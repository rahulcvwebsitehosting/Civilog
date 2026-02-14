
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ODRequest, Profile } from '../types';
import { CheckCircle, XCircle, ExternalLink, Loader2, RefreshCw, Paperclip, CreditCard } from 'lucide-react';
import { generateODLetter } from '../services/pdfService';

const FacultyDashboard: React.FC = () => {
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [facultyProfile, setFacultyProfile] = useState<Profile | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    
    // Fetch the current faculty profile to include their signature in approved letters
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

    const { data, error } = await supabase
      .from('od_requests')
      .select('*')
      .eq('status', 'Pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data as ODRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproval = async (request: ODRequest, approve: boolean) => {
    setProcessingId(request.id);
    try {
      if (approve) {
        // Fix: generateODLetter requires studentProfile and optionally facultyProfile.
        // We fetch the lead student's metadata to retrieve their digital signature for the PDF.
        const { data: userData } = await supabase.auth.admin.getUserById(request.user_id);
        const studentProfile: Profile = {
          id: request.user_id,
          email: '',
          role: 'student',
          full_name: request.student_name,
          signature_url: userData?.user?.user_metadata?.signature_url || null
        };

        const pdfBlob = await generateODLetter(request, studentProfile, facultyProfile || undefined);
        const fileName = `OD_Letter_${request.register_no}_${Date.now()}.pdf`;
        
        const { error: uploadError } = await supabase.storage
          .from('od-files')
          .upload(`od_letters/${fileName}`, pdfBlob);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('od-files')
          .getPublicUrl(`od_letters/${fileName}`);

        const { error: dbError } = await supabase
          .from('od_requests')
          .update({ status: 'Approved', od_letter_url: publicUrl })
          .eq('id', request.id);
          
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('od_requests')
          .update({ status: 'Rejected' })
          .eq('id', request.id);
          
        if (dbError) throw dbError;
      }
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (err) {
      console.error(err);
      alert('Error processing request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Faculty Dashboard</h2>
          <p className="text-slate-500 mt-1">Review and manage pending On-Duty requests.</p>
        </div>
        <button 
          onClick={fetchRequests} 
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-all"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-slate-500 font-medium">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">All Clear!</h3>
            <p className="text-slate-500 mt-2">There are no pending OD requests for approval.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-slate-700 uppercase tracking-wider">Student Details</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-700 uppercase tracking-wider">Event Information</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-700 uppercase tracking-wider">Evidence Docs</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-700 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{request.student_name}</div>
                      <div className="text-sm text-slate-500 font-mono">{request.register_no}</div>
                      <div className="text-xs text-blue-600 font-medium">{request.year} Yr / {request.roll_no}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{request.event_title}</div>
                      <div className="text-sm text-slate-500">{request.organization_name}</div>
                      <div className="text-xs mt-1 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">{request.event_date}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {request.registration_proof_url && (
                          <a 
                            href={request.registration_proof_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-[11px] font-bold uppercase"
                          >
                            <Paperclip size={12} /> Reg Proof
                          </a>
                        )}
                        {request.payment_proof_url && (
                          <a 
                            href={request.payment_proof_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-[11px] font-bold uppercase"
                          >
                            <CreditCard size={12} /> Pay Proof
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {processingId === request.id ? (
                        <div className="flex justify-end items-center gap-2 text-blue-600 font-bold">
                          <Loader2 className="animate-spin" size={18} />
                          Processing...
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleApproval(request, false)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Reject"
                          >
                            <XCircle size={24} />
                          </button>
                          <button
                            onClick={() => handleApproval(request, true)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Approve & Generate Letter"
                          >
                            <CheckCircle size={24} />
                          </button>
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

export default FacultyDashboard;
