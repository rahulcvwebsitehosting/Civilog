
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, Profile, ODStatus } from '../types';
import { Loader2, RefreshCw, Search, BarChart3, Clock, CheckCircle2, LayoutList, BookOpen, AlertCircle, ChevronLeft, Terminal, FileText, Download, ExternalLink } from 'lucide-react';
import { generateODDocument } from '../services/pdfService';
import { Link } from 'react-router-dom';
import FeedCard from './FeedCard';

const FacultyAdmin: React.FC = () => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ pending: 0, approved: 0, completed: 0 });
  const [activeStatus, setActiveStatus] = useState<ODStatus>('Pending');
  const [viewMode, setViewMode] = useState<'registry' | 'inspection'>('registry');
  const [facultyProfile, setFacultyProfile] = useState<Profile | null>(null);
  
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFacultyProfile({
          id: user.id,
          email: user.email || '',
          role: user.user_metadata?.role || 'faculty',
          full_name: user.user_metadata?.full_name || '',
          signature_url: user.user_metadata?.signature_url || null,
        });
      }

      // Fetch list based on active status
      const { data: listData } = await supabase
        .from('od_requests')
        .select('*')
        .eq('status', activeStatus)
        .order('created_at', { ascending: false });

      // Fetch all counts for stats
      const { count: pendingCount } = await supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending');
      const { count: approvedCount } = await supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved');
      const { count: completedCount } = await supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed');

      if (listData) setRequests(listData as ODRequest[]);
      setStats({ 
        pending: pendingCount || 0, 
        approved: approvedCount || 0, 
        completed: completedCount || 0 
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
          od_letter_url: publicUrl 
        }).eq('id', request.id);

        if (dbError) throw dbError;
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

  const filteredRequests = requests.filter(r => 
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.register_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.event_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">ADMIN TERMINAL</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64 mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Filter by name/ID/event..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-xs outline-none focus:border-blueprint-blue"
            />
          </div>
          <div className="bg-white border p-1 rounded-xl flex items-center shadow-sm">
            <button onClick={() => setViewMode('registry')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'registry' ? 'bg-blueprint-blue text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutList size={14} /> Registry
            </button>
            <button onClick={() => setViewMode('inspection')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'inspection' ? 'bg-blueprint-blue text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-slate-600'}`}>
              <BookOpen size={14} /> Inspection
            </button>
          </div>
          <button onClick={fetchRequests} className="p-2.5 bg-white border rounded-xl hover:bg-slate-50 transition-colors shadow-sm"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => setActiveStatus('Pending')}
          className={`bg-white border p-6 rounded-[2rem] flex items-center gap-5 shadow-sm transition-all text-left ${activeStatus === 'Pending' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'hover:border-slate-300'}`}
        >
          <div className={`p-4 rounded-2xl ${activeStatus === 'Pending' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}><Clock size={28}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Logs</p><p className="text-3xl font-black">{stats.pending}</p></div>
        </button>
        
        <button 
          onClick={() => setActiveStatus('Approved')}
          className={`bg-white border p-6 rounded-[2rem] flex items-center gap-5 shadow-sm transition-all text-left ${activeStatus === 'Approved' ? 'border-green-400 ring-2 ring-green-400/20' : 'hover:border-slate-300'}`}
        >
          <div className={`p-4 rounded-2xl ${activeStatus === 'Approved' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'}`}><CheckCircle2 size={28}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized</p><p className="text-3xl font-black">{stats.approved}</p></div>
        </button>

        <button 
          onClick={() => setActiveStatus('Completed')}
          className={`bg-white border p-6 rounded-[2rem] flex items-center gap-5 shadow-sm transition-all text-left ${activeStatus === 'Completed' ? 'border-blue-400 ring-2 ring-blue-400/20' : 'hover:border-slate-300'}`}
        >
          <div className={`p-4 rounded-2xl ${activeStatus === 'Completed' ? 'bg-blueprint-blue text-white' : 'bg-blue-100 text-blueprint-blue'}`}><BarChart3 size={28}/></div>
          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cycle Closed</p><p className="text-3xl font-black">{stats.completed}</p></div>
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
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900 uppercase text-xs">{request.student_name}</p>
                      <p className="text-[9px] text-slate-500 font-mono">ID: {request.register_no}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-black text-blueprint-blue uppercase text-sm tracking-tighter italic">{request.event_title}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{request.organization_name}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        {request.od_letter_url ? (
                          <a 
                            href={request.od_letter_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-2 bg-blue-50 text-blueprint-blue rounded-lg hover:bg-blue-100 transition-colors"
                            title="View Authorized Letter"
                          >
                            <FileText size={18} />
                          </a>
                        ) : (
                          <span className="text-[8px] font-black text-slate-300 uppercase italic">Awaiting Sync</span>
                        )}
                        {request.geotag_photo_url && (
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
                      </div>
                    </td>
                  </tr>
                ))
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
              <FeedCard 
                key={request.id} 
                request={request}
                isFaculty={true}
                isProcessing={processingId === request.id}
                onApprove={(req) => handleAction(req, true)}
                onReject={(req) => handleAction(req, false)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyAdmin;
