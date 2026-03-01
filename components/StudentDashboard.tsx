
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, ODStatus, Profile } from '../types';
import { Plus, XCircle, Loader2, GraduationCap, Terminal, Trophy } from 'lucide-react';
import SubmissionForm from './SubmissionForm';
import FeedCard from './FeedCard';
import NotificationCenter from './NotificationCenter';
import { Link } from 'react-router-dom';

interface PrizeDetailsPromptModalProps {
  onClose: () => void;
  onConfirm: (prizeType: string, prizeEvent: string) => void;
  isLoading: boolean;
}

const PrizeDetailsPromptModal: React.FC<PrizeDetailsPromptModalProps> = ({ onClose, onConfirm, isLoading }) => {
  const [prizeType, setPrizeType] = useState('');
  const [prizeEvent, setPrizeEvent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!prizeType.trim() || !prizeEvent.trim()) {
      setError('Both prize type and associated event are required.');
      return;
    }
    onConfirm(prizeType, prizeEvent);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative border border-slate-200 animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors p-1">
          <XCircle size={24} />
        </button>
        <div className="text-center mb-6">
          <Trophy size={48} className="text-primary mx-auto mb-3" />
          <h3 className="text-2xl font-black text-blueprint-blue uppercase italic tracking-tighter">Prize Achievement</h3>
          <p className="text-[10px] text-pencil-gray font-technical uppercase tracking-widest mt-1">Details for Verification</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="prizeType" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Prize Type</label>
            <input
              id="prizeType"
              type="text"
              value={prizeType}
              onChange={(e) => setPrizeType(e.target.value)}
              placeholder="e.g., 1st Place, Best Innovation, Runner Up"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blueprint-blue outline-none text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="prizeEvent" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Associated Event</label>
            <input
              id="prizeEvent"
              type="text"
              value={prizeEvent}
              onChange={(e) => setPrizeEvent(e.target.value)}
              placeholder="e.g., Inter-College Robotics Competition"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blueprint-blue outline-none text-sm"
              required
            />
          </div>
          {error && <p className="text-red-600 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blueprint-blue text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-goldenrod transition-all shadow-lg shadow-amber-500/10 uppercase tracking-widest text-xs"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Save Prize Details'}
          </button>
        </form>
      </div>
    </div>
  );
};


