
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Profile } from '../types';
import { Loader2, User, Fingerprint, Briefcase, GraduationCap, Building2, CheckCircle2, AlertCircle, Save, PenTool, Upload, FileImage, Trash2, Info, Lock, Clock, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEPARTMENTS } from '../constants';
import { useToast } from '../contexts/ToastContext';

interface ProfilePageProps {
  profile: Profile;
  onUpdate: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ profile, onUpdate }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [adminDeleteConfirm, setAdminDeleteConfirm] = useState('');
  const [isProfileLocked, setIsProfileLocked] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [pendingProfileRequest, setPendingProfileRequest] = useState<any>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    checkPendingDeletion();
    fetchLockStatus();
    fetchPendingProfileRequest();
  }, [profile.id, profile.department]);

  const fetchLockStatus = async () => {
    try {
      let isLocked = false;
      
      // Individual lock check (all roles)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_profile_locked')
        .eq('id', profile.id)
        .single();
      
      if (profileData?.is_profile_locked) isLocked = true;

      // Department lock check for students
      if (profile.role === 'student' && profile.department) {
        const { data: lockData } = await supabase
          .from('registration_locks')
          .select('profile_locked')
          .eq('department', profile.department)
          .single();
        if (lockData?.profile_locked) isLocked = true;
      }

      setIsProfileLocked(isLocked);
    } catch (err) {
      console.error("Error fetching lock status:", err);
    }
  };

  const fetchPendingProfileRequest = async () => {
    try {
      const { data } = await supabase
        .from('profile_update_requests')
        .select('*')
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .single();
      if (data) setPendingProfileRequest(data);
    } catch (err) {
      // Ignore
    }
  };

  const checkPendingDeletion = async () => {
    try {
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('id')
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .single();
      
      if (data) setHasPendingRequest(true);
    } catch (err) {
      // Ignore error if no request found
    }
  };
  
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
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProfileLocked && profile.role !== 'admin') {
      setShowRequestModal(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verify Session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session found. Please log in again.");
      }

      // 2. Update Auth Metadata (for session persistence)
      const { error: authError } = await supabase.auth.updateUser({
        data: { ...formData }
      });

      if (authError) {
        console.error("Auth Metadata Update Error:", authError);
        throw new Error(`Auth Error: ${authError.message}`);
      }

      // 3. Update/Upsert the profiles table (source of truth)
      // Note: We use 'profiles' table, NOT 'users' table.
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({ 
          id: profile.id,
          email: profile.email,
          role: profile.role,
          full_name: formData.full_name,
          identification_no: formData.identification_no,
          roll_no: formData.roll_no,
          phone_number: formData.phone_number,
          year: formData.year,
          semester: formData.semester,
          designation: formData.designation,
          department: formData.department,
          is_hod: formData.is_hod,
          is_profile_complete: true
        }, { onConflict: 'id' });

      if (dbError) {
        console.error("Database Profile Update Error:", dbError);
        if (dbError.message.includes('permission denied')) {
          throw new Error("System Permission Denied: The database rejected the update. Please run the SQL fix provided in the chat to reset permissions.");
        }
        throw dbError;
      }

      setSuccess(true);
      onUpdate();
    } catch (err: any) {
      console.error("Profile Update Exception:", err);
      setError(err.message || 'Update failed. Check your connection or system permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionReason.trim() && profile.role === 'student') return;
    
    setRequestingDeletion(true);
    try {
      if (profile.role === 'admin') {
        if (adminDeleteConfirm !== 'DELETE') {
          showToast("Please type DELETE to confirm.", "error");
          setRequestingDeletion(false);
          return;
        }

        const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
        if (error) throw error;
        await supabase.auth.signOut();
        showToast("Account deleted successfully.", "success");
        window.location.href = '/';
        return;
      }

      const { error } = await supabase.from('deletion_requests').insert({
        user_id: profile.id,
        user_email: profile.email,
        user_name: profile.full_name || 'User',
        reason: deletionReason || 'No reason provided',
        status: 'pending'
      });

      if (error) throw error;

      setHasPendingRequest(true);
      setDeletionReason('');
      setSuccess(true);
      setError(null);
      // We can reuse success state or add a specific one, user request says "show success message"
      showToast("Your deletion request has been submitted. The admin will review it shortly.", "success");
    } catch (err: any) {
      setError(err.message || "Failed to submit deletion request.");
    } finally {
      setRequestingDeletion(false);
    }
  };

  const handleProfileUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) return;

    setRequestLoading(true);
    try {
      const { error } = await supabase.from('profile_update_requests').insert({
        user_id: profile.id,
        current_data: {
          full_name: profile.full_name,
          identification_no: profile.identification_no,
          roll_no: profile.roll_no,
          phone_number: profile.phone_number,
          year: profile.year,
          semester: profile.semester,
          designation: profile.designation,
          department: profile.department,
          is_hod: profile.is_hod
        },
        requested_data: formData,
        reason: requestReason,
        department: profile.department,
        status: 'pending'
      });

      if (error) throw error;

      showToast("Profile updated successfully.", "success");
      setShowRequestModal(false);
      setRequestReason('');
      fetchPendingProfileRequest();
    } catch (err: any) {
      showToast(err.message || "Failed to submit request", "error");
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Profile Update Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Lock size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight text-amber-600">Profile Locked</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Direct profile editing is currently locked by the admin. To change your details, please submit a request with a reason for coordinator approval.
                  </p>
                </div>
                <form onSubmit={handleProfileUpdateRequest} className="w-full space-y-4 pt-4">
                  <textarea 
                    placeholder="Reason for profile update (e.g., Correction in Roll No)"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none text-sm focus:border-blueprint-blue resize-none"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowRequestModal(false)}
                      className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={requestLoading || !requestReason.trim()}
                      className="px-6 py-3 bg-blueprint-blue text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      {requestLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mb-10 flex flex-col md:flex-row justify-between items-end border-b pb-8">
        <div>
          <h2 className="text-4xl font-black text-blueprint-blue tracking-tighter uppercase italic">System Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 rounded-2xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-all shadow-sm flex items-center gap-2 border border-slate-200 dark:border-gray-700"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <div className="px-4 py-1.5 bg-blueprint-blue text-white text-[10px] font-black rounded-full uppercase tracking-widest">{profile.role} Terminal</div>
        </div>
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
                      {[2 * parseInt(formData.year) - 1, 2 * parseInt(formData.year)].map(sem => (
                        <option key={sem} value={sem.toString()}>{sem}{sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th'} Sem</option>
                      ))}
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
              
              {isProfileLocked && profile.role !== 'admin' && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 mb-4">
                  <Lock className="text-amber-600" size={18} />
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                    Profile editing is locked. Changes will require coordinator approval.
                  </p>
                </div>
              )}

              {pendingProfileRequest && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 mb-4">
                  <Clock className="text-blue-600" size={18} />
                  <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">
                    You have a pending profile update request.
                  </p>
                </div>
              )}

              <button type="submit" disabled={loading || (!!pendingProfileRequest && isProfileLocked)} className="bg-blueprint-blue text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:bg-goldenrod transition-all disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={18} /> : isProfileLocked && profile.role !== 'admin' ? 'Request Changes' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Danger Zone: Account Deletion */}
          {(profile.role === 'student' || profile.role === 'coordinator' || profile.role === 'hod' || profile.role === 'admin') && (
            <div className="mt-12 bg-red-50 rounded-[2rem] border border-red-100 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-900 uppercase tracking-tight">Danger Zone</h3>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                    {profile.role === 'admin' ? 'Delete Admin Account' : 'Request Account Deletion'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-red-700 leading-relaxed">
                  {profile.role === 'admin' 
                    ? 'Deleting your admin account is immediate and permanent. All your admin access will be revoked.' 
                    : 'Deleting your account is permanent. All your profile data will be removed. Your OD requests will be preserved for institutional audit records but will no longer be linked to your profile.'}
                </p>

                {hasPendingRequest && profile.role !== 'admin' ? (
                  <div className="p-4 bg-white border border-red-200 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="text-green-500" size={18} />
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      Your deletion request has been submitted and is pending admin review.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRequestDeletion} className="space-y-4">
                    {profile.role === 'admin' ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-red-600 uppercase tracking-widest block">Type DELETE to confirm</label>
                        <input
                          type="text"
                          value={adminDeleteConfirm}
                          onChange={(e) => setAdminDeleteConfirm(e.target.value)}
                          placeholder="DELETE"
                          required
                          className="w-full px-5 py-3.5 rounded-xl bg-white border border-red-100 outline-none text-sm focus:border-red-500"
                        />
                      </div>
                    ) : (
                      <textarea 
                        placeholder={profile.role === 'student' ? "Please provide a reason for account deletion..." : "Optional: provide a reason for account deletion"}
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value)}
                        required={profile.role === 'student'}
                        rows={3}
                        className="w-full px-5 py-3.5 rounded-xl bg-white border border-red-100 outline-none text-sm focus:border-red-500 resize-none"
                      />
                    )}
                    <button 
                      type="submit" 
                      disabled={requestingDeletion || (profile.role === 'student' && !deletionReason.trim()) || (profile.role === 'admin' && adminDeleteConfirm !== 'DELETE')}
                      className="bg-red-600 text-white px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      {requestingDeletion ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      {profile.role === 'admin' ? 'Delete Account Permanently' : 'Submit Deletion Request'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-[9px] text-slate-300 font-mono uppercase tracking-widest">
              Built by{' '}
              <a
                href="https://linkedin.com/in/rahulshyamcivil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blueprint-blue hover:underline font-black"
              >
                Rahul Shyam
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
