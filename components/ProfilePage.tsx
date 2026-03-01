
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { Loader2, User, Fingerprint, Briefcase, GraduationCap, Building2, CheckCircle2, AlertCircle, Save, PenTool, Upload, FileImage, Trash2, Info } from 'lucide-react';

interface ProfilePageProps {
  profile: Profile;
  onUpdate: () => void;
}

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

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedSignatureFile, setSelectedSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(profile.signature_url || null);
  
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
    setSuccess(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { setError('File too large.'); return; }
      setSelectedSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setSignaturePreview(reader.result as string);
      reader.readAsDataURL(file);
      setSuccess(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let signatureUrl = profile.signature_url;
      if (profile.role === 'faculty' && selectedSignatureFile) {
        const fileExt = selectedSignatureFile.name.split('.').pop();
        const fileName = `sig_${profile.id}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('od-files').upload(`signatures/${fileName}`, selectedSignatureFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('od-files').getPublicUrl(`signatures/${fileName}`);
        signatureUrl = publicUrl;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...formData, signature_url: signatureUrl }
      });

      if (updateError) throw updateError;
      setSuccess(true);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-end border-b pb-8">
        <div>
          <h2 className="text-4xl font-black text-blueprint-blue tracking-tighter uppercase italic">System Profile</h2>
        </div>
        <div className="px-4 py-1.5 bg-blueprint-blue text-white text-[10px] font-black rounded-full uppercase tracking-widest">{profile.role} Terminal</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] border p-8 text-center shadow-sm">
            <div className="w-24 h-24 bg-blueprint-blue text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-4xl font-black">{profile.full_name?.charAt(0) || '?'}</div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{profile.full_name || 'User'}</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{profile.email}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border shadow-xl overflow-hidden">
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input name="full_name" required value={formData.full_name} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none text-sm" placeholder="Full Name" />
                <input name="identification_no" required value={formData.identification_no} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-mono text-sm" placeholder="ID No" />
                {profile.role === 'student' ? (
                  <>
                    <input name="roll_no" required value={formData.roll_no} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-mono text-sm" placeholder="Roll No" />
                    <select name="year" value={formData.year} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none text-sm">
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      {formData.department === 'M.Tech. CSE (5-Years)' && (
                        <option value="5">5th Year (M.Tech)</option>
                      )}
                    </select>
                  </>
                ) : (
                  <input name="designation" required value={formData.designation} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none text-sm" placeholder="Designation" />
                )}
                <select name="department" value={formData.department} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none text-sm">
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {profile.role === 'faculty' && (
                  <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl bg-slate-50 border">
                    <input
                      type="checkbox"
                      id="is_hod"
                      name="is_hod"
                      checked={formData.is_hod}
                      onChange={handleInputChange}
                      className="w-5 h-5 accent-blueprint-blue"
                    />
                    <label htmlFor="is_hod" className="text-xs font-bold text-slate-700 uppercase tracking-tight">HOD Status</label>
                  </div>
                )}
              </div>

              {profile.role === 'faculty' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Faculty Digital Signature</label>
                  <label className="w-full h-40 bg-slate-50 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 transition-all">
                    {signaturePreview ? (
                      <img src={signaturePreview} className="max-w-full max-h-full object-contain p-4" alt="Preview" />
                    ) : (
                      <div className="text-slate-400 uppercase text-[10px] font-black flex flex-col items-center gap-2">
                        <Upload size={24} />
                        Upload Signature
                      </div>
                    )}
                    <input type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
              )}

              {error && <div className="text-amber-700 text-[10px] font-black uppercase">{error}</div>}
              {success && <div className="text-amber-600 text-[10px] font-black uppercase">Profile Updated</div>}

              <button type="submit" disabled={loading} className="bg-blueprint-blue text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:bg-goldenrod transition-all">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
