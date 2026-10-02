import React from 'react';
import { ArrowRight } from 'lucide-react';

export function BeforeAfterSection() {
  return (
    <section className="py-24 bg-[#0B0F17]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">MEASURE THE IMPROVEMENT</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">See what changed after remediation.</h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Security improvement should be measurable. Compare your posture before and after fixes and understand where risk was reduced.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto relative">
          {/* Before */}
          <div className="bg-[#101522] border border-white/5 rounded-2xl p-8 hover:bg-white/[0.02] transition-colors">
            <div className="text-sm font-medium text-slate-500 mb-6 uppercase tracking-wider">Before Remediation</div>
            <div className="text-5xl font-bold text-white mb-2">61<span className="text-xl text-slate-500 font-normal">/100</span></div>
            <div className="text-sm text-slate-400 mb-8">Security Score</div>
            
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-bold text-red-400 mb-1">4</div>
                <div className="text-xs text-slate-500">Critical</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400 mb-1">12</div>
                <div className="text-xs text-slate-500">High</div>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="bg-[#101522] border border-primary/30 rounded-2xl p-8 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#0B0F17] rounded-full border border-white/10 hidden md:flex items-center justify-center z-10 text-primary">
              <ArrowRight className="w-5 h-5" />
            </div>
            
            <div className="text-sm font-medium text-primary mb-6 uppercase tracking-wider">After Remediation</div>
            <div className="text-5xl font-bold text-white mb-2">82<span className="text-xl text-slate-500 font-normal">/100</span></div>
            <div className="text-sm text-slate-400 mb-8">Security Score</div>
            
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-bold text-red-400 mb-1">1</div>
                <div className="text-xs text-slate-500">Critical</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400 mb-1">6</div>
                <div className="text-xs text-slate-500">High</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
