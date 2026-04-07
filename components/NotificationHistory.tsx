
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Notification, Profile } from '../types';
import { Bell, CheckCircle2, Info, AlertTriangle, Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotificationHistory: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    } catch (err) {
      console.error("Failed to fetch notification history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllNotifications();
  }, [profile.id]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?")) return;
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', profile.id);

    if (!error) {
      setNotifications([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="p-2 bg-white rounded-xl border hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-blueprint-blue uppercase italic tracking-tighter">Notification History</h1>
              <p className="text-[10px] text-pencil-gray font-technical uppercase tracking-widest font-bold opacity-60">
                System Alerts & Activity Log
              </p>
            </div>
          </div>
          
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              <button 
                onClick={markAllAsRead}
                disabled={!notifications.some(n => !n.read)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Mark all read
              </button>
              <button 
                onClick={clearAll}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm"
              >
                <Trash2 size={14} />
                Clear All
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-20 text-center">
              <Loader2 className="animate-spin text-blueprint-blue mx-auto mb-4" size={32} />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Retrieving Archives...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                <Bell size={40} />
              </div>
              <h3 className="text-xl font-black text-blueprint-blue uppercase italic tracking-tighter">No Notifications</h3>
              <p className="text-slate-500 text-sm mt-2">Your notification history is currently empty.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-6 hover:bg-slate-50/50 transition-colors group relative ${!n.read ? 'bg-blue-50/20' : ''}`}
                >
                  <div className="flex gap-4">
                    <div className={`mt-1 p-2 rounded-xl shrink-0 ${
                      n.type === 'success' ? 'bg-green-100 text-green-600' : 
                      n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {n.type === 'success' ? <CheckCircle2 size={18}/> : 
                       n.type === 'warning' ? <AlertTriangle size={18}/> : 
                       <Info size={18}/>}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm leading-relaxed ${!n.read ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                          {n.message}
                        </p>
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all"
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">
                          {new Date(n.created_at).toLocaleDateString()} • {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {!n.read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="text-[9px] font-black text-blueprint-blue uppercase tracking-widest hover:underline"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationHistory;
