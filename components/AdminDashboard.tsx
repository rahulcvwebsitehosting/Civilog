
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, ODRequest } from '../types';
import { generateODLetter } from '../services/pdfService';
import { 
  Shield, Users, History, Search, Filter, 
  ChevronRight, Calendar, Clock, User, 
  CheckCircle2, XCircle, Trash2, Info,
  GraduationCap, Briefcase, Building2,
  ArrowUpDown, Download, LayoutDashboard,
  ArrowUp, ArrowDown, RefreshCw, Mail,
  AlertCircle, Check, X, Loader2, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FeedCard from './FeedCard';
import { useToast } from '../contexts/ToastContext';
import { DEPARTMENTS } from '../constants';

const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'feed' | 'system' | 'mail'>('feed');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmRejectRequest, setConfirmRejectRequest] = useState<ODRequest | null>(null);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Mail Center State
  const [mailRecipient, setMailRecipient] = useState<string>('');
  const [mailSubject, setMailSubject] = useState<string>('');
  const [mailMessage, setMailMessage] = useState<string>('');
  const [mailDept, setMailDept] = useState<string>('none');
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailProgress, setMailProgress] = useState<string | null>(null);
  
  // SMTP Test State
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    fetchData();
    if (activeTab === 'system') {
      checkSystemStatus();
    }
  }, [activeTab, sortOrder]);

  const checkSystemStatus = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setSystemStatus(data);
    } catch (err) {
      console.error("Health Check Error:", err);
    }
  };

  const handleVerifySMTP = async () => {
    setVerifyLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/verify-smtp');
      const contentType = res.headers.get("content-type");
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded with ${res.status}: ${text.substring(0, 100)}...`);
      }

      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (data.success) {
          setTestResult({ success: true, message: "SMTP Connection Verified! Transporter is ready." });
        } else {
          setTestResult({ success: false, message: `Verification Failed: ${data.error}` });
        }
      } else {
        const text = await res.text();
        throw new Error(`Expected JSON but received ${contentType}. Response: ${text.substring(0, 100)}...`);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Error: ${err.message}` });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/test-email?to=${encodeURIComponent(testEmail)}`);
      const contentType = res.headers.get("content-type");

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded with ${res.status}: ${text.substring(0, 100)}...`);
      }

      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (data.success) {
          setTestResult({ success: true, message: "Test email sent successfully! Check your inbox." });
        } else {
          setTestResult({ success: false, message: `Failed: ${data.error}` });
        }
      } else {
        const text = await res.text();
        throw new Error(`Expected JSON but received ${contentType}. Response: ${text.substring(0, 100)}...`);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Error: ${err.message}` });
    } finally {
      setTestLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch admin profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminProfile({
          id: user.id,
          email: user.email || '',
          role: user.user_metadata?.role || 'admin',
          full_name: user.user_metadata?.full_name || 'Admin',
        });
      }

      if (activeTab === 'users' || activeTab === 'mail') {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, department')
          .order('full_name');
        setProfiles(data || []);
      } else if (activeTab === 'requests' || activeTab === 'feed') {
        const { data } = await supabase
          .from('od_requests')
          .select('*')
          .order('created_at', { ascending: sortOrder === 'asc' });
        setRequests(data || []);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const deptCounts = requests.reduce((acc: Record<string, number>, r) => {
    if (r.department) {
      acc[r.department] = (acc[r.department] || 0) + 1;
    }
    return acc;
  }, {});

  const availableDepts = Object.keys(deptCounts).sort();

  const filteredRequests = requests.filter(r => {
    const matchesDept = deptFilter === 'all' || r.department === deptFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = (r.student_name || '').toLowerCase().includes(query) || 
                         (r.event_title || '').toLowerCase().includes(query) ||
                         (r.register_no || '').toLowerCase().includes(query) ||
                         (r.roll_no || '').toLowerCase().includes(query) ||
                         (r.team_members && r.team_members.some(m => 
                           (m.roll_no || '').toLowerCase().includes(query) || 
                           (m.register_no || '').toLowerCase().includes(query)
                         ));
    return matchesDept && matchesSearch;
  });

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = (p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.identification_no?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailSubject || !mailMessage) return;
    
    let recipients: string[] = [];
    if (mailDept !== 'none') {
      recipients = profiles
        .filter(p => p.department === mailDept)
        .map(p => p.email);
    } else if (mailRecipient) {
      recipients = [mailRecipient];
    }

    if (recipients.length === 0) {
      showToast("No recipients found", "error");
      return;
    }

    setIsSendingMail(true);
    let successCount = 0;
    
    try {
      for (let i = 0; i < recipients.length; i++) {
        const to = recipients[i];
        if (recipients.length > 1) {
          setMailProgress(`Sending ${i + 1}/${recipients.length}...`);
        }

        const htmlBody = `
          <div style="font-family: sans-serif; padding: 20px; color: #334155; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: white;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #0369a1; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">ESEC OD Portal</h1>
              <p style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">Official Communication</p>
            </div>
            <div style="margin-bottom: 30px;">
              ${mailMessage.replace(/\n/g, '<br/>')}
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <div style="text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0;">Erode Sengunthar Engineering College</p>
              <p style="font-size: 10px; color: #94a3b8; margin-top: 5px;">Student On-Duty Management System</p>
            </div>
          </div>
        `;

        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject: mailSubject, message: htmlBody })
        });
        
        if (res.ok) successCount++;
      }
      
      if (successCount === recipients.length) {
        showToast(`Successfully sent to ${successCount} recipient(s)`, "success");
        setMailRecipient('');
        setMailSubject('');
        setMailMessage('');
        setMailDept('none');
      } else {
        showToast(`Sent to ${successCount}/${recipients.length} recipients. Some failed.`, "info");
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, "error");
    } finally {
      setIsSendingMail(false);
      setMailProgress(null);
    }
  };

  const getActionIcon = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('INSERT')) return <Info className="text-blue-500" size={16} />;
    if (act.includes('UPDATE')) {
      if (act.includes('OD_REQUESTS')) return <CheckCircle2 className="text-amber-500" size={16} />;
      return <History className="text-blue-400" size={16} />;
    }
    if (act.includes('DELETE')) return <Trash2 className="text-red-500" size={16} />;
    
    switch (act) {
      case 'ADVISOR_APPROVE': return <CheckCircle2 className="text-amber-500" size={16} />;
      case 'HOD_APPROVE': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'REJECT_OD': return <XCircle className="text-red-500" size={16} />;
      default: return <History className="text-slate-400" size={16} />;
    }
  };

  const handleApproval = async (request: ODRequest, approve: boolean, confirmed: boolean = false) => {
    if (!approve && !confirmed) {
      setConfirmRejectRequest(request);
      return;
    }

    setProcessingId(request.id);
    setConfirmRejectRequest(null);
    try {
      if (approve) {
        // Fetch student profile
        const { data: studentProfileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', request.user_id)
          .single();

        const studentProfile: Profile = studentProfileData || {
          id: request.user_id,
          email: '',
          role: 'student',
          full_name: request.student_name,
        };

        const pdfBlob = await generateODLetter(request, studentProfile, adminProfile || undefined);
        const fileName = `OD_Letter_${request.register_no}_${Date.now()}.pdf`;
        
        const { error: uploadError } = await supabase.storage
          .from('od-files')
          .upload(`od_letters/${fileName}`, pdfBlob);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('od-files')
          .getPublicUrl(`od_letters/${fileName}`);

        const { error: dbError } = await supabase
          .from('od_requests')
          .update({ 
            status: 'Approved', 
            od_letter_url: publicUrl, 
            notification_sent: true,
            hod_id: adminProfile?.id,
            hod_approved_at: new Date().toISOString()
          })
          .eq('id', request.id);
          
        if (dbError) throw dbError;

        // Notify Student
        await supabase.from('notifications').insert({
          user_id: request.user_id,
          message: `Your OD request for ${request.event_title} has been approved by Admin.`,
          type: 'success',
          read: false
        });
      } else {
        const { error: dbError } = await supabase
          .from('od_requests')
          .update({ status: 'Rejected' })
          .eq('id', request.id);
          
        if (dbError) throw dbError;

        // Notify Student
        await supabase.from('notifications').insert({
          user_id: request.user_id,
          message: `Your OD request for ${request.event_title} has been rejected by Admin.`,
          type: 'error',
          read: false
        });
      }
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: approve ? 'Approved' : 'Rejected' } : r));
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error processing request', "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 font-display relative">
      {/* Rejection Confirmation Modal */}
      <AnimatePresence>
        {confirmRejectRequest && (
          <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                  <XCircle size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Confirm Rejection</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Are you sure you want to <span className="font-bold text-red-600">REJECT</span> the OD request for <span className="font-bold text-slate-900">{confirmRejectRequest.student_name}</span>? 
                    This action cannot be undone and the student will be notified.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                  <button 
                    onClick={() => setConfirmRejectRequest(null)}
                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleApproval(confirmRejectRequest, false, true)}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                  >
                    <X size={14} /> Confirm Deny
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
              <Shield className="text-blueprint-blue" size={36} /> Central Command
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">System Audit & Registry • Read-Only Access</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl border shadow-sm overflow-x-auto">
            <button 
              onClick={() => setActiveTab('feed')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'feed' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutDashboard size={14} className="inline mr-2" /> Global Feed
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users size={14} className="inline mr-2" /> Registry
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'requests' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Search size={14} className="inline mr-2" /> All Requests
            </button>
            <button 
              onClick={() => setActiveTab('mail')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'mail' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Mail size={14} className="inline mr-2" /> Mail Center
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'system' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Shield size={14} className="inline mr-2" /> System
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {(activeTab === 'users' || activeTab === 'feed' || activeTab === 'requests') && (
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder={activeTab === 'users' ? "Search by Name, Email, or Reg No..." : "Search by Student or Event..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border rounded-2xl outline-none focus:border-blueprint-blue shadow-sm text-sm"
              />
            </div>
          )}
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {activeTab === 'users' ? (
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-5 py-4 bg-white border rounded-2xl outline-none shadow-sm text-sm font-bold uppercase tracking-tight min-w-[140px]"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="advisor">Advisors</option>
                <option value="hod">HODs</option>
                <option value="admin">Admins</option>
              </select>
            ) : (activeTab === 'feed' || activeTab === 'requests') ? (
              <select 
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-5 py-4 bg-white border rounded-2xl outline-none shadow-sm text-sm font-bold uppercase tracking-tight min-w-[140px]"
              >
                <option value="all">All Departments ({requests.length})</option>
                {availableDepts.map(d => (
                  <option key={d} value={d}>{d} ({deptCounts[d]})</option>
                ))}
              </select>
            ) : null}

            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-5 py-4 bg-white border rounded-2xl outline-none shadow-sm text-sm font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-slate-50 transition-all"
            >
              {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              {sortOrder === 'asc' ? 'Oldest' : 'Newest'}
            </button>

            <button 
              onClick={fetchData}
              className="p-4 bg-white border rounded-2xl outline-none shadow-sm hover:bg-slate-50 transition-all"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-[2.5rem] border shadow-2xl overflow-hidden min-h-[600px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <div className="w-12 h-12 border-4 border-blueprint-blue border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Secure Logs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'feed' && (
                <div className="p-8 space-y-8 bg-slate-50/30">
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-20">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No Activity Found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-8">
                      {filteredRequests.map((r) => (
                        <FeedCard 
                          key={r.id} 
                          request={r} 
                          isAdminView={true}
                          isFaculty={true}
                          isProcessing={processingId === r.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'users' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identity</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role & Status</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Department</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Registration Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProfiles.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blueprint-blue/10 flex items-center justify-center text-blueprint-blue">
                              <User size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{p.full_name || 'Incomplete Profile'}</p>
                              <p className="text-xs text-slate-500">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            p.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' :
                            p.role === 'hod' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            p.role === 'advisor' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                            {p.role}
                          </span>
                          <div className="mt-2 flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${p.is_profile_complete ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{p.is_profile_complete ? 'Verified' : 'Pending Setup'}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{p.department || 'Not Assigned'}</p>
                          {p.designation && <p className="text-[10px] text-slate-400 mt-1 italic">{p.designation}</p>}
                        </td>
                        <td className="p-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">ID: <span className="font-mono text-blueprint-blue">{p.identification_no || 'N/A'}</span></p>
                            {p.role === 'student' && (
                              <>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Roll: <span className="font-mono text-blueprint-blue">{p.roll_no || 'N/A'}</span></p>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Year: <span className="font-mono text-blueprint-blue">{p.year || 'N/A'}</span></p>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'requests' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Event Details</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Status</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timeline</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                          <p className="font-bold text-slate-900 text-sm">{r.student_name}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">{r.register_no}</p>
                          <p className="text-[9px] text-slate-400 mt-1">{r.department}</p>
                        </td>
                        <td className="p-6">
                          <p className="font-bold text-slate-700 text-xs">{r.event_title}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{r.organization_name}</p>
                          <div className="mt-2 flex gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black uppercase text-slate-500">{r.event_type}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            r.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' :
                            r.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Created: {new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            {r.advisor_approved_at && (
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Advisor: {new Date(r.advisor_approved_at).toLocaleDateString()}</span>
                              </div>
                            )}
                            {r.hod_approved_at && (
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">HOD: {new Date(r.hod_approved_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                            {r.status === 'Approved' || r.status === 'Rejected' ? 'Processed' : 'Audit Only'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'mail' && (
                <div className="p-8 max-w-3xl mx-auto">
                  <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                      <Mail className="text-blueprint-blue" size={24} /> Mail Center
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Broadcast official communications to users</p>
                  </div>

                  <form onSubmit={handleSendMail} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Recipient</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            list="user-list"
                            placeholder="Select user or type email..."
                            value={mailRecipient}
                            onChange={(e) => setMailRecipient(e.target.value)}
                            disabled={mailDept !== 'none'}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blueprint-blue text-sm disabled:opacity-50"
                          />
                          <datalist id="user-list">
                            {profiles.map(p => (
                              <option key={p.id} value={p.email}>{p.full_name} ({p.role}) - {p.department}</option>
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Send to Department</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <select 
                            value={mailDept}
                            onChange={(e) => {
                              setMailDept(e.target.value);
                              if (e.target.value !== 'none') setMailRecipient('');
                            }}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blueprint-blue text-sm appearance-none"
                          >
                            <option value="none">None (Individual)</option>
                            {DEPARTMENTS.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Subject</label>
                      <input 
                        type="text"
                        placeholder="Official Communication: [Subject]"
                        value={mailSubject}
                        onChange={(e) => setMailSubject(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blueprint-blue text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Message Body</label>
                      <textarea 
                        placeholder="Type your message here..."
                        value={mailMessage}
                        onChange={(e) => setMailMessage(e.target.value)}
                        required
                        rows={8}
                        className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:border-blueprint-blue text-sm resize-none"
                      />
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit"
                        disabled={isSendingMail || (!mailRecipient && mailDept === 'none')}
                        className="w-full py-4 bg-blueprint-blue text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {isSendingMail ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            {mailProgress || 'Sending...'}
                          </>
                        ) : (
                          <>
                            <Send size={18} />
                            Send Communication
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {activeTab === 'system' && (
                <div className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* SMTP Status */}
                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Mail size={18} className="text-blueprint-blue" /> SMTP Configuration
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-white rounded-2xl border">
                          <span className="text-[10px] font-black text-slate-400 uppercase">EMAIL_USER</span>
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${systemStatus?.smtp?.user === 'Configured' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {systemStatus?.smtp?.user || 'Checking...'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-white rounded-2xl border">
                          <span className="text-[10px] font-black text-slate-400 uppercase">EMAIL_PASS</span>
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${systemStatus?.smtp?.pass === 'Configured' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {systemStatus?.smtp?.pass || 'Checking...'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-white rounded-2xl border">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Verification</span>
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${systemStatus?.smtp?.verified ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {systemStatus?.smtp?.verified ? 'Verified' : 'Failed'}
                          </span>
                        </div>
                        {systemStatus?.smtp?.error && (
                          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                            <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Error Details</p>
                            <p className="text-[10px] text-red-500 font-mono break-all">{systemStatus.smtp.error}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-8 space-y-4">
                        <button 
                          onClick={handleVerifySMTP}
                          disabled={verifyLoading}
                          className="w-full py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {verifyLoading ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                          {verifyLoading ? 'Verifying...' : 'Verify SMTP Connection'}
                        </button>

                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/debug-server');
                              const data = await res.json();
                              setTestResult({ success: true, message: `Debug: ${JSON.stringify(data)}` });
                            } catch (err: any) {
                              setTestResult({ success: false, message: `Debug Error: ${err.message}` });
                            }
                          }}
                          className="w-full py-3 bg-slate-100 border-2 border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                          <Shield size={14} />
                          Debug Server
                        </button>

                        <p className="text-[10px] text-slate-500 italic">
                          * Ensure you use a Gmail App Password if 2FA is enabled.
                        </p>
                        <form onSubmit={handleTestEmail} className="space-y-4">
                          <input 
                            type="email"
                            placeholder="Recipient Email Address"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-white border rounded-xl outline-none focus:border-blueprint-blue text-sm"
                            required
                          />
                          <button 
                            type="submit"
                            disabled={testLoading}
                            className="w-full py-3 bg-blueprint-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                          >
                            {testLoading ? 'Sending...' : 'Send Test Email'}
                          </button>
                        </form>
                        
                        {testResult && (
                          <div className={`mt-4 p-4 rounded-xl text-[10px] font-bold ${testResult.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {testResult.message}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* System Info */}
                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Info size={18} className="text-blueprint-blue" /> System Diagnostics
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-white rounded-2xl border">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">API Endpoint</p>
                          <p className="text-xs font-mono text-slate-700">/api/send-email</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Server Status</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              <span className="text-xs font-bold text-slate-700 uppercase">Operational</span>
                            </div>
                            <button 
                              onClick={checkSystemStatus}
                              className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                              title="Refresh Status"
                            >
                              <RefreshCw size={14} className="text-slate-400" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Environment</p>
                          <p className="text-xs font-bold text-slate-700 uppercase">{import.meta.env.MODE || 'development'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-2 py-8 border-t">
          <Shield size={16} className="text-slate-300" />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">End-to-End Audit Encryption Active</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
