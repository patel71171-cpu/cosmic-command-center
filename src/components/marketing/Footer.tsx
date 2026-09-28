import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#06070B] pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4 text-white">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="font-bold tracking-widest text-sm">SENTINEL</span>
            </div>
            <p className="text-slate-400 text-sm">Find. Prove. Understand. Fix. Verify.</p>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#" className="hover:text-primary transition-colors">Dashboard</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Assessments</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Findings</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Attack Surface</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Risk Graph</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Remediation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Reports</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">AI Copilot</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Security Posture</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div>© 2026 SENTINEL. Security assessment platform.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
