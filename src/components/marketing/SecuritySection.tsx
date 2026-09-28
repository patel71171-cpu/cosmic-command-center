import React from 'react';

const principles = [
  { title: "Controlled Testing", desc: "Assess only authorized applications and isolated environments." },
  { title: "Evidence-Based Findings", desc: "Treat AI-generated findings as hypotheses until supported by evidence." },
  { title: "Risk Context", desc: "Separate severity from confidence and provide context around affected assets." },
  { title: "Verification", desc: "Confirm remediation through re-testing instead of assuming the issue is fixed." }
];

export function SecuritySection() {
  return (
    <section id="security" className="py-24 bg-[#06070B]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">SECURITY BY DESIGN</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Built around controlled, evidence-driven assessment.</h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">SENTINEL is designed to support authorized security assessments with controlled testing, evidence collection and human-reviewed findings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {principles.map((p, i) => (
            <div key={i} className="bg-[#101522] border border-white/5 p-6 rounded-2xl hover:bg-white/[0.02] transition-colors">
              <div className="text-xl font-bold text-white mb-3 flex items-center gap-3">
                <span className="text-primary text-sm font-mono opacity-60">0{i+1}</span> {p.title}
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}