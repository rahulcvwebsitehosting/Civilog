import React, { useEffect, useState, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LogOut, Search as SearchIcon, LayoutDashboard, Settings, User, Home, Terminal, Database, LogIn } from 'lucide-react';
import { supabase, configError } from './supabaseClient';
import Auth from './components/Auth';
import StudentDashboard from './components/StudentDashboard';
import FacultyAdmin from './components/FacultyAdmin';
import DebugProfiles from './components/DebugProfiles';
import FacultyRegistry from './components/FacultyRegistry';
import TrackingView from './components/TrackingView';
import ProfileSetup from './components/ProfileSetup';
import ProfilePage from './components/ProfilePage';
import CTOProfile from './components/CTOProfile';
import AdminDashboard from './components/AdminDashboard';
import NotificationCenter from './components/NotificationCenter';
import ErrorBoundary from './components/ErrorBoundary';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfUse from './components/TermsOfUse';
import { ToastProvider } from './contexts/ToastContext';
import { Profile } from './types';

const NavLink: React.FC<{ to: string; children: React.ReactNode; icon: React.ReactNode }> = ({ to, children, icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-blueprint-blue text-white shadow-lg shadow-amber-500/20 scale-105' 
          : 'text-pencil-gray hover:bg-amber-50 hover:text-blueprint-blue'
      }`}
    >
      {icon}
      <span className="font-bold text-xs uppercase tracking-wider">{children}</span>
    </Link>
  );
};

const MobileNav: React.FC<{ profile: Profile | null }> = ({ profile }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3 flex justify-around items-center z-[50] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {profile && profile.is_profile_complete ? (
        <>
          <Link to={
            profile.role === 'admin' ? '/admin-panel' :
            profile.role === 'hod' ? '/hod-dashboard' :
            profile.role === 'advisor' ? '/advisor-dashboard' :
            '/student-dashboard'
          } className={`flex flex-col items-center gap-1 ${isActive('/student-dashboard') || isActive('/advisor-dashboard') || isActive('/hod-dashboard') || isActive('/admin-panel') ? 'text-blueprint-blue' : 'text-slate-400'}`}>
            <Home size={22} className={isActive('/student-dashboard') || isActive('/advisor-dashboard') || isActive('/hod-dashboard') || isActive('/admin-panel') ? 'fill-blueprint-blue/10' : ''} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Terminal</span>
          </Link>
          {(profile.role === 'advisor' || profile.role === 'hod' || profile.role === 'admin') && (
            <Link to="/faculty/registry" className={`flex flex-col items-center gap-1 ${isActive('/faculty/registry') ? 'text-blueprint-blue' : 'text-slate-400'}`}>
              <Database size={22} className={isActive('/faculty/registry') ? 'fill-blueprint-blue/10' : ''} />
              <span className="text-[8px] font-black uppercase tracking-tighter">Registry</span>
            </Link>
          )}
          <Link to="/track" className={`flex flex-col items-center gap-1 ${isActive('/track') ? 'text-blueprint-blue' : 'text-slate-400'}`}>
            <SearchIcon size={22} className={isActive('/track') ? 'fill-blueprint-blue/10' : ''} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Track</span>
          </Link>
          <Link to="/profile" className={`flex flex-col items-center gap-1 ${isActive('/profile') ? 'text-blueprint-blue' : 'text-slate-400'}`}>
            <User size={22} className={isActive('/profile') ? 'fill-blueprint-blue/10' : ''} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Profile</span>
          </Link>
        </>
      ) : (
        <>
          <Link to="/login" className={`flex flex-col items-center gap-1 ${isActive('/login') ? 'text-blueprint-blue' : 'text-slate-400'}`}>
            <User size={22} className={isActive('/login') ? 'fill-blueprint-blue/10' : ''} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Login</span>
          </Link>
          <Link to="/track" className={`flex flex-col items-center gap-1 ${isActive('/track') ? 'text-blueprint-blue' : 'text-slate-400'}`}>
            <SearchIcon size={22} className={isActive('/track') ? 'fill-blueprint-blue/10' : ''} />
            <span className="text-[8px] font-black uppercase tracking-tighter">Track</span>
          </Link>
        </>
      )}
    </nav>
  );
};

const Header: React.FC<{ profile: Profile | null; onLogout: () => void }> = ({ profile, onLogout }) => (
  <header className="bg-concrete-gray/80 backdrop-blur-md border-b border-blueprint-blue/20 sticky top-0 z-[60] py-3">
    <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="bg-white p-1 rounded-2xl shadow-xl shadow-amber-500/10 group-hover:scale-110 transition-transform overflow-hidden flex items-center justify-center w-12 h-12 border border-slate-100">
            <img 
              src="https://erode-sengunthar.ac.in/wp-content/uploads/2023/02/ESEC_Logo.png" 
              alt="ESEC Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-blue-600 uppercase italic leading-none">ERODE SENGUNTHAR ENGINEERING COLLEGE OD</h1>
            <p className="text-[8px] uppercase tracking-[0.2em] text-pencil-gray font-technical font-bold mt-1">Student OD Management System</p>
          </div>
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        {profile && <NotificationCenter userId={profile.id} />}
        <nav className="hidden lg:flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-white">
          <NavLink to="/track" icon={<SearchIcon size={18} />}>Track</NavLink>
          {profile && profile.is_profile_complete ? (
            <>
              {profile.role === 'student' ? (
                <NavLink to="/student-dashboard" icon={<LayoutDashboard size={18} />}>Feed</NavLink>
              ) : (
                <>
                  <NavLink to={
                    profile.role === 'admin' ? '/admin-panel' :
                    profile.role === 'hod' ? '/hod-dashboard' :
                    '/advisor-dashboard'
                  } icon={<Settings size={18} />}>Admin</NavLink>
                  <NavLink to="/faculty/registry" icon={<Database size={18} />}>Registry</NavLink>
                </>
              )}
              <NavLink to="/profile" icon={<User size={18} />}>Profile</NavLink>
            </>
          ) : (
            <NavLink to="/login" icon={<LogIn size={18} />}>Login</NavLink>
          )}
        </nav>

        {profile && (
          <div className="flex items-center gap-3 pl-4 border-l border-blueprint-blue/10">
            <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-technical font-bold text-blueprint-blue uppercase">{profile.full_name || profile.email?.split('@')[0] || 'User'}</p>
                <p className="text-[9px] uppercase text-pencil-gray font-black tracking-widest opacity-60">{profile.role}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blueprint-blue text-white flex items-center justify-center text-sm font-black shadow-lg shadow-amber-500/10 border-2 border-white">
                {profile.full_name?.charAt(0) || profile.email?.charAt(0).toUpperCase() || '?'}
              </div>
            </Link>
            <button 
              onClick={onLogout}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
              title="Terminate Session"
              type="button"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRetry, setShowRetry] = useState(false);
  const loadingRef = useRef(true);
  const currentUserIdRef = useRef<string | null>(null);
  const sessionRef = useRef<any>(null);

  // Sync ref with state
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setShowRetry(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [loading]);

  const updateProfileFromUser = useCallback((user: any, shouldSetLoading = true) => {
    if (!user) return;
    console.log("Updating profile from user metadata fallback");
    const metadataProfile: Profile = {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'student',
      full_name: user.user_metadata?.full_name || '',
      identification_no: user.user_metadata?.identification_no || '',
      roll_no: user.user_metadata?.roll_no || '',
      phone_number: user.user_metadata?.phone_number || '',
      year: user.user_metadata?.year || '',
      semester: user.user_metadata?.semester || '',
      designation: user.user_metadata?.designation || '',
      department: user.user_metadata?.department || '',
      is_profile_complete: !!user.user_metadata?.is_profile_complete
    };

    setProfile(prev => {
      // Only update if data actually changed to prevent re-render loops
      if (prev && JSON.stringify(prev) === JSON.stringify(metadataProfile)) return prev;
      return metadataProfile;
    });
    if (shouldSetLoading) setLoading(false);
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) updateProfileFromUser(user, true);
          return;
        }
        throw error;
      }
      
      if (data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error("[AUTH] Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [updateProfileFromUser]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        setSession(session);
        // Fix: Set currentUserIdRef.current immediately to prevent duplicate fetch in onAuthStateChange
        currentUserIdRef.current = session.user.id;
        // Load from metadata first but DON'T stop loading yet
        updateProfileFromUser(session.user, false);
        // Then fetch the source of truth from DB
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setLoading(false);
      } else if (session) {
        setSession(session);
        if (currentUserIdRef.current !== session.user.id) {
          currentUserIdRef.current = session.user.id;
          updateProfileFromUser(session.user, false);
          fetchProfile(session.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, updateProfileFromUser]);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  if (configError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-10 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl">
          <Database size={40} />
        </div>
        <h1 className="text-3xl font-black text-red-900 uppercase italic mb-4 tracking-tighter">Configuration Error</h1>
        <div className="max-w-md bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-red-100 space-y-4">
          <p className="text-red-700 font-bold text-sm leading-relaxed">
            {configError}
          </p>
          <div className="pt-4 border-t border-red-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">How to fix this:</p>
            <ol className="text-left text-[11px] text-slate-600 space-y-3 font-medium">
              <li className="flex gap-3"><span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center shrink-0 font-bold">1</span> Go to your Supabase Dashboard</li>
              <li className="flex gap-3"><span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center shrink-0 font-bold">2</span> Settings &gt; API</li>
              <li className="flex gap-3"><span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center shrink-0 font-bold">3</span> Copy the <strong className="text-red-600">anon public key</strong> (starts with 'eyJ')</li>
              <li className="flex gap-3"><span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center shrink-0 font-bold">4</span> Update VITE_SUPABASE_ANON_KEY in your environment settings</li>
            </ol>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-red-600 text-white font-black uppercase text-xs rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
          >
            I've updated the key, reload system
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-drafting-paper grid-bg">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blueprint-blue/10 border-t-blueprint-blue rounded-full animate-spin"></div>
          <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-blueprint-blue">school</span>
        </div>
        <p className="mt-6 text-[10px] font-technical font-bold text-blueprint-blue uppercase tracking-[0.4em] animate-pulse">Synchronizing ESEC OD Portal...</p>
        
        {showRetry && (
          <div className="mt-8 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="text-[9px] text-pencil-gray uppercase font-bold tracking-widest opacity-60">Connection taking longer than expected</p>
            <button 
              onClick={() => setLoading(false)}
              className="px-6 py-2 bg-blueprint-blue text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform"
            >
              Force Enter Portal
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="text-[9px] text-blueprint-blue uppercase font-black tracking-widest hover:underline"
            >
              Reload System
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ToastProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col font-display">
          <Header profile={profile} onLogout={handleLogout} />
          <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 pb-24 lg:pb-8">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={
              session ? (
                profile ? (
                  profile.is_profile_complete ? (
                    profile.role === 'admin' ? <Navigate to="/admin-panel" replace /> :
                    profile.role === 'hod' ? <Navigate to="/hod-dashboard" replace /> :
                    profile.role === 'advisor' ? <Navigate to="/advisor-dashboard" replace /> :
                    <Navigate to="/student-dashboard" replace />
                  ) : (
                    <Navigate to="/setup-profile" replace />
                  )
                ) : (
                  // This case should be rare now as we set profile from metadata
                  <div className="min-h-screen flex flex-col items-center justify-center bg-drafting-paper grid-bg">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blueprint-blue/10 border-t-blueprint-blue rounded-full animate-spin"></div>
                      <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-blueprint-blue">school</span>
                    </div>
                    <p className="mt-6 text-[10px] font-technical font-bold text-blueprint-blue uppercase tracking-[0.4em] animate-pulse">Finalizing Synchronization...</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-4 text-[9px] text-blueprint-blue uppercase font-black tracking-widest hover:underline"
                    >
                      Reload System
                    </button>
                  </div>
                )
              ) : (
                <Navigate to="/login" replace />
              )
            } />

            <Route path="/login" element={
              !session ? (
                <Auth />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            <Route path="/setup-profile" element={
              session ? (
                profile ? (
                  !profile.is_profile_complete ? (
                    <ProfileSetup profile={profile} onComplete={() => fetchProfile(session.user.id)} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                ) : (
                  <Navigate to="/" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            } />

            <Route path="/profile" element={
              session && profile?.is_profile_complete ? (
                <ProfilePage profile={profile} onUpdate={() => fetchProfile(session.user.id)} />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            <Route path="/profile/rahul-shyam" element={
              <CTOProfile />
            } />

            <Route path="/student-dashboard" element={
              session && profile?.role === 'student' && profile?.is_profile_complete ? (
                <StudentDashboard profile={profile} />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            <Route path="/advisor-dashboard" element={
              session && profile?.role === 'advisor' && profile?.is_profile_complete ? (
                <FacultyAdmin role="advisor" />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            {(import.meta.env.DEV) && (
              <Route path="/debug-profiles" element={
                session && profile?.role === 'admin' ? (
                  <DebugProfiles />
                ) : (
                  <Navigate to="/" replace />
                )
              } />
            )}

            <Route path="/hod-dashboard" element={
              session && profile?.role === 'hod' && profile?.is_profile_complete ? (
                <FacultyAdmin role="hod" />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            <Route path="/admin-panel" element={
              session && profile?.role === 'admin' && profile?.is_profile_complete ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            <Route path="/faculty/registry" element={
              session && (profile?.role === 'advisor' || profile?.role === 'hod' || profile?.role === 'admin') && profile?.is_profile_complete ? (
                <FacultyRegistry />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            <Route path="/faculty-admin" element={
              session && profile?.is_profile_complete ? (
                profile.role === 'admin' ? <Navigate to="/admin-panel" replace /> :
                profile.role === 'hod' ? <Navigate to="/hod-dashboard" replace /> :
                profile.role === 'advisor' ? <Navigate to="/advisor-dashboard" replace /> :
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } />

            <Route path="/track" element={
              <TrackingView profile={profile} />
            } />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <MobileNav profile={profile} />
      <footer className="hidden lg:block bg-white/50 backdrop-blur-sm border-t border-blueprint-blue/10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-40 grayscale">
            <span className="material-symbols-outlined">domain</span>
            <p className="text-[10px] font-technical font-bold uppercase tracking-widest">ESEC Departments • System v2.6.0</p>
          </div>
          <p className="text-[10px] font-technical font-bold text-pencil-gray uppercase tracking-widest opacity-40">
            © {new Date().getFullYear()} ERODE SENGUNTHAR ENGINEERING COLLEGE OD
          </p>
          <div className="flex items-center gap-3 text-[10px] font-technical font-bold text-pencil-gray uppercase tracking-widest opacity-40">
            <Link to="/privacy" className="hover:text-blueprint-blue hover:opacity-100 transition-all">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-blueprint-blue hover:opacity-100 transition-all">Terms of Use</Link>
          </div>
        </div>
      </footer>
    </div>
  </HashRouter>
</ToastProvider>
);
};

export default App;