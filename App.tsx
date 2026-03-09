import React, { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LogOut, Search as SearchIcon, LayoutDashboard, Settings, User, Home, Terminal, Database } from 'lucide-react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import StudentDashboard from './components/StudentDashboard';
import FacultyAdmin from './components/FacultyAdmin';
import FacultyRegistry from './components/FacultyRegistry';
import TrackingView from './components/TrackingView';
import ProfileSetup from './components/ProfileSetup';
import ProfilePage from './components/ProfilePage';
import CTOProfile from './components/CTOProfile';
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
  if (!profile || !profile.is_profile_complete) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3 flex justify-around items-center z-[50] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
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
    </nav>
  );
};

const Header: React.FC<{ profile: Profile | null; onLogout: () => void }> = ({ profile, onLogout }) => (
  <header className="bg-concrete-gray/80 backdrop-blur-md border-b border-blueprint-blue/20 sticky top-0 z-[60] py-3">
    <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="bg-blueprint-blue p-2.5 rounded-2xl text-white shadow-xl shadow-amber-500/20 group-hover:rotate-12 transition-transform">
            <span className="material-symbols-outlined text-2xl">school</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-blueprint-blue italic leading-none">ESEC OD</h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-pencil-gray font-technical font-bold mt-1">College OD Management System</p>
          </div>
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        <nav className="hidden lg:flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-white">
          <NavLink to="/track" icon={<SearchIcon size={18} />}>Track</NavLink>
          {profile && profile.is_profile_complete && (
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

  const updateProfileFromUser = (user: any) => {
    setProfile({
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'student',
      full_name: user.user_metadata?.full_name || '',
      identification_no: user.user_metadata?.identification_no || '',
      roll_no: user.user_metadata?.roll_no || '',
      year: user.user_metadata?.year || '',
      designation: user.user_metadata?.designation || '',
      department: user.user_metadata?.department || '',
      signature_url: user.user_metadata?.signature_url || null,
      is_profile_complete: !!user.user_metadata?.is_profile_complete
    });
    setLoading(false);
  };

  const fetchProfile = async (userId: string, skipLoading = false) => {
    // Only show full-screen loading if we don't have a profile yet
    if (!skipLoading && !profile) {
      setLoading(true);
    }
    try {
      console.log(`Fetching profile for user: ${userId}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log("Profile not found, using metadata fallback");
          // Profile doesn't exist yet, fallback to session user metadata if available
          if (session?.user) {
            updateProfileFromUser(session.user);
          } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              updateProfileFromUser(user);
            } else {
              setLoading(false);
            }
          }
          return;
        }
        throw error;
      }
      
      if (data) {
        setProfile(data as Profile);
        currentUserIdRef.current = userId;
      }
    } catch (err) {
      console.error("Profile synchronization error:", err);
      try {
        if (session?.user) {
          updateProfileFromUser(session.user);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            updateProfileFromUser(user);
          } else {
            setLoading(false);
          }
        }
      } catch (authErr) {
        console.error("Auth fallback failed:", authErr);
        setLoading(false);
      }
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  useEffect(() => {
    // Safety timeout: Ensure loading screen doesn't stay forever
    const safetyTimeout = setTimeout(() => {
      if (loadingRef.current) {
        console.warn("Auth initialization timed out, forcing loading to false");
        setLoading(false);
      }
    }, 10000); // 10 seconds safety margin

    // Initial session check
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          const errMsg = error.message.toLowerCase();
          if (errMsg.includes('refresh_token_not_found') || 
              errMsg.includes('invalid refresh token') || 
              errMsg.includes('refresh token not found') ||
              errMsg.includes('session_not_found')) {
            await supabase.auth.signOut();
            setSession(null);
            setProfile(null);
            currentUserIdRef.current = null;
          }
          setLoading(false);
          return;
        }

        if (session) {
          setSession(session);
          currentUserIdRef.current = session.user.id;
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Initial session check failed:", err);
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth Event: ${event}`);
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        currentUserIdRef.current = null;
        sessionRef.current = null;
        setLoading(false);
      } else if (session) {
        const isNewUser = currentUserIdRef.current !== session.user.id;
        const isNewSession = session.access_token !== sessionRef.current?.access_token;
        
        if (isNewSession) {
          setSession(session);
          sessionRef.current = session;
        }
        
        if (isNewUser) {
          currentUserIdRef.current = session.user.id;
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } else if (event === 'INITIAL_SESSION' && !session) {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

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
    <HashRouter>
      <div className="min-h-screen flex flex-col font-display">
        <Header profile={profile} onLogout={handleLogout} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 pb-24 lg:pb-8">
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
                  // Session exists but profile is null (e.g. fetch failed or in progress)
                  <div className="min-h-screen flex flex-col items-center justify-center bg-drafting-paper grid-bg">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blueprint-blue/10 border-t-blueprint-blue rounded-full animate-spin"></div>
                      <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-blueprint-blue">school</span>
                    </div>
                    <p className="mt-6 text-[10px] font-technical font-bold text-blueprint-blue uppercase tracking-[0.4em] animate-pulse">Synchronizing Profile...</p>
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
              <CTOProfile signature={profile?.signature_url} />
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

            <Route path="/hod-dashboard" element={
              session && profile?.role === 'hod' && profile?.is_profile_complete ? (
                <FacultyAdmin role="hod" />
              ) : (
                <Navigate to="/" replace />
              )
            } />

            <Route path="/admin-panel" element={
              session && profile?.role === 'admin' && profile?.is_profile_complete ? (
                <FacultyAdmin role="admin" />
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

            <Route path="/track" element={<TrackingView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <MobileNav profile={profile} />
        <footer className="hidden lg:block bg-white/50 backdrop-blur-sm border-t border-blueprint-blue/10 py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 opacity-40 grayscale">
              <span className="material-symbols-outlined">domain</span>
              <p className="text-[10px] font-technical font-bold uppercase tracking-widest">ESEC Departments • System v2.5.1</p>
            </div>
            <p className="text-[10px] font-technical font-bold text-pencil-gray uppercase tracking-widest opacity-40">
              © {new Date().getFullYear()} ESEC OD PORTAL
            </p>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
};

export default App;