
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, ODRequest } from '../types';
import { generateODLetter } from '../services/pdfService';
import { 
  Shield, Users, History, Search, Filter, 
  ChevronRight, Calendar, Clock, User, 
  CheckCircle2, XCircle, Trash2, Info,
  GraduationCap, Briefcase, Building2,
  FileText, CreditCard,
  ArrowUpDown, Download, LayoutDashboard,
  ArrowUp, ArrowDown, RefreshCw, Mail,
  AlertCircle, Check, X, Loader2, Send,
  Lock, Unlock, Eye, ChevronDown, ChevronUp,
  FileSearch, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FeedCard from './FeedCard';
import { useToast } from '../contexts/ToastContext';
import { DEPARTMENTS, EVENT_CATEGORIES } from '../constants';

const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'feed' | 'system' | 'mail' | 'locks' | 'audit' | 'deletions' | 'analytics'>('analytics');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [selectedAnalyticsDept, setSelectedAnalyticsDept] = useState<string | null>(null);
  const [selectedAnalyticsYear, setSelectedAnalyticsYear] = useState<string | null>(null);
  const [selectedAnalyticsCategory, setSelectedAnalyticsCategory] = useState<string | null>(null);
  const [registrationLocks, setRegistrationLocks] = useState<Record<string, any>>({});
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmRejectRequest, setConfirmRejectRequest] = useState<ODRequest | null>(null);
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Student Audit State
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditSearchResults, setAuditSearchResults] = useState<Profile[]>([]);
  const [auditSearchLoading, setAuditSearchLoading] = useState(false);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<ODRequest[]>([]);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Mail Center State
  const [mailRecipient, setMailRecipient] = useState<string>('');
  const [mailSubject, setMailSubject] = useState<string>('');
  const [mailMessage, setMailMessage] = useState<string>('');
  const [mailDept, setMailDept] = useState<string>('none');
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailProgress, setMailProgress] = useState<string | null>(null);
  
  // Blacklist State
  const [blacklistingUserId, setBlacklistingUserId] = useState<string | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  
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

  // Student Audit Debounce Search
  useEffect(() => {
    if (activeTab !== 'audit' || !auditSearchTerm.trim()) {
      setAuditSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setAuditSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'student')
          .or(`full_name.ilike.%${auditSearchTerm}%,identification_no.ilike.%${auditSearchTerm}%,roll_no.ilike.%${auditSearchTerm}%`)
          .limit(10);

        if (error) throw error;
        setAuditSearchResults(data || []);
      } catch (err: any) {
        showToast(err.message || 'Search failed', 'error');
      } finally {
        setAuditSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [auditSearchTerm, activeTab]);

  const fetchStudentHistory = async (studentId: string) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
      return;
    }

    setHistoryLoading(true);
    setExpandedStudentId(studentId);
    try {
      const { data, error } = await supabase
        .from('od_requests')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSelectedStudentHistory(data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

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
          .select('id, full_name, email, role, department, is_profile_complete, identification_no, phone_number, roll_no, year, designation, is_blacklisted, blacklist_reason, is_profile_locked')
          .order('full_name');
        setProfiles(data || []);
      } else if (activeTab === 'locks') {
        const { data: locks } = await supabase.from('registration_locks').select('*');
        const lockMap = (locks || []).reduce((acc: any, curr: any) => {
          acc[curr.department] = curr;
          return acc;
        }, {});
        setRegistrationLocks(lockMap);
      } else if (activeTab === 'deletions') {
        const { data } = await supabase
          .from('deletion_requests')
          .select('*, profiles(role, department)')
          .eq('status', 'pending')
          .order('requested_at', { ascending: true });
        setDeletionRequests(data || []);
      } else if (activeTab === 'requests' || activeTab === 'feed') {
        const { data } = await supabase
          .from('od_requests')
          .select('*')
          .order('created_at', { ascending: sortOrder === 'asc' });
        setRequests(data || []);
      } else if (activeTab === 'analytics') {
        const { data } = await supabase
          .from('od_requests')
          .select('id, department, year, event_title, organization_name, event_type, status, student_name, roll_no, register_no, event_date, event_end_date, coordinator_id, hod_id, phone_number, semester, hod_approved_at, registration_proof_url, payment_proof_url, event_start_time')
          .or('status.eq.Approved,and(hod_id.not.is.null,coordinator_id.not.is.null)');
        setAnalyticsData(data || []);
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

  const handleToggleLock = async (dept: string, type: 'registration' | 'profile', currentLockState: boolean) => {
    const processingKey = `${dept}_${type}`;
    setProcessingId(processingKey);
    try {
      const updateData: any = {
        department: dept,
        updated_at: new Date().toISOString()
      };
      
      if (type === 'registration') {
        updateData.locked = !currentLockState;
        updateData.locked_by = adminProfile?.id;
        updateData.locked_at = new Date().toISOString();
      } else {
        updateData.profile_locked = !currentLockState;
      }

      const { error } = await supabase.from('registration_locks').upsert(updateData, { onConflict: 'department' });

      if (error) throw error;

      showToast(`${dept} ${type} ${!currentLockState ? 'locked' : 'unlocked'} successfully`, "success");
      
      // Update local state
      setRegistrationLocks(prev => ({
        ...prev,
        [dept]: {
          ...(prev[dept] || { department: dept }),
          ...updateData
        }
      }));
    } catch (err: any) {
      showToast(err.message || 'Error updating lock state', "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveDeletion = async (request: any) => {
    if (!adminProfile) return;
    setProcessingId(request.id);
    try {
      // 1. Update request status
      const { error: updateError } = await supabase
        .from('deletion_requests')
        .update({ 
          status: 'approved', 
          resolved_at: new Date().toISOString(), 
          resolved_by: adminProfile.id 
        })
        .eq('id', request.id);
      
      if (updateError) throw updateError;

      // 2. Delete profile (cascades to other tables if configured, but OD requests are preserved as they reference auth.users)
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', request.user_id);
      
      if (deleteError) throw deleteError;

      showToast("Account deleted successfully", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to approve deletion", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectDeletion = async (requestId: string) => {
    if (!adminProfile) return;
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('deletion_requests')
        .update({ 
          status: 'rejected', 
          resolved_at: new Date().toISOString(), 
          resolved_by: adminProfile.id 
        })
        .eq('id', requestId);
      
      if (error) throw error;

      showToast("Request rejected", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to reject deletion", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBlacklist = async (userId: string) => {
    if (!blacklistReason.trim()) {
      showToast("Please provide a reason for blacklisting", "error");
      return;
    }
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blacklisted: true, blacklist_reason: blacklistReason })
        .eq('id', userId);
      
      if (error) throw error;
      
      showToast("Student blacklisted successfully", "success");
      setBlacklistingUserId(null);
      setBlacklistReason('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to blacklist student", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnblock = async (userId: string) => {
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blacklisted: false, blacklist_reason: null })
        .eq('id', userId);
      
      if (error) throw error;
      
      showToast("Student unblocked successfully", "success");
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to unblock student", "error");
    } finally {
      setProcessingId(null);
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
      case 'APPROVE_COORDINATOR': return <CheckCircle2 className="text-amber-500" size={16} />;
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
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'analytics' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <BarChart3 size={14} className="inline mr-2" /> Analytics
            </button>
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
              onClick={() => setActiveTab('locks')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'locks' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Lock size={14} className="inline mr-2" /> Locks
            </button>
            <button 
              onClick={() => setActiveTab('audit')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'audit' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Eye size={14} className="inline mr-2" /> Student Audit
            </button>
            <button 
              onClick={() => setActiveTab('deletions')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'deletions' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Trash2 size={14} className="inline mr-2" /> Deletions
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
                <option value="coordinator">Activity Coordinators</option>
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
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
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
                              {p.is_blacklisted && (
                                <div className="mt-1 flex items-center gap-1 text-[8px] font-black text-red-600 uppercase">
                                  <AlertCircle size={10} />
                                  <span>Blacklisted: {p.blacklist_reason}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            p.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' :
                            p.role === 'hod' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            p.role === 'coordinator' ? 'bg-blue-50 text-blue-600 border-blue-100' :
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
                            {p.phone_number && <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Phone: <span className="font-mono text-blueprint-blue">{p.phone_number}</span></p>}
                            {p.role === 'student' && (
                              <>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Roll: <span className="font-mono text-blueprint-blue">{p.roll_no || 'N/A'}</span></p>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Year: <span className="font-mono text-blueprint-blue">{p.year || 'N/A'}</span></p>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex flex-col items-end gap-2">
                            {p.role === 'student' && (
                              <div className="flex flex-col items-end gap-2">
                                {p.is_blacklisted ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-[8px] font-black uppercase tracking-widest border border-red-200">Blacklisted</span>
                                    <button 
                                      onClick={() => handleUnblock(p.id)}
                                      disabled={processingId === p.id}
                                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50"
                                    >
                                      {processingId === p.id ? <RefreshCw size={10} className="animate-spin" /> : 'Unblock'}
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {blacklistingUserId === p.id ? (
                                      <div className="flex flex-col gap-2 w-48">
                                        <input 
                                          type="text"
                                          placeholder="Reason for blacklist..."
                                          value={blacklistReason}
                                          onChange={(e) => setBlacklistReason(e.target.value)}
                                          className="px-3 py-2 bg-slate-50 border rounded-lg text-[10px] outline-none focus:border-red-500"
                                          autoFocus
                                        />
                                        <div className="flex gap-2">
                                          <button 
                                            onClick={() => { setBlacklistingUserId(null); setBlacklistReason(''); }}
                                            className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                          >
                                            Cancel
                                          </button>
                                          <button 
                                            onClick={() => handleBlacklist(p.id)}
                                            disabled={processingId === p.id}
                                            className="flex-1 px-2 py-1.5 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                                          >
                                            {processingId === p.id ? <RefreshCw size={10} className="animate-spin" /> : 'Confirm'}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => setBlacklistingUserId(p.id)}
                                        className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                                      >
                                        Blacklist
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                            {(p.role === 'student' || p.role === 'coordinator' || p.role === 'hod') && (
                              <div className="flex items-center gap-2">
                                {p.is_profile_locked ? (
                                  <>
                                    <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded text-[8px] font-black uppercase tracking-widest border border-amber-200">Locked</span>
                                    <button 
                                      onClick={async () => {
                                        setProcessingId(p.id);
                                        try {
                                          const { error } = await supabase.from('profiles').update({ is_profile_locked: false }).eq('id', p.id);
                                          if (error) throw error;
                                          showToast("Profile unlocked successfully", "success");
                                          fetchData();
                                        } catch (err: any) {
                                          showToast(err.message || "Failed to unlock profile", "error");
                                        } finally {
                                          setProcessingId(null);
                                        }
                                      }}
                                      disabled={processingId === p.id}
                                      className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
                                    >
                                      {processingId === p.id ? <RefreshCw size={10} className="animate-spin" /> : 'Unlock'}
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    onClick={async () => {
                                      setProcessingId(p.id);
                                      try {
                                        const { error } = await supabase.from('profiles').update({ is_profile_locked: true }).eq('id', p.id);
                                        if (error) throw error;
                                        showToast("Profile locked successfully", "success");
                                        fetchData();
                                      } catch (err: any) {
                                        showToast(err.message || "Failed to lock profile", "error");
                                      } finally {
                                        setProcessingId(null);
                                      }
                                    }}
                                    disabled={processingId === p.id}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                                  >
                                    {processingId === p.id ? <RefreshCw size={10} className="animate-spin" /> : 'Lock Profile'}
                                  </button>
                                )}
                              </div>
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
                          {r.phone_number && <p className="text-[9px] text-primary font-black uppercase mt-1">{r.phone_number}</p>}
                          {r.team_members && r.team_members.length > 0 && (
                            <div className="mt-2 pt-1 border-t border-slate-100">
                              <p className="text-[8px] font-black text-blueprint-blue uppercase tracking-widest">Team ({r.team_members.length})</p>
                              <p className="text-[9px] text-slate-500 truncate max-w-[120px]">{r.team_members.map(m => m.name).join(', ')}</p>
                            </div>
                          )}
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
                            {r.coordinator_approved_at && (
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Coordinator: {new Date(r.coordinator_approved_at).toLocaleDateString()}</span>
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
              {activeTab === 'locks' && (
                <div className="p-8 space-y-8">
                  <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                      <Lock className="text-blueprint-blue" size={24} /> Registration Locks
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control new account creation per department</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {DEPARTMENTS.map(dept => {
                        const lock = registrationLocks[dept];
                        const isRegLocked = lock?.locked || false;
                        const isProfileLocked = lock?.profile_locked || false;
                        return (
                          <div key={dept} className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col justify-between gap-6 hover:shadow-md transition-all">
                            <div>
                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight mb-4">{dept}</h4>
                              
                              <div className="space-y-4">
                                {/* Registration Lock */}
                                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isRegLocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Registration</span>
                                  </div>
                                  <button
                                    onClick={() => handleToggleLock(dept, 'registration', isRegLocked)}
                                    disabled={processingId === `${dept}_registration`}
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                                      isRegLocked ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                                    } disabled:opacity-50`}
                                  >
                                    {processingId === `${dept}_registration` ? <RefreshCw size={10} className="animate-spin" /> : isRegLocked ? 'Unlock' : 'Lock'}
                                  </button>
                                </div>

                                {/* Profile Lock */}
                                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isProfileLocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Profile Edits</span>
                                  </div>
                                  <button
                                    onClick={() => handleToggleLock(dept, 'profile', isProfileLocked)}
                                    disabled={processingId === `${dept}_profile`}
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                                      isProfileLocked ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'
                                    } disabled:opacity-50`}
                                  >
                                    {processingId === `${dept}_profile` ? <RefreshCw size={10} className="animate-spin" /> : isProfileLocked ? 'Unlock' : 'Lock'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              {activeTab === 'audit' && (
                <div className="p-8 space-y-8">
                  <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                      <FileSearch className="text-blueprint-blue" size={24} /> Student Audit Log
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Full chronological OD history across all years</p>
                  </div>

                  <div className="relative max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Search by Student Name, Reg No, or Roll No..."
                      value={auditSearchTerm}
                      onChange={(e) => setAuditSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl outline-none focus:border-blueprint-blue shadow-sm text-sm"
                    />
                    {auditSearchLoading && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-blueprint-blue" size={18} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {auditSearchResults.length === 0 && auditSearchTerm.trim() !== '' && !auditSearchLoading && (
                      <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No students found matching "{auditSearchTerm}"</p>
                      </div>
                    )}

                    {auditSearchResults.map((student) => (
                      <div key={student.id} className="bg-white border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <button 
                          onClick={() => fetchStudentHistory(student.id)}
                          className="w-full p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blueprint-blue/10 flex items-center justify-center text-blueprint-blue">
                              <User size={24} />
                            </div>
                            <div className="text-left">
                              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-tight">{student.full_name}</h4>
                              <div className="flex gap-3 mt-1">
                                <span className="text-[10px] font-mono text-slate-400 uppercase">REG: {student.identification_no}</span>
                                <span className="text-[10px] font-mono text-slate-400 uppercase">ROLL: {student.roll_no}</span>
                              </div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{student.department} • YEAR {student.year}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {expandedStudentId === student.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                          </div>
                        </button>

                        <AnimatePresence>
                          {expandedStudentId === student.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t bg-slate-50/30"
                            >
                              {historyLoading ? (
                                <div className="p-12 flex flex-col items-center justify-center">
                                  <Loader2 className="animate-spin text-blueprint-blue mb-2" size={24} />
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retrieving Timeline...</p>
                                </div>
                              ) : (
                                <div className="p-8 space-y-6">
                                  {/* History Summary */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
                                      <BarChart3 className="text-blueprint-blue mb-1" size={16} />
                                      <p className="text-[18px] font-black text-slate-900 leading-none">{selectedStudentHistory.length}</p>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Total ODs</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
                                      <CheckCircle2 className="text-green-500 mb-1" size={16} />
                                      <p className="text-[18px] font-black text-green-600 leading-none">{selectedStudentHistory.filter(h => h.status === 'Approved').length}</p>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Approved</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
                                      <XCircle className="text-red-500 mb-1" size={16} />
                                      <p className="text-[18px] font-black text-red-600 leading-none">{selectedStudentHistory.filter(h => h.status === 'Rejected').length}</p>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Rejected</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center justify-center text-center">
                                      <Clock className="text-amber-500 mb-1" size={16} />
                                      <p className="text-[18px] font-black text-amber-600 leading-none">{selectedStudentHistory.filter(h => h.status !== 'Approved' && h.status !== 'Rejected').length}</p>
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Pending</p>
                                    </div>
                                  </div>

                                  {/* History List */}
                                  <div className="space-y-4">
                                    {selectedStudentHistory.length === 0 ? (
                                      <div className="text-center py-10">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">No OD history recorded for this student.</p>
                                      </div>
                                    ) : (
                                      selectedStudentHistory.map((h, idx) => (
                                        <div key={h.id} className="relative pl-8 before:absolute before:left-[11px] before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-200 last:before:h-4">
                                          <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${
                                            h.status === 'Approved' ? 'bg-green-500' : 
                                            h.status === 'Rejected' ? 'bg-red-500' : 'bg-amber-500'
                                          }`}>
                                            {h.status === 'Approved' ? <Check size={10} className="text-white" /> : 
                                             h.status === 'Rejected' ? <X size={10} className="text-white" /> : 
                                             <Clock size={10} className="text-white" />}
                                          </div>
                                          <div className="bg-white p-5 rounded-2xl border shadow-sm hover:border-blueprint-blue/30 transition-all">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(h.created_at).toLocaleDateString()}</span>
                                                  <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${
                                                    h.status === 'Approved' ? 'bg-green-50 text-green-600' : 
                                                    h.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                  }`}>
                                                    {h.status}
                                                  </span>
                                                </div>
                                                <h5 className="text-sm font-bold text-slate-900 mt-1">{h.event_title}</h5>
                                                <p className="text-[10px] text-slate-500 mt-0.5">{h.organization_name} • {h.event_type}</p>
                                              </div>
                                              <div className="text-left sm:text-right">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Event Date</p>
                                                <p className="text-[10px] font-mono text-slate-700">{h.event_date} {h.event_end_date && h.event_end_date !== h.event_date ? `to ${h.event_end_date}` : ''}</p>
                                                {(h.coordinator_approved_at || h.hod_approved_at) && (
                                                  <div className="mt-2 flex flex-wrap sm:justify-end gap-2">
                                                    {h.coordinator_approved_at && (
                                                      <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded border">Coordinator Recommended</span>
                                                    )}
                                                    {h.hod_approved_at && (
                                                      <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded border">HOD Approved</span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'deletions' && (
                <div className="p-8 space-y-8">
                  <div className="mb-8">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                      <Trash2 className="text-red-500" size={24} /> Deletion Requests
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Review and approve account deletion requests</p>
                  </div>

                  {deletionRequests.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No pending deletion requests</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {deletionRequests.map((req) => (
                        <div key={req.id} className="bg-white border rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="space-y-4 flex-1">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                                  <User size={24} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-900 text-sm uppercase tracking-tight flex items-center gap-2">
                                    {req.user_name}
                                    {req.profiles?.role && (
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                                        req.profiles.role === 'hod' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                                        req.profiles.role === 'coordinator' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                        'bg-slate-50 text-slate-600 border-slate-100'
                                      }`}>
                                        {req.profiles.role}
                                      </span>
                                    )}
                                  </h4>
                                  <p className="text-[10px] font-mono text-slate-400 uppercase">{req.user_email}</p>
                                </div>
                              </div>
                              
                              <div className="bg-slate-50 p-6 rounded-2xl border">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reason for Deletion</p>
                                {req.reason ? (
                                  <p className="text-sm text-slate-700 leading-relaxed">{req.reason}</p>
                                ) : (
                                  <p className="text-sm text-slate-400 italic">No reason provided</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                <Clock size={14} />
                                Requested on {new Date(req.requested_at).toLocaleString()}
                              </div>
                            </div>

                            <div className="flex md:flex-col gap-3 justify-end md:w-48">
                              <button 
                                onClick={() => handleApproveDeletion(req)}
                                disabled={processingId === req.id}
                                className="flex-1 py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                Approve
                              </button>
                              <button 
                                onClick={() => handleRejectDeletion(req.id)}
                                disabled={processingId === req.id}
                                className="flex-1 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'analytics' && (
                <div className="p-8 space-y-8">
                  <div className="mb-8 flex justify-between items-end">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <BarChart3 className="text-blueprint-blue" size={24} /> Department Analytics
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        {selectedAnalyticsDept ? (
                          <span className="flex items-center gap-2">
                            <span className="text-blueprint-blue">{selectedAnalyticsDept}</span>
                            {selectedAnalyticsYear && (
                              <>
                                <ChevronRight size={12} />
                                <span className="text-blueprint-blue">{selectedAnalyticsYear}</span>
                              </>
                            )}
                            {selectedAnalyticsCategory && (
                              <>
                                <ChevronRight size={12} />
                                <span className="text-blueprint-blue">{selectedAnalyticsCategory}</span>
                              </>
                            )}
                          </span>
                        ) : "Drill down into department-wise OD statistics"}
                      </p>
                    </div>
                    {(selectedAnalyticsDept || selectedAnalyticsYear || selectedAnalyticsCategory) && (
                      <button 
                        onClick={() => {
                          if (selectedAnalyticsCategory) setSelectedAnalyticsCategory(null);
                          else if (selectedAnalyticsYear) setSelectedAnalyticsYear(null);
                          else setSelectedAnalyticsDept(null);
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                      >
                        <History size={14} /> Back
                      </button>
                    )}
                  </div>

                  {/* Level 1: Department Grid */}
                  {!selectedAnalyticsDept && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {DEPARTMENTS.map(dept => {
                        const count = analyticsData.filter(r => r.department === dept).length;
                        return (
                          <button 
                            key={dept}
                            onClick={() => setSelectedAnalyticsDept(dept)}
                            className="bg-white border rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all text-left group"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blueprint-blue transition-colors">
                                <Building2 size={24} />
                              </div>
                              <span className="px-3 py-1 bg-blueprint-blue/10 text-blueprint-blue rounded-full text-[10px] font-black uppercase tracking-widest">
                                {count} Requests
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-tight leading-tight">{dept}</h4>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Level 2: Year Breakdown */}
                  {selectedAnalyticsDept && !selectedAnalyticsYear && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Overall'].map(year => {
                        const yearNum = year.charAt(0);
                        const filtered = analyticsData.filter(r => 
                          r.department === selectedAnalyticsDept && 
                          (year === 'Overall' ? true : r.year === yearNum)
                        );
                        
                        if (year === '5th Year' && filtered.length === 0) return null;

                        return (
                          <button 
                            key={year}
                            onClick={() => setSelectedAnalyticsYear(year)}
                            className="bg-white border rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all text-left group"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blueprint-blue transition-colors">
                                <GraduationCap size={24} />
                              </div>
                              <span className="px-3 py-1 bg-blueprint-blue/10 text-blueprint-blue rounded-full text-[10px] font-black uppercase tracking-widest">
                                {filtered.length} Requests
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-tight leading-tight">{year}</h4>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Level 3: Event Breakdown */}
                  {selectedAnalyticsDept && selectedAnalyticsYear && !selectedAnalyticsCategory && (() => {
                    const filteredData = analyticsData.filter(r => 
                      r.department === selectedAnalyticsDept && 
                      (selectedAnalyticsYear === 'Overall' ? true : r.year === selectedAnalyticsYear.charAt(0)) &&
                      (r.status === 'Approved' || (r.hod_id !== null && r.coordinator_id !== null))
                    );
                    
                    const categoryCounts = EVENT_CATEGORIES.map(category => {
                      const count = filteredData.filter(r => 
                        (r.event_type?.startsWith(category.value) || r.event_type === category.value)
                      ).length;
                      return { ...category, count };
                    });

                    return (
                      <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden">
                        <div className="p-8 border-b bg-slate-50/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Approved Participations</p>
                              <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                                {filteredData.length}
                              </h4>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Scope</p>
                              <p className="text-xs font-bold text-blueprint-blue uppercase tracking-tight">{selectedAnalyticsDept} • {selectedAnalyticsYear}</p>
                            </div>
                          </div>
                        </div>
                        <div className="divide-y">
                          {categoryCounts.map(category => (
                            <button 
                              key={category.value} 
                              onClick={() => setSelectedAnalyticsCategory(category.value)}
                              className="w-full p-6 flex justify-between items-center hover:bg-slate-50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                  <BarChart3 size={18} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">{category.label}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                  <div 
                                    className="h-full bg-blueprint-blue transition-all duration-1000"
                                    style={{ width: filteredData.length > 0 ? `${(category.count / filteredData.length) * 100}%` : '0%' }}
                                  ></div>
                                </div>
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest min-w-[60px] text-center">
                                  {category.count}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Level 4: Approved Students List */}
                  {selectedAnalyticsDept && selectedAnalyticsYear && selectedAnalyticsCategory && (() => {
                    const filteredData = analyticsData.filter(r => 
                      r.department === selectedAnalyticsDept && 
                      (selectedAnalyticsYear === 'Overall' ? true : r.year === selectedAnalyticsYear.charAt(0)) &&
                      (r.status === 'Approved' || (r.hod_id !== null && r.coordinator_id !== null)) &&
                      (r.event_type?.startsWith(selectedAnalyticsCategory) || r.event_type === selectedAnalyticsCategory)
                    );

                    return (
                      <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Approved Students</p>
                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
                              {selectedAnalyticsCategory}
                            </h4>
                          </div>
                          <div className="text-right">
                            <span className="px-4 py-2 bg-blueprint-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                              {filteredData.length} Students
                            </span>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 border-b">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student Info</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Period Details</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Event Specifics</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Proofs</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Audit Info</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {filteredData.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-8 py-12 text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No approved registrations found for this category.</p>
                                  </td>
                                </tr>
                              ) : (
                                filteredData.map((student) => (
                                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blueprint-blue/10 flex items-center justify-center text-blueprint-blue">
                                          <User size={16} />
                                        </div>
                                        <div>
                                          <p className="font-bold text-slate-900 text-sm uppercase tracking-tight">{student.student_name}</p>
                                          <p className="text-[10px] font-mono text-slate-400 uppercase">Roll: {student.roll_no || 'N/A'}</p>
                                          <p className="text-[10px] font-mono text-slate-400 uppercase">Phone: {student.phone_number || 'N/A'}</p>
                                          <p className="text-[10px] font-mono text-blueprint-blue uppercase font-black">Sem: {student.semester || 'N/A'}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-6">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={12} className="text-blueprint-blue" />
                                        <p className="text-[10px] font-mono text-slate-700 uppercase font-bold">
                                          {student.event_date} {student.event_end_date && student.event_end_date !== student.event_date ? `to ${student.event_end_date}` : ''}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-slate-400" />
                                        <p className="text-[10px] font-mono text-slate-500 uppercase">
                                          {student.event_start_time || 'Day Event'}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-8 py-6">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Building2 size={12} className="text-slate-400" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{student.organization_name}</p>
                                      </div>
                                      <p className="text-[9px] font-bold text-blueprint-blue uppercase italic">{student.event_type}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                      <div className="flex items-center justify-center gap-4">
                                        {student.registration_proof_url ? (
                                          <a href={student.registration_proof_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blueprint-blue transition-colors" title="Registration Proof">
                                            <FileText size={16} />
                                          </a>
                                        ) : (
                                          <FileText size={16} className="text-slate-200" />
                                        )}
                                        {student.payment_proof_url ? (
                                          <a href={student.payment_proof_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blueprint-blue transition-colors" title="Payment Proof">
                                            <CreditCard size={16} />
                                          </a>
                                        ) : (
                                          <CreditCard size={16} className="text-slate-200" />
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-8 py-6">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                        <div>
                                          <p className="text-[10px] font-black text-slate-400 uppercase">Sanctioned At</p>
                                          <p className="text-[10px] font-mono text-slate-600">
                                            {student.hod_approved_at ? new Date(student.hod_approved_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
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
