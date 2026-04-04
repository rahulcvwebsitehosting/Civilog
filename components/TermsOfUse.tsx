
import React from 'react';
import { Gavel, ArrowLeft, AlertTriangle, Scale, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsOfUse: React.FC = () => {
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
              <Gavel size={32} />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-2">Terms of Use</h1>
            <p className="text-blueprint-blue/20 font-technical font-bold uppercase tracking-[0.3em] text-xs bg-white/90 inline-block px-3 py-1 rounded-full">Effective: April 2026</p>
          </div>
        </div>

        <div className="p-10 space-y-10">
          <section>
            <h2 className="text-xl font-black text-blueprint-blue uppercase tracking-tight italic mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-blueprint-blue/10 rounded-lg flex items-center justify-center text-blueprint-blue text-sm not-italic font-bold">01</span>
              Official Use Only
            </h2>
            <div className="flex gap-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <ShieldCheck className="text-blue-600 shrink-0" size={24} />
              <p className="text-pencil-gray text-sm leading-relaxed">
                The ESEC OD Portal is for official Erode Sengunthar Engineering College On-Duty requests only. Any other use is strictly prohibited.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-blueprint-blue uppercase tracking-tight italic mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-blueprint-blue/10 rounded-lg flex items-center justify-center text-blueprint-blue text-sm not-italic font-bold">02</span>
              Accuracy & Responsibility
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <Scale className="text-slate-600 shrink-0" size={24} />
                <p className="text-pencil-gray text-sm leading-relaxed">
                  Students are solely responsible for the accuracy and completeness of their submitted information. Submitting false or fraudulent OD requests is a serious offense.
                </p>
              </div>
              <div className="flex gap-4 p-4 bg-red-50 border border-red-100 rounded-2xl">
                <AlertTriangle className="text-red-600 shrink-0" size={24} />
                <p className="text-red-800 text-sm font-bold leading-relaxed">
                  Fraudulent submissions are subject to immediate college disciplinary action, which may include suspension or expulsion.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-blueprint-blue uppercase tracking-tight italic mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-blueprint-blue/10 rounded-lg flex items-center justify-center text-blueprint-blue text-sm not-italic font-bold">03</span>
              College Rights & Oversight
            </h2>
            <p className="text-pencil-gray text-sm leading-relaxed mb-4">
              The college reserves the right to access, review, and act on any data submitted through this portal. This includes:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Verification of submitted documents',
                'Review of attendance patterns',
                'Account suspension for misuse',
                'Reporting to academic departments'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-blueprint-blue rounded-full"></div>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-blueprint-blue uppercase tracking-tight italic mb-4 flex items-center gap-3">
              <span className="w-8 h-8 bg-blueprint-blue/10 rounded-lg flex items-center justify-center text-blueprint-blue text-sm not-italic font-bold">04</span>
              Limitation of Liability
            </h2>
            <p className="text-pencil-gray text-sm leading-relaxed">
              While we strive for 100% uptime, the college is not liable for technical downtime, data loss beyond reasonable measures, or delays in processing due to system issues.
            </p>
          </section>

          <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Legal Compliance</p>
              <p className="text-sm font-bold text-blueprint-blue">ESEC Academic Regulations 2026</p>
            </div>
            <Link to="/login" className="px-8 py-3 bg-blueprint-blue text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform">
              Accept Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
