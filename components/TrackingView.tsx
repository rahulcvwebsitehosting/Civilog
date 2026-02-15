
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, ODStatus } from '../types';
import { Search as SearchIcon, Loader2, Download, Image as ImageIcon, Award, FileCheck, Info, MapPin, CheckCircle2, Calendar } from 'lucide-react';
import exifr from 'exifr';

const TrackingView: React.FC = () => {
  const [registerNo, setRegisterNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ODRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState<{ id: string; type: 'photo' | 'certificate' } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerNo) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('od_requests')
        .select('*')
        .eq('register_no', registerNo)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setResults(data as ODRequest[]);
      if (data.length === 0) {
        setError('No submittals found for this technical identification.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEvidenceUpload = async (request: ODRequest, file: File, type: 'photo' | 'certificate') => {
    setUploading({ id: request.id, type });
    try {
      // Removed geotag detection logic
      // if (type === 'photo') {
      //   const metadata = await exifr.gps(file);
      //   if (!metadata || !metadata.latitude || !metadata.longitude) {
      //     throw new Error('Structural Validation Failed: Photo lacks GPS metadata. Ensure location services were active during field logging.');
      //   }
      // }

      const fileName = `${Date.now()}_${type}_${request.register_no}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('od-files')
        .upload(`evidence/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('od-files')
        .getPublicUrl(`evidence/${fileName}`);

      const updates: any = {};
      if (type === 'photo') updates.geotag_photo_url = publicUrl;
      else updates.certificate_url = publicUrl;

      const isBothNow = (type === 'photo' && request.certificate_url) || (type === 'certificate' && request.geotag_photo_url);
      if (isBothNow) updates.status = 'Completed';

      const { error: dbError } = await supabase
        .from('od_requests')
        .update(updates)
        .eq('id', request.id);

      if (dbError) throw dbError;
      
      setResults(prev => prev.map(r => {
        if (r.id === request.id) {
          return { ...r, ...updates };
        }
        return r;
      }));
    } catch (err: any) {
      alert(err.message || 'Evidence logging failed.');
    } finally {
      setUploading(null);
    }
  };

  const getStatusStyle = (status: ODStatus) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="mb-12 text-center">
        <div className="inline-flex bg-blueprint-blue/10 p-3 rounded-2xl mb-4 text-blueprint-blue animate-pin">
           <SearchIcon size={32} />
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Tracking Terminal</h2>
        <p className="text-pencil-gray mt-2 font-bold uppercase tracking-widest text-[10px]">Technical Progress Verification Center</p>
        
        <form onSubmit={handleSearch} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              required
              placeholder="Registration ID..."
              value={registerNo}
              onChange={(e) => setRegisterNo(e.target.value.trim())}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-blueprint-blue outline-none transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blueprint-blue text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-900 transition-all uppercase tracking-widest text-xs"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Query System'}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-white border-2 border-slate-100 p-12 rounded-[2.5rem] text-center shadow-xl shadow-slate-100/50">
            <Info className="mx-auto text-slate-200 mb-4" size={56} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">{error}</p>
          </div>
        )}

        {results.map((request) => {
          const isEventPassed = new Date(request.event_end_date || request.event_date) < new Date();
          const dateRange = (request.event_end_date && request.event_end_date !== request.event_date)
            ? `${request.event_date} - ${request.event_end_date}`
            : request.event_date;

          return (
            <div key={request.id} className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-200 overflow-hidden relative group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blueprint-blue/10 to-transparent"></div>
              <div className="p-8 flex flex-col md:flex-row gap-8 justify-between items-start">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${getStatusStyle(request.status)}`}>
                      {request.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-technical font-bold uppercase tracking-widest">Logged {new Date(request.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{request.event_title}</h3>
                    <p className="text-pencil-gray font-bold text-sm">{request.organization_name}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Calendar size={12} className="text-blueprint-blue" />
                      <p className="text-[10px] text-blue-600 font-black uppercase">
                        TECHNICAL DATE: {dateRange}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    {(request.status === 'Approved' || request.status === 'Completed') && request.od_letter_url && (
                      <a
                        href={request.od_letter_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-blueprint-blue text-white rounded-xl font-black hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/10 uppercase text-[10px] tracking-widest"
                      >
                        <Download size={16} />
                        Retrieve OD Letter
                      </a>
                    )}
                  </div>
                </div>

                {request.status === 'Approved' && isEventPassed && (
                  <div className="w-full md:w-72 bg-slate-50 p-6 rounded-2xl border border-slate-200 shrink-0">
                    <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2 uppercase text-[10px] tracking-widest">
                      <FileCheck className="text-primary" size={16} />
                      FIELD EVIDENCE
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Geotagged Photo</span>
                        {request.geotag_photo_url ? (
                          <div className="flex items-center gap-2 text-green-600 text-[10px] font-black uppercase bg-green-50 px-3 py-3 rounded-xl border border-green-100">
                            <CheckCircle2 size={14} /> LOGGED SUCCESSFULLY
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 w-full p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-[10px] font-black uppercase text-slate-600 tracking-widest shadow-sm">
                            {uploading?.id === request.id && uploading?.type === 'photo' ? <Loader2 className="animate-spin text-primary" /> : (
                              <><MapPin size={16} /> Upload Photo</>
                            )}
                            <input type="file" className="sr-only" accept="image/*" onChange={(e) => e.target.files && handleEvidenceUpload(request, e.target.files[0], 'photo')} />
                          </label>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Participation Certificate</span>
                        {request.certificate_url ? (
                          <div className="flex items-center gap-2 text-green-600 text-[10px] font-black uppercase bg-green-50 px-3 py-3 rounded-xl border border-green-100">
                            <CheckCircle2 size={14} /> ARCHIVED
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 w-full p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-[10px] font-black uppercase text-slate-600 tracking-widest shadow-sm">
                             {uploading?.id === request.id && uploading?.type === 'certificate' ? <Loader2 className="animate-spin text-primary" /> : (
                              <><Award size={16} /> Upload Cert</>
                            )}
                            <input type="file" className="sr-only" onChange={(e) => e.target.files && handleEvidenceUpload(request, e.target.files[0], 'certificate')} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {request.status === 'Completed' && (
                   <div className="w-full md:w-64 bg-blueprint-blue text-white p-8 rounded-[2rem] flex flex-col items-center text-center shrink-0 shadow-2xl shadow-blue-900/30">
                    <div className="bg-white/10 p-4 rounded-full mb-4 animate-pulse">
                      <FileCheck size={40} />
                    </div>
                    <h4 className="font-black uppercase text-[11px] tracking-[0.3em] italic">CYCLE CLOSED</h4>
                    <p className="text-[9px] uppercase font-bold opacity-60 mt-2">Structural Authentication Verified</p>
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackingView;