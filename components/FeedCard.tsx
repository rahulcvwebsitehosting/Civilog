
import React, { useState } from 'react';
import { ODRequest, ODStatus } from '../types';
import { Trash2, Users, FileText, MapPin, Image as ImageIcon, ExternalLink, Phone, CreditCard, X, Download, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';

interface FeedCardProps {
  request: ODRequest;
  onUploadEvidence?: (type: 'photo' | 'certificate') => void;
  onDelete?: (id: string) => void;
  onApprove?: (req: ODRequest) => void;
  onReject?: (req: ODRequest) => void;
  isUploading?: boolean;
  uploadType?: 'photo' | 'certificate';
  currentUserId?: string;
  isFaculty?: boolean;
  isProcessing?: boolean;
}

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
              title="Open Original"
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

const FeedCard: React.FC<FeedCardProps> = ({ 
  request, 
  onUploadEvidence, 
  onDelete, 
  onApprove, 
  onReject,
  isUploading, 
  uploadType, 
  currentUserId,
  isFaculty,
  isProcessing
}) => {
  const [previewImage, setPreviewImage] = useState<{ url: string, label: string } | null>(null);

  const getStatusColor = (status: ODStatus) => {
    switch (status) {
      case 'Approved': return 'text-green-600 bg-green-500';
      case 'Pending': return 'text-amber-600 bg-amber-500';
      case 'Rejected': return 'text-red-600 bg-red-500';
      case 'Completed': return 'text-blueprint-blue bg-blueprint-blue';
      default: return 'text-slate-400 bg-slate-400';
    }
  };

  const isPdf = (url: string | null) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.pdf');
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
  };

  const firstLetter = request.student_name?.charAt(0).toUpperCase() || '?';

  const previews = [
    { url: request.event_poster_url, label: 'Poster', icon: <ImageIcon size={14} /> },
    { url: request.geotag_photo_url, label: 'Field', icon: <MapPin size={14} /> },
    { url: request.registration_proof_url, label: 'Reg', icon: <FileText size={14} /> },
    { url: request.payment_proof_url, label: 'Receipt', icon: <CreditCard size={14} /> }
  ].filter(p => p.url !== null);

  const handlePreviewClick = (url: string, label: string) => {
    if (isPdf(url)) {
      window.open(url, '_blank');
    } else {
      setPreviewImage({ url, label });
    }
  };

  return (
    <>
      {previewImage && (
        <ImagePreviewModal 
          url={previewImage.url} 
          label={previewImage.label} 
          onClose={() => setPreviewImage(null)} 
        />
      )}
      <article className="bg-white mb-6 border border-slate-200 shadow-sm overflow-hidden rounded-2xl group/card relative animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="p-5 pb-3">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blueprint-blue text-white font-black text-xl shadow-md shrink-0 border-2 border-white">
                {firstLetter}
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm text-gray-900 truncate tracking-tight uppercase tracking-tighter">{request.student_name}</h3>
                  <span className="material-symbols-outlined text-blueprint-blue text-[16px]">verified</span>
                </div>
                <p className="text-[10px] text-pencil-gray font-technical uppercase tracking-wider leading-tight">
                  LEAD • {request.year} Year • ID: {request.register_no}
                </p>
                {request.phone_number && (
                  <p className="text-[9px] text-primary font-black uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                    <Phone size={10} /> {request.phone_number}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-gray-400 font-technical uppercase shrink-0 font-bold">{timeAgo(request.created_at)}</span>
              {!isFaculty && currentUserId === request.user_id && onDelete && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(request.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Delete Entry"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-black text-blueprint-blue mb-1 uppercase tracking-tight italic">{request.event_title}</h2>
            <div className="flex flex-col gap-1 text-sm text-gray-700 leading-snug font-body">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-1.5 py-0.5 bg-blue-50 text-blueprint-blue text-[10px] font-black rounded uppercase">{request.event_type}</span>
                <span>at <span className="font-bold">{request.organization_name}</span></span>
              </div>
              {request.organization_location && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                  <MapPin size={10} /> {request.organization_location}
                </div>
              )}
              <div className="text-[11px] font-bold text-slate-600 mt-1 uppercase flex items-center gap-1.5">
                <Calendar size={12} className="text-blueprint-blue" />
                Schedule: <span className="font-technical text-[12px] font-black">
                  {request.event_date === request.event_end_date || !request.event_end_date 
                    ? request.event_date 
                    : `${request.event_date} to ${request.event_end_date}`
                  }
                </span>
              </div>
            </div>
            
            {request.team_members && request.team_members.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-blueprint-blue font-black uppercase text-[9px] tracking-[0.1em]">
                  <Users size={12} /> Unit Strength: {request.team_members.length + 1} Members
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {request.team_members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] text-slate-800 font-black truncate leading-tight uppercase tracking-tighter">{m.name} ({m.year}Y)</p>
                        <p className="text-[8px] text-slate-500 font-mono truncate">Reg: {m.register_no}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`relative w-full bg-slate-100 border-y border-slate-100 aspect-[16/10] overflow-hidden flex gap-0.5 p-0.5 ${previews.length === 0 ? 'items-center justify-center' : ''}`}>
          {previews.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-300 w-full">
               <span className="material-symbols-outlined text-5xl mb-1">image_not_supported</span>
               <span className="text-[10px] font-technical uppercase font-bold">Waiting for field assets</span>
            </div>
          ) : (
            previews.map((item, idx) => {
              const isDoc = isPdf(item.url);
              let itemWidth = 'w-full';
              if (previews.length === 2) itemWidth = 'w-1/2';
              else if (previews.length === 3) itemWidth = 'w-1/3';
              else if (previews.length >= 4) itemWidth = 'w-1/4';

              return (
                <div 
                  key={idx} 
                  className={`relative overflow-hidden group cursor-pointer h-full transition-all duration-500 ease-in-out hover:z-10 ${itemWidth}`}
                  onClick={() => handlePreviewClick(item.url!, item.label)}
                >
                  {isDoc ? (
                    <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center text-slate-400 group-hover:bg-slate-300 transition-colors">
                      <span className="material-symbols-outlined text-4xl mb-2">picture_as_pdf</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">View PDF Document</span>
                    </div>
                  ) : (
                    <img 
                      src={item.url!} 
                      alt={item.label}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded-md text-[9px] font-technical flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-lg">
                    {item.icon} {item.label} {isDoc && <ExternalLink size={10} />}
                  </div>
                </div>
              );
            })
          )}
          
          {request.status === 'Completed' && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md text-blueprint-blue px-4 py-2 rounded-xl shadow-2xl border border-blueprint-blue/10 flex items-center gap-2 z-20">
              <span className="material-symbols-outlined text-yellow-600 animate-bounce">emoji_events</span>
              <div className="flex flex-col leading-none">
                <span className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Verified Log</span>
                <span className="text-xs font-black uppercase italic tracking-tighter">Cycle Closed</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-50 bg-slate-50/50 gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-3 w-full sm:w-auto">
            {request.od_letter_url && (
              <button onClick={() => window.open(request.od_letter_url!, '_blank')} className="flex items-center gap-1.5 text-blueprint-blue font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[18px]">description</span> Letter
              </button>
            )}
            {request.registration_proof_url && (
              <button onClick={() => handlePreviewClick(request.registration_proof_url!, 'Registration')} className="flex items-center gap-1.5 text-slate-500 hover:text-blueprint-blue font-black uppercase text-[10px] tracking-widest transition-colors">
                <span className="material-symbols-outlined text-[18px]">attachment</span> Reg
              </button>
            )}
            {request.payment_proof_url && (
              <button onClick={() => handlePreviewClick(request.payment_proof_url!, 'Receipt')} className="flex items-center gap-1.5 text-indigo-500 hover:text-blueprint-blue font-black uppercase text-[10px] tracking-widest transition-colors">
                <span className="material-symbols-outlined text-[18px]">payments</span> Receipt
              </button>
            )}
            {!isFaculty && request.status === 'Approved' && onUploadEvidence && (
              <button onClick={() => onUploadEvidence('photo')} className="flex items-center gap-1.5 text-primary font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                {isUploading && uploadType === 'photo' ? 'Syncing...' : 'Field Evidence'}
              </button>
            )}
            {!isFaculty && request.status === 'Completed' && (
              <div className="flex items-center gap-1.5 text-green-600 font-black uppercase text-[10px] tracking-widest">
                <span className="material-symbols-outlined text-[18px]">verified_user</span> Authenticated
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            {isFaculty && request.status === 'Pending' && onApprove && onReject ? (
              <div className="flex items-center gap-2">
                {isProcessing ? (
                  <div className="flex items-center gap-2 text-blueprint-blue text-[10px] font-black uppercase tracking-widest">
                    <Loader2 className="animate-spin" size={16} /> Authorizing...
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => onReject(request)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-100 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      <XCircle size={14} /> Deny
                    </button>
                    <button 
                      onClick={() => onApprove(request)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blueprint-blue text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/10 hover:bg-blue-900 transition-all"
                    >
                      <CheckCircle size={14} /> Authorize
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-auto">
                <span className={`w-2.5 h-2.5 rounded-full ring-4 ring-offset-2 ${getStatusColor(request.status).split(' ')[1].replace('bg-', 'ring-')}/20 ${getStatusColor(request.status).split(' ')[1]}`}></span>
                <span className={`text-[11px] font-black uppercase tracking-[0.2em] italic ${getStatusColor(request.status).split(' ')[0]}`}>
                  {request.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    </>
  );
};

export default FeedCard;
