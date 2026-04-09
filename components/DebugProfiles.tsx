import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, ShieldCheck, Users, Building2 } from 'lucide-react';

const DebugProfiles: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true });
      
      if (!error && data) {
        setProfiles(data);
      }
      setLoading(false);
    };
    fetchProfiles();
  }, []);

  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setTestStatus('Sending...');
    try {
      const res = await fetch(`/api/test-email?to=${testEmail}`);
      const result = await res.json();
      if (result.success) {
        setTestStatus('Success! Check your inbox.');
      } else {
        setTestStatus('Failed: ' + result.error);
      }
    } catch (err: any) {
      setTestStatus('Error: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-blueprint-blue p-8 text-white">
          <h2 className="text-2xl font-black uppercase italic tracking-tight flex items-center gap-3">
            <ShieldCheck size={28} /> System Debug: Profile Registry
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-widest opacity-70 mt-1">Verify Role & Department Synchronization</p>
        </div>

        <div className="p-8 border-b bg-slate-50">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">SMTP Configuration Test</h3>
          <div className="flex gap-3">
            <input 
              type="email" 
              placeholder="Enter test email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border text-sm outline-none focus:border-blueprint-blue"
            />
            <button 
              onClick={handleTestEmail}
              className="px-6 py-2 bg-blueprint-blue text-white rounded-xl font-bold uppercase text-[10px] tracking-widest"
            >
              Send Test Email
            </button>
          </div>
          {testStatus && <p className="mt-2 text-[9px] font-bold uppercase text-blueprint-blue">{testStatus}</p>}
        </div>

        <div className="p-8">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="animate-spin text-blueprint-blue mx-auto mb-4" size={40} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Database...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Name</th>
                    <th className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                    <th className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Department</th>
                    <th className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4">
                        <p className="font-bold text-slate-900 text-sm">{p.full_name || 'Unnamed'}</p>
                        <p className="text-[9px] font-mono text-slate-400">{p.id}</p>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                          p.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' :
                          p.role === 'hod' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          p.role === 'coordinator' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{p.department || 'Not Set'}</p>
                      </td>
                      <td className="py-4">
                        <p className="text-xs text-slate-500">{p.email}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugProfiles;
