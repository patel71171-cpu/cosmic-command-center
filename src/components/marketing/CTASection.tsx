import React from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-32 relative overflow-hidden bg-[#06070B]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none"></div>
      
      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <h2 className="text-xs font-bold tracking-widest text-primary mb-4">READY TO ASSESS?</h2>
        <h3 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Turn security findings into verified fixes.</h3>
        <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
          Discover risk. Build evidence. Remediate with confidence. Verify the result.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/login">
            <Button size="lg" className="h-14 px-8 text-base rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all border-none">
              Start Assessment <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full border-white/20 hover:bg-white/10 bg-[#101522] text-white">
              Explore Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
