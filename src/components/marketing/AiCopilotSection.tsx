import React from 'react';
import { Bot } from 'lucide-react';

export function AiCopilotSection() {
  return (
    <section className="py-24 relative overflow-hidden bg-[#06070B]">
      <div className="max-w-7xl mx-auto px-6 text-center mb-16 relative z-10">
        <h2 className="text-xs font-bold tracking-widest text-primary mb-3">AI SECURITY COPILOT</h2>
        <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Ask your security data questions.</h3>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">Use AI to investigate findings, summarize evidence, explain security impact and understand remediation options.</p>
      </div>

      <div className="max-w-3xl mx-auto px-6 relative z-10">
        <div className="bg-[#101522] border border-white/10 rounded-2xl p-6 shadow-2xl hover:border-primary/20 transition-colors">
          <div className="flex gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0"></div>
            <div className="bg-[#0B0F17] border border-white/5 p-4 rounded-2xl rounded-tl-none text-slate-300 text-sm">
              Why is this finding considered high risk?
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 text-primary">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl rounded-tr-none text-slate-300 text-sm leading-relaxed">
              <p className="mb-4">This finding affects an authenticated API endpoint and may allow unauthorized access to protected resources. The assessment contains 4 supporting evidence items and the current confidence level is 91%.</p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white">Evidence: 4 items</span>
                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white">Confidence: 91%</span>
                <span className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded text-xs font-medium">Severity: High</span>
                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white">Asset: API /users</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}