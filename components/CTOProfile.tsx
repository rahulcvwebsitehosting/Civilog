
import React from 'react';
import { Terminal, Github, Linkedin, MessageCircle, MapPin, GraduationCap, Cpu, Globe, Rocket, ShieldCheck, ExternalLink, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CTOProfile: React.FC<{ signature?: string | null }> = ({ signature }) => {
  const techRadar = [
    { category: 'Web Dev', skills: ['Next.js', 'React', 'Tailwind CSS', 'TypeScript', 'Node.js'] },
    { category: 'AI & Intelligence', skills: ['Gemini API', 'LLM Integration', 'Multi-modal LLMs', 'AI Agents'] },
    { category: 'Engineering & 3D', skills: ['Three.js', 'Digital Twins', 'Web Audio API', 'Canvas API'] },
  ];

  const projects = [
    { name: 'Ecobrick (Startup)', tags: ['Next.js', '3D Viz', 'System Design'] },
    { name: 'AcademicVision AI', tags: ['React 19', 'Gemini AI', 'Tailwind'] },
    { name: 'TunnelViz', tags: ['Three.js', 'React', 'D3.js'] },
    { name: 'Hostel Planner', tags: ['Canvas API', 'OpenAI', 'Next.js'] },
    { name: 'TypeArena', tags: ['Node.js', 'Socket.io', 'React'] },
  ];

  const presentations = [
    { org: 'PSG College of Technology', task: 'Paper Presentation & Workshop' },
    { org: 'Kongu Engineering College', task: 'Technical Paper Presentation' },
    { org: 'IIT Madras (SRM Chennai)', task: 'Paper Presentation' },
    { org: 'KPR Institute', task: 'Workshop & Symposium' },
  ];

  return (
    <div className="min-h-screen bg-drafting-paper grid-bg font-display p-6 animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex items-center justify-between sticky top-0 z-50 py-4 bg-drafting-paper/80 backdrop-blur-sm border-b border-blueprint-blue/10">
          <Link to="/" className="flex items-center gap-2 text-blueprint-blue font-black uppercase text-[10px] tracking-widest hover:translate-x-[-4px] transition-transform">
            <ArrowLeft size={16} /> System Return
          </Link>
          <div className="flex items-center gap-3">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             <span className="text-[10px] font-black uppercase text-pencil-gray tracking-tighter">Node: CTO_DOSSIER_001</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-8">
            {/* Hero Card */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-blueprint-blue/10 shadow-xl shadow-blueprint-blue/5 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blueprint-blue/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative space-y-6">
                <div className="flex items-end gap-6">
                  <div className="w-28 h-28 bg-blueprint-blue rounded-[2rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl border-4 border-white">
                    RS
                  </div>
                  <div className="pb-2">
                    <h1 className="text-4xl font-black text-blueprint-blue leading-none italic uppercase tracking-tighter">RAHUL SHYAM</h1>
                    <p className="text-[11px] font-bold text-pencil-gray uppercase tracking-[0.2em] mt-2">CTO & Full Stack Engineer</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-blueprint-blue italic leading-relaxed">
                    "I don't just build websites — I engineer solutions. True learning happens when theory meets application."
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blueprint-blue/5 rounded-xl border border-blueprint-blue/10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CGPA</p>
                    <p className="text-xl font-black text-blueprint-blue">8.6</p>
                  </div>
                  <div className="text-center p-3 bg-blueprint-blue/5 rounded-xl border border-blueprint-blue/10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Year</p>
                    <p className="text-xl font-black text-blueprint-blue">2nd</p>
                  </div>
                  <div className="text-center p-3 bg-blueprint-blue/5 rounded-xl border border-blueprint-blue/10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loc</p>
                    <p className="text-xl font-black text-blueprint-blue">MAA</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Tech Radar */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-blueprint-blue/10 shadow-lg">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-2">
                <Cpu size={16} className="text-blueprint-blue" /> Technical Radar
              </h2>
              <div className="space-y-6">
                {techRadar.map((cat, i) => (
                  <div key={i} className="space-y-3">
                    <h3 className="text-[10px] font-black text-blueprint-blue uppercase tracking-widest">{cat.category}</h3>
                    <div className="flex flex-wrap gap-2">
                      {cat.skills.map((skill, j) => (
                        <span key={j} className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-100 hover:border-blueprint-blue/30 transition-colors cursor-default">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-7 space-y-8">
            {/* Current Role */}
            <section className="bg-blueprint-blue text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Rocket size={120} />
               </div>
               <div className="relative">
                 <div className="flex items-center gap-3 mb-4">
                   <div className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/20">Active Tenure</div>
                   <div className="text-[9px] font-black uppercase tracking-widest opacity-60">2025 – Present</div>
                 </div>
                 <h2 className="text-3xl font-black italic uppercase tracking-tight mb-2">CTO @ Academic Infrastructure</h2>
                 <p className="text-sm opacity-80 leading-relaxed font-medium max-w-xl">
                   Leading technical architecture for a government-funded educational-tech venture developing innovative academic solutions and supply chain automation.
                 </p>
                 <div className="mt-6 flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      <ShieldCheck size={16} className="text-green-400" /> Gov-Funded
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                      <Globe size={16} className="text-blue-300" /> Ed-Tech
                    </div>
                 </div>
               </div>
            </section>

            {/* Projects & Presentations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white rounded-[2.5rem] p-8 border border-blueprint-blue/10 shadow-lg h-full">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                  <Terminal size={16} className="text-blueprint-blue" /> Project Log
                </h2>
                <div className="space-y-4">
                  {projects.map((proj, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blueprint-blue/20 transition-all cursor-pointer group">
                      <h4 className="font-black text-slate-800 text-sm group-hover:text-blueprint-blue transition-colors uppercase tracking-tight italic">{proj.name}</h4>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {proj.tags.map((tag, j) => (
                          <span key={j} className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{tag} {j < proj.tags.length - 1 ? '•' : ''}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-[2.5rem] p-8 border border-blueprint-blue/10 shadow-lg h-full">
                <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                  <GraduationCap size={16} className="text-blueprint-blue" /> Academic Engagement
                </h2>
                <div className="space-y-4">
                  {presentations.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-[10px] font-black text-blueprint-blue uppercase tracking-widest">{item.org}</p>
                      <p className="text-[11px] text-slate-600 font-medium leading-tight">{item.task}</p>
                      {i < presentations.length - 1 && <div className="h-px bg-slate-100 w-full mt-4"></div>}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer Dossier */}
        <div className="bg-white rounded-[2.5rem] p-10 border-2 border-dashed border-blueprint-blue/20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="space-y-4">
              <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Communication Channels</h5>
              <div className="flex flex-col gap-3">
                <a href="https://wa.me/917305169964" target="_blank" className="flex items-center gap-3 text-sm font-black text-blueprint-blue hover:underline uppercase tracking-tight">
                  <MessageCircle size={18} className="text-green-500" /> WhatsApp Direct
                </a>
                <a href="https://github.com/rahulcvwebsitehosting" target="_blank" className="flex items-center gap-3 text-sm font-black text-blueprint-blue hover:underline uppercase tracking-tight">
                  <Github size={18} /> GitHub Repository
                </a>
                <a href="https://www.linkedin.com/in/rahulshyamcivil/" target="_blank" className="flex items-center gap-3 text-sm font-black text-blueprint-blue hover:underline uppercase tracking-tight">
                  <Linkedin size={18} className="text-blue-600" /> LinkedIn Network
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Institutional Verification</h5>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-loose">
                AUTHENTICITY: VERIFIED<br />
                LOGS: ARCHIVED<br />
                ID: RS-DOS-2027<br />
                PORTAL: <a href="https://rahulshyam-portfolio.vercel.app/" className="underline">rahulshyam-portfolio.vercel</a>
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">ENGINEERING APPROVED</p>
              <div className="w-full h-24 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200">
                {signature ? (
                   <img src={signature} alt="Digital Signature" className="max-w-full max-h-full object-contain grayscale opacity-60" />
                ) : (
                   <div className="text-[10px] font-mono text-slate-300 italic">Signature Not Staged</div>
                )}
              </div>
              <p className="text-[8px] font-mono text-slate-400 uppercase">Electronically Authenticated Submittal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-12 text-center">
        <p className="text-[9px] font-black text-pencil-gray/30 uppercase tracking-[0.6em]">ESEC OD OS • CTO OFFICE • TERMINAL SECURE</p>
      </div>
    </div>
  );
};

export default CTOProfile;
