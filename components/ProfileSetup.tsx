
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { Loader2, User, Fingerprint, Briefcase, GraduationCap, Building2, Upload } from 'lucide-react';

import { DEPARTMENTS, BASE_URL } from '../constants';

interface ProfileSetupProps {
  profile: Profile;
  onComplete: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ profile, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const initialYear = profile?.year || '1';
  const getInitialSemester = (year: string) => {
    const y = parseInt(year);
    return (2 * y - 1).toString();
  };

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    identification_no: profile?.identification_no || '',
    roll_no: profile?.roll_no || '',
    phone_number: profile?.phone_number || '',
    year: initialYear,
    semester: profile?.semester || getInitialSemester(initialYear),
    designation: profile?.designation || '',
    department: profile?.department || 'Computer Science and Engineering',
    is_hod: profile?.is_hod || false
  });

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
      // Sync semester with year
      if (name === 'year') {
        const year = parseInt(value);
        next.semester = (2 * year - 1).toString();
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 0. Check Registration Lock (Students Only)
      if (profile.role === 'student') {
        const { data: lockData } = await supabase
          .from('registration_locks')
          .select('locked')
          .eq('department', formData.department)
          .single();

        if (lockData?.locked) {
          setError('Registration for this department is currently locked by the admin. Please contact your department admin.');
          setLoading(false);
          return;
        }
      }

      // 1. Update Auth Metadata (for session persistence)
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...formData, is_profile_complete: true }
      });

      if (updateError) {
        console.error("Auth Metadata Update Error:", updateError);
        throw new Error(`Auth Error: ${updateError.message}`);
      }

      // 2. Update/Upsert the profiles table (source of truth)
      // Note: We use 'profiles' table, NOT 'users' table.
      const { error: dbError } = await supabase.from('profiles').upsert({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        ...formData,
        is_profile_complete: true
      }, { onConflict: 'id' });

      if (dbError) {
        console.error("Database Profile Update Error:", dbError);
        if (dbError.message.includes('permission denied')) {
          throw new Error("System Permission Denied: Please ensure the 'profiles' table RLS policies are applied in Supabase.");
        }
        throw dbError;
      }

      // 3. Lazy Notification Drain
      if (profile.role === 'coordinator' || profile.role === 'hod') {
        const targetStatus = profile.role === 'coordinator' ? 'Pending Coordinator' : 'Pending HOD';
        const { data: pendingRequests } = await supabase
          .from('od_requests')
          .select('*')
          .eq('department', formData.department)
          .eq('status', targetStatus);

        if (pendingRequests && pendingRequests.length > 0) {
          const dashboardLink = BASE_URL;
          
          // In-app notification
          await supabase.from('notifications').insert({
            user_id: profile.id,
            message: `Welcome! You have ${pendingRequests.length} pending OD requests in your department to review.`,
            type: 'info',
            read: false
          });

          // Email notification
          const emailMessage = `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #003366;">Welcome to ESEC OD Portal</h2>
              <p>Hello <strong>${formData.full_name}</strong>,</p>
              <p>Your profile setup is complete. You have <strong>${pendingRequests.length}</strong> pending OD requests in the <strong>${formData.department}</strong> department waiting for your review.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <a href="${dashboardLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; background-color: #003366; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Dashboard</a>
            </div>
          `;

          try {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: profile.email,
                subject: `Pending OD Requests: ${pendingRequests.length} items to review`,
                message: emailMessage
              })
            });
          } catch (e) {
            console.error("Lazy notification email failed:", e);
          }
        }
      }

      onComplete();
    } catch (err: any) {
      console.error("Profile Setup Exception:", err);
      setError(err.message || 'Setup failed. Check your connection or system permissions.');
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
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      name="roll_no"
                      required
                      value={formData.roll_no}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-sm outline-none"
                      placeholder="Roll No"
                    />
                    <input
                      name="phone_number"
                      required
                      type="tel"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
                      placeholder="Phone Number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
                    >
                      {[2 * parseInt(formData.year) - 1, 2 * parseInt(formData.year)].map(sem => (
                        <option key={sem} value={sem.toString()}>{sem}{sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th'} Sem</option>
                      ))}
                    </select>
                  </div>
                </>
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
