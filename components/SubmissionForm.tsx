
import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, UserPlus, Trash2, Phone, Tag, MapPin, AlertCircle, Upload, Info, CheckCircle2, Calendar, Beaker, Image as ImageIcon, FileText, CreditCard, X, User, Database } from 'lucide-react';
import { SubmissionFormData, Profile, TeamMember, ODRequest } from '../types';
import { generateODDocument } from '../services/pdfService';

interface SubmissionFormProps {
  onSuccess: () => void;
  onClose: () => void;
  profile: Profile;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

import { DEPARTMENTS } from '../constants';

const SubmissionForm: React.FC<SubmissionFormProps> = ({ onSuccess, onClose, profile }) => {
  const [formData, setFormData] = useState<SubmissionFormData>({
    student_name: profile?.full_name || '',
    register_no: profile?.identification_no || '',
    roll_no: profile?.roll_no || '',
    phone_number: '',
    year: profile?.year || '2', 
    department: profile?.department || 'Computer Science and Engineering',
    semester: '3',
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
  
  const [teamMemberInput, setTeamMemberInput] = useState<TeamMember>({
    name: '',
    register_no: '',
    roll_no: '',
    year: '2',
    department: profile?.department || 'Computer Science and Engineering'
  });

  if (!profile) return null;

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

  const handleAutoFill = () => {
    setFormData(prev => ({
      ...prev,
      phone_number: '9876543210',
      department: 'Computer Science and Engineering',
      semester: '5',
      event_title: 'Technical Symposium on AI & Innovation',
      organization_name: 'IIT Madras',
      organization_location: 'Adyar, Chennai',
      event_type: 'Others',
      event_date: '2026-01-10',
      event_end_date: '2026-01-12',
      team_members: [
        {
          name: 'Suresh Kumar',
          register_no: '2203730045',
          roll_no: '22CS45',
          year: '3',
          department: 'Computer Science and Engineering'
        }
      ]
    }));
    
    setCustomEventType('Inter-College Hackathon');
    
    setTeamMemberInput({
      name: '',
      register_no: '',
      roll_no: '',
      year: '2',
      department: profile.department || 'Computer Science and Engineering'
    });
  };

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

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const fullPath = `${path}/${fileName}`;

    console.log(`[STORAGE] Starting upload to ${fullPath}...`);
    
    // Create a promise that rejects after 15 seconds
    const uploadPromise = supabase.storage
      .from('od-files')
      .upload(fullPath, file);
      
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Upload to ${path} timed out after 15s`)), 15000)
    );

    const result = await Promise.race([uploadPromise, timeoutPromise]) as any;
    
    if (result instanceof Error) throw result;
    const { error: uploadError } = result;

    if (uploadError) {
      console.error(`[STORAGE] Upload error for ${path}:`, uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('od-files')
      .getPublicUrl(fullPath);
    
    const publicUrl = data.publicUrl;

    console.log(`[STORAGE] Upload complete: ${publicUrl}`);
    return publicUrl;
  };

  const addTeamMember = () => {
    if (teamMemberInput.name && teamMemberInput.register_no && teamMemberInput.roll_no && teamMemberInput.department) {
      setFormData(prev => ({ 
        ...prev, 
        team_members: [...prev.team_members, { ...teamMemberInput }] 
      }));
      setTeamMemberInput({ 
        name: '', 
        register_no: '', 
        roll_no: '', 
        year: '2', 
        department: profile.department || 'Computer Science and Engineering' 
      });
    } else {
      setError('Please fill all member fields.');
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({ ...prev, team_members: prev.team_members.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    // Add a safety timeout
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Transmission timed out (25s). This usually happens if the Supabase URL/Key is incorrect or the network is blocked. Check your browser console (F12) for more details.');
      console.error("SUBMISSION TIMEOUT: The request took too long. Check network tab.");
    }, 25000);

    try {
      console.log("--- SUBMISSION START ---");
      console.log("Profile ID:", profile.id);
      console.log("Step 1: Starting file uploads...");
      
      let regUrl = null;
      if (regFile) {
        console.log("Uploading registration proof...");
        regUrl = await uploadFile(regFile, 'registration_proofs');
      }
      
      let posterUrl = null;
      if (posterFile) {
        console.log("Uploading event poster...");
        posterUrl = await uploadFile(posterFile, 'event_posters');
      }
      
      let payUrl = null;
      if (payFile) {
        console.log("Uploading payment proof...");
        payUrl = await uploadFile(payFile, 'payment_proofs');
      }

      const finalEventType = formData.event_type === 'Others' ? customEventType : formData.event_type;

      const requestData = {
        user_id: profile.id,
        created_at: new Date().toISOString(),
        student_name: formData.student_name,
        register_no: formData.register_no,
        roll_no: formData.roll_no,
        phone_number: formData.phone_number,
        year: formData.year,
        department: formData.department,
        semester: formData.semester,
        event_title: formData.event_title,
        organization_name: formData.organization_name,
        organization_location: formData.organization_location,
        event_type: finalEventType,
        event_date: formData.event_date,
        event_end_date: formData.event_end_date || formData.event_date,
        team_members: formData.team_members,
        status: 'Pending Advisor' as const,
        registration_proof_url: regUrl,
        payment_proof_url: payUrl,
        event_poster_url: posterUrl,
        od_letter_url: null,
        geotag_photo_urls: [],
        certificate_urls: [],
        prize_details: [],
        achievement_details: null,
        remarks: null,
        geotag_photo_url: null,
        certificate_url: null,
      };

      console.log("Step 2: Generating OD Document...");
      const letterBlob = await generateODDocument({ ...requestData, id: 'PENDING' } as ODRequest, profile);
      console.log("OD Document generated, size:", (letterBlob.size / 1024).toFixed(2), "KB");

      const letterFileName = `Requisition_${formData.register_no}_${Date.now()}.pdf`;
      const letterPath = `od_requisitions/${letterFileName}`;

      console.log("Step 3: Uploading OD Letter to storage...");
      // Add timeout to this upload too
      const letterUploadPromise = supabase.storage
        .from('od-files')
        .upload(letterPath, letterBlob);
        
      const letterTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("OD Letter upload timed out after 15s")), 15000)
      );

      const letterResult = await Promise.race([letterUploadPromise, letterTimeoutPromise]) as any;
      if (letterResult instanceof Error) throw letterResult;
      const { error: letterUploadError } = letterResult;

      if (letterUploadError) {
        console.error("OD Letter Upload Error:", letterUploadError);
        throw letterUploadError;
      }

      const { data: letterData } = supabase.storage
        .from('od-files')
        .getPublicUrl(letterPath);
      
      const letterUrl = letterData.publicUrl;
      console.log("OD Letter uploaded:", letterUrl);

      console.log("Step 4: Inserting into database...");
      // Add timeout to database insert
      const dbInsertPromise = supabase.from('od_requests').insert([
        {
          ...requestData,
          od_letter_url: letterUrl,
          notification_sent: false
        },
      ]).select().single();

      const dbTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database insertion timed out after 15s")), 15000)
      );

      const dbResult = await Promise.race([dbInsertPromise, dbTimeoutPromise]) as any;
      if (dbResult instanceof Error) throw dbResult;
      const { data: insertedData, error: dbError } = dbResult;

      if (dbError) {
        console.error("Database Insert Error:", dbError);
        throw dbError;
      }

      console.log("Step 5: Submission successful! ID:", insertedData?.id);
      clearTimeout(timeoutId);
      onSuccess();
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("--- SUBMISSION FAILED ---");
      console.error("Error Object:", err);
      setError(`Error: ${err.message || 'Unknown error'}. Check console for details.`);
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
          <h1 className="text-3xl font-black text-slate-900 dark:text-gray-100 uppercase tracking-tighter italic leading-none">OD Submittal</h1>
          <div className="flex flex-wrap gap-2 mt-3">
            <button 
              type="button"
              onClick={handleAutoFill}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">terminal</span> DEBUG: AUTO-FILL
            </button>
            <button 
              type="button"
              onClick={async () => {
                const start = Date.now();
                console.log("--- SYSTEM CHECK START ---");
                try {
                  const { data, error } = await supabase.from('profiles').select('count').limit(1);
                  const duration = Date.now() - start;
                  if (error) throw error;
                  alert(`System Check: SUCCESS!\nResponse time: ${duration}ms\nConnection to Supabase is active.`);
                } catch (err: any) {
                  console.error("System Check Failed:", err);
                  alert(`System Check: FAILED!\nError: ${err.message}\nCheck console for full details.`);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-lg shadow-slate-500/20 transition-all active:scale-95"
            >
              <Database size={14} /> SYSTEM CHECK
            </button>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-red-500 transition-colors p-2 bg-slate-100 rounded-full" type="button">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-10 max-h-[65vh] overflow-y-auto custom-scrollbar bg-topo">
        {/* ... (Lead Identification section remains same) ... */}
        <div className="space-y-5">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 01 LEAD IDENTIFICATION
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
                placeholder="Lead Student Name" 
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
               {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(sem => (
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
             <input name="register_no" required value={formData.register_no} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none font-mono shadow-sm" placeholder="Reg No" />
             <input name="roll_no" required value={formData.roll_no} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none font-mono shadow-sm" placeholder="Roll No" />
          </div>
        </div>

        <div className="space-y-5 pt-2">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 02 SPECIFICATIONS
          </h2>
          <input name="event_title" required value={formData.event_title} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none font-bold shadow-sm" placeholder="Event Title" />
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
            <input name="organization_name" required value={formData.organization_name} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm h-fit" placeholder="Organization" />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Start Date</label>
              <input 
                type="date" 
                name="event_date" 
                required 
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
                value={formData.event_end_date} 
                onChange={handleInputChange} 
                className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm" 
              />
            </div>
          </div>
          <input name="organization_location" required value={formData.organization_location} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-sm px-5 py-4 rounded-2xl border border-slate-200 outline-none shadow-sm" placeholder="Organization Location (e.g. Chennai)" />
        </div>

        <div className="space-y-5 pt-2 pb-8">
           <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 03 DOCUMENTATION
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
              <span>Transmitting Data...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>Transmit OD Request</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SubmissionForm;
