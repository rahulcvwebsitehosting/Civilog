
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, Profile, ODStatus } from '../types';
import { Loader2, RefreshCw, Search, BarChart3, Clock, CheckCircle2, LayoutList, BookOpen, AlertCircle, ChevronLeft, Terminal, FileText, Download, ExternalLink, Database, Trash2, Archive, RefreshCcw, Lock, X } from 'lucide-react';
import { generateODDocument } from '../services/pdfService';
import { Link } from 'react-router-dom';
import FeedCard from './FeedCard';
import NotificationCenter from './NotificationCenter';

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

const FacultyAdmin: React.FC = () => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ pendingAdvisor: 0, pendingHOD: 0, approved: 0, completed: 0, archived: 0 });
  const [activeStatus, setActiveStatus] = useState<ODStatus>('Pending Advisor');
  const [viewMode, setViewMode] = useState<'registry' | 'inspection'>('registry');
  const [facultyProfile, setFacultyProfile] = useState<Profile | null>(null);

  // Auth for Delete
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  
  const ADMIN_PASSWORD = 'Adminesec@123';
  
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile: Profile = {
          id: user.id,
          email: user.email || '',
          role: user.user_metadata?.role || 'faculty',
          full_name: user.user_metadata?.full_name || '',
          signature_url: user.user_metadata?.signature_url || null,
          department: user.user_metadata?.department || null,
          is_hod: user.user_metadata?.is_hod || false,
        };
        setFacultyProfile(profile);

        // Auto-set active status based on role if it's the first load
        if (loading) {
          setActiveStatus(profile.is_hod ? 'Pending HOD' : 'Pending Advisor');
        }
      }

      // Fetch list based on active status
      let query = supabase
        .from('od_requests')
        .select('*')
        .eq('status', activeStatus)
        .order('created_at', { ascending: false });

      if (user?.user_metadata?.department) {
        query = query.eq('department', user.user_metadata.department);
      }

      const { data: listData } = await query;

      // Fetch all counts for stats
      let pendingAdvisorQuery = supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending Advisor');
      let pendingHODQuery = supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending HOD');
      let approvedQuery = supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved');
      let completedQuery = supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed');
      let archivedQuery = supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Archived');

      if (user?.user_metadata?.department) {
        pendingAdvisorQuery = pendingAdvisorQuery.eq('department', user.user_metadata.department);
        pendingHODQuery = pendingHODQuery.eq('department', user.user_metadata.department);
        approvedQuery = approvedQuery.eq('department', user.user_metadata.department);
        completedQuery = completedQuery.eq('department', user.user_metadata.department);
        archivedQuery = archivedQuery.eq('department', user.user_metadata.department);
      }

      const { count: pendingAdvisorCount } = await pendingAdvisorQuery;
      const { count: pendingHODCount } = await pendingHODQuery;
      const { count: approvedCount } = await approvedQuery;
      const { count: completedCount } = await completedQuery;
      const { count: archivedCount } = await archivedQuery;

      if (listData) setRequests(listData as ODRequest[]);
      setStats({ 
        pendingAdvisor: pendingAdvisorCount || 0,
        pendingHOD: pendingHODCount || 0,
        approved: approvedCount || 0, 
        completed: completedCount || 0,
        archived: archivedCount || 0
      });
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeStatus]);

  const handleAction = async (request: ODRequest, approve: boolean) => {
    if (approve && !facultyProfile?.signature_url) {
      alert("Faculty E-Signature is required for approval. Please update your profile.");
      return;
    }

    setProcessingId(request.id);
    try {
      if (approve && facultyProfile) {
        if (facultyProfile.is_hod) {
          // HOD Approval Logic
          const studentProfile: Profile = {
            id: request.user_id,
            email: '',
            role: 'student',
            full_name: request.student_name,
            year: request.year
          };

          const pdfBlob = await generateODDocument(request, studentProfile, facultyProfile);
          const fileName = `Approved_OD_${request.register_no}_${Date.now()}.pdf`;
          const filePath = `od_letters/${fileName}`;
          
          const { error: uploadError } = await supabase.storage.from('od-files').upload(filePath, pdfBlob);
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('od-files').getPublicUrl(filePath);

          const { error: dbError } = await supabase.from('od_requests').update({ 
            status: 'Approved', 
            od_letter_url: publicUrl,
            hod_id: facultyProfile.id
          }).eq('id', request.id);

          if (dbError) throw dbError;

          // Trigger Email & In-App Notification
          try {
            const { data: studentProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', request.user_id)
              .single();

            const notificationMessage = `Dear ${request.student_name}, your OD for ${request.event_title} has been sanctioned. All the best for your presentation! - ESEC OD Portal.`;

            // 1. Try Email (Currently on hold as per user request)
            /*
            if (studentProfile?.email) {
              await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: studentProfile.email,
                  subject: 'OD Sanctioned - ESEC OD Portal',
                  message: notificationMessage
                })
              });
            }
            */

            // 2. Try In-App Notification (Assuming notifications table exists)
            await supabase.from('notifications').insert({
              user_id: request.user_id,
              message: notificationMessage,
              type: 'success',
              read: false
            });
          } catch (notificationErr) {
            console.error("Failed to send notification:", notificationErr);
          }
        } else {
          // Advisor Approval Logic
          const { error: dbError } = await supabase.from('od_requests').update({ 
            status: 'Pending HOD',
            advisor_id: facultyProfile.id
          }).eq('id', request.id);

          if (dbError) throw dbError;
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

  const filteredRequests = requests.filter(r => 
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.register_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.event_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 relative">
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

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">ADMIN TERMINAL</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="bg-white border p-1 rounded-xl flex items-center shadow-sm">
            <button onClick={() => setViewMode('registry')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'registry' ? 'bg-blueprint-blue text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutList size={14} /> List
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

      {loading ? (
        <div className="p-20 flex flex-col items-center justify-center gap-4 bg-white rounded-[2rem] border shadow-sm">
          <Loader2 className="animate-spin text-blueprint-blue" size={48} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Registry...</p>
        </div>
      ) : viewMode === 'registry' ? (
        <div className="bg-white rounded-[2rem] border shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lead Student</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Activity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assets</th>
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
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                           <button 
                            onClick={() => setViewMode('inspection')} 
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
                          >
                            <BookOpen size={14} /> Inspect
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
                  onApprove={(req) => handleAction(req, true)}
                  onReject={(req) => handleAction(req, false)}
                />
                
                {activeStatus === 'Archived' ? (
                   <div className="absolute top-4 right-16 flex gap-2">
                      <button onClick={() => handleRestore(request.id)} className="bg-white p-2 rounded-lg text-green-600 shadow-sm border border-slate-200 hover:bg-green-50 font-bold text-[10px] uppercase flex items-center gap-1">
                        <RefreshCcw size={14} /> Restore
                      </button>
                      <button onClick={() => initiateHardDelete(request.id)} className="bg-white p-2 rounded-lg text-red-600 shadow-sm border border-slate-200 hover:bg-red-50 font-bold text-[10px] uppercase flex items-center gap-1">
                        <Trash2 size={14} /> Delete Forever
                      </button>
                   </div>
                ) : (
                  <button 
                    onClick={() => handleSoftDelete(request.id)}
                    className="absolute top-4 right-16 bg-white p-2 rounded-lg text-slate-400 hover:text-red-500 shadow-sm border border-slate-200 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    title="Remove to Recycle Bin"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyAdmin;
