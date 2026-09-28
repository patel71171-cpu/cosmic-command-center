import React from 'react';

const steps = [
  { num: "01", title: "Detect", desc: "Identify vulnerabilities, misconfigurations, dependency risks and attack-surface weaknesses." },
  { num: "02", title: "Prove", desc: "Collect evidence and validate whether the reported issue is actually reproducible." },
  { num: "03", title: "Understand", desc: "Analyze severity, affected assets, attack paths, confidence and business impact." },
  { num: "04", title: "Fix", desc: "Generate actionable remediation guidance and track the issue through resolution." },
  { num: "05", title: "Verify", desc: "Re-test the issue and compare the security posture before and after remediation." }
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-[#06070B]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">HOW IT WORKS</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">FROM FINDING TO VERIFIED FIX</h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">A security finding should not end with an alert. SENTINEL follows the issue through validation, remediation and verification.</p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-px bg-white/10 -translate-y-1/2"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="relative bg-[#101522] lg:bg-transparent border lg:border-none border-white/5 p-6 lg:p-0 rounded-2xl z-10 group">
                <div className="w-12 h-12 rounded-full bg-[#101522] border border-white/20 flex items-center justify-center text-primary font-bold mb-6 mx-auto group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all">
                  {s.num}
                </div>
                <div className="text-center">
                  <h4 className="text-lg font-bold text-white mb-2">{s.title}</h4>
                  <p className="text-sm text-slate-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}