import React from 'react';

export function EvidenceSection() {
  return (
    <section className="py-24 bg-[#06070B]">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">EVIDENCE-FIRST SECURITY</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Don't just report a vulnerability. Prove it.</h3>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Every important finding should have a traceable evidence chain showing what was detected, how it was validated and why it matters.
          </p>
          <div className="space-y-4">
            {['Finding title & Severity', 'Confidence & Affected asset', 'Request/response evidence', 'Remediation guidance'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] opacity-20 blur-3xl rounded-full"></div>
          <div className="bg-[#101522] border border-white/10 rounded-2xl p-6 relative z-10 shadow-2xl hover:border-primary/20 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <div className="flex items-center gap-3">
                <div className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">CRITICAL</div>
                <div className="text-white font-medium text-sm sm:text-base">SQL Injection in Login endpoint</div>
              </div>
              <div className="text-slate-400 text-xs sm:text-sm">Confidence: 99%</div>
            </div>
            
            <div className="bg-[#0B0F17] rounded-lg border border-white/5 p-4 mb-4 font-mono text-xs overflow-x-auto">
              <div className="text-slate-500 mb-2">POST /api/v1/auth/login</div>
              <div className="text-slate-300">
                <span className="text-blue-400">username</span>: "admin' OR 1=1--"<br/>
                <span className="text-blue-400">password</span>: "any"
              </div>
            </div>
            
            <div className="bg-[#0B0F17] rounded-lg border border-white/5 p-4 font-mono text-xs overflow-x-auto">
              <div className="text-green-400 mb-2">HTTP/1.1 200 OK</div>
              <div className="text-slate-300">
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."<br/>
                "user": "admin"
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}