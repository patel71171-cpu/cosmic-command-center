import React from 'react';
import { ShieldCheck, Network, Sparkles, Activity, FileText, CheckCircle } from 'lucide-react';

const features = [
  {
    icon: <CheckCircle className="w-6 h-6 text-primary" />,
    title: "Evidence Chain",
    description: "Connect every finding to the evidence that supports it, making security results easier to validate and investigate."
  },
  {
    icon: <Network className="w-6 h-6 text-primary" />,
    title: "Security Risk Graph",
    description: "Visualize relationships between applications, APIs, endpoints, dependencies and vulnerabilities."
  },
  {
    icon: <Sparkles className="w-6 h-6 text-primary" />,
    title: "AI Security Copilot",
    description: "Ask questions about findings, evidence, impact and remediation using an AI-assisted security analysis layer."
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-primary" />,
    title: "Verified Remediation",
    description: "Track remediation and confirm whether a vulnerability is actually resolved after re-testing."
  },
  {
    icon: <Activity className="w-6 h-6 text-primary" />,
    title: "Security Posture",
    description: "Understand how your security posture changes over time with measurable risk reduction."
  },
  {
    icon: <FileText className="w-6 h-6 text-primary" />,
    title: "Assessment Reports",
    description: "Generate structured reports containing findings, evidence, severity, remediation and verification results."
  }
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-[#0B0F17]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">BUILT FOR REAL SECURITY WORK</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Everything you need to understand security risk.</h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">SENTINEL focuses on evidence, context and verification instead of simply generating vulnerability lists.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-[#101522] p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-colors group">
              <div className="bg-[#0B0F17] w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner border border-white/5">
                {f.icon}
              </div>
              <h4 className="text-xl font-semibold text-white mb-3">{f.title}</h4>
              <p className="text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
