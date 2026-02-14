
import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, UserPlus, Trash2, Phone, Tag, MapPin } from 'lucide-react';
import { SubmissionFormData, Profile, TeamMember } from '../types';

interface SubmissionFormProps {
  onSuccess: () => void;
  onClose: () => void;
  profile: Profile;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const SubmissionForm: React.FC<SubmissionFormProps> = ({ onSuccess, onClose, profile }) => {
  const [formData, setFormData] = useState<SubmissionFormData>({
    student_name: '',
    register_no: '',
    roll_no: '',
    phone_number: '',
    year: '2', 
    semester: '3',
    event_title: '',
    organization_name: '',
    organization_location: '',
    event_type: 'Symposium',
    event_date: '',
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (teamMemberInput.name && teamMemberInput.register_no && teamMemberInput.roll_no) {
      setFormData(prev => ({ 
        ...prev, 
        team_members: [...prev.team_members, { ...teamMemberInput }] 
      }));
      setTeamMemberInput({ name: '', register_no: '', roll_no: '', year: '2' });
      setError(null);
    } else {
      setError('Please fill all team member fields.');
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({ ...prev, team_members: prev.team_members.filter((_, i) => i !== index) }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFile) {
      setError('Registration proof is mandatory.');
      return;
    }
    if (!posterFile) {
      setError('Event poster is mandatory for preview.');
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

      const { error: dbError } = await supabase.from('od_requests').insert([
        {
          ...formData,
          event_type: finalEventType,
          user_id: profile.id,
          registration_proof_url: regUrl,
          payment_proof_url: payUrl,
          event_poster_url: posterUrl,
          status: 'Pending'
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
    <div className="relative w-full max-w-xl bg-[#F5F5F5] dark:bg-[#262626] rounded-xl shadow-2xl overflow-hidden border-4 border-gray-300 dark:border-gray-700 font-display transition-all">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      
      <div className="relative w-full h-3 bg-gray-300 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-600">
        <div 
          className="absolute top-0 left-0 h-full bg-primary bg-stripes shadow-[0_0_10px_rgba(255,87,34,0.6)] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
        <div 
          className="absolute top-[-4px] w-3 h-5 bg-white border-2 border-primary shadow-md transform -translate-x-1/2 rounded-sm z-10 transition-all duration-700 ease-out"
          style={{ left: `${progress}%` }}
        ></div>
      </div>

      <div className="relative px-8 pt-10 pb-6 border-b-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="absolute top-6 right-6">
          <button onClick={onClose} className="text-gray-400 hover:text-primary transition-colors p-1" type="button">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-primary p-2 rounded-lg text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-3xl">engineering</span>
          </div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 uppercase tracking-tight italic">Structural OD Submittal</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar bg-topo">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-mono">01 LEAD IDENTIFICATION</h2>
            <div className="h-px bg-gray-300 dark:bg-gray-600 flex-grow"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative group">
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Team Lead Name</label>
              <input 
                name="student_name"
                required
                value={formData.student_name}
                onChange={handleInputChange}
                className="w-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm p-3.5 rounded-lg steel-border input-inset focus:ring-2 focus:ring-primary font-mono outline-none" 
                placeholder="Ex: Rahul S" 
              />
            </div>
            <div className="relative group">
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Contact Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  name="phone_number"
                  required
                  type="tel"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm pl-10 pr-3.5 py-3.5 rounded-lg steel-border input-inset focus:ring-2 focus:ring-primary font-mono outline-none" 
                  placeholder="Ex: +91 98765 43210" 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
               <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Academic Year</label>
               <select name="year" value={formData.year} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg steel-border input-inset font-mono outline-none">
                 <option value="1">1st Year</option>
                 <option value="2">2nd Year</option>
                 <option value="3">3rd Year</option>
                 <option value="4">4th Year</option>
               </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Registration No.</label>
              <input 
                name="register_no"
                required
                value={formData.register_no}
                onChange={handleInputChange}
                className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg steel-border input-inset focus:ring-2 focus:ring-primary font-mono outline-none" 
                placeholder="Ex: 2403730..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Roll Number</label>
              <input 
                name="roll_no"
                required
                value={formData.roll_no}
                onChange={handleInputChange}
                className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg steel-border input-inset focus:ring-2 focus:ring-primary font-mono outline-none" 
                placeholder="Ex: 22CE01"
              />
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-mono">01.1 ADDITIONAL TEAM</h2>
              <div className="h-px bg-gray-300 dark:bg-gray-600 flex-grow"></div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input 
                  value={teamMemberInput.name}
                  onChange={(e) => setTeamMemberInput(prev => ({...prev, name: e.target.value}))}
                  placeholder="Member Name (Ex: Kamaleshganth)"
                  className="bg-white dark:bg-gray-800 text-sm p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-primary font-mono" 
                />
                <select 
                  value={teamMemberInput.year}
                  onChange={(e) => setTeamMemberInput(prev => ({...prev, year: e.target.value}))}
                  className="bg-white dark:bg-gray-800 text-sm p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-primary font-mono"
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  value={teamMemberInput.register_no}
                  onChange={(e) => setTeamMemberInput(prev => ({...prev, register_no: e.target.value}))}
                  placeholder="Reg No (Ex: 240373...)"
                  className="bg-white dark:bg-gray-800 text-sm p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-primary font-mono" 
                />
                <input 
                  value={teamMemberInput.roll_no}
                  onChange={(e) => setTeamMemberInput(prev => ({...prev, roll_no: e.target.value}))}
                  placeholder="Roll No (Ex: 22CE02)"
                  className="bg-white dark:bg-gray-800 text-sm p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-primary font-mono" 
                />
              </div>
              <button 
                type="button" 
                onClick={addTeamMember}
                className="w-full bg-blueprint-blue text-white py-2 rounded-lg hover:bg-blue-900 transition-all font-black uppercase text-[10px] flex items-center justify-center gap-2"
              >
                <UserPlus size={14} /> Add Team Member
              </button>
            </div>

            <div className="space-y-2">
              {formData.team_members.map((member, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="overflow-hidden">
                    <p className="text-[11px] font-black text-slate-800 truncate">{member.name} ({member.year} Year)</p>
                    <p className="text-[9px] text-slate-500 font-mono">Reg: {member.register_no} • Roll: {member.roll_no}</p>
                  </div>
                  <button type="button" onClick={() => removeTeamMember(i)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-mono">02 SPECIFICATIONS</h2>
            <div className="h-px bg-gray-300 dark:bg-gray-600 flex-grow"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Activity Title</label>
              <input 
                name="event_title" 
                required 
                value={formData.event_title} 
                onChange={handleInputChange} 
                className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg steel-border input-inset font-mono outline-none" 
                placeholder="Ex: Bridge Design Expo 2025"
              />
            </div>
            
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Event Type</label>
              <select 
                name="event_type" 
                value={formData.event_type} 
                onChange={handleInputChange} 
                className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg steel-border input-inset font-mono outline-none"
              >
                <option value="Symposium">Symposium</option>
                <option value="Workshop">Workshop</option>
                <option value="Paper Presentation">Paper Presentation</option>
                <option value="Technical Quiz">Technical Quiz</option>
                <option value="Model Making">Model Making</option>
                <option value="Surveying Camp">Surveying Camp</option>
                <option value="Industrial Visit">Industrial Visit</option>
                <option value="Internship">Internship</option>
                <option value="Culturals">Culturals</option>
                <option value="Sports">Sports</option>
                <option value="Other">Other (Custom Entry)</option>
              </select>
            </div>

            {formData.event_type === 'Other' && (
              <div className="sm:col-span-1">
                <label className="block text-[10px] font-black text-primary uppercase mb-1.5 ml-1">Manual Type Entry</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" size={14} />
                  <input 
                    required 
                    value={customEventType} 
                    onChange={(e) => setCustomEventType(e.target.value)} 
                    className="w-full bg-primary/5 border-primary/20 dark:bg-gray-800 text-sm pl-9 pr-3.5 py-3.5 rounded-lg focus:ring-2 focus:ring-primary font-mono outline-none" 
                    placeholder="Ex: Guest Lecture"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">College / Organization Name</label>
              <input 
                name="organization_name" 
                required 
                value={formData.organization_name} 
                onChange={handleInputChange} 
                className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg steel-border input-inset font-mono outline-none" 
                placeholder="Ex: Anna University, Chennai"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">College / Organization Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  name="organization_location" 
                  required 
                  value={formData.organization_location} 
                  onChange={handleInputChange} 
                  className="w-full bg-gray-100 dark:bg-gray-800 text-sm pl-10 pr-3.5 py-3.5 rounded-lg steel-border input-inset font-mono outline-none" 
                  placeholder="Ex: Guindy, Chennai"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1.5 ml-1">Event Date</label>
              <input name="event_date" required type="date" value={formData.event_date} onChange={handleInputChange} className="w-full bg-gray-100 dark:bg-gray-800 text-sm p-3.5 rounded-lg steel-border input-inset font-mono outline-none" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-mono">03 DOCUMENTATION</h2>
            <div className="h-px bg-gray-300 dark:bg-gray-600 flex-grow"></div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-500 uppercase ml-1">Event Poster (Mandatory for Preview)</label>
              <label className={`relative w-full h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${posterFile ? 'border-primary bg-primary/5' : 'border-gray-400 bg-gray-200/50 hover:border-primary'}`}>
                <span className={`material-symbols-outlined text-3xl mb-1 ${posterFile ? 'text-primary' : 'text-gray-400'}`}>
                  {posterFile ? 'image' : 'add_photo_alternate'}
                </span>
                <span className="text-[10px] font-bold uppercase truncate px-4">{posterFile ? posterFile.name : 'Upload Event Poster (JPG/PNG)'}</span>
                <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, setPosterFile)} />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase ml-1">Registration Proof *</label>
                <label className={`relative w-full h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${regFile ? 'border-primary bg-primary/5' : 'border-gray-400 bg-gray-200/50 hover:border-primary'}`}>
                  <span className={`material-symbols-outlined text-2xl ${regFile ? 'text-primary' : 'text-gray-400'}`}>description</span>
                  <span className="text-[10px] font-bold uppercase truncate px-2">{regFile ? regFile.name : 'Upload PDF/Image'}</span>
                  <input type="file" className="sr-only" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setRegFile)} />
                </label>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase ml-1">Payment Receipt (Optional)</label>
                <label className={`relative w-full h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${payFile ? 'border-primary bg-primary/5' : 'border-gray-400 bg-gray-200/50 hover:border-primary'}`}>
                  <span className={`material-symbols-outlined text-2xl ${payFile ? 'text-primary' : 'text-gray-400'}`}>payments</span>
                  <span className="text-[10px] font-bold uppercase truncate px-2">{payFile ? payFile.name : 'Upload Receipt'}</span>
                  <input type="file" className="sr-only" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setPayFile)} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 pb-2">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-xs font-mono">
              <p className="font-bold uppercase tracking-widest">Error</p>
              <p>{error}</p>
            </div>
          )}
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-black py-5 px-8 rounded-xl shadow-xl transform active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin mx-auto" /> : <span className="tracking-widest uppercase">Transmit OD Request</span>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubmissionForm;
