
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, ODStatus, Profile } from '../types';
import { Plus, XCircle, Loader2, HardHat, Terminal } from 'lucide-react';
import SubmissionForm from './SubmissionForm';
import FeedCard from './FeedCard';
import exifr from 'exifr';
import { Link } from 'react-router-dom';

const StudentDashboard: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadState, setUploadState] = useState<{ id: string | null; type: string | null; index: number | null }>({
    id: null,
    type: null,
    index: null
  });

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('od_requests')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) setRequests(data as ODRequest[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [profile.id]);

  const handleDelete = async (request: ODRequest) => {
    if (request.status === 'Approved' || request.status === 'Completed') {
      alert("Structural Violation: Authorized logs cannot be deleted from the central registry.");
      return;
    }

    const { error } = await supabase
      .from('od_requests')
      .delete()
      .eq('id', request.id)
      .eq('user_id', profile.id);

    if (error) {
      alert('Structural failure during deletion: ' + error.message);
    } else {
      setRequests(prev => prev.filter(r => r.id !== request.id));
    }
  };

  const handleEvidenceUpload = async (request: ODRequest, type: 'photo' | 'certificate' | 'prize', index: number = 0) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'photo' ? 'image/*' : '*/*';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploadState({ id: request.id, type, index });
      try {
        // Removed geotag detection logic
        // if (type === 'photo') {
        //   const metadata = await exifr.gps(file);
        //   if (!metadata || !metadata.latitude || !metadata.longitude) {
        //     throw new Error('No GPS data found. Use a geotagged photo from the event location.');
        //   }
        // }

        const fileName = `${Date.now()}_${type}_idx${index}_${profile.id}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('od-files')
          .upload(`evidence/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('od-files')
          .getPublicUrl(`evidence/${fileName}`);

        const updates: any = {};
        
        if (type === 'photo') {
          const current = request.geotag_photo_urls || [];
          const next = [...current];
          next[index] = publicUrl;
          updates.geotag_photo_urls = next;
          // Sync legacy field for compatibility if first slot
          if (index === 0) updates.geotag_photo_url = publicUrl;
        } else if (type === 'certificate') {
          const current = request.certificate_urls || [];
          const next = [...current];
          next[index] = publicUrl;
          updates.certificate_urls = next;
          // Sync legacy field if first slot
          if (index === 0) updates.certificate_url = publicUrl;
        } else if (type === 'prize') {
          const current = request.prize_certificate_urls || [];
          const next = [...current];
          next[index] = publicUrl;
          updates.prize_certificate_urls = next;
        }

        // Auto-complete logic: at least one photo and one certificate required
        const hasPhoto = (type === 'photo') || (request.geotag_photo_urls && request.geotag_photo_urls.length > 0);
        const hasCert = (type === 'certificate') || (request.certificate_urls && request.certificate_urls.length > 0);
        
        if (hasPhoto && hasCert) {
          updates.status = 'Completed';
        }

        const { error: dbError } = await supabase
          .from('od_requests')
          .update(updates)
          .eq('id', request.id)
          .eq('user_id', profile.id);

        if (dbError) throw dbError;
        fetchRequests();
      } catch (err: any) {
        alert(err.message || 'Error uploading evidence');
      } finally {
        setUploadState({ id: null, type: null, index: null });
      }
    };
    
    input.click();
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 relative">
      <div className="mb-8 flex justify-between items-end bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-blueprint-blue/10">
        <div>
          <h2 className="text-3xl font-black text-blueprint-blue tracking-tighter uppercase italic">ACTIVITY FEED</h2>
          <p className="text-[10px] text-pencil-gray font-technical uppercase tracking-[0.2em] font-bold">Structural Log • Civil Engineering</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blueprint-blue text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-900 transition-all shadow-lg shadow-blue-100 uppercase text-xs tracking-wider"
        >
          <Plus size={16} /> Log Entry
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <SubmissionForm 
            onSuccess={() => { setShowForm(false); fetchRequests(); }} 
            onClose={() => setShowForm(false)}
            profile={profile} 
          />
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="animate-spin text-blueprint-blue" size={48} />
            <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-blueprint-blue text-sm">construction</span>
          </div>
          <p className="text-pencil-gray font-technical uppercase tracking-widest text-xs font-bold">Synchronizing Feed...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-16 text-center">
          <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
            <span className="material-symbols-outlined text-6xl">history_edu</span>
          </div>
          <h3 className="text-2xl font-black text-blueprint-blue uppercase italic tracking-tighter">No Activity Logged</h3>
          <p className="text-pencil-gray mt-2 mb-8 font-display">Your technical activity feed is currently empty.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-blueprint-blue font-black uppercase text-xs tracking-widest hover:underline inline-flex items-center gap-2"
          >
            Create your first entry <Plus size={16} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {requests.map((request) => (
            <FeedCard 
              key={request.id} 
              request={request}
              onUploadEvidence={(type, idx) => handleEvidenceUpload(request, type, idx)}
              onDelete={() => handleDelete(request)}
              isUploading={uploadState.id === request.id}
              uploadType={uploadState.type || undefined}
              uploadIndex={uploadState.index || undefined}
              currentUserId={profile.id}
            />
          ))}
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

export default StudentDashboard;