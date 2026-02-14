
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest } from '../types';
import { CheckCircle, XCircle, Loader2, RefreshCw, FileCheck, Search, Paperclip, CreditCard, Image as ImageIcon, Phone, BarChart3, Clock, CheckCircle2, X, Download } from 'lucide-react';
import { generateODLetter } from '../services/pdfService';

const ImagePreviewModal: React.FC<{ url: string; onClose: () => void; label: string }> = ({ url, onClose, label }) => {
  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-12 left-0 right-0 flex justify-between items-center text-white">
          <h3 className="font-black uppercase tracking-widest text-xs italic">{label} Preview</h3>
          <div className="flex gap-2">
            <a 
              href={url} 
              download 
              target="_blank" 
              rel="noreferrer"
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <Download size={20} />
            </a>
            <button 
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <img 
          src={url} 
          alt={label} 
          className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300"
        />
      </div>
    </div>
  );
};

const FacultyAdmin: React.FC = () => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ pending: 0, approved: 0, completed: 0 });
  const [previewImage, setPreviewImage] = useState<{ url: string, label: string } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
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
    setProcessingId(request.id);
    try {
      if (approve) {
        const pdfBlob = await generateODLetter(request);
        const fileName = `OD_Letter_${request.register_no}_${Date.now()}.pdf`;
        
        await supabase.storage.from('od-files').upload(`od_letters/${fileName}`, pdfBlob);
        const { data: { publicUrl } } = supabase.storage.from('od-files').getPublicUrl(`od_letters/${fileName}`);

        await supabase.from('od_requests').update({ status: 'Approved', od_letter_url: publicUrl }).eq('id', request.id);
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

  const isPdf = (url: string | null) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.pdf');
  };

  const handlePreview = (url: string | null, label: string) => {
    if (!url) return;
    if (isPdf(url)) {
      window.open(url, '_blank');
    } else {
      setPreviewImage({ url, label });
    }
  };

  const filteredRequests = requests.filter(r => 
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.register_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {previewImage && (
        <ImagePreviewModal 
          url={previewImage.url} 
          label={previewImage.label} 
          onClose={() => setPreviewImage(null)} 
        />
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">ADMIN TERMINAL</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Structural Engineering Submittal Review</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search ID/Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm w-full md:w-48 font-mono shadow-sm"
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blueprint-blue" size={48} />
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Fetching submittals...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-20 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <FileCheck size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 uppercase italic">Queue Clear</h3>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">No pending submittals require validation</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lead Entity</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Activity Specs</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Verification Docs</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="mb-2">
                        <p className="font-black text-slate-900 uppercase text-xs tracking-tighter">{request.student_name} ({request.year}Y)</p>
                        <p className="text-[9px] text-slate-500 font-mono">ID: {request.register_no} • Roll: {request.roll_no}</p>
                        <p className="text-[10px] text-primary font-black flex items-center gap-1 mt-1">
                          <Phone size={10} /> {request.phone_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-black text-blueprint-blue uppercase tracking-tight text-sm">{request.event_title}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-black italic mt-1">{request.event_date} • {request.organization_name}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        {request.event_poster_url && (
                          <button 
                            onClick={() => handlePreview(request.event_poster_url, 'Event Poster')}
                            className="flex items-center gap-1.5 text-[10px] font-black text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 w-fit transition-colors"
                          >
                            <ImageIcon size={14} /> POSTER_PREVIEW
                          </button>
                        )}
                        <button 
                          onClick={() => handlePreview(request.registration_proof_url, 'Registration')}
                          className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 w-fit transition-colors"
                        >
                          <Paperclip size={14} /> REGISTRATION_PROOF
                        </button>
                        {request.payment_proof_url && (
                          <button 
                            onClick={() => handlePreview(request.payment_proof_url, 'Payment')}
                            className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 w-fit transition-colors"
                          >
                            <CreditCard size={14} /> PAYMENT_PROOF
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {processingId === request.id ? (
                        <Loader2 className="animate-spin text-blueprint-blue inline" size={24} />
                      ) : (
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleAction(request, false)} className="p-2.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all border border-transparent hover:border-red-100" title="Reject"><XCircle size={24} /></button>
                          <button onClick={() => handleAction(request, true)} className="p-2.5 text-green-500 hover:bg-green-50 hover:text-green-600 rounded-xl transition-all border border-transparent hover:border-green-100" title="Approve"><CheckCircle size={24} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyAdmin;
