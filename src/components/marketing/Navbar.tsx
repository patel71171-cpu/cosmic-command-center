import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ShieldCheck, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#06070B]/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20 group-hover:border-primary/40 transition-colors">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold tracking-widest text-sm">SENTINEL</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#platform" className="hover:text-white transition-colors">Platform</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
        </nav>
        
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Sign In</Link>
          <Link to="/dashboard">
            <Button className="bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-90 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all rounded-full px-6">
              Get Started
            </Button>
          </Link>
        </div>

        <button className="md:hidden text-slate-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-[#06070B]/95 backdrop-blur-xl border-b border-white/5 px-6 py-8 flex flex-col gap-6">
          <a href="#platform" className="text-lg font-medium text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Platform</a>
          <a href="#how-it-works" className="text-lg font-medium text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#features" className="text-lg font-medium text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#security" className="text-lg font-medium text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Security</a>
          <div className="h-px bg-white/5 w-full my-2"></div>
          <Link to="/login" className="text-lg font-medium text-slate-300 hover:text-white">Sign In</Link>
          <Link to="/dashboard">
            <Button className="w-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full">
              Get Started
            </Button>
          </Link>
        </div>
      )}
    </header>
  );
}