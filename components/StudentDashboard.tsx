
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, ODStatus, Profile } from '../types';
import { Plus, XCircle, Loader2, GraduationCap, Terminal, Trophy, RefreshCw, Trash2, AlertCircle, X } from 'lucide-react';
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


interface DeleteConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
  request: ODRequest;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ onClose, onConfirm, request }) => {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full relative border-4 border-red-50 animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
        
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
            <Trash2 size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Confirm Deletion</h3>
          <p className="text-sm text-slate-500 mt-3 px-4">
            You are about to permanently remove the OD request for <span className="font-bold text-red-600">"{request.event_title}"</span>. This action cannot be undone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type <span className="text-red-600">DELETE</span> to confirm</label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError(null);
              }}
              placeholder="DELETE"
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 focus:bg-white outline-none text-center font-black tracking-widest transition-all"
              autoFocus
            />
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[10px] font-black uppercase justify-center animate-bounce">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all"
            >
              Delete Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PrizeQuestionModal: React.FC<{ onAnswer: (won: boolean) => void; onClose: () => void }> = ({ onAnswer, onClose }) => (
  <div className="fixed inset-0 z-[130] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl border-4 border-amber-50 animate-in zoom-in-95 duration-300">
      <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
        <Trophy size={40} />
      </div>
      <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Achievement Check</h3>
      <p className="text-sm text-slate-500 mt-3 px-4">Did you win any prizes or merit awards in this event?</p>
      <div className="grid grid-cols-2 gap-4 mt-8">
        <button 
          onClick={() => onAnswer(false)} 
          className="py-4 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
        >
          No, just participated
        </button>
        <button 
          onClick={() => onAnswer(true)} 
          className="py-4 rounded-2xl bg-blueprint-blue text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-amber-500/20 hover:bg-goldenrod transition-all"
        >
          Yes, I won!
        </button>
      </div>
      <button onClick={onClose} className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Maybe Later</button>
    </div>
  </div>
);

