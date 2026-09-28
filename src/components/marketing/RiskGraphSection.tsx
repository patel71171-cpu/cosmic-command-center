import React from 'react';

export function RiskGraphSection() {
  return (
    <section className="py-24 bg-[#0B0F17]">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        <div className="order-2 lg:order-1 relative h-96 bg-[#101522] border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center hover:border-primary/20 transition-colors group">
          <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #3B82F6 0%, transparent 70%)' }}></div>
          {/* Abstract Graph Nodes */}
          <div className="relative w-full h-full">
            <div className="absolute top-[20%] left-[20%] w-28 h-10 bg-[#0B0F17] border border-white/10 rounded-lg flex items-center justify-center text-xs text-slate-300 shadow-lg">Web App</div>
            <div className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-28 h-10 bg-[#0B0F17] border border-primary/50 rounded-lg flex items-center justify-center text-xs text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] z-10">Auth API</div>
            <div className="absolute bottom-[20%] right-[20%] w-32 h-10 bg-[#0B0F17] border border-red-500/50 rounded-lg flex items-center justify-center text-xs text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">Database (Critical)</div>
            
            {/* SVG Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line x1="25%" y1="25%" x2="50%" y2="45%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
              <line x1="50%" y1="45%" x2="75%" y2="75%" stroke="rgba(239,68,68,0.4)" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_1s_linear_infinite]" />
            </svg>
            <style>{ `@keyframes dash { to { stroke-dashoffset: -8; } }` }</style>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">UNDERSTAND THE ATTACK SURFACE</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">See how risks connect.</h3>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Security problems rarely exist in isolation. SENTINEL maps relationships between assets, dependencies, APIs and findings so teams can understand where risk concentrates.
          </p>
        </div>
      </div>
    </section>
  );
}