
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { Loader2, User, Fingerprint, Briefcase, GraduationCap, Building2, Upload } from 'lucide-react';

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

interface ProfileSetupProps {
  profile: Profile;
  onComplete: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ profile, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    identification_no: profile.identification_no || '',
    roll_no: profile.roll_no || '',
    year: profile.year || '1',
    designation: profile.designation || '',
    department: profile.department || 'Computer Science and Engineering',
    is_hod: profile.is_hod || false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => {
      const next = { ...prev, [name]: val };
      // Reset year if department changes and year 5 is no longer valid
      if (name === 'department' && value !== 'M.Tech. CSE (5-Years)' && prev.year === '5') {
        next.year = '4';
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let signatureUrl = null;
      if (profile.role === 'faculty' && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `sig_${profile.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('od-files').upload(`signatures/${fileName}`, selectedFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('od-files').getPublicUrl(`signatures/${fileName}`);
        signatureUrl = publicUrl;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...formData, signature_url: signatureUrl, is_profile_complete: true }
      });

      if (updateError) throw updateError;
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Profile synchronization failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-blueprint-blue"></div>
        
        <div className="p-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Complete Your Profile</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <input
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
                placeholder="Full Name"
              />
              <input
                name="identification_no"
                required
                value={formData.identification_no}
                onChange={handleInputChange}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-sm outline-none"
                placeholder={profile.role === 'student' ? "Reg No" : "Emp ID"}
              />

              {profile.role === 'student' ? (
                <div className="grid grid-cols-2 gap-4">
                  <input
                    name="roll_no"
                    required
                    value={formData.roll_no}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-sm outline-none"
                    placeholder="Roll No"
                  />
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    {formData.department === 'M.Tech. CSE (5-Years)' && (
                      <option value="5">5th Year (M.Tech)</option>
                    )}
                  </select>
                </div>
              ) : (
                <input
                  name="designation"
                  required
                  value={formData.designation}
                  onChange={handleInputChange}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
                  placeholder="Designation"
                />
              )}
              
              {profile.role === 'faculty' && (
                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    id="is_hod"
                    name="is_hod"
                    checked={formData.is_hod}
                    onChange={handleInputChange}
                    className="w-5 h-5 accent-blueprint-blue"
                  />
                  <label htmlFor="is_hod" className="text-sm font-bold text-slate-700 uppercase tracking-tight">Are you the Head of Department (HOD)?</label>
                </div>
              )}

              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {profile.role === 'faculty' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Faculty Digital Signature</label>
                <label className="w-full h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 transition-all">
                  <Upload size={20} className="text-slate-400 mb-1" />
                  <span className="text-[10px] font-bold uppercase">{selectedFile ? selectedFile.name : 'Upload Image'}</span>
                  <input type="file" className="sr-only" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            )}

            {error && <div className="text-amber-700 text-[10px] font-bold uppercase">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blueprint-blue text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-500/20 hover:bg-goldenrod transition-all"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Finalize Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
