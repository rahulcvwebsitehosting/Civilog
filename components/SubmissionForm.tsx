
import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Phone, AlertCircle, Upload, Image as ImageIcon, FileText, CreditCard, X, User } from 'lucide-react';
import { SubmissionFormData, Profile, TeamMember, ODRequest } from '../types';
import { generateODDocument } from '../services/pdfService';
import { logAudit } from '../services/auditService';

interface SubmissionFormProps {
  onSuccess: () => void;
  onClose: () => void;
  profile: Profile;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

import { DEPARTMENTS, BASE_URL } from '../constants';

const SubmissionForm: React.FC<SubmissionFormProps> = ({ onSuccess, onClose, profile }) => {
  const initialYear = profile?.year || '2';
  const getInitialSemester = (year: string) => {
    const y = parseInt(year);
    return (2 * y - 1).toString();
  };

  const [formData, setFormData] = useState<SubmissionFormData>({
    student_name: profile?.full_name || '',
    register_no: profile?.identification_no || '',
    roll_no: profile?.roll_no || '',
    phone_number: profile?.phone_number || '',
    year: initialYear, 
    department: profile?.department || 'Computer Science and Engineering',
    semester: profile?.semester || getInitialSemester(initialYear),
    event_title: '',
    organization_name: '',
    organization_location: '',
    event_type: 'Symposium',
    event_date: '',
    event_end_date: '',
    team_members: [],
  });

  const [customEventType, setCustomEventType] = useState('');
  const [regFile, setRegFile] = useState<File | null>(null);
  const [payFile, setPayFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => {
    const fieldsToTrack = [
      formData.student_name.trim(),
      formData.register_no.trim(),
      formData.roll_no.trim(),
      formData.phone_number.trim(),
      formData.event_title.trim(),
      formData.organization_name.trim(),
      formData.organization_location.trim(),
      formData.event_date.trim(),
      regFile ? 'file' : '',
      posterFile ? 'file' : ''
    ];

    const filledCount = fieldsToTrack.filter(val => val !== '').length;
    const totalPossible = fieldsToTrack.length;
    
    return totalPossible > 0 ? (filledCount / totalPossible) * 100 : 0;
  }, [formData, regFile, posterFile]);
  
  if (!profile) return null;

  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds 5MB limit.`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File "${file.name}" is not a supported format. Use PDF, JPEG, or PNG.`;
    }
    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      // Sync end date with start date if end date is empty or was previously synced
      if (name === 'event_date' && (prev.event_end_date === '' || prev.event_end_date === prev.event_date)) {
        newData.event_end_date = value;
      }
      // Reset year if department changes and year 5 is no longer valid
      if (name === 'department' && value !== 'M.Tech. CSE (5-Years)' && prev.year === '5') {
        newData.year = '4';
      }
      // Sync semester with year
      if (name === 'year') {
        const year = parseInt(value);
        const sem1 = 2 * year - 1;
        newData.semester = sem1.toString();
      }
      return newData;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        e.target.value = '';
        return;
      }
      setError(null);
      setter(file);
    }
  };

  const startBackgroundUpload = (file: File, path: string, label: string, contentType?: string) => {
    return supabase.storage
      .from('od-files')
      .upload(path, file, { 
        cacheControl: '3600', 
        upsert: false,
        contentType: contentType || file.type
      })
      .then(({ error: err }) => {
        if (err) {
          console.error(`[BACKGROUND] ${label} upload failed:`, err);
          throw err;
        }
        return path;
      })
      .catch(e => {
        console.error(`[BACKGROUND] ${label} exception:`, e);
        throw e;
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    try {
      
      // Step 0: Ensure profile exists in DB (Resiliency check)
      const { error: syncError } = await supabase.from('profiles').upsert({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        full_name: formData.student_name,
        identification_no: formData.register_no,
        roll_no: formData.roll_no,
        year: formData.year,
        department: formData.department,
        is_profile_complete: true
      }, { onConflict: 'id' });

      if (syncError) {
        console.warn("Profile sync warning (non-fatal):", syncError);
      }

      // Step 1: Prepare all file paths
      const generateUniquePath = (file: File, folder: string) => {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name}`;
        return `${folder}/${fileName}`;
      };

      const regPath = regFile ? generateUniquePath(regFile, 'registration_proofs') : null;
      const posterPath = posterFile ? generateUniquePath(posterFile, 'event_posters') : null;
      const payPath = payFile ? generateUniquePath(payFile, 'payment_proofs') : null;

      const regUrl = regPath ? supabase.storage.from('od-files').getPublicUrl(regPath).data.publicUrl : null;
      const posterUrl = posterPath ? supabase.storage.from('od-files').getPublicUrl(posterPath).data.publicUrl : null;
      const payUrl = payPath ? supabase.storage.from('od-files').getPublicUrl(payPath).data.publicUrl : null;

      const finalEventType = formData.event_type === 'Others' ? customEventType : formData.event_type;

      // Step 2: Prepare Database Data
      const requestData = {
        user_id: profile.id,
        student_name: formData.student_name,
        register_no: formData.register_no,
        roll_no: formData.roll_no,
        phone_number: formData.phone_number,
        year: formData.year,
        department: profile.department || formData.department,
        semester: formData.semester,
        event_title: formData.event_title,
        organization_name: formData.organization_name,
        organization_location: formData.organization_location,
        event_type: finalEventType,
        event_date: formData.event_date,
        event_end_date: formData.event_end_date || formData.event_date,
        team_members: formData.team_members,
      };

      // Predict OD Letter Path
      const letterFileName = `${Date.now()}_Requisition_${formData.register_no}.pdf`;
      const letterPath = `od_letters/${letterFileName}`;

      // Step 3: Database Insertion (FAST)
      const { data: insertedData, error: dbError } = await supabase.from('od_requests').insert([
        {
          ...requestData,
          status: 'Pending Advisor',
          registration_proof_url: regUrl,
          payment_proof_url: payUrl,
          event_poster_url: posterUrl,
          od_letter_url: null, // Set to null initially, updated after background upload
          notification_sent: false,
          created_at: new Date().toISOString(),
        }
      ]).select().single();

      if (dbError) {
        console.error("Database Insert Error:", dbError);
        throw dbError;
      }

      // Step 4: Success UI (IMMEDIATE)
      onSuccess();

      // Log Audit
      await logAudit('CREATE_OD', 'od_request', insertedData?.id || null, {
        student_name: formData.student_name,
        event_title: formData.event_title,
        department: formData.department
      });

      // Step 5: Background Tasks (PDF, Uploads & Notifications)
      
      // Generate PDF in background
      generateODDocument({ ...requestData, id: insertedData?.id || 'PENDING' } as any, profile).then(blob => {
        const letterFile = new File([blob], letterFileName, { type: 'application/pdf' });
        startBackgroundUpload(letterFile, letterPath, 'OD Letter', 'application/pdf')
          .then(() => {
            const realUrl = supabase.storage.from('od-files').getPublicUrl(letterPath).data.publicUrl;
            return supabase.from('od_requests')
              .update({ od_letter_url: realUrl })
              .eq('id', insertedData.id);
          })
          .then(({ error }) => {
            if (error) console.error('[BACKGROUND] od_letter_url DB update failed:', error);
          })
          .catch(e => console.error('[BACKGROUND] OD Letter pipeline failed:', e));
      }).catch(e => console.error("[BACKGROUND] PDF generation failed:", e));

      if (regFile && regPath) startBackgroundUpload(regFile, regPath, 'Registration Proof');
      if (posterFile && posterPath) startBackgroundUpload(posterFile, posterPath, 'Event Poster');
      if (payFile && payPath) startBackgroundUpload(payFile, payPath, 'Payment Proof');

      // Step 6: Notify Advisor (Background)
      if (insertedData) {
        try {
          const { data: recipients, error: recipientError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('role', 'advisor')
            .eq('department', formData.department);

          if (recipientError) {
            console.error("[DEBUG] Recipient fetch error:", recipientError);
          }


          if (recipients && recipients.length > 0) {
            for (const recipient of recipients) {
              if (recipient.email) {
                const finalUrl = BASE_URL;
                
                
                // Also insert in-app notification
                await supabase.from('notifications').insert({
                  user_id: recipient.id,
                  message: `New OD Request from ${formData.student_name} (${formData.register_no}) for ${formData.event_title}. Pending your recommendation.`,
                  type: 'info',
                  read: false
                });

                const emailMessage = `
                  <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #003366;">New OD Request for Recommendation</h2>
                    <p>A new On-Duty request has been submitted by <strong>${formData.student_name}</strong> (${formData.register_no}) and is pending your recommendation.</p>
                    <p><strong>Event:</strong> ${formData.event_title}</p>
                    <p><strong>Organization:</strong> ${formData.organization_name}</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p>Please log in to your dashboard to review and recommend this request to the HOD.</p>
                    <a href="${finalUrl}" style="display: inline-block; padding: 12px 24px; background-color: #003366; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">View Advisor Dashboard</a>
                    <p style="font-size: 12px; color: #666; margin-top: 30px;">Ref: OD-REQ-${insertedData.id.substring(0, 8)}</p>
                  </div>
                `;

                const emailRes = await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: recipient.email,
                    subject: `New OD Request for Recommendation: ${formData.event_title}`,
                    message: emailMessage
                  })
                });
                const emailResult = await emailRes.json();
              }
            }
            
            // Mark notification as sent
            await supabase.from('od_requests').update({ notification_sent: true }).eq('id', insertedData.id);
          } else {
            console.warn(`[DEBUG] No Advisors found for department: ${formData.department}`);
          }
        } catch (notifyErr) {
          console.error("[DEBUG] Advisor notification failed:", notifyErr);
        }
      }

    } catch (err: any) {
      console.error("--- SUBMISSION FAILED ---", err);
      setError(`Error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl bg-[#F5F5F5] dark:bg-[#262626] rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-white dark:border-gray-700 font-display">
      <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-800">
        <div 
          className="absolute top-0 left-0 h-full bg-blueprint-blue shadow-[0_0_15px_rgba(0,51,102,0.4)] transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="relative px-10 pt-12 pb-8 border-b border-slate-200 dark:border-gray-600 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-gray-100 uppercase tracking-tighter italic leading-none">OD Submission</h1>
          <p className="text-[10px] text-pencil-gray font-technical font-bold uppercase tracking-widest mt-2">Please fill in the details accurately</p>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-red-500 transition-colors p-2 bg-slate-100 rounded-full" type="button">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-10 max-h-[65vh] overflow-y-auto custom-scrollbar bg-topo">
        <div className="space-y-5">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 01 PERSONAL INFORMATION
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="student_name"
                required
                value={formData.student_name}
                onChange={handleInputChange}
                className="w-full bg-white dark:bg-gray-800 text-sm pl-12 pr-4 py-4 rounded-2xl border border-slate-200 outline-none focus:border-blueprint-blue transition-colors shadow-sm" 
                placeholder="Student Name (Ex. Rahul Shyam)" 
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                name="phone_number"
                required
                type="tel"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="w-full bg-white dark:bg-gray-800 text-sm pl-12 pr-4 py-4 rounded-2xl border border-slate-200 outline-none focus:border-blueprint-blue transition-colors shadow-sm" 
                placeholder="Phone Number" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <select 
              name="year" 
              value={formData.year} 
              onChange={handleInputChange} 
              disabled={!!profile.year}
              className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none disabled:opacity-70 shadow-sm"
            >
               <option value="1">1st Year</option>
               <option value="2">2nd Year</option>
               <option value="3">3rd Year</option>
               <option value="4">4th Year</option>
               {formData.department === 'M.Tech. CSE (5-Years)' && (
                 <option value="5">5th Year (M.Tech)</option>
               )}
             </select>
             <select 
              name="semester" 
              value={formData.semester} 
              onChange={handleInputChange} 
              className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm"
            >
               {[2 * parseInt(formData.year) - 1, 2 * parseInt(formData.year)].map(sem => (
                 <option key={sem} value={sem.toString()}>{sem}{sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th'} Sem</option>
               ))}
             </select>
             <select 
              name="department" 
              value={formData.department} 
              onChange={handleInputChange} 
              disabled={!!profile.department}
              className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none disabled:opacity-70 shadow-sm"
            >
               {DEPARTMENTS.map(dept => (
                 <option key={dept} value={dept}>{dept}</option>
               ))}
             </select>
          </div>
          <div className="grid grid-cols-2 gap-5">
             <input name="register_no" required value={formData.register_no} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none font-mono shadow-sm" placeholder="Reg No (Ex. 2403730410321019)" />
             <input name="roll_no" required value={formData.roll_no} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none font-mono shadow-sm" placeholder="Roll No (Ex. ES24CE19)" />
          </div>
        </div>

        <div className="space-y-5 pt-2">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 02 SPECIFICATIONS
          </h2>
          <input name="event_title" required value={formData.event_title} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none font-bold shadow-sm" placeholder="Event Title (Ex. Paper Presentation)" />
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <select name="event_type" value={formData.event_type} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm">
                <option value="Conference">Conference</option>
                <option value="Culturals">Culturals</option>
                <option value="FDP">FDP</option>
                <option value="Hackathon">Hackathon</option>
                <option value="NSS/NCC">NSS/NCC</option>
                <option value="Paper Presentation">Paper Presentation</option>
                <option value="Project Contest">Project Contest</option>
                <option value="Quiz Event">Quiz Event</option>
                <option value="Seminar">Seminar</option>
                <option value="Sports / Games">Sports / Games</option>
                <option value="Symposium">Symposium</option>
                <option value="Webinar">Webinar</option>
                <option value="Workshop">Workshop</option>
                <option value="Others">Others</option>
              </select>
              {formData.event_type === 'Others' && (
                <input 
                  type="text"
                  placeholder="Specify Event Type"
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 text-sm px-5 py-3 rounded-xl border-2 border-blueprint-blue outline-none animate-in slide-in-from-top-1 duration-200"
                  required
                />
              )}
            </div>
            <input name="organization_name" required value={formData.organization_name} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm h-fit" placeholder="Organization (Ex. ESEC)" />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Start Date</label>
              <input 
                type="date" 
                name="event_date" 
                required 
                min={new Date().toISOString().split('T')[0]}
                value={formData.event_date} 
                onChange={handleInputChange} 
                className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">End Date</label>
              <input 
                type="date" 
                name="event_end_date" 
                required 
                min={formData.event_date || new Date().toISOString().split('T')[0]}
                value={formData.event_end_date} 
                onChange={handleInputChange} 
                className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm" 
              />
            </div>
          </div>
          <input name="organization_location" required value={formData.organization_location} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm" placeholder="Organization Location (Ex. Chennai)" />
        </div>

        <div className="space-y-5 pt-2 pb-8">
           <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 03 DOCUMENTATION (Optional)
          </h2>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
             <label className={`h-28 border-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${posterFile ? 'border-blueprint-blue bg-blue-50/50 shadow-inner' : 'border-dashed border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'}`}>
                <ImageIcon size={28} className={posterFile ? 'text-blueprint-blue' : 'text-slate-300'} />
                <span className="text-[9px] font-black uppercase mt-2 px-3 truncate w-full text-center tracking-tighter">{posterFile ? posterFile.name : 'Poster (Opt)'}</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setPosterFile)} />
             </label>
             <label className={`h-28 border-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${regFile ? 'border-blueprint-blue bg-blue-50/50 shadow-inner' : 'border-dashed border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'}`}>
                <FileText size={28} className={regFile ? 'text-blueprint-blue' : 'text-slate-300'} />
                <span className="text-[9px] font-black uppercase mt-2 px-3 truncate w-full text-center tracking-tighter">{regFile ? regFile.name : 'Reg Proof (Opt)'}</span>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setRegFile)} />
             </label>
             <label className={`h-28 border-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${payFile ? 'border-indigo-500 bg-indigo-50/50 shadow-inner' : 'border-dashed border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50'}`}>
                <CreditCard size={28} className={payFile ? 'text-indigo-500' : 'text-slate-300'} />
                <span className="text-[9px] font-black uppercase mt-2 px-3 truncate w-full text-center tracking-tighter">{payFile ? payFile.name : 'Receipt (Opt)'}</span>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setPayFile)} />
             </label>
           </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-100 text-xs font-mono flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-blueprint-blue hover:bg-blue-900 text-white font-black py-6 px-10 rounded-[1.5rem] shadow-2xl shadow-blue-900/20 transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-xs active:scale-[0.98] flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>Submit OD Request</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SubmissionForm;
