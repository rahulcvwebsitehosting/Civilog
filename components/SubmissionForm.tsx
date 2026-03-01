
import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, UserPlus, Trash2, Phone, Tag, MapPin, AlertCircle, Upload, Info, CheckCircle2, Calendar, Beaker, Image as ImageIcon, FileText, CreditCard } from 'lucide-react';
import { SubmissionFormData, Profile, TeamMember, ODRequest } from '../types';
import { generateODDocument } from '../services/pdfService';

interface SubmissionFormProps {
  onSuccess: () => void;
  onClose: () => void;
  profile: Profile;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const DEPARTMENTS = [
  'Civil Engineering',
  'Agriculture Engineering',
  'Biomedical Engineering',
  'Computer Science and Engineering',
  'Electrical and Electronics Engineering',
  'Electronics and Communication Engineering',
  'Electronics and Instrumentation Engineering',
  'Mechanical Engineering',
  'Robotics and Automation',
  'CSE (Cyber Security)',
  'CSE (AI & ML)',
  'CSE (IoT)',
  'Chemical Engineering',
  'Information Technology',
  'Artificial Intelligence and Data Science',
  'Computer Science and Design',
  'M.Tech. CSE (5-Years)',
  'MBA',
  'MCA',
  'Food Technology',
  'S&H'
];

const SubmissionForm: React.FC<SubmissionFormProps> = ({ onSuccess, onClose, profile }) => {
  const [formData, setFormData] = useState<SubmissionFormData>({
    student_name: profile.full_name || '',
    register_no: profile.identification_no || '',
    roll_no: profile.roll_no || '',
    phone_number: '',
    year: profile.year || '2', 
    department: profile.department || 'Computer Science and Engineering',
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
    year: '2'
  });

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
      event_title: 'Technical Symposium on AI & Innovation',
      organization_name: 'IIT Madras',
      organization_location: 'Adyar, Chennai',
      event_type: 'Workshop',
      event_date: '2026-01-10',
      event_end_date: '2026-01-12',
    }));
    
    setTeamMemberInput({
      name: 'Suresh Kumar',
      register_no: '2203730045',
      roll_no: '22CS45',
      year: '3'
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
      if (name === 'event_date' && !prev.event_end_date) {
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

    const { error: uploadError } = await supabase.storage
      .from('od-files')
      .upload(fullPath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('od-files')
      .getPublicUrl(fullPath);

    return publicUrl;
  };

  const addTeamMember = () => {
    if (teamMemberInput.name && teamMemberInput.register_no && teamMemberInput.roll_no) {
      setFormData(prev => ({ 
        ...prev, 
        team_members: [...prev.team_members, { ...teamMemberInput }] 
      }));
      setTeamMemberInput({ name: '', register_no: '', roll_no: '', year: '2' });
    } else {
      setError('Please fill all member fields.');
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({ ...prev, team_members: prev.team_members.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regFile || !posterFile) {
      setError('Poster and Registration proof are mandatory.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const regUrl = await uploadFile(regFile, 'registration_proofs');
      const posterUrl = await uploadFile(posterFile, 'event_posters');
      let payUrl = null;
      if (payFile) {
        payUrl = await uploadFile(payFile, 'payment_proofs');
      }

      const finalEventType = formData.event_type === 'Other' ? customEventType : formData.event_type;

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
        geotag_photo_urls: [], // Initialize as empty array
        certificate_urls: [], // Initialize as empty array
        prize_details: [], // Initialize as empty array
        achievement_details: null,
        advisor_id: null,
        hod_id: null,
        remarks: null,
        // Legacy single fields - for backward compatibility, keep them null or empty
        geotag_photo_url: null,
        certificate_url: null,
      };

      const letterBlob = await generateODDocument({ ...requestData, id: 'PENDING' } as ODRequest, profile);
      const letterFileName = `Requisition_${formData.register_no}_${Date.now()}.pdf`;
      const letterPath = `od_requisitions/${letterFileName}`;

      const { error: letterUploadError } = await supabase.storage
        .from('od-files')
        .upload(letterPath, letterBlob);

      if (letterUploadError) throw letterUploadError;

      const { data: { publicUrl: letterUrl } } = supabase.storage
        .from('od-files')
        .getPublicUrl(letterPath);

      const { error: dbError } = await supabase.from('od_requests').insert([
        {
          ...requestData,
          od_letter_url: letterUrl
        },
      ]);

      if (dbError) throw dbError;
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Transmission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl bg-[#F5F5F5] dark:bg-[#262626] rounded-xl shadow-2xl overflow-hidden border-4 border-gray-300 dark:border-gray-700 font-display">
      <div className="relative w-full h-3 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-600">
        <div 
          className="absolute top-0 left-0 h-full bg-blueprint-blue bg-stripes shadow-[0_0_10px_rgba(245,158,11,0.6)] transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="relative px-8 pt-10 pb-6 border-b-2 border-dashed border-gray-300 dark:border-gray-600 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight italic">OD Submittal</h1>
          <button 
            type="button"
            onClick={handleAutoFill}
            className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 shadow-md"
          >
            <Beaker size={14} /> DEBUG: AUTO-FILL
          </button>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-primary transition-colors p-1" type="button">
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar bg-topo">
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-mono">01 LEAD IDENTIFICATION</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input 
              name="student_name"
              required
              value={formData.student_name}
              onChange={handleInputChange}
              className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg border-2 border-slate-200 outline-none" 
              placeholder="Lead Student Name" 
            />
            <input 
              name="phone_number"
              required
              type="tel"
              value={formData.phone_number}
              onChange={handleInputChange}
              className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg border-2 border-slate-200 outline-none" 
              placeholder="Phone Number" 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <select name="year" value={formData.year} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg border-2 border-slate-200 outline-none">
               <option value="1">1st Year</option>
               <option value="2">2nd Year</option>
               <option value="3">3rd Year</option>
               <option value="4">4th Year</option>
               {formData.department === 'M.Tech. CSE (5-Years)' && (
                 <option value="5">5th Year (M.Tech)</option>
               )}
             </select>
             <select name="department" value={formData.department} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg border-2 border-slate-200 outline-none">
               {DEPARTMENTS.map(dept => (
                 <option key={dept} value={dept}>{dept}</option>
               ))}
             </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <input name="register_no" required value={formData.register_no} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg border-2 border-slate-200 outline-none font-mono" placeholder="Reg No" />
             <input name="roll_no" required value={formData.roll_no} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg border-2 border-slate-200 outline-none font-mono" placeholder="Roll No" />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-mono">01.1 ADDITIONAL TEAM</h2>
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 space-y-4 shadow-inner">
            <div className="grid grid-cols-2 gap-3">
              <input value={teamMemberInput.name} onChange={(e) => setTeamMemberInput(prev => ({...prev, name: e.target.value}))} placeholder="Name" className="bg-slate-50 text-sm p-3 rounded-lg border border-slate-200 outline-none" />
              <input value={teamMemberInput.register_no} onChange={(e) => setTeamMemberInput(prev => ({...prev, register_no: e.target.value}))} placeholder="Reg No" className="bg-slate-50 text-sm p-3 rounded-lg border border-slate-200 outline-none font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={teamMemberInput.roll_no} onChange={(e) => setTeamMemberInput(prev => ({...prev, roll_no: e.target.value}))} placeholder="Roll No" className="bg-slate-50 text-sm p-3 rounded-lg border border-slate-200 outline-none font-mono" />
              <select value={teamMemberInput.year} onChange={(e) => setTeamMemberInput(prev => ({...prev, year: e.target.value}))} className="bg-slate-50 text-sm p-3 rounded-lg border border-slate-200 outline-none">
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                {formData.department === 'M.Tech. CSE (5-Years)' && (
                  <option value="5">5th Year (M.Tech)</option>
                )}
              </select>
            </div>
            <button type="button" onClick={addTeamMember} className="w-full bg-blueprint-blue text-white py-3 rounded-xl hover:bg-goldenrod transition-all font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10">
              <UserPlus size={14} /> Add Member
            </button>
          </div>
          <div className="space-y-2">
            {formData.team_members.map((member, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="text-[10px]"><p className="font-black text-slate-800 uppercase">{member.name} ({member.year}Y)</p><p className="text-slate-500 font-mono">ID: {member.register_no}</p></div>
                <button type="button" onClick={() => removeTeamMember(i)} className="text-red-400 p-1"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-mono">02 SPECIFICATIONS</h2>
          <input name="event_title" required value={formData.event_title} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg border-2 border-slate-200 outline-none font-mono" placeholder="Event Title" />
          <div className="grid grid-cols-2 gap-4">
            <select name="event_type" value={formData.event_type} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg border-2 border-slate-200 outline-none">
              <option value="Symposium">Symposium</option>
              <option value="Workshop">Workshop</option>
              <option value="Paper Presentation">Paper Presentation</option>
              <option value="Other">Other</option>
            </select>
            <input name="organization_name" required value={formData.organization_name} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg border-2 border-slate-200 outline-none" placeholder="Organization" />
          </div>
        </div>

        <div className="space-y-4 pt-2 pb-8">
           <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-mono">03 DOCUMENTATION</h2>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <label className={`h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${posterFile ? 'border-primary bg-primary/5' : 'border-gray-400 bg-white hover:border-gray-500 hover:bg-gray-50'}`}>
                <ImageIcon size={20} className={posterFile ? 'text-primary' : 'text-gray-400'} />
                <span className="text-[8px] font-bold uppercase mt-1 px-2 truncate w-full text-center">{posterFile ? posterFile.name : 'Event Poster'}</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setPosterFile)} />
             </label>
             <label className={`h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${regFile ? 'border-primary bg-primary/5' : 'border-gray-400 bg-white hover:border-gray-500 hover:bg-gray-50'}`}>
                <FileText size={20} className={regFile ? 'text-primary' : 'text-gray-400'} />
                <span className="text-[8px] font-bold uppercase mt-1 px-2 truncate w-full text-center">{regFile ? regFile.name : 'Reg Proof'}</span>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setRegFile)} />
             </label>
             <label className={`h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${payFile ? 'border-amber-500 bg-amber-50' : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}`}>
                <CreditCard size={20} className={payFile ? 'text-amber-500' : 'text-gray-400'} />
                <span className="text-[8px] font-bold uppercase mt-1 px-2 truncate w-full text-center">{payFile ? payFile.name : 'Receipt (Opt)'}</span>
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setPayFile)} />
             </label>
           </div>
        </div>

        {error && <div className="bg-amber-50 text-amber-700 p-4 rounded-lg border border-amber-200 text-xs font-mono">{error}</div>}
        <button type="submit" disabled={loading} className="w-full bg-blueprint-blue hover:bg-goldenrod text-white font-black py-5 px-8 rounded-xl shadow-xl shadow-amber-500/10 transition-all disabled:opacity-50 uppercase tracking-widest text-xs">
          {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Transmit OD Request'}
        </button>
      </form>
    </div>
  );
};

export default SubmissionForm;
