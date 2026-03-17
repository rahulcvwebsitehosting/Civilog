
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Profile, ODRequest } from '../types';
import { 
  Shield, Users, History, Search, Filter, 
  ChevronRight, Calendar, Clock, User, 
  CheckCircle2, XCircle, Trash2, Info,
  GraduationCap, Briefcase, Building2,
  ArrowUpDown, Download
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'users' | 'requests'>('audit');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false });
        setAuditLogs(data || []);
      } else if (activeTab === 'users') {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .order('role', { ascending: true });
        setProfiles(data || []);
      } else if (activeTab === 'requests') {
        const { data } = await supabase
          .from('od_requests')
          .select('*')
          .order('created_at', { ascending: false });
        setRequests(data || []);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = (p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.identification_no?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getActionIcon = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('INSERT')) return <Info className="text-blue-500" size={16} />;
    if (act.includes('UPDATE')) {
      if (act.includes('OD_REQUESTS')) return <CheckCircle2 className="text-amber-500" size={16} />;
      return <History className="text-blue-400" size={16} />;
    }
    if (act.includes('DELETE')) return <Trash2 className="text-red-500" size={16} />;
    
    switch (act) {
      case 'ADVISOR_APPROVE': return <CheckCircle2 className="text-amber-500" size={16} />;
      case 'HOD_APPROVE': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'REJECT_OD': return <XCircle className="text-red-500" size={16} />;
      default: return <History className="text-slate-400" size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8 font-display">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
              <Shield className="text-blueprint-blue" size={36} /> Central Command
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">System Audit & Registry • Read-Only Access</p>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
            <button 
              onClick={() => setActiveTab('audit')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <History size={14} className="inline mr-2" /> Audit Log
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users size={14} className="inline mr-2" /> User Registry
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-blueprint-blue text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Search size={14} className="inline mr-2" /> All Requests
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search by Name, Email, or Reg No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border rounded-2xl outline-none focus:border-blueprint-blue shadow-sm text-sm"
              />
            </div>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-5 py-4 bg-white border rounded-2xl outline-none shadow-sm text-sm font-bold uppercase tracking-tight"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="advisor">Advisors</option>
              <option value="hod">HODs</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-white rounded-[2.5rem] border shadow-2xl overflow-hidden min-h-[600px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <div className="w-12 h-12 border-4 border-blueprint-blue border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Secure Logs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'audit' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                            <Calendar size={14} className="text-slate-400" />
                            {new Date(log.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-[10px] mt-1 font-mono">
                            <Clock size={12} />
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="p-6">
                          <p className="font-bold text-slate-900 text-xs">{log.user_email || 'System'}</p>
                          <p className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">{log.user_id?.substring(0, 8)}...</p>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{log.action.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <pre className="text-[9px] font-mono text-slate-600 whitespace-pre-wrap">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'users' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identity</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role & Status</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Department</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Registration Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProfiles.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blueprint-blue/10 flex items-center justify-center text-blueprint-blue">
                              <User size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{p.full_name || 'Incomplete Profile'}</p>
                              <p className="text-xs text-slate-500">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            p.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' :
                            p.role === 'hod' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            p.role === 'advisor' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                            {p.role}
                          </span>
                          <div className="mt-2 flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${p.is_profile_complete ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{p.is_profile_complete ? 'Verified' : 'Pending Setup'}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{p.department || 'Not Assigned'}</p>
                          {p.designation && <p className="text-[10px] text-slate-400 mt-1 italic">{p.designation}</p>}
                        </td>
                        <td className="p-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">ID: <span className="font-mono text-blueprint-blue">{p.identification_no || 'N/A'}</span></p>
                            {p.role === 'student' && (
                              <>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Roll: <span className="font-mono text-blueprint-blue">{p.roll_no || 'N/A'}</span></p>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Year: <span className="font-mono text-blueprint-blue">{p.year || 'N/A'}</span></p>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'requests' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Event Details</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Status</th>
                      <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Timeline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {requests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6">
                          <p className="font-bold text-slate-900 text-sm">{r.student_name}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">{r.register_no}</p>
                          <p className="text-[9px] text-slate-400 mt-1">{r.department}</p>
                        </td>
                        <td className="p-6">
                          <p className="font-bold text-slate-700 text-xs">{r.event_title}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{r.organization_name}</p>
                          <div className="mt-2 flex gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black uppercase text-slate-500">{r.event_type}</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            r.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' :
                            r.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Created: {new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            {r.advisor_approved_at && (
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Advisor: {new Date(r.advisor_approved_at).toLocaleDateString()}</span>
                              </div>
                            )}
                            {r.hod_approved_at && (
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase">HOD: {new Date(r.hod_approved_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-2 py-8 border-t">
          <Shield size={16} className="text-slate-300" />
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">End-to-End Audit Encryption Active</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
