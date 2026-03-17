
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { Loader2, User, Fingerprint, Briefcase, GraduationCap, Building2, CheckCircle2, AlertCircle, Save, PenTool, Upload, FileImage, Trash2, Info } from 'lucide-react';
import { DEPARTMENTS } from '../constants';

interface ProfilePageProps {
  profile: Profile;
  onUpdate: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    identification_no: profile?.identification_no || '',
    roll_no: profile?.roll_no || '',
    phone_number: profile?.phone_number || '',
    year: profile?.year || '1',
    semester: profile?.semester || '1',
    designation: profile?.designation || '',
    department: profile?.department || 'Computer Science and Engineering',
    is_hod: profile?.is_hod || false,
    signature_url: profile?.signature_url || null
  });

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_signature.${fileExt}`;
      const filePath = `signatures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('od-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('od-files')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, signature_url: publicUrl }));
      
      // Update profile immediately in DB
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ signature_url: publicUrl })
        .eq('id', profile.id);

      if (dbError) throw dbError;

      setSuccess(true);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Signature upload failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...formData }
      });

      if (updateError) throw updateError;

      // Also update the profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ ...formData })
        .eq('id', profile.id);

      if (dbError) throw dbError;

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

          <div className="bg-white rounded-[2rem] border p-8 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <PenTool size={14} /> Official Signature
            </h4>
            {formData.signature_url ? (
              <div className="relative group">
                <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200">
                  <img src={formData.signature_url} alt="Signature" className="max-h-20 mx-auto" referrerPolicy="no-referrer" />
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer">
                  <Upload className="text-white" size={24} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 cursor-pointer hover:bg-slate-100 transition-colors">
                <Upload className="text-slate-400 mb-2" size={24} />
                <span className="text-[10px] font-bold text-slate-500 uppercase">Upload Signature</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} />
              </label>
            )}
            <p className="text-[9px] text-slate-400 mt-3 italic">Used for generating official OD letters.</p>
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
                    <input name="phone_number" required type="tel" value={formData.phone_number} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none text-sm" placeholder="Phone Number" />
                    <select name="year" value={formData.year} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none text-sm">
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      {formData.department === 'M.Tech. CSE (5-Years)' && (
                        <option value="5">5th Year (M.Tech)</option>
                      )}
                    </select>
                    <select name="semester" value={formData.semester} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none text-sm">
                      <option value="1">1st Sem</option>
                      <option value="2">2nd Sem</option>
                      <option value="3">3rd Sem</option>
                      <option value="4">4th Sem</option>
                      <option value="5">5th Sem</option>
                      <option value="6">6th Sem</option>
                      <option value="7">7th Sem</option>
                      <option value="8">8th Sem</option>
                      {formData.department === 'M.Tech. CSE (5-Years)' && (
                        <>
                          <option value="9">9th Sem</option>
                          <option value="10">10th Sem</option>
                        </>
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
