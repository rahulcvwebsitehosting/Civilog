
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { Loader2, User, Fingerprint, Briefcase, GraduationCap, Building2, CheckCircle2, AlertCircle, Save, PenTool, Upload, FileImage, Trash2, Info } from 'lucide-react';

interface ProfilePageProps {
  profile: Profile;
  onUpdate: () => void;
}

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
    department: profile.department || 'Civil Engineering'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Signature file must be under 2MB.');
        return;
      }
      setSelectedSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
      setSuccess(false);
    }
  };

  const saveSignature = async (): Promise<string | null> => {
    if (!selectedSignatureFile) return profile.signature_url || null;

    const fileExt = selectedSignatureFile.name.split('.').pop();
    const fileName = `signature_${profile.id}_${Date.now()}.${fileExt}`;
    const filePath = `signatures/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('od-files')
      .upload(filePath, selectedSignatureFile, {
        contentType: selectedSignatureFile.type,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('od-files')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const signatureUrl = await saveSignature();

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...formData,
          signature_url: signatureUrl
        }
      });

      if (updateError) throw updateError;
      setSuccess(true);
      onUpdate();
    } catch (err: any) {
      setError(err.message || 'Structural modification failed.');
    } finally {
      setLoading(false);
    }
  };

  const removeSignature = () => {
    setSelectedSignatureFile(null);
    setSignaturePreview(null);
    setSuccess(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-8">
        <div>
          <h2 className="text-4xl font-black text-blueprint-blue tracking-tighter uppercase italic leading-none">System Profile</h2>
          <p className="text-[10px] text-pencil-gray font-technical font-bold uppercase tracking-[0.4em] mt-3">Identity Management & Configuration</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 bg-blueprint-blue/5 text-blueprint-blue text-[10px] font-black rounded-full border border-blueprint-blue/10 uppercase tracking-widest">
            {profile.role} Terminal
          </span>
          <span className="px-4 py-1.5 bg-green-50 text-green-600 text-[10px] font-black rounded-full border border-green-100 uppercase tracking-widest">
            Authenticated
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-24 h-24 bg-blueprint-blue text-white rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-4xl font-black shadow-xl shadow-blue-900/20">
              {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{profile.full_name || 'System User'}</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{profile.email}</p>
            
            <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Network Node</span>
                <span className="text-slate-900">CIV-LOG-MAIN</span>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Security Level</span>
                <span className="text-blueprint-blue">{profile.role === 'faculty' ? 'ADMIN_LVL_2' : 'USER_LVL_1'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <PenTool size={14} /> System Registry
            </h4>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <Info size={12} className="text-blueprint-blue" /> User Note
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                Ensure all technical identification matches institutional records for automated document validation.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 px-8 py-5 flex items-center justify-between">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] font-technical">Modification Parameters</h4>
              <Building2 className="text-slate-300" size={18} />
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <User size={12} /> Full Legal Name
                  </label>
                  <input
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-display text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Fingerprint size={12} /> {profile.role === 'student' ? 'Register Number' : 'Employee ID'}
                  </label>
                  <input
                    name="identification_no"
                    required
                    value={formData.identification_no}
                    onChange={handleInputChange}
                    className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-mono text-sm"
                  />
                </div>

                {profile.role === 'student' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                        <GraduationCap size={12} /> Roll Number
                      </label>
                      <input
                        name="roll_no"
                        required
                        value={formData.roll_no}
                        onChange={handleInputChange}
                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Year</label>
                      <select
                        name="year"
                        value={formData.year}
                        onChange={handleInputChange}
                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-display text-sm appearance-none"
                      >
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                      <Briefcase size={12} /> Current Designation
                    </label>
                    <input
                      name="designation"
                      required
                      value={formData.designation}
                      onChange={handleInputChange}
                      className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-display text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Upload size={14} className="text-blueprint-blue" /> Structural Digital Signature
                  </label>
                  {signaturePreview && (
                    <button 
                      type="button" 
                      onClick={removeSignature}
                      className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                  <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
                    <Info size={16} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Aesthetic Guideline</p>
                    <p className="text-[10px] text-amber-600 leading-tight">
                      For a professional appearance on generated documents, please <b>remove the background</b> of your signature image before uploading. Use a high-contrast ink (Blue/Black) on a white surface.
                    </p>
                  </div>
                </div>

                <div className="relative group">
                  {signaturePreview ? (
                    <div className="w-full h-40 bg-white border-2 border-slate-100 rounded-[2rem] flex items-center justify-center p-6 shadow-inner">
                      <img src={signaturePreview} alt="Signature Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <label className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-blueprint-blue hover:bg-blueprint-blue/5 transition-all group">
                      <div className="bg-white p-4 rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <FileImage size={24} className="text-slate-400 group-hover:text-blueprint-blue" />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blueprint-blue">Upload Signature File</span>
                      <span className="text-[9px] text-slate-400 mt-1 uppercase">PNG, JPG or PDF • MAX 2MB</span>
                      <input 
                        type="file" 
                        className="sr-only" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                    </label>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 italic">Signature will be used for official automated submittal generation.</p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 text-xs font-bold uppercase tracking-tight">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 text-green-600 p-4 rounded-xl border border-green-100 flex items-center gap-3 text-xs font-bold uppercase tracking-tight animate-in fade-in">
                  <CheckCircle2 size={16} /> Identity Metadata Updated Successfully
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blueprint-blue text-white px-8 py-4 rounded-xl font-black flex items-center gap-3 hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <Save size={16} /> Save System Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