const StudentDashboard: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<ODRequest | null>(null);
  const [showPrizeQuestionModal, setShowPrizeQuestionModal] = useState(false);
  const [pendingRequestForCert, setPendingRequestForCert] = useState<ODRequest | null>(null);

  if (!profile) return null;
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
    if (!profile?.id) return;
    console.log(`[DASHBOARD] Fetching requests for: ${profile.id}`);
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('od_requests')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error("[DASHBOARD] Fetch error:", error);
        setError('Failed to load OD log. Please try again.');
        return;
      }

      console.log(`[DASHBOARD] Fetched ${data?.length || 0} requests`);
      setRequests((data as ODRequest[]) || []);
    } catch (err) {
      console.error("[DASHBOARD] Exception:", err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [profile.id]);

  // Sync notifications for earlier approvals that might have been missed
  useEffect(() => {
    const syncNotifications = async () => {
      if (!profile.id || requests.length === 0) return;

      const unsentApprovals = requests.filter(r => 
        (r.status === 'Approved' || r.status === 'Completed') && 
        r.notification_sent === false
      );

      if (unsentApprovals.length === 0) return;

      for (const req of unsentApprovals) {
        try {
          // Create notification
          await supabase.from('notifications').insert({
            user_id: profile.id,
            message: `Your OD request for ${req.event_title} has been officially sanctioned. You can now download your OD letter.`,
            type: 'success',
            read: false
          });

          // Mark as sent
          await supabase.from('od_requests').update({ notification_sent: true }).eq('id', req.id);
        } catch (err) {
          console.error("Failed to sync notification for request:", req.id, err);
        }
      }
      
      // Refresh requests to reflect notification_sent: true
      fetchRequests();
    };

    syncNotifications();
  }, [requests.length, profile.id]); // Use requests.length to avoid infinite loop if fetchRequests is called inside

  const handleDelete = async (request: ODRequest) => {
    if (request.status === 'Approved' || request.status === 'Completed' || request.status === 'Pending HOD') {
      alert("System Violation: Authorized or partially authorized logs cannot be deleted.");
      return;
    }
    setDeleteRequest(request);
  };

  const confirmDelete = async () => {
    if (!deleteRequest) return;

    try {
      const { error } = await supabase
        .from('od_requests')
        .delete()
        .eq('id', deleteRequest.id)
        .eq('user_id', profile.id);

      if (error) {
        alert('System failure during deletion: ' + error.message);
      } else {
        setRequests(prev => prev.filter(r => r.id !== deleteRequest.id));
      }
    } finally {
      setDeleteRequest(null);
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
    if (type === 'certificate') {
      // Before certificate posted, ask if they won any prizes
      setPendingRequestForCert(request);
      setShowPrizeQuestionModal(true);
      return;
    }

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
        const hasCert = (currentCerts.filter(Boolean).length > 0) || (currentPrizeDetails.filter(p => p.url && p.url.trim() !== '').length > 0);
        
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

  const proceedWithCertificateUpload = (request: ODRequest) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setUploadState({ id: request.id, type: 'certificate', index: 0 });
      try {
        const fileName = `${Date.now()}_certificate_idx0_${profile.id}.${file.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('od-files')
          .upload(`evidence/${fileName}`, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('od-files')
          .getPublicUrl(`evidence/${fileName}`);

        const updates: any = {};
        const currentCerts = Array.isArray(request.certificate_urls) ? request.certificate_urls : [];

        const nextCerts = [...currentCerts];
        nextCerts[0] = publicUrl;
        updates.certificate_urls = nextCerts;
        
        // Auto-complete logic: Mark as Completed if a certificate is uploaded
        updates.status = 'Completed';

        const { error: dbError } = await supabase
          .from('od_requests')
          .update(updates)
          .eq('id', request.id)
          .eq('user_id', profile.id);

        if (dbError) throw dbError;
        await fetchRequests();
      } catch (err: any) {
        alert(err.message || 'Error uploading certificate');
      } finally {
        setUploadState({ id: null, type: null, index: null });
      }
    };
    
    input.click();
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 relative">
      <div className="mb-8 flex justify-between items-end bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-blueprint-blue/10 relative z-50">
        <div>
          <h2 className="text-3xl font-black text-blueprint-blue tracking-tighter uppercase italic">ACTIVITY FEED</h2>
          <p className="text-[10px] text-pencil-gray font-technical uppercase tracking-[0.2em] font-bold">Activity Log • {profile.department || 'ESEC'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <NotificationCenter userId={profile.id} />
          <button 
            onClick={fetchRequests}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Log"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
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

      {deleteRequest && (
        <DeleteConfirmationModal
          request={deleteRequest}
          onClose={() => setDeleteRequest(null)}
          onConfirm={confirmDelete}
        />
      )}

      {showPrizeQuestionModal && pendingRequestForCert && (
        <PrizeQuestionModal
          onClose={() => {
            setShowPrizeQuestionModal(false);
            setPendingRequestForCert(null);
          }}
          onAnswer={(won) => {
            const req = pendingRequestForCert;
            setShowPrizeQuestionModal(false);
            setPendingRequestForCert(null);
            if (won) {
              initiatePrizeFileUpload(req, 0);
            } else {
              proceedWithCertificateUpload(req);
            }
          }}
        />
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="animate-spin text-blueprint-blue" size={48} />
            <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-blueprint-blue text-sm">school</span>
          </div>
          <p className="text-pencil-gray font-technical uppercase tracking-widest text-xs font-bold">Synchronizing Feed...</p>
          <button 
            onClick={() => fetchRequests()}
            className="mt-4 text-[9px] text-blueprint-blue uppercase font-black tracking-widest hover:underline"
          >
            Retry Sync
          </button>
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
              currentUserRegNo={profile.identification_no}
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