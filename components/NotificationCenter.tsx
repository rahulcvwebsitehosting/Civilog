
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Notification } from '../types';
import { Bell, X, CheckCircle2, Info, AlertTriangle, Loader2 } from 'lucide-react';

const NotificationCenter: React.FC<{ userId: string }> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data as Notification[]);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time subscription
    const channel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2.5 bg-white border rounded-xl hover:bg-slate-50 transition-colors shadow-sm group"
      >
        <Bell size={20} className={unreadCount > 0 ? 'text-blueprint-blue animate-swing' : 'text-slate-400'} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border shadow-2xl z-[120] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Alerts</h3>
            <button onClick={() => setShowDropdown(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
          </div>
          
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Loader2 className="animate-spin text-blueprint-blue mx-auto mb-2" size={24} />
                <p className="text-[10px] font-bold text-slate-400 uppercase">Syncing Alerts...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Info className="text-slate-200 mx-auto mb-2" size={32} />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No new alerts</p>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`p-4 border-b last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/30' : ''}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                      n.type === 'success' ? 'bg-green-100 text-green-600' : 
                      n.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {n.type === 'success' ? <CheckCircle2 size={14}/> : 
                       n.type === 'warning' ? <AlertTriangle size={14}/> : 
                       <Info size={14}/>}
                    </div>
                    <div className="space-y-1">
                      <p className={`text-xs leading-relaxed ${!n.read ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-[8px] font-mono text-slate-400 uppercase">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 bg-slate-50 border-t text-center">
            <button className="text-[9px] font-black text-blueprint-blue uppercase tracking-widest hover:underline">View All History</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
