
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

  const startBackgroundUpload = (file: File, path: string, label: string, contentType?: string) => {
    console.log(`[BACKGROUND] Starting ${label} upload to ${path}...`);
    supabase.storage
      .from('od-files')
      .upload(path, file, { 
        cacheControl: '3600', 
        upsert: false,
        contentType: contentType || file.type
      })
      .then(({ error: err }) => {
        if (err) console.error(`[BACKGROUND] ${label} upload failed:`, err);
        else console.log(`[BACKGROUND] ${label} upload successful: ${path}`);
      })
      .catch(e => console.error(`[BACKGROUND] ${label} exception:`, e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    try {
      alert("🚀 Step 1: Preparing data and file paths...");
      console.log("--- SUBMISSION START (DATABASE-FIRST) ---");
      
      // Step 1: Prepare all file paths and predict URLs immediately
      const generateUniquePath = (file: File, folder: string) => {
        const ext = file.name.split('.').pop();
        // Append unique timestamp to prevent 409 conflicts
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

      // Step 2: Generate OD Document
      console.log("Step 2: Generating OD Document...");
      const requestDataForPDF = {
        user_id: profile.id,
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
      };

      const letterBlob = await generateODDocument({ ...requestDataForPDF, id: 'PENDING' } as any, profile);
      
      // Predict OD Letter URL
      const letterFileName = `${Date.now()}_Requisition_${formData.register_no}.pdf`;
      const letterPath = `od_letters/${letterFileName}`; // Strictly od_letters/
      const letterUrl = supabase.storage.from('od-files').getPublicUrl(letterPath).data.publicUrl;

      alert("📄 Step 2: Generating OD Requisition PDF...");
      // Step 3: DATABASE INSERTION (PRIORITY)
      console.log("Step 3: Inserting into database...");
      console.table(requestDataForPDF);

      const { error: dbError } = await supabase.from('od_requests').insert([
        {
          ...requestDataForPDF,
          created_at: new Date().toISOString(),
          status: 'Pending Advisor',
          registration_proof_url: regUrl,
          payment_proof_url: payUrl,
          event_poster_url: posterUrl,
          od_letter_url: letterUrl,
          notification_sent: false,
          geotag_photo_urls: [],
          certificate_urls: [],
          prize_details: [],
          achievement_details: null,
          remarks: null,
          geotag_photo_url: null,
          certificate_url: null,
        },
      ]); // Removed .select() to prevent hangs

      if (dbError) {
        console.error("Database Insert Error Details:", dbError);
        alert(`❌ Database Error: ${dbError.message}\nCode: ${dbError.code}`);
        throw new Error(`Database Error: ${dbError.message} (Code: ${dbError.code})`);
      }

      alert("✅ Step 3: Database Saved! Finalizing...");

      // Step 4: SUCCESS UI (IMMEDIATE)
      console.log("Step 4: Database confirmed. Showing success UI.");
      onSuccess();

      // Step 5: BACKGROUND UPLOADS (NON-BLOCKING)
      console.log("Step 5: Starting background uploads...");
      
      if (regFile && regPath) startBackgroundUpload(regFile, regPath, 'Registration Proof');
      if (posterFile && posterPath) startBackgroundUpload(posterFile, posterPath, 'Event Poster');
      if (payFile && payPath) startBackgroundUpload(payFile, payPath, 'Payment Proof');
      
      const letterFile = new File([letterBlob], letterFileName, { type: 'application/pdf' });
      startBackgroundUpload(letterFile, letterPath, 'OD Letter', 'application/pdf');

    } catch (err: any) {
      console.error("--- SUBMISSION FAILED ---");
      console.error("Error Object:", err);
      setError(`Error: ${err.message || 'Unknown error'}`);
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
                  // 1. Check connection & Table existence
                  const { data: profileCheck, error: profileError } = await supabase.from('profiles').select('id').limit(1);
                  if (profileError) throw new Error(`Profiles table check failed: ${profileError.message}`);
                  
                  const { data: odCheck, error: odError } = await supabase.from('od_requests').select('id').limit(1);
                  if (odError) throw new Error(`OD Requests table check failed: ${odError.message}`);

                  // 2. Check Storage Bucket
                  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
                  if (bucketError) throw new Error(`Storage check failed: ${bucketError.message}`);
                  const hasBucket = buckets.some(b => b.name === 'od-files');
                  
                  const duration = Date.now() - start;
                  
                  // 3. Check key format
                  const anonKey = (supabase as any).supabaseKey || '';
                  const isStandardKey = anonKey.startsWith('eyJ');
                  const isManagementKey = anonKey.startsWith('sb_publishable_');
                  
                  let msg = `✅ System Check: SUCCESS!\n`;
                  msg += `⏱️ Response time: ${duration}ms\n`;
                  msg += `📂 Tables: Found 'profiles' and 'od_requests'\n`;
                  msg += `📦 Storage: 'od-files' bucket is ${hasBucket ? 'ACTIVE' : 'MISSING'}\n\n`;
                  
                  if (!hasBucket) {
                    msg += `❌ CRITICAL: 'od-files' bucket not found in Storage. Please create it.\n\n`;
                  }

                  if (isManagementKey) {
                    msg += `❌ KEY ERROR: You are using a 'Management API' key. This will NOT work for database operations.\n`;
                  }
                  
                  alert(msg);
                } catch (err: any) {
                  console.error("System Check Failed:", err);
                  alert(`❌ System Check: FAILED!\n\nError: ${err.message}\n\nCommon Fixes:\n1. Run the SQL schema I gave you.\n2. Create the 'od-files' bucket.\n3. Ensure your Anon Key starts with 'eyJ'.`);
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

        <div className="space-y-5 pt-2">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 03 TEAM COMPOSITION
          </h2>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-slate-100 dark:border-gray-700 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                placeholder="Member Name" 
                value={teamMemberInput.name} 
                onChange={e => setTeamMemberInput({...teamMemberInput, name: e.target.value})}
                className="w-full bg-slate-50 dark:bg-gray-700 text-sm px-5 py-3 rounded-xl border border-slate-100 outline-none focus:border-blueprint-blue transition-colors"
              />
              <input 
                placeholder="Register No" 
                value={teamMemberInput.register_no} 
                onChange={e => setTeamMemberInput({...teamMemberInput, register_no: e.target.value})}
                className="w-full bg-slate-50 dark:bg-gray-700 text-sm px-5 py-3 rounded-xl border border-slate-100 outline-none focus:border-blueprint-blue transition-colors font-mono"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <input 
                placeholder="Roll No" 
                value={teamMemberInput.roll_no} 
                onChange={e => setTeamMemberInput({...teamMemberInput, roll_no: e.target.value})}
                className="w-full bg-slate-50 dark:bg-gray-700 text-sm px-5 py-3 rounded-xl border border-slate-100 outline-none focus:border-blueprint-blue transition-colors font-mono"
              />
              <select 
                value={teamMemberInput.year} 
                onChange={e => setTeamMemberInput({...teamMemberInput, year: e.target.value})}
                className="w-full bg-slate-50 dark:bg-gray-700 text-sm px-4 py-3 rounded-xl border border-slate-100 outline-none"
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
              <select 
                value={teamMemberInput.department} 
                onChange={e => setTeamMemberInput({...teamMemberInput, department: e.target.value})}
                className="w-full bg-slate-50 dark:bg-gray-700 text-sm px-4 py-3 rounded-xl border border-slate-100 outline-none col-span-2"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <button 
              type="button" 
              onClick={addTeamMember}
              className="w-full py-3 bg-slate-100 dark:bg-gray-700 hover:bg-blueprint-blue hover:text-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={14} /> Add Member to Squad
            </button>
          </div>

          {formData.team_members.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
              {formData.team_members.map((member, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-gray-700 flex items-center justify-center text-blueprint-blue font-black text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-gray-100">{member.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase">{member.register_no} • {member.roll_no}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => removeTeamMember(idx)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5 pt-2 pb-8">
           <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200"></span> 04 DOCUMENTATION
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
