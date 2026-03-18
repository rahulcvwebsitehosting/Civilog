
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2, Mail, Lock, UserPlus, LogIn, GraduationCap, AlertCircle, CheckCircle2, Search, Eye, EyeOff } from 'lucide-react';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const ADVISOR_PASSWORD = import.meta.env.VITE_ADVISOR_PASSWORD || '';
  const HOD_PASSWORD = import.meta.env.VITE_HOD_PASSWORD || '';
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';

  const getRoleFromPassword = (pwd: string) => {
    if (pwd === ADMIN_PASSWORD) return 'admin';
    if (pwd === HOD_PASSWORD) return 'hod';
    if (pwd === ADVISOR_PASSWORD) return 'advisor';
    return 'student';
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const role = getRoleFromPassword(password);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: role }
          }
        });
        if (error) throw error;
        
        if (data.session) {
          setMessage('Account initialized! Accessing dashboard...');
        } else {
          setMessage('Account request received. Please check your inbox for confirmation.');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          // Check if profile already exists and is complete
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('is_profile_complete, role, full_name')
            .eq('id', data.user.id)
            .single();

          const role = existingProfile ? existingProfile.role : getRoleFromPassword(password);
          
          // Always ensure metadata is synced with the role
          // But only if it's different to avoid unnecessary updates
          if (data.user.user_metadata?.role !== role) {
            await supabase.auth.updateUser({
              data: { role: role }
            });
          }
          
          // Upsert the profile but preserve is_profile_complete if it's already true in DB
          const isComplete = existingProfile?.is_profile_complete || !!data.user.user_metadata?.is_profile_complete;
          
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({ 
              id: data.user.id, 
              email: data.user.email,
              role: role,
              full_name: existingProfile?.full_name || data.user.user_metadata?.full_name || '',
              is_profile_complete: isComplete
            }, { onConflict: 'id' });
            
          if (upsertError) {
            console.error("Profile upsert failed:", upsertError);
          }
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Email not confirmed')) {
        setError('Email confirmation is required. Please check your inbox.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-blueprint-blue opacity-10"></div>
        
        <div className="text-center mb-8">
          <div className="bg-blueprint-blue w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-amber-500/20">
            <LogIn size={32} />
          </div>
          <h2 className="text-2xl font-black text-blueprint-blue uppercase tracking-tight italic">
            {isSignUp ? 'Profile Creation' : 'Login'}
          </h2>
          <p className="text-pencil-gray text-[10px] font-technical font-bold uppercase tracking-widest mt-1">
            {isSignUp ? 'New Student Account' : 'Enter Credentials'}
          </p>
        </div>

        <div className="space-y-4">
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-pencil-gray uppercase tracking-widest mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-display text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-pencil-gray uppercase tracking-widest mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blueprint-blue/5 focus:border-blueprint-blue outline-none transition-all font-display text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blueprint-blue transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-amber-50 text-amber-700 p-3 rounded-xl border border-amber-200 flex items-start gap-2 text-[11px] font-medium leading-tight">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {message && (
              <div className="bg-amber-50 text-amber-600 p-3 rounded-xl border border-amber-200 flex items-start gap-2 text-[11px] font-medium leading-tight">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span className="flex-1">{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blueprint-blue text-white py-3.5 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-goldenrod transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50 uppercase tracking-widest text-xs"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (isSignUp ? 'Create Profile' : 'Login')}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-400">
              <span className="bg-white px-3">Authentication</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/track')}
            className="w-full bg-slate-50 text-slate-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-200 uppercase tracking-widest text-[10px]"
          >
            <Search size={16} />
            Track Submittal
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
            className="text-blueprint-blue font-black text-[10px] uppercase tracking-widest hover:underline"
          >
            {isSignUp ? 'Back to Login' : "No Account? Profile Creation"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