const StudentDashboard: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadState, setUploadState] = useState<{ id: string | null; type: string | null; index: number | null }>({
    id: null,
    type: null,
    index: null
  });
  const [showPrizePrompt, setShowPrizePrompt] = useState(false);
  const [currentPrizeRequest, setCurrentPrizeRequest] = useState<ODRequest | null>(null);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState<number | null>(null);
  const [isPrizeDetailsSubmitting, setIsPrizeDetailsSubmitting] = useState(false); // For loading state of modal button
  const [tempPrizeUploadUrl, setTempPrizeUploadUrl] = useState<string | null>(null);


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
    if (request.status === 'Approved' || request.status === 'Completed' || request.status === 'Pending HOD') {
      alert("System Violation: Authorized or partially authorized logs cannot be deleted.");
      return;
    }

    const { error } = await supabase
      .from('od_requests')
      .delete()
      .eq('id', request.id)
      .eq('user_id', profile.id);

    if (error) {
      alert('System failure during deletion: ' + error.message);
    } else {
      setRequests(prev => prev.filter(r => r.id !== request.id));
    }
  };

  // This function now only initiates the file upload for prizes
  const initiatePrizeFileUpload = (request: ODRequest, index: number) => {
    setCurrentPrizeRequest(request);
    setCurrentPrizeIndex(index);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*'; // Certificates can be PDF or images
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) {
        // User cancelled file selection
        setUploadState({ id: null, type: null, index: null });
        return;
      }

      setUploadState({ id: request.id, type: 'prize', index }); // Indicate file upload is in progress
      try {
        const fileName = `${Date.now()}_prize_idx${index}_${profile.id}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('od-files')
          .upload(`evidence/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('od-files')
          .getPublicUrl(`evidence/${fileName}`);

        if (!publicUrl) {
          throw new Error('Failed to get public URL for prize certificate.');
        }

        setTempPrizeUploadUrl(publicUrl); // Store the URL temporarily
        setShowPrizePrompt(true);        // Show the modal to collect details
      } catch (err: any) {
        alert(err.message || 'Error uploading prize certificate.');
        setUploadState({ id: null, type: null, index: null }); // Clear upload state on error
      }
    };
    
    input.click();
  };

  // This function handles the modal confirmation, using the already uploaded URL
  const handlePrizeDetailsConfirmed = async (prizeType: string, prizeEvent: string) => {
    if (!currentPrizeRequest || currentPrizeIndex === null || !tempPrizeUploadUrl) {
      alert('Missing prize upload context. Please try again.');
      return;
    }

    setIsPrizeDetailsSubmitting(true); // Start loading for the modal button
    try {
      const updates: any = {};
      const currentPhotos = Array.isArray(currentPrizeRequest.geotag_photo_urls) ? currentPrizeRequest.geotag_photo_urls : [];
      const currentCerts = Array.isArray(currentPrizeRequest.certificate_urls) ? currentPrizeRequest.certificate_urls : [];
      const currentPrizeDetails = Array.isArray(currentPrizeRequest.prize_details) ? currentPrizeRequest.prize_details : [];

      const nextPrizeDetails = [...currentPrizeDetails];
      nextPrizeDetails[currentPrizeIndex] = { type: prizeType, event: prizeEvent, url: tempPrizeUploadUrl };
      updates.prize_details = nextPrizeDetails;
      
      // Auto-complete logic: Mark as Completed if a certificate is uploaded
      const hasAnyCert = (currentCerts.filter(Boolean).length > 0) || (nextPrizeDetails.filter(p => p.url && p.url.trim() !== '').length > 0);
      
      if (hasAnyCert) {
        updates.status = 'Completed';
      }

      const { error: dbError } = await supabase
        .from('od_requests')
        .update(updates)
        .eq('id', currentPrizeRequest.id)
        .eq('user_id', profile.id);

      if (dbError) throw dbError;
      await fetchRequests(); // Re-fetch to update local state and re-render FeedCard with new data
    } catch (err: any) {
      alert(err.message || 'Error saving prize details.');
    } finally {
      setUploadState({ id: null, type: null, index: null }); // Clear general upload state
      setShowPrizePrompt(false);
      setCurrentPrizeRequest(null);
      setCurrentPrizeIndex(null);
      setTempPrizeUploadUrl(null); // Clear temporary URL
      setIsPrizeDetailsSubmitting(false); // Clear modal submission state
    }
  };

  // General evidence upload (photos, non-prize certificates)
  const handleEvidenceUpload = async (request: ODRequest, type: 'photo' | 'certificate' | 'prize', index: number = 0) => {
    if (type === 'prize') {
      initiatePrizeFileUpload(request, index); // Call the specific prize file upload handler
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'photo' ? 'image/*' : '*/*';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploadState({ id: request.id, type, index });
      try {
        const fileName = `${Date.now()}_${type}_idx${index}_${profile.id}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('od-files')
          .upload(`evidence/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('od-files')
          .getPublicUrl(`evidence/${fileName}`);

        const updates: any = {};
        const currentPhotos = Array.isArray(request.geotag_photo_urls) ? request.geotag_photo_urls : [];
        const currentCerts = Array.isArray(request.certificate_urls) ? request.certificate_urls : [];
        const currentPrizeDetails = Array.isArray(request.prize_details) ? request.prize_details : [];

        if (type === 'photo') {
          const nextPhotos = [...currentPhotos];
          nextPhotos[index] = publicUrl;
          updates.geotag_photo_urls = nextPhotos;
        } else if (type === 'certificate') {
          const nextCerts = [...currentCerts];
          nextCerts[index] = publicUrl;
          updates.certificate_urls = nextCerts;
        } 
        
        // Auto-complete logic: Mark as Completed if a certificate is uploaded
        const hasCert = (type === 'certificate' && updates.certificate_urls?.[index]) || (currentCerts.filter(Boolean).length > 0) || (currentPrizeDetails.filter(p => p.url && p.url.trim() !== '').length > 0);
        
        if (hasCert) {
          updates.status = 'Completed';
        }

        const { error: dbError } = await supabase
          .from('od_requests')
          .update(updates)
          .eq('id', request.id)
          .eq('user_id', profile.id);

        if (dbError) throw dbError;
        await fetchRequests(); // Use await here to ensure state is updated before re-render
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
          <p className="text-[10px] text-pencil-gray font-technical uppercase tracking-[0.2em] font-bold">Activity Log • {profile.department || 'ESEC'}</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter userId={profile.id} />
          <button
            onClick={() => setShowForm(true)}
            className="bg-blueprint-blue text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-goldenrod transition-all shadow-lg shadow-amber-500/10 uppercase text-xs tracking-wider"
          >
            <Plus size={16} /> Log Entry
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <SubmissionForm 
            onSuccess={() => { setShowForm(false); fetchRequests(); }} 
            onClose={() => setShowForm(false)}
            profile={profile} 
          />
        </div>
      )}

      {showPrizePrompt && (
        <PrizeDetailsPromptModal
          onClose={() => {
            setShowPrizePrompt(false);
            setCurrentPrizeRequest(null);
            setCurrentPrizeIndex(null);
            setTempPrizeUploadUrl(null); // Clear temp URL if modal is closed
            setIsPrizeDetailsSubmitting(false); // Clear modal submission state
            setUploadState({ id: null, type: null, index: null }); // Also clear any lingering upload state
          }}
          onConfirm={handlePrizeDetailsConfirmed}
          isLoading={isPrizeDetailsSubmitting}
        />
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="animate-spin text-blueprint-blue" size={48} />
            <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-blueprint-blue text-sm">school</span>
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
              isUploading={uploadState.id === request.id} // Only use uploadState for FeedCard's isUploading
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
        className="fixed bottom-24 lg:bottom-12 right-6 lg:right-12 w-14 h-14 bg-blueprint-blue text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-[90] group shadow-amber-500/20"
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