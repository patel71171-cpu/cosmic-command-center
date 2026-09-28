import React from 'react';
import { ArrowRight, ShieldCheck, Zap, Activity, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Subtle Network */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #6366F1 0%, transparent 50%)', filter: 'blur(100px)' }}>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101522] border border-white/10 text-primary text-xs font-semibold tracking-widest mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          SECURITY ASSESSMENT PLATFORM
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
          SEE THE RISK.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]">PROVE THE FINDING.</span><br/>
          FIX IT.
        </h1>
        
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-12 leading-relaxed">
          Evidence-driven security assessment for modern applications. Discover, validate, remediate and verify from one unified platform.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link to="/login">
            <Button size="lg" className="h-14 px-8 text-base rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] transition-all border-none">
              Start Assessment <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <a href="#platform">
            <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full border-white/10 hover:bg-white/5 bg-[#101522] text-white">
              Explore Platform
            </Button>
          </a>
        </div>
        
        {/* Trust Strip */}
        <div className="pt-10 border-t border-white/5 flex flex-wrap justify-center gap-8 md:gap-16 text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary/70" /> Evidence-Driven</div>
          <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-primary/70" /> Continuous Assessment</div>
          <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-primary/70" /> AI-Assisted Analysis</div>
          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary/70" /> Verified Remediation</div>
        </div>
      </div>
    </section>
  );
}
