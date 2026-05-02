
import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Phone, AlertCircle, Upload, Image as ImageIcon, FileText, CreditCard, X, User } from 'lucide-react';
import { SubmissionFormData, Profile, TeamMember, ODRequest } from '../types';
import { generateODDocument } from '../services/pdfService';
import { logAudit } from '../services/auditService';
import SearchableSelect from './SearchableSelect';
import { useToast } from '../contexts/ToastContext';

interface SubmissionFormProps {
  onSuccess: () => void;
  onClose: () => void;
  profile: Profile;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

import { DEPARTMENTS, BASE_URL, TAMIL_NADU_DISTRICTS, EVENT_CATEGORIES } from '../constants';
import { useEventCategories } from '../hooks/useEventCategories';

const SubmissionForm: React.FC<SubmissionFormProps> = ({ onSuccess, onClose, profile }) => {
  const { showToast } = useToast();
  const { categories: EVENT_CATEGORIES_LIVE } = useEventCategories();
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
    event_type: '',
    event_date: '',
    event_end_date: '',
    team_members: [],
  });

  const [eventCategorySearch, setEventCategorySearch] = useState('');
  const [eventSubType, setEventSubType] = useState('');
  const [customSubType, setCustomSubType] = useState('');
  const [extraEvents, setExtraEvents] = useState<{title: string, category: string, subType: string, customSubType: string}[]>([]);
  const [customLocation, setCustomLocation] = useState('');
  const [regFile, setRegFile] = useState<File | null>(null);
  const [payFile, setPayFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      team_members: [...prev.team_members, { 
        name: '', 
        register_no: '', 
        roll_no: '',
        year: prev.year,
        department: prev.department
      }]
    }));
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  const handleTeamMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    setFormData(prev => {
      const newMembers = [...prev.team_members];
      newMembers[index] = { ...newMembers[index], [field]: value };
      return { ...prev, team_members: newMembers };
    });
  };

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
    
    if (name === 'event_end_date' && formData.event_date && value < formData.event_date) {
      setError("Warning: End date is before the start date.");
    } else if (error && (name === 'event_end_date' || name === 'event_date')) {
      if (error.includes("date")) setError(null);
    }

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
    
    if (!formData.event_type) {
      setError("Please select an event category.");
      return;
    }

    if (formData.event_end_date && formData.event_date && formData.event_end_date < formData.event_date) {
      setError("End date cannot be before the start date.");
      return;
    }

    setLoading(true);
    setError(null);

    // Step -1: Validate Department against DEPARTMENTS constant
    if (!DEPARTMENTS.includes(formData.department)) {
      setError(`Invalid Department: "${formData.department}". Please select a valid department from the list.`);
      setLoading(false);
      return;
    }

    try {
      
      // Step 0: Prepare all file paths
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

      let finalEventType = formData.event_type;
      if (eventSubType) {
        if (eventSubType === 'Other' && customSubType) {
          finalEventType = `${formData.event_type} - Other: ${customSubType}`;
        } else {
          finalEventType = `${formData.event_type} - ${eventSubType}`;
        }
      }
      
      let finalTitle = formData.event_title;
      extraEvents.forEach(ev => {
        if (!ev.title.trim()) return;
        finalTitle += ` & ${ev.title.trim()}`;
        let evType = ev.category;
        if (ev.subType) {
          if (ev.subType === 'Other' && ev.customSubType) {
            evType = `${ev.category} - Other: ${ev.customSubType}`;
          } else {
            evType = `${ev.category} - ${ev.subType}`;
          }
        }
        finalEventType += `, ${evType}`;
      });

      const finalLocation = formData.organization_location === 'Other' ? customLocation : formData.organization_location;

      // Step 1: Prepare Database Data
      const requestData = {
        user_id: profile.id,
        student_name: formData.student_name,
        register_no: formData.register_no,
        roll_no: formData.roll_no,
        phone_number: formData.phone_number,
        year: profile.year || formData.year,
        department: profile.department || formData.department,
        semester: formData.semester,
        event_title: finalTitle,
        organization_name: formData.organization_name,
        organization_location: finalLocation,
        event_type: finalEventType,
        event_date: formData.event_date,
        event_end_date: formData.event_end_date || formData.event_date,
        team_members: formData.team_members,
      };

      // Predict OD Letter Path
      const letterFileName = `${Date.now()}_Requisition_${formData.register_no}.pdf`;
      const letterPath = `od_letters/${letterFileName}`;

      // Step 2: Database Insertion (FAST)
      const { data: insertedData, error: dbError } = await supabase.from('od_requests').insert([
        {
          ...requestData,
          status: 'Pending Coordinator',
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

      // Step 3: Success UI (IMMEDIATE)
      onSuccess();

      // Log Audit
      await logAudit('CREATE_OD', 'od_request', insertedData?.id || null, {
        student_name: formData.student_name,
        event_title: formData.event_title,
        department: formData.department
      });

      // Step 4: Background Tasks (PDF, Uploads & Notifications)
      
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

      // Step 5: Notify Coordinator (Background)
      if (insertedData) {
        try {
          const { data: recipients, error: recipientError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('role', 'coordinator')
            .ilike('department', formData.department.trim());

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
                    <a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; background-color: #003366; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">View Coordinator Dashboard</a>
                    <p style="font-size: 12px; color: #666; margin-top: 30px;">Ref: OD-REQ-${insertedData.id.substring(0, 8)}</p>
                  </div>
                `;

                const { data: { session } } = await supabase.auth.getSession();
                const emailRes = await fetch('/api/send-email', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                  },
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
            console.warn(`[DEBUG] No Coordinators found for department: ${formData.department}`);
          }
        } catch (notifyErr) {
          console.error("[DEBUG] Coordinator notification failed:", notifyErr);
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

      <div className="relative px-4 sm:px-10 pt-12 pb-8 border-b border-slate-200 dark:border-gray-600 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-gray-100 uppercase tracking-tighter italic leading-none">OD Submission</h1>
          <p className="text-[10px] text-pencil-gray font-technical font-bold uppercase tracking-widest mt-2">Please fill in the details accurately</p>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-red-600 transition-all p-2.5 bg-slate-200/50 hover:bg-slate-200 rounded-full" type="button">
          <X size={20} strokeWidth={3} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 sm:px-10 py-6 space-y-10 max-h-[65vh] overflow-y-auto custom-scrollbar bg-topo">
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
                className="w-full bg-white dark:bg-gray-800 text-sm pl-12 pr-4 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none focus:border-blueprint-blue transition-colors shadow-sm" 
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
                className="w-full bg-white dark:bg-gray-800 text-sm pl-12 pr-4 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none focus:border-blueprint-blue transition-colors shadow-sm" 
                placeholder="Phone Number" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <select 
              name="year" 
              value={formData.year} 
              onChange={handleInputChange} 
              disabled={!!profile.year}
              className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none disabled:opacity-70 shadow-sm"
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
              className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none shadow-sm"
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
              className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none disabled:opacity-70 shadow-sm"
            >
               {DEPARTMENTS.map(dept => (
                 <option key={dept} value={dept}>{dept}</option>
               ))}
             </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
             <input name="register_no" required value={formData.register_no} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none font-mono shadow-sm" placeholder="Reg No (Ex. 2403730410321019)" />
             <input name="roll_no" required value={formData.roll_no} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none font-mono shadow-sm" placeholder="Roll No (Ex. ES24CE19)" />
          </div>
        </div>

        <div className="space-y-5 pt-2">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 02 SPECIFICATIONS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Event Title / Topic Name</label>
              <input 
                name="event_title" 
                required 
                value={formData.event_title} 
                onChange={handleInputChange} 
                className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none font-bold shadow-sm" 
                placeholder="Ex. Seismic Analysis of High-Rise Structures" 
              />
            </div>
            <div className="space-y-2">
              <SearchableSelect
                label="Event Category"
                options={EVENT_CATEGORIES_LIVE.map(c => c.label)}
                value={formData.event_type}
                onChange={(val) => {
                  setFormData(prev => ({ ...prev, event_type: val }));
                  setEventSubType('');
                  setCustomSubType('');
                }}
                placeholder="Search Events"
              />
              
              <button 
                type="button" 
                onClick={() => setExtraEvents([...extraEvents, {title: '', category: '', subType: '', customSubType: ''}])}
                className="text-[10px] font-black uppercase tracking-widest text-blueprint-blue hover:text-blue-900 flex items-center justify-center gap-1 w-full py-2 bg-blue-50/50 rounded-xl hover:bg-blue-50 transition-colors border border-blue-100 border-dashed mt-2"
              >
                + Add Another Event
              </button>
              
              {formData.event_type && (
                <>
                  {EVENT_CATEGORIES_LIVE.find(c => c.value === formData.event_type)?.subcategories.length! > 0 && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Select Sub-Category</label>
                      <select 
                        value={eventSubType}
                        onChange={(e) => {
                          setEventSubType(e.target.value);
                          if (e.target.value !== 'Other') setCustomSubType('');
                        }}
                        className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none shadow-sm"
                        required
                      >
                        <option value="">Choose Sub-Category</option>
                        {EVENT_CATEGORIES_LIVE.find(c => c.value === formData.event_type)?.subcategories.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {eventSubType === 'Other' && (
                    <input 
                      type="text"
                      placeholder="Specify Sub-Category"
                      value={customSubType}
                      onChange={(e) => setCustomSubType(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 text-sm px-5 py-5 min-h-[48px] rounded-xl border-2 border-blueprint-blue outline-none animate-in slide-in-from-top-1 duration-200"
                      required
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {extraEvents.map((ev, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100 relative animate-in slide-in-from-top-2">
              <button 
                type="button" 
                onClick={() => setExtraEvents(prev => prev.filter((_, i) => i !== index))}
                className="absolute -top-3 -right-3 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                title="Remove Event"
              >
                <X size={12} strokeWidth={3} />
              </button>
              
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Event Title</label>
                <input 
                  required 
                  value={ev.title} 
                  onChange={(e) => {
                    const newEvs = [...extraEvents];
                    newEvs[index].title = e.target.value;
                    setExtraEvents(newEvs);
                  }}
                  className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none font-bold shadow-sm" 
                  placeholder="Ex. Web Development Hackathon" 
                />
              </div>
              
              <div className="space-y-2">
                <SearchableSelect
                  label="Event Category"
                  options={EVENT_CATEGORIES_LIVE.map(c => c.label)}
                  value={ev.category}
                  onChange={(val) => {
                    const newEvs = [...extraEvents];
                    newEvs[index].category = val;
                    newEvs[index].subType = '';
                    newEvs[index].customSubType = '';
                    setExtraEvents(newEvs);
                  }}
                  placeholder="Search Events"
                />
                
                {ev.category && (
                  <>
                    {EVENT_CATEGORIES_LIVE.find(c => c.value === ev.category)?.subcategories.length! > 0 && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Select Sub-Category</label>
                        <select 
                          value={ev.subType}
                          onChange={(e) => {
                            const newEvs = [...extraEvents];
                            newEvs[index].subType = e.target.value;
                            if (e.target.value !== 'Other') newEvs[index].customSubType = '';
                            setExtraEvents(newEvs);
                          }}
                          className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none shadow-sm"
                          required
                        >
                          <option value="">Choose Sub-Category</option>
                          {EVENT_CATEGORIES_LIVE.find(c => c.value === ev.category)?.subcategories.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {ev.subType === 'Other' && (
                      <input 
                        type="text"
                        placeholder="Specify Sub-Category"
                        value={ev.customSubType}
                        onChange={(e) => {
                          const newEvs = [...extraEvents];
                          newEvs[index].customSubType = e.target.value;
                          setExtraEvents(newEvs);
                        }}
                        className="w-full bg-white dark:bg-gray-700 text-sm px-5 py-5 min-h-[48px] rounded-xl border-2 border-blueprint-blue outline-none animate-in slide-in-from-top-1 duration-200"
                        required
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Redundant button removed as it is now near the main category */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Organization Name</label>
              <input name="organization_name" required value={formData.organization_name} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none shadow-sm h-fit" placeholder="Organization (Ex. ESEC)" />
            </div>
            <div className="space-y-1.5">
              <SearchableSelect
                label="Organization Location"
                options={TAMIL_NADU_DISTRICTS}
                value={formData.organization_location}
                onChange={(val) => {
                  handleInputChange({
                    target: { name: 'organization_location', value: val }
                  } as any);
                }}
                placeholder="Select District"
              />
              {formData.organization_location === 'Other' && (
                <div className="pt-2 animate-in slide-in-from-top-1 duration-200">
                  <input 
                    type="text"
                    placeholder="Specify Location (Ex. Bangalore)"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 text-sm px-5 py-5 min-h-[48px] rounded-xl border-2 border-blueprint-blue outline-none"
                    required
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5 mt-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Start Date</label>
              <input 
                type="date" 
                name="event_date" 
                required 
                min={new Date().toISOString().split('T')[0]}
                value={formData.event_date} 
                onChange={handleInputChange} 
                className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none shadow-sm" 
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
                className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-5 min-h-[48px] rounded-2xl border border-slate-200 outline-none shadow-sm" 
              />
            </div>
          </div>
        </div>

        <div className="space-y-5 pt-2 pb-8">
           <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 04 DOCUMENTATION (Optional)
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
          className="w-full bg-blueprint-blue hover:bg-blue-900 text-white font-black py-5 px-10 rounded-[1.5rem] shadow-2xl shadow-blue-900/20 transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-xs active:scale-[0.98] flex items-center justify-center gap-3"
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
