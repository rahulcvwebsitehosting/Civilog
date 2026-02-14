
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, ODStatus, Profile } from '../types';
import { Plus, XCircle, Loader2, HardHat } from 'lucide-react';
import SubmissionForm from './SubmissionForm';
import FeedCard from './FeedCard';
import exifr from 'exifr';

const StudentDashboard: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadState, setUploadState] = useState<{ id: string | null; type: 'photo' | 'certificate' | null }>({
    id: null,
    type: null
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

  const handleDelete = async (id: string) => {
    // Explicitly add user_id check to ensure RLS compliance
    const { error } = await supabase
      .from('od_requests')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id);

    if (error) {
      alert('Structural failure during deletion: ' + error.message);
    } else {
      setRequests(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleEvidenceUpload = async (request: ODRequest, type: 'photo' | 'certificate') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'photo' ? 'image/*' : '*/*';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploadState({ id: request.id, type });
      try {
        if (type === 'photo') {
          const metadata = await exifr.gps(file);
          if (!metadata || !metadata.latitude || !metadata.longitude) {
            throw new Error('No GPS data found. Use a geotagged photo from the event location.');
          }
        }

        const fileName = `${Date.now()}_${type}_${profile.id}.${file.name.split('.').pop()}`;
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
          .eq('id', request.id)
          .eq('user_id', profile.id);

        if (dbError) throw dbError;
        fetchRequests();
      } catch (err: any) {
        alert(err.message || 'Error uploading evidence');
      } finally {
        setUploadState({ id: null, type: null });
      }
    };
    
    input.click();
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
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
              onUploadEvidence={(type) => handleEvidenceUpload(request, type)}
              onDelete={handleDelete}
              isUploading={uploadState.id === request.id}
              uploadType={uploadState.type || undefined}
              currentUserId={profile.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
