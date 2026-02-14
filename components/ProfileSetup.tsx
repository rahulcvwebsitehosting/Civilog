
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { Loader2, User, Fingerprint, Briefcase, GraduationCap, Building2 } from 'lucide-react';

interface ProfileSetupProps {
  profile: Profile;
  onComplete: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ profile, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    identification_no: profile.identification_no || '',
    roll_no: profile.roll_no || '',
    year: profile.year || '1',
    designation: profile.designation || '',
    department: 'Civil Engineering'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...formData,
          is_profile_complete: true
        }
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blueprint-blue/5 rounded-3xl text-blueprint-blue mb-4 ring-1 ring-blueprint-blue/10">
              <span className="material-symbols-outlined text-4xl">person_edit</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Complete Your Profile</h2>
            <p className="text-[10px] text-pencil-gray font-technical font-bold uppercase tracking-[0.3em] mt-2">Personal Identification Phase</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name (Legal)</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blueprint-blue transition-colors" size={18} />
                  <input
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-display text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                    {profile.role === 'student' ? 'Register Number' : 'Employee ID'}
                  </label>
                  <div className="relative">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blueprint-blue transition-colors" size={18} />
                    <input
                      name="identification_no"
                      required
                      value={formData.identification_no}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-mono text-sm"
                      placeholder={profile.role === 'student' ? "Ex: 24037..." : "Ex: FAC901..."}
                    />
                  </div>
                </div>

                {profile.role === 'student' ? (
                  <div className="relative group">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Roll Number</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blueprint-blue transition-colors" size={18} />
                      <input
                        name="roll_no"
                        required
                        value={formData.roll_no}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-mono text-sm"
                        placeholder="Ex: 22CE01"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Designation</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blueprint-blue transition-colors" size={18} />
                      <input
                        name="designation"
                        required
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-display text-sm"
                        placeholder="Ex: Assistant Professor"
                      />
                    </div>
                  </div>
                )}
              </div>

              {profile.role === 'student' && (
                <div className="relative group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Academic Year</label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full pl-4 pr-10 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-display text-sm appearance-none"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              )}

              <div className="relative group">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Department</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    name="department"
                    readOnly
                    value={formData.department}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed font-display text-sm"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blueprint-blue text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-900 transition-all shadow-xl shadow-blue-900/10 disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Finalize Account
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-center text-[9px] font-technical font-black text-pencil-gray uppercase tracking-[0.4em] opacity-40">
        Structural Integrity Verified System • v2.5.1
      </p>
    </div>
  );
};

export default ProfileSetup;
