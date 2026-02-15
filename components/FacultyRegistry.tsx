
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest } from '../types';
import { Loader2, Download, Search, RefreshCw, Award, Edit3, Save, X, ExternalLink, Trophy, Image as ImageIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

const FacultyRegistry: React.FC = () => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fetchRegistry = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('od_requests')
      .select('*')
      .in('status', ['Approved', 'Completed'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data as ODRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRegistry();

    // Subscribe to changes to handle "Logic: Ensure the table refreshes when new certificates are uploaded"
    const subscription = supabase
      .channel('od_requests_registry')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'od_requests' }, () => {
        fetchRegistry();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleExport = () => {
    const exportData = filteredRequests.map(r => ({
      'Student Name': r.student_name,
      'Roll No': r.roll_no,
      'Register No': r.register_no,
      'Year': r.year,
      'Event Title': r.event_title,
      'Organization': r.organization_name,
      'Event Type': r.event_type,
      'Event Date': r.event_date,
      'Status': r.status,
      'Achievement': r.achievement_details || 'N/A',
      'Prize Details': (Array.isArray(r.prize_details) ? r.prize_details : []).map(p => `${p.type} (${p.event})`).join('; ') || 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OD_Registry");
    XLSX.writeFile(wb, `CivLog_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUpdateAchievement = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('od_requests')
      .update({ achievement_details: editValue })
      .eq('id', id);

    if (error) {
      alert('Failed to update achievement details: ' + error.message);
    } else {
      setEditingId(null);
      fetchRegistry();
    }
  };

  const filteredRequests = requests.filter(r => 
    r.student_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.register_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.event_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white/50 backdrop-blur-sm p-8 rounded-[2rem] border border-blueprint-blue/10">
        <div>
          <h2 className="text-4xl font-black text-blueprint-blue tracking-tighter uppercase italic">Central Registry</h2>
          <p className="text-[10px] text-pencil-gray font-technical uppercase tracking-[0.2em] font-bold mt-1">Authorized Logs & Achievement Database</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search registry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-xs outline-none focus:border-blueprint-blue shadow-sm"
            />
          </div>
          <button 
            onClick={fetchRegistry}
            className="p-2.5 bg-white border rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            title="Refresh Registry"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleExport}
            className="px-6 py-2.5 bg-blueprint-blue text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-900/20 flex items-center gap-2 hover:bg-blue-900 transition-all"
          >
            <Download size={16} /> Export spreadsheet
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b-2 border-slate-100">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">IDENTIFICATION</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">FIELD ACTIVITY</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">TIMELINE</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ACHIEVEMENT / PRIZE DETAILS</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-display">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin text-blueprint-blue mx-auto mb-4" size={40} />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Central Archive...</p>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search size={32} className="text-slate-200" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No matching authorized logs found</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-900 uppercase text-xs tracking-tight">{request.student_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-blueprint-blue/60 uppercase tracking-widest">{request.year}YR</span>
                        <span className="text-[9px] text-slate-400 font-mono">ID: {request.register_no}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-black text-blueprint-blue uppercase text-xs italic tracking-tighter">{request.event_title}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{request.organization_name}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{request.event_date}</span>
                        {request.event_end_date && request.event_end_date !== request.event_date && (
                          <span className="text-[8px] text-slate-400 uppercase">to {request.event_end_date}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 min-w-[200px]">
                      <div className="space-y-3">
                        {editingId === request.id ? (
                          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200 shadow-inner">
                            <input 
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Enter general achievement notes..."
                              className="bg-transparent text-[10px] font-bold uppercase w-full outline-none"
                              autoFocus
                            />
                            <button onClick={() => handleUpdateAchievement(request.id)} className="text-green-600 p-1 hover:bg-green-100 rounded transition-colors"><Save size={14}/></button>
                            <button onClick={() => setEditingId(null)} className="text-slate-400 p-1 hover:bg-slate-200 rounded transition-colors"><X size={14}/></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <p className={`text-[10px] font-bold uppercase ${request.achievement_details ? 'text-slate-700' : 'text-slate-300 italic'}`}>
                              {request.achievement_details || 'No general achievement notes.'}
                            </p>
                            <button 
                              onClick={() => {
                                setEditingId(request.id);
                                setEditValue(request.achievement_details || '');
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:text-blueprint-blue transition-all"
                              title="Edit Achievement Notes"
                            >
                              <Edit3 size={12} />
                            </button>
                          </div>
                        )}
                        {(Array.isArray(request.prize_details) && request.prize_details.length > 0) && (
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                              <Trophy size={10} className="text-primary" /> Prize Logs:
                            </p>
                            {request.prize_details.map((prize, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                {prize.url ? (
                                  <a 
                                    href={prize.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded transition-all text-[10px] font-black uppercase tracking-tight italic border border-primary/20"
                                  >
                                    {prize.type} <ImageIcon size={10} />
                                  </a>
                                ) : (
                                  <span className="text-[10px] font-bold text-primary uppercase tracking-tight italic">{prize.type}</span>
                                )}
                                <span className="text-[9px] text-slate-500 normal-case">in {prize.event}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 rounded-md text-[8px] font-black tracking-widest uppercase border ${
                          request.status === 'Completed' 
                            ? 'bg-blue-50 text-blueprint-blue border-blue-100' 
                            : 'bg-green-50 text-green-600 border-green-100'
                        }`}>
                          {request.status}
                        </span>
                        {Array.isArray(request.certificate_urls) && request.certificate_urls.filter(Boolean).length > 0 && (
                          <div className="flex items-center gap-1 text-[8px] font-black text-green-600 uppercase">
                            <Award size={10} /> Certified
                          </div>
                        )}
                        {Array.isArray(request.prize_details) && request.prize_details.filter(Boolean).length > 0 && (
                          <div className="flex items-center gap-1 text-[8px] font-black text-primary uppercase">
                            <Trophy size={10} /> PRIZE LOGGED
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-8 py-4 border-t flex justify-between items-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
            Displaying {filteredRequests.length} of {requests.length} Total Registry Entries
          </p>
          <div className="flex items-center gap-2 opacity-30 grayscale">
            <span className="material-symbols-outlined text-xs">database</span>
            <span className="text-[8px] font-technical font-bold uppercase tracking-widest">CIVLOG_REGISTRY_v2.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyRegistry;
