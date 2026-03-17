
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, Profile, ODStatus } from '../types';
import { Loader2, RefreshCw, Search, BarChart3, Clock, CheckCircle2, LayoutList, BookOpen, AlertCircle, ChevronLeft, Terminal, FileText, Download, ExternalLink, Database, Trash2, Archive, RefreshCcw, Lock, X, Folder, Bell, Filter, FileSpreadsheet, UserCheck, GraduationCap, Mail, Check } from 'lucide-react';
import { generateODDocument } from '../services/pdfService';
import { Link, useSearchParams } from 'react-router-dom';
import FeedCard from './FeedCard';
import NotificationCenter from './NotificationCenter';
import NestedFolderView from './NestedFolderView';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

import { DEPARTMENTS } from '../constants';

// Utility function to format date as "01st October, 2026"
const formatFancyDate = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) {
    suffix = 'st';
  } else if (day === 2 || day === 22) {
    suffix = 'nd';
  } else if (day === 3 || day === 23) {
    suffix = 'rd';
  }
  return `${day}${suffix} ${month}, ${year}`;
};

interface FacultyAdminProps {
  role: 'advisor' | 'hod' | 'admin';
}

const FacultyAdmin: React.FC<FacultyAdminProps> = ({ role }) => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [deptSearch, setDeptSearch] = useState('');
  const [stats, setStats] = useState({ pendingAdvisor: 0, pendingHOD: 0, approved: 0, completed: 0, archived: 0 });
  const [activeStatus, setActiveStatus] = useState<ODStatus>('Pending Advisor');
  const [viewMode, setViewMode] = useState<'registry' | 'inspection' | 'nested'>('nested');
  const [facultyProfile, setFacultyProfile] = useState<Profile | null>(null);
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request_id');

  // Admin Filters
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Approval Confirmation
  const [confirmApprovalRequest, setConfirmApprovalRequest] = useState<ODRequest | null>(null);

  // Auth for Delete
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  
  const ADMIN_PASSWORD = 'Adminesec@123';
  
  const fetchRequests = async () => {
    setLoading(true);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      console.warn("Registry synchronization timed out");
    }, 10000); // 10 second timeout

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch profile from DB for source of truth
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const profile: Profile = dbProfile ? (dbProfile as Profile) : {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role || 'faculty',
        full_name: user.user_metadata?.full_name || '',
        department: user.user_metadata?.department || null,
        is_hod: user.user_metadata?.is_hod || false,
      };
      
      setFacultyProfile(profile);
      const dept = profile.department;

      // Fetch list based on active status
      let query = supabase
        .from('od_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestId) {
        query = query.eq('id', requestId);
      } else {
        query = query.eq('status', activeStatus);
      }

      // Role-based filtering
      if (role !== 'admin' && dept) {
        query = query.eq('department', dept);
      }

      // Fetch all counts for stats in parallel
      const getCount = (status: ODStatus) => {
        let q = supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', status);
        if (role !== 'admin' && dept) {
          q = q.eq('department', dept);
        }
        return q;
      };

      const [
        listResult,
        pendingAdvisorResult,
        pendingHODResult,
        approvedResult,
        completedResult,
        archivedResult
      ] = await Promise.all([
        query,
        getCount('Pending Advisor'),
        getCount('Pending HOD'),
        getCount('Approved'),
        getCount('Completed'),
        getCount('Archived')
      ]);

      if (listResult.error) throw listResult.error;

      if (listResult.data) setRequests(listResult.data as ODRequest[]);
      setStats({ 
        pendingAdvisor: pendingAdvisorResult.count || 0,
        pendingHOD: pendingHODResult.count || 0,
        approved: approvedResult.count || 0, 
        completed: completedResult.count || 0,
        archived: archivedResult.count || 0
      });
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set initial status based on role
    if (role === 'hod') setActiveStatus('Pending HOD');
    else if (role === 'advisor') setActiveStatus('Pending Advisor');
    else setActiveStatus('Pending Advisor');
  }, [role]);

  useEffect(() => {
    if (requestId) {
      setViewMode('inspection');
    }
  }, [requestId]);

  useEffect(() => {
    fetchRequests();
  }, [activeStatus, role, requestId]);

  const handleAction = async (request: ODRequest, approve: boolean, confirmed: boolean = false) => {
    // Permission check
    const canPerformAction = 
      role === 'admin' || 
      (role === 'advisor' && request.status === 'Pending Advisor') ||
      (role === 'hod' && request.status === 'Pending HOD');

    if (!canPerformAction) {
      alert(`As ${role.toUpperCase()}, you are not authorized to ${approve ? 'approve' : 'reject'} requests in '${request.status}' state.`);
      return;
    }

    if (approve && !confirmed) {
      setConfirmApprovalRequest(request);
      return;
    }

    setProcessingId(request.id);
    setConfirmApprovalRequest(null);
    try {
      if (approve) {
        // For admins, we might not have a full facultyProfile if they haven't set it up
        // but we need an ID for the advisor_id/hod_id fields.
        const activeFacultyId = facultyProfile?.id || (await supabase.auth.getUser()).data.user?.id;
        
        if (!activeFacultyId) throw new Error("Authentication session lost. Please reload.");

        if (role === 'hod' || (role === 'admin' && request.status === 'Pending HOD')) {
          // HOD Approval Logic (Final Sanction)
          
          // Fetch real student profile
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
            year: request.year
          };

          const pdfBlob = await generateODDocument(request, studentProfile, facultyProfile || undefined);
          const fileName = `Approved_OD_${request.register_no}_${Date.now()}.pdf`;
          const filePath = `od_letters/${fileName}`;
          
          const { error: uploadError } = await supabase.storage.from('od-files').upload(filePath, pdfBlob);
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('od-files').getPublicUrl(filePath);

          const { error: dbError } = await supabase.from('od_requests').update({ 
            status: 'Approved', 
            od_letter_url: publicUrl,
            hod_id: activeFacultyId,
            hod_approved_at: new Date().toISOString()
          }).eq('id', request.id);

          if (dbError) throw dbError;

          // Trigger Email & In-App Notification (Client-side fallback)
          try {
            const { data: studentProfileData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', request.user_id)
              .single();

            const studentName = studentProfileData?.full_name || request.student_name;
            const studentEmail = studentProfileData?.email;
            const notificationMessage = `Dear ${studentName}, your OD for ${request.event_title} has been sanctioned. All the best for your presentation! - Team ESEC OD.`;
            const emailMessage = `
              <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #2e7d32;">OD Request Sanctioned!</h2>
                <p>Dear <strong>${studentName}</strong>,</p>
                <p>Your On-Duty request for <strong>${request.event_title}</strong> has been officially sanctioned by the Department HOD.</p>
                <p>All the best for your presentation!</p>
                <p><strong>Download OD Letter:</strong> <a href="${publicUrl}" style="color: #2e7d32; font-weight: bold;">Click here to download</a></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #666; margin-top: 30px;">Team ESEC OD Portal</p>
              </div>
            `;

            if (studentEmail) {
              const emailRes = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: studentEmail,
                  subject: `OD Sanctioned: ${request.event_title}`,
                  message: emailMessage
                })
              });
              const emailResult = await emailRes.json();
              if (!emailResult.success) {
                await supabase.from('notifications_log').insert({
                  user_id: request.user_id,
                  request_id: request.id,
                  error_message: JSON.stringify(emailResult.error) || 'Student Email delivery failed',
                  status: 'failed',
                  type: 'email',
                  created_at: new Date().toISOString()
                });
              }
            }

            await supabase.from('notifications').insert({
              user_id: request.user_id,
              message: notificationMessage,
              type: 'success',
              read: false
            });
            
            // Also notify the advisor that their recommendation was finalized
            if (request.advisor_id) {
              await supabase.from('notifications').insert({
                user_id: request.advisor_id,
                message: `The OD request for ${request.student_name} you recommended has been officially sanctioned by HOD.`,
                type: 'info',
                read: false
              });
            }

            await supabase.from('od_requests').update({ notification_sent: true }).eq('id', request.id);
          } catch (notificationErr) {
            console.error("Failed to process notifications:", notificationErr);
          }
        } else {
          // Advisor Approval Logic (or Admin acting as Advisor)
          const { error: dbError } = await supabase.from('od_requests').update({ 
            status: 'Pending HOD',
            advisor_id: activeFacultyId,
            advisor_approved_at: new Date().toISOString(),
            notification_sent: false // Reset for HOD notification
          }).eq('id', request.id);

          if (dbError) throw dbError;

          // Trigger HOD Notification (Client-side fallback)
          try {
            const { data: hodProfiles } = await supabase
              .from('profiles')
              .select('id, email, full_name')
              .eq('role', 'hod')
              .eq('department', request.department);

            if (hodProfiles && hodProfiles.length > 0) {
              const dashboardUrl = `${window.location.origin}/hod-dashboard?request_id=${request.id}`;
              const emailMessage = `
                <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                  <h2 style="color: #003366;">OD Authorization Required</h2>
                  <p>An OD request for <strong>${request.student_name}</strong> (${request.register_no}) has been <strong>Approved by Advisor</strong> and now requires your final authorization.</p>
                  <p><strong>Event:</strong> ${request.event_title}</p>
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p>Please log in to your dashboard to provide the final authorization.</p>
                  <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #003366; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">View HOD Dashboard</a>
                  <p style="font-size: 12px; color: #666; margin-top: 30px;">Ref: OD-AUTH-${request.id.substring(0, 8)}</p>
                </div>
              `;

              for (const hod of hodProfiles) {
                if (hod.email) {
                  const emailRes = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      to: hod.email,
                      subject: `Advisor Approved: ${request.event_title}`,
                      message: emailMessage
                    })
                  });
                  const emailResult = await emailRes.json();
                  if (!emailResult.success) {
                    await supabase.from('notifications_log').insert({
                      user_id: hod.id || activeFacultyId,
                      request_id: request.id,
                      error_message: JSON.stringify(emailResult.error) || 'HOD Email delivery failed',
                      status: 'failed',
                      type: 'email',
                      created_at: new Date().toISOString()
                    });
                  }
                }
              }
              await supabase.from('od_requests').update({ notification_sent: true }).eq('id', request.id);
            }

            // Notify Student about Advisor Approval
            await supabase.from('notifications').insert({
              user_id: request.user_id,
              message: `Your OD request for ${request.event_title} has been approved by your Advisor and is now pending HOD authorization.`,
              type: 'info',
              read: false
            });
          } catch (notifyErr) {
            console.error("HOD notification failed:", notifyErr);
          }
        }
      } else {
        await supabase.from('od_requests').update({ status: 'Rejected' }).eq('id', request.id);
      }
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setProcessingId(null);
    }
  };

  // Soft Delete - Move to Recycle Bin
  const handleSoftDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to move this post to the Recycle Bin?")) return;
    
    try {
      const { error } = await supabase.from('od_requests').update({ status: 'Archived' }).eq('id', id);
      if (error) throw error;
      fetchRequests();
    } catch (err: any) {
      alert("Error archiving: " + err.message);
    }
  };

  // Restore from Recycle Bin
  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase.from('od_requests').update({ status: 'Pending Advisor' }).eq('id', id);
      if (error) throw error;
      fetchRequests();
    } catch (err: any) {
      alert("Error restoring: " + err.message);
    }
  };

  // Initiate Hard Delete (Open Modal)
  const initiateHardDelete = (id: string) => {
    setDeleteCandidateId(id);
    setAdminPasswordInput('');
  };

  // Execute Hard Delete
  const handleHardDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput !== ADMIN_PASSWORD) {
      alert("Authentication Failed: Incorrect Admin Password.");
      return;
    }

    if (!deleteCandidateId) return;

    try {
      const { error } = await supabase.from('od_requests').delete().eq('id', deleteCandidateId);
      if (error) throw error;
      setDeleteCandidateId(null);
      fetchRequests();
    } catch (err: any) {
      alert("Deletion Error: " + err.message);
    }
  };

  // Manual Notification Fallback
  const sendManualNotification = async (request: ODRequest) => {
    try {
      setProcessingId(request.id);
      let targetEmail = '';
      let subject = '';
      let message = '';

      if (request.status === 'Pending Advisor') {
        const { data: recipients } = await supabase
          .from('profiles')
          .select('email')
          .in('role', ['advisor', 'hod'])
          .eq('department', request.department);
        if (recipients && recipients.length > 0) {
          targetEmail = recipients[0].email;
          subject = `New OD: ${request.event_title}`;
          message = `<h2>New OD Request</h2><p>Student: ${request.student_name}</p><p>Event: ${request.event_title}</p><p>Please review in Advisor Dashboard.</p>`;
        }
      } else if (request.status === 'Pending HOD') {
        const { data: hods } = await supabase
          .from('profiles')
          .select('email')
          .eq('role', 'hod')
          .eq('department', request.department);
        if (hods && hods.length > 0) {
          targetEmail = hods[0].email;
          subject = `Advisor Approved: ${request.event_title}`;
          message = `<h2>OD Authorization Required</h2><p>Student: ${request.student_name}</p><p>Event: ${request.event_title}</p><p>Final authorization required in HOD Dashboard.</p>`;
        }
      } else if (request.status === 'Approved') {
        const { data: student } = await supabase.from('profiles').select('email').eq('id', request.user_id).single();
        if (student) {
          targetEmail = student.email;
          subject = `OD Sanctioned: ${request.event_title}`;
          message = `<h2>OD Sanctioned!</h2><p>Your OD for ${request.event_title} has been approved. Download the letter from the portal.</p>`;
        }
      }

      if (!targetEmail) {
        alert("No target email found for this status/department.");
        return;
      }

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: targetEmail, subject, message })
      });

      const result = await res.json();
      if (result.success) {
        alert(`Notification sent to ${targetEmail}`);
        await supabase.from('od_requests').update({ notification_sent: true }).eq('id', request.id);
        fetchRequests();
      } else {
        throw new Error(result.error || "Failed to send");
      }
    } catch (err: any) {
      alert("Manual Notification Failed: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.register_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.event_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept ? r.department === selectedDept : true;
    const matchesYear = selectedYear ? r.year === selectedYear : true;
    const matchesMonth = monthFilter ? new Date(r.event_date).getMonth() === parseInt(monthFilter) : true;
    return matchesSearch && matchesDept && matchesYear && matchesMonth;
  });

  const exportToExcel = () => {
    const dataToExport = filteredRequests.map(r => {
      const teamMembersRaw = r.team_members;
      const teamMembers: any[] = Array.isArray(teamMembersRaw) 
        ? teamMembersRaw 
        : (typeof teamMembersRaw === 'string' ? JSON.parse(teamMembersRaw) : []);
      
      return {
        'Student Name': r.student_name,
        'Register No': r.register_no,
        'Roll No': r.roll_no,
        'Phone': r.phone_number || 'N/A',
        'Department': r.department,
        'Year': r.year,
        'Semester': r.semester,
        'Team Members': teamMembers.map(m => `${m.name} (${m.register_no})`).join('; ') || 'None',
        'Event Title': r.event_title,
        'Organization': r.organization_name,
        'Location': r.organization_location || 'N/A',
        'Event Type': r.event_type,
        'Start Date': r.event_date,
        'End Date': r.event_end_date || r.event_date,
        'Status': r.status,
        'Achievement': r.achievement_details || 'N/A',
        'Advisor Approved': r.advisor_approved_at ? 'Yes' : 'No',
        'HOD Approved': r.hod_approved_at ? 'Yes' : 'No'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OD Requests');
    XLSX.writeFile(wb, `ESEC_OD_Registry_${activeStatus}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const canApprove = (request: ODRequest) => {
    if (role === 'admin') return true;
    if (role === 'advisor' && request.status === 'Pending Advisor') return true;
    if (role === 'hod' && request.status === 'Pending HOD') return true;
    return false;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 relative">
      {/* Approval Confirmation Modal */}
      <AnimatePresence>
        {confirmApprovalRequest && (
          <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Confirm Approval</h3>
                  <p className="text-xs text-slate-500 font-medium mt-2">
                    Are you sure you want to approve the OD request for <span className="font-black text-blueprint-blue">{confirmApprovalRequest.student_name}</span>? 
                    This action will generate the official OD letter and notify the student.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                  <button 
                    onClick={() => setConfirmApprovalRequest(null)}
                    className="px-6 py-3.5 bg-slate-50 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleAction(confirmApprovalRequest, true, true)}
                    className="px-6 py-3.5 bg-blueprint-blue text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/20 hover:bg-goldenrod transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={14} /> Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Modal for Hard Delete */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-red-100 animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-red-600 uppercase italic">Admin Override</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Permanent Deletion Protocol</p>
                </div>
                <button onClick={() => setDeleteCandidateId(null)} className="text-slate-300 hover:text-slate-500"><X size={20}/></button>
             </div>
             <form onSubmit={handleHardDelete} className="space-y-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Lock size={12}/> Security Password</label>
                 <input 
                    type="password" 
                    autoFocus
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition-all"
                    placeholder="Enter Admin Password"
                 />
               </div>
               <button type="submit" className="w-full bg-red-600 text-white font-black uppercase text-xs py-4 rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                 <Trash2 size={16} /> Confirm Deletion
               </button>
             </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-50">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">
            {role === 'admin' ? 'MASTER TERMINAL' : role === 'hod' ? 'HOD TERMINAL' : 'ADVISOR TERMINAL'}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {role === 'admin' && (
            <button 
              onClick={exportToExcel}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg mr-2"
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          )}
          
          <Link 
            to="/faculty/registry"
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-700 transition-all shadow-lg mr-2"
          >
            <Database size={14} /> Full Registry & Export
          </Link>
          
          <div className="relative w-48 mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Filter view..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-xs outline-none focus:border-blueprint-blue"
            />
          </div>

          {role === 'admin' && (
            <>
              <div className="relative w-48 mr-2">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-xs outline-none focus:border-blueprint-blue appearance-none"
                >
                  <option value="">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="relative w-32 mr-2">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-xs outline-none focus:border-blueprint-blue appearance-none"
                >
                  <option value="">All Years</option>
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y.toString()}>{y} Year</option>)}
                </select>
              </div>
            </>
          )}

          <div className="bg-white border p-1 rounded-xl flex items-center shadow-sm">
            <button onClick={() => setViewMode('registry')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'registry' ? 'bg-blueprint-blue text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutList size={14} /> List
            </button>
            <button onClick={() => setViewMode('nested')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'nested' ? 'bg-blueprint-blue text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600'}`}>
              <Folder size={14} /> Folder
            </button>
            <button onClick={() => setViewMode('inspection')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'inspection' ? 'bg-blueprint-blue text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600'}`}>
              <BookOpen size={14} /> Detail
            </button>
          </div>
          {facultyProfile && <NotificationCenter userId={facultyProfile.id} />}
          <button onClick={fetchRequests} className="p-2.5 bg-white border rounded-xl hover:bg-slate-50 transition-colors shadow-sm"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button 
          onClick={() => setActiveStatus('Pending Advisor')}
          className={`bg-white border p-5 rounded-[1.5rem] flex items-center gap-4 shadow-sm transition-all text-left ${activeStatus === 'Pending Advisor' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'hover:border-slate-300'}`}
        >
          <div className={`p-3 rounded-xl ${activeStatus === 'Pending Advisor' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}><Clock size={20}/></div>
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Advisor Pending</p><p className="text-2xl font-black">{stats.pendingAdvisor}</p></div>
        </button>

        <button 
          onClick={() => setActiveStatus('Pending HOD')}
          className={`bg-white border p-5 rounded-[1.5rem] flex items-center gap-4 shadow-sm transition-all text-left ${activeStatus === 'Pending HOD' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'hover:border-slate-300'}`}
        >
          <div className={`p-3 rounded-xl ${activeStatus === 'Pending HOD' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}><Clock size={20}/></div>
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">HOD Pending</p><p className="text-2xl font-black">{stats.pendingHOD}</p></div>
        </button>
        
        <button 
          onClick={() => setActiveStatus('Approved')}
          className={`bg-white border p-5 rounded-[1.5rem] flex items-center gap-4 shadow-sm transition-all text-left ${activeStatus === 'Approved' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'hover:border-slate-300'}`}
        >
          <div className={`p-3 rounded-xl ${activeStatus === 'Approved' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}><CheckCircle2 size={20}/></div>
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized</p><p className="text-2xl font-black">{stats.approved}</p></div>
        </button>

        <button 
          onClick={() => setActiveStatus('Completed')}
          className={`bg-white border p-5 rounded-[1.5rem] flex items-center gap-4 shadow-sm transition-all text-left ${activeStatus === 'Completed' ? 'border-goldenrod ring-2 ring-goldenrod/20' : 'hover:border-slate-300'}`}
        >
          <div className={`p-3 rounded-xl ${activeStatus === 'Completed' ? 'bg-goldenrod text-white' : 'bg-amber-50 text-goldenrod'}`}><BarChart3 size={20}/></div>
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cycle Closed</p><p className="text-2xl font-black">{stats.completed}</p></div>
        </button>

        <button 
          onClick={() => setActiveStatus('Archived')}
          className={`bg-white border p-5 rounded-[1.5rem] flex items-center gap-4 shadow-sm transition-all text-left ${activeStatus === 'Archived' ? 'border-amber-700 ring-2 ring-amber-700/20' : 'hover:border-slate-300'}`}
        >
          <div className={`p-3 rounded-xl ${activeStatus === 'Archived' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-700'}`}><Archive size={20}/></div>
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recycle Bin</p><p className="text-2xl font-black">{stats.archived}</p></div>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-4 flex flex-wrap items-center justify-center gap-2 shadow-sm">
        <button 
          onClick={() => setMonthFilter('')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${monthFilter === '' ? 'bg-blueprint-blue text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
        >
          All Time
        </button>
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
          <button
            key={m}
            onClick={() => setMonthFilter(i.toString())}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${monthFilter === i.toString() ? 'bg-blueprint-blue text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-20 flex flex-col items-center justify-center gap-4 bg-white rounded-[2rem] border shadow-sm">
          <Loader2 className="animate-spin text-blueprint-blue" size={48} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Registry...</p>
          <button 
            onClick={() => fetchRequests()}
            className="mt-4 text-[9px] text-blueprint-blue uppercase font-black tracking-widest hover:underline"
          >
            Retry Sync
          </button>
        </div>
      ) : viewMode === 'nested' ? (
        <NestedFolderView 
          requests={filteredRequests} 
          onApprove={(req) => handleAction(req, true)}
          onReject={(req) => handleAction(req, false)}
          processingId={processingId}
        />
      ) : viewMode === 'registry' ? (
        <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lead Student</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Activity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assets</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Alerts</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-display">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest italic">No matching logs found in this sector</td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const formattedEventDate = formatFancyDate(request.event_date);
                  const formattedEventEndDate = formatFancyDate(request.event_end_date);
                  const dateDisplay = (request.event_end_date && request.event_end_date !== request.event_date)
                    ? `${formattedEventDate} - ${formattedEventEndDate}`
                    : formattedEventDate;
                  return (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-black text-slate-900 uppercase text-xs">{request.student_name}</p>
                        <p className="text-[9px] text-slate-500 font-mono">ID: {request.register_no}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-black text-blueprint-blue uppercase text-sm tracking-tighter italic">{request.event_title}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{request.organization_name}</p>
                        <p className="text-[9px] text-slate-500 font-technical mt-1">{dateDisplay}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-wrap gap-1.5">
                          {request.event_type.split(' ').map((type, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blueprint-blue/5 text-blueprint-blue rounded-md text-[8px] font-black uppercase tracking-wider border border-blueprint-blue/10">
                              {type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          {request.od_letter_url ? (
                            <a 
                              href={request.od_letter_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                              title="View Authorized Letter"
                            >
                              <FileText size={18} />
                            </a>
                          ) : (
                            <span className="text-[8px] font-black text-slate-300 uppercase italic">Awaiting Sync</span>
                          )}
                          {(Array.isArray(request.geotag_photo_urls) && request.geotag_photo_urls.filter(Boolean).length > 0) && (
                            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg" title="Field Assets Cached">
                              <ExternalLink size={18} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {request.notification_sent ? (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <Bell size={12} className="fill-green-600/20" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Notified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Bell size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Pending</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                           <button 
                            onClick={() => setViewMode('inspection')} 
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                          >
                            <BookOpen size={14} /> Inspect
                          </button>

                          <button
                            onClick={() => sendManualNotification(request)}
                            disabled={processingId === request.id}
                            className={`px-3 py-2 border rounded-xl transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${request.notification_sent ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'}`}
                            title={request.notification_sent ? "Resend Notification" : "Send Initial Notification"}
                          >
                            {processingId === request.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                            {request.notification_sent ? "Resend" : "Notify"}
                          </button>
                          
                          {activeStatus === 'Archived' ? (
                            <>
                              <button
                                onClick={() => handleRestore(request.id)}
                                className="px-3 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-100 transition-all"
                                title="Restore to Pending"
                              >
                                <RefreshCcw size={16} />
                              </button>
                              <button
                                onClick={() => initiateHardDelete(request.id)}
                                className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-300 rounded-xl hover:bg-amber-100 transition-all"
                                title="Delete Permanently"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleSoftDelete(request.id)}
                              className="px-3 py-2 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                              title="Move to Recycle Bin"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between px-4">
            <button onClick={() => setViewMode('registry')} className="text-blueprint-blue font-black uppercase text-[10px] tracking-widest flex items-center gap-1 hover:translate-x-[-4px] transition-transform">
              <ChevronLeft size={16} /> Back to Registry
            </button>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Sector: {activeStatus}</p>
          </div>
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-[2rem] border p-20 text-center">
               <AlertCircle size={40} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-400 uppercase text-[10px] font-black tracking-[0.2em]">No logs staging for inspection</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="relative group">
                <FeedCard 
                  request={request}
                  isFaculty={true}
                  isProcessing={processingId === request.id}
                  onApprove={canApprove(request) ? (req) => handleAction(req, true) : undefined}
                  onReject={canApprove(request) ? (req) => handleAction(req, false) : undefined}
                />
                
                <div className="absolute top-4 right-16 flex gap-2">
                  <button 
                    onClick={() => sendManualNotification(request)}
                    disabled={processingId === request.id}
                    className={`bg-white p-2 rounded-lg shadow-sm border font-bold text-[10px] uppercase flex items-center gap-1 transition-all ${request.notification_sent ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50' : 'text-amber-600 border-amber-200 hover:bg-amber-50'}`}
                  >
                    {processingId === request.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                    {request.notification_sent ? "Resend" : "Notify"}
                  </button>
                  {activeStatus === 'Archived' ? (
                     <>
                        <button onClick={() => handleRestore(request.id)} className="bg-white p-2 rounded-lg text-green-600 shadow-sm border border-slate-200 hover:bg-green-50 font-bold text-[10px] uppercase flex items-center gap-1">
                          <RefreshCcw size={14} /> Restore
                        </button>
                        <button onClick={() => initiateHardDelete(request.id)} className="bg-white p-2 rounded-lg text-red-600 shadow-sm border border-slate-200 hover:bg-red-50 font-bold text-[10px] uppercase flex items-center gap-1">
                          <Trash2 size={14} /> Delete Forever
                        </button>
                     </>
                  ) : (
                    <button 
                      onClick={() => handleSoftDelete(request.id)}
                      className="bg-white p-2 rounded-lg text-slate-400 hover:text-red-500 shadow-sm border border-slate-200 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      title="Remove to Recycle Bin"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyAdmin;
