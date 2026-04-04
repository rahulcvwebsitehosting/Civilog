
import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Link 
        to="/login" 
        className="inline-flex items-center gap-2 text-blueprint-blue font-black text-[10px] uppercase tracking-widest hover:underline mb-8"
      >
        <ArrowLeft size={14} />
        Back to Portal
      </Link>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-blueprint-blue p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/30">
              <Shield size={32} />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-2">Privacy Policy</h1>
            <p className="text-blueprint-blue/20 font-technical font-bold uppercase tracking-[0.3em] text-xs bg-white/90 inline-block px-3 py-1 rounded-full">Effective: April 2026</p>
          </div>
        </div>

        <div className="p-10 space-y-10">
          <section>
            <h2 className="text-xl font-black text-blueprint-blue uppercase tracking-tight italic mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-blueprint-blue/10 rounded-lg flex items-center justify-center text-blueprint-blue text-sm not-italic font-bold">01</span>
              Data Collection
            </h2>
            <p className="text-pencil-gray text-sm leading-relaxed mb-4">
              To facilitate the On-Duty (OD) management process, we collect and process the following personal information:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['Full Name', 'Email Address', 'Phone Number', 'Register Number', 'Roll Number', 'Department', 'Academic Year', 'Uploaded Verification Files'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-blueprint-blue rounded-full"></div>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-blueprint-blue uppercase tracking-tight italic mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-blueprint-blue/10 rounded-lg flex items-center justify-center text-blueprint-blue text-sm not-italic font-bold">02</span>
              Purpose of Collection
            </h2>
            <p className="text-pencil-gray text-sm leading-relaxed">
              The collected data is used exclusively for processing OD requests, maintaining academic records, and general college administration related to student attendance and participation in official events.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-blueprint-blue uppercase tracking-tight italic mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-blueprint-blue/10 rounded-lg flex items-center justify-center text-blueprint-blue text-sm not-italic font-bold">03</span>
              Data Access
            </h2>
            <p className="text-pencil-gray text-sm leading-relaxed mb-4">
              Access to your data is strictly controlled and limited to authorized personnel:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'The Student', desc: 'Full access to their own profile and requests.' },
                { title: 'Department Advisor', desc: 'Review and initial approval of requests.' },
                { title: 'Head of Department', desc: 'Final approval and oversight.' },
                { title: 'College Admin', desc: 'System maintenance and reporting.' }
              ].map((role, i) => (
                <div key={i} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-[10px] font-black text-blueprint-blue uppercase tracking-widest mb-1">{role.title}</h3>
                  <p className="text-[11px] text-pencil-gray font-medium">{role.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-blueprint-blue uppercase tracking-tight italic mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-blueprint-blue/10 rounded-lg flex items-center justify-center text-blueprint-blue text-sm not-italic font-bold">04</span>
              Data Retention & Security
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-amber-600">history</span>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Retention Period</h3>
                  <p className="text-[11px] text-amber-800 font-medium">Data is stored for the duration of the student's enrollment plus one additional academic year for audit purposes.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-blue-600">database</span>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">Secure Storage</h3>
                  <p className="text-[11px] text-blue-800 font-medium">All data is stored securely on Supabase servers with industry-standard encryption and access controls.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Information</p>
              <p className="text-sm font-bold text-blueprint-blue">ESEC Admin: admin@erode-sengunthar.ac.in</p>
            </div>
            <Link to="/login" className="px-8 py-3 bg-blueprint-blue text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform">
              I Understand
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
