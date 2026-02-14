
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, Profile } from '../types';
import { Loader2, RefreshCw, Search, BarChart3, Clock, CheckCircle2, LayoutList, BookOpen, AlertCircle, ChevronLeft, Terminal } from 'lucide-react';
import { generateODDocument } from '../services/pdfService';
import { Link } from 'react-router-dom';
import FeedCard from './FeedCard';

const FacultyAdmin: React.FC = () => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ pending: 0, approved: 0, completed: 0 });
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

      const { data: pendingData } = await supabase.from('od_requests').select('*').eq('status', 'Pending').order('created_at', { ascending: false });
      const { count: approvedCount } = await supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved');
      const { count: completedCount } = await supabase.from('od_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed');

      if (pendingData) setRequests(pendingData as ODRequest[]);
      setStats({ 
        pending: pendingData?.length || 0, 
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
  }, []);

  const handleAction = async (request: ODRequest, approve: boolean) => {
    if (approve && !facultyProfile?.signature_url) {
      alert("Structural Violation: Faculty E-Signature is required for approval.");
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
          signature_url: request.remarks
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">ADMIN TERMINAL</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Structural Engineering Submittal Review</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm">
            <button 
              onClick={() => setViewMode('registry')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'registry' ? 'bg-blueprint-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutList size={14} /> Registry
            </button>
            <button 
              onClick={() => setViewMode('inspection')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'inspection' ? 'bg-blueprint-blue text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <BookOpen size={14} /> Inspection
            </button>
          </div>
          
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Filter Terminal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blueprint-blue outline-none text-sm w-full md:w-48 font-mono shadow-sm"
            />
          </div>
          <button onClick={fetchRequests} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-amber-100 p-4 rounded-2xl text-amber-600"><Clock size={28}/></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Review</p>
            <p className="text-3xl font-black text-slate-900 leading-none mt-1">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-green-100 p-4 rounded-2xl text-green-600"><CheckCircle2 size={28}/></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Permissions</p>
            <p className="text-3xl font-black text-slate-900 leading-none mt-1">{stats.approved}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-[2rem] flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-blue-100 p-4 rounded-2xl text-blueprint-blue"><BarChart3 size={28}/></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Closed Cycles</p>
            <p className="text-3xl font-black text-slate-900 leading-none mt-1">{stats.completed}</p>
          </div>
        </div>
      </div>

      {!facultyProfile?.signature_url && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-700 shadow-sm">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-[11px] font-black uppercase tracking-widest leading-tight">
            Institutional Lock: No E-Signature detected. Add yours in <Link to="/profile" className="underline hover:text-amber-900">System Profile</Link> to enable submittal authorization.
          </p>
        </div>
      )}

      {loading ? (
        <div className="p-20 flex flex-col items-center gap-4 bg-white rounded-[2rem] border border-slate-200">
          <Loader2 className="animate-spin text-blueprint-blue" size={48} />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Submittals...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-20 text-center bg-white rounded-[2rem] border border-slate-200">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 uppercase italic">Queue Clear</h3>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">No pending submittals require validation at this node</p>
        </div>
      ) : viewMode === 'registry' ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lead Entity</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Activity Specs</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action Terminal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900 uppercase text-xs tracking-tighter">
                        {request.student_name} ({request.year}Y)
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono">ID: {request.register_no} • Roll: {request.roll_no}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-black text-blueprint-blue uppercase tracking-tight text-sm">{request.event_title}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black italic mt-1">{request.event_date} • {request.organization_name}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button 
                        onClick={() => setViewMode('inspection')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blueprint-blue hover:text-white transition-all border border-slate-200"
                      >
                        <BookOpen size={14} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="mb-6 flex items-center justify-between sticky top-24 z-40 bg-drafting-paper/90 backdrop-blur-md p-4 rounded-2xl border border-blueprint-blue/10">
             <button 
              onClick={() => setViewMode('registry')}
              className="text-blueprint-blue font-black uppercase text-[10px] tracking-widest flex items-center gap-1 hover:underline"
             >
               <ChevronLeft size={16} /> Back to Registry
             </button>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Reviewing {filteredRequests.length} Pending Submittals
             </span>
          </div>
          <div className="space-y-6">
            {filteredRequests.map((request) => (
              <FeedCard 
                key={request.id} 
                request={request}
                isFaculty={true}
                isProcessing={processingId === request.id}
                onApprove={(req) => handleAction(req, true)}
                onReject={(req) => handleAction(req, false)}
              />
            ))}
          </div>
        </div>
      )}

      {/* CTO FAB */}
      <Link 
        to="/profile/rahul-shyam" 
        className="fixed bottom-24 lg:bottom-12 right-6 lg:right-12 w-14 h-14 bg-blueprint-blue text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-[90] group"
        title="CTO Terminal"
      >
        <Terminal size={24} className="group-hover:rotate-12 transition-transform" />
        <div className="absolute right-full mr-4 bg-blueprint-blue text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
           CTO PROFILE
        </div>
      </Link>
    </div>
  );
};

export default FacultyAdmin;
