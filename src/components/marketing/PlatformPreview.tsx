import React from 'react';

export function PlatformPreview() {
  return (
    <section id="platform" className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">ONE SECURITY COMMAND CENTER</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">See your entire security posture in one place.</h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Monitor assessments, findings, risk concentration, remediation progress and security trends from a single command center.</p>
        </div>
        
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(99,102,241,0.15)] bg-[#101522] transform hover:-translate-y-2 transition-transform duration-500">
          {/* Mac window controls */}
          <div className="bg-[#0B0F17] px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          
          {/* Mockup Content */}
          <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5">
                  <div className="text-slate-400 text-sm mb-1">Security Score</div>
                  <div className="text-3xl font-bold text-white">82<span className="text-sm text-slate-500 font-normal">/100</span></div>
                </div>
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5">
                  <div className="text-slate-400 text-sm mb-1">Critical</div>
                  <div className="text-3xl font-bold text-red-400">1</div>
                </div>
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5">
                  <div className="text-slate-400 text-sm mb-1">High</div>
                  <div className="text-3xl font-bold text-orange-400">6</div>
                </div>
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5">
                  <div className="text-slate-400 text-sm mb-1">Open</div>
                  <div className="text-3xl font-bold text-white">26</div>
                </div>
              </div>
              
              <div className="bg-[#0B0F17] h-64 rounded-xl border border-white/5 p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="text-sm font-medium text-slate-300">Risk Trend</div>
                {/* Fake chart */}
                <div className="absolute bottom-0 left-0 w-full h-32 flex items-end px-6 pb-6 gap-2 opacity-60">
                   {[40, 50, 45, 60, 55, 70, 65, 80, 75, 90, 85, 100].map((h, i) => (
                     <div key={i} className="flex-1 bg-gradient-to-t from-primary/40 to-transparent rounded-t-sm group-hover:from-primary/60 transition-colors" style={{ height: `${h}%` }}></div>
                   ))}
                </div>
              </div>
            </div>
            
            <div className="col-span-1 space-y-6">
               <div className="bg-[#0B0F17] rounded-xl border border-white/5 p-6 h-full">
                 <div className="text-sm font-medium text-slate-300 mb-6">Recent Findings</div>
                 <div className="space-y-4">
                   {['Broken Access Control', 'API Authentication Weakness', 'Outdated Dependency', 'Missing Security Header'].map((f, i) => (
                     <div key={i} className="flex items-center gap-3 group/item">
                       <div className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-red-400' : 'bg-orange-400'}`}></div>
                       <div className="text-sm text-slate-300 truncate group-hover/item:text-white transition-colors">{f}</div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}