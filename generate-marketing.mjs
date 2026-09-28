import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'src/components/marketing');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const files = {
    'MarketingPage.tsx': `
import React from 'react';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { Features } from './Features';
import { PlatformPreview } from './PlatformPreview';
import { EvidenceSection } from './EvidenceSection';
import { RiskGraphSection } from './RiskGraphSection';
import { AiCopilotSection } from './AiCopilotSection';
import { BeforeAfterSection } from './BeforeAfterSection';
import { SecuritySection } from './SecuritySection';
import { FAQSection } from './FAQSection';
import { CTASection } from './CTASection';
import { Footer } from './Footer';
import { HowItWorksSection } from './HowItWorksSection';

export function MarketingPage() {
  return (
    <div className="min-h-screen bg-[#06070B] text-[#F8FAFC] selection:bg-primary/30 font-sans">
      <Navbar />
      <main>
        <Hero />
        <PlatformPreview />
        <HowItWorksSection />
        <Features />
        <EvidenceSection />
        <RiskGraphSection />
        <AiCopilotSection />
        <BeforeAfterSection />
        <SecuritySection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
`,
    'Navbar.tsx': `
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
    <header className={\`fixed top-0 w-full z-50 transition-all duration-300 \${scrolled ? 'bg-[#06070B]/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}\`}>
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
`,
    'Hero.tsx': `
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
          <Link to="/dashboard">
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
`,
    'PlatformPreview.tsx': `
import React from 'react';

export function PlatformPreview() {
  return (
    <section id="platform" className="py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">ONE SECURITY COMMAND CENTER</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">See your entire security posture in one place.</h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Monitor assessments, findings, risk concentration, remediation progress and security trends from a single command center.</p>
        </div>
        
        <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(99,102,241,0.15)] bg-[#101522] transform hover:-translate-y-2 transition-transform duration-500">
          {/* Mac window controls */}
          <div className="bg-[#0B0F17] px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          
          {/* Mockup Content */}
          <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5">
                  <div className="text-slate-400 text-sm mb-1">Security Score</div>
                  <div className="text-3xl font-bold text-white">82<span className="text-sm text-slate-500 font-normal">/100</span></div>
                </div>
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5">
                  <div className="text-slate-400 text-sm mb-1">Critical</div>
                  <div className="text-3xl font-bold text-red-400">1</div>
                </div>
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5">
                  <div className="text-slate-400 text-sm mb-1">High</div>
                  <div className="text-3xl font-bold text-orange-400">6</div>
                </div>
                <div className="bg-[#0B0F17] p-4 rounded-xl border border-white/5">
                  <div className="text-slate-400 text-sm mb-1">Open</div>
                  <div className="text-3xl font-bold text-white">26</div>
                </div>
              </div>
              
              <div className="bg-[#0B0F17] h-64 rounded-xl border border-white/5 p-6 flex flex-col justify-between relative overflow-hidden group">
                <div className="text-sm font-medium text-slate-300">Risk Trend</div>
                {/* Fake chart */}
                <div className="absolute bottom-0 left-0 w-full h-32 flex items-end px-6 pb-6 gap-2 opacity-60">
                   {[40, 50, 45, 60, 55, 70, 65, 80, 75, 90, 85, 100].map((h, i) => (
                     <div key={i} className="flex-1 bg-gradient-to-t from-primary/40 to-transparent rounded-t-sm group-hover:from-primary/60 transition-colors" style={{ height: \`\${h}%\` }}></div>
                   ))}
                </div>
              </div>
            </div>
            
            <div className="col-span-1 space-y-6">
               <div className="bg-[#0B0F17] rounded-xl border border-white/5 p-6 h-full">
                 <div className="text-sm font-medium text-slate-300 mb-6">Recent Findings</div>
                 <div className="space-y-4">
                   {['Broken Access Control', 'API Authentication Weakness', 'Outdated Dependency', 'Missing Security Header'].map((f, i) => (
                     <div key={i} className="flex items-center gap-3 group/item">
                       <div className={\`w-2 h-2 rounded-full \${i < 2 ? 'bg-red-400' : 'bg-orange-400'}\`}></div>
                       <div className="text-sm text-slate-300 truncate group-hover/item:text-white transition-colors">{f}</div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
`,
    'HowItWorksSection.tsx': `
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
`,
    'Features.tsx': `
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
`,
    'EvidenceSection.tsx': `
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
`,
    'RiskGraphSection.tsx': `
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
            <style>{ \`@keyframes dash { to { stroke-dashoffset: -8; } }\` }</style>
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
`,
    'AiCopilotSection.tsx': `
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
`,
    'BeforeAfterSection.tsx': `
import React from 'react';
import { ArrowRight } from 'lucide-react';

export function BeforeAfterSection() {
  return (
    <section className="py-24 bg-[#0B0F17]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">MEASURE THE IMPROVEMENT</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">See what changed after remediation.</h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Security improvement should be measurable. Compare your posture before and after fixes and understand where risk was reduced.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto relative">
          {/* Before */}
          <div className="bg-[#101522] border border-white/5 rounded-2xl p-8 hover:bg-white/[0.02] transition-colors">
            <div className="text-sm font-medium text-slate-500 mb-6 uppercase tracking-wider">Before Remediation</div>
            <div className="text-5xl font-bold text-white mb-2">61<span className="text-xl text-slate-500 font-normal">/100</span></div>
            <div className="text-sm text-slate-400 mb-8">Security Score</div>
            
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-bold text-red-400 mb-1">4</div>
                <div className="text-xs text-slate-500">Critical</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400 mb-1">12</div>
                <div className="text-xs text-slate-500">High</div>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="bg-[#101522] border border-primary/30 rounded-2xl p-8 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#0B0F17] rounded-full border border-white/10 hidden md:flex items-center justify-center z-10 text-primary">
              <ArrowRight className="w-5 h-5" />
            </div>
            
            <div className="text-sm font-medium text-primary mb-6 uppercase tracking-wider">After Remediation</div>
            <div className="text-5xl font-bold text-white mb-2">82<span className="text-xl text-slate-500 font-normal">/100</span></div>
            <div className="text-sm text-slate-400 mb-8">Security Score</div>
            
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-bold text-red-400 mb-1">1</div>
                <div className="text-xs text-slate-500">Critical</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400 mb-1">6</div>
                <div className="text-xs text-slate-500">High</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
`,
    'SecuritySection.tsx': `
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
`,
    'FAQSection.tsx': `
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: "What is SENTINEL?", a: "SENTINEL is an evidence-driven security assessment platform designed to help teams discover, validate, understand, remediate and verify application security findings." },
  { q: "How does a security assessment work?", a: "An assessment moves through asset discovery, security analysis, finding validation, evidence collection, risk analysis, remediation and verification." },
  { q: "How does SENTINEL validate vulnerabilities?", a: "SENTINEL connects findings to evidence and controlled validation steps so security issues can be investigated rather than treated as unverified alerts." },
  { q: "What is the role of AI?", a: "AI assists with security analysis, finding explanations, evidence interpretation and remediation guidance. AI-generated conclusions should remain evidence-backed and human-reviewed." },
  { q: "How does remediation verification work?", a: "After remediation, the affected finding can be re-tested and compared against its previous state to determine whether the issue has been resolved." },
  { q: "Can SENTINEL generate security reports?", a: "Yes. The platform is designed to generate structured assessment reports containing findings, evidence, severity, remediation and verification results." }
];

export function FAQSection() {
  return (
    <section className="py-24 bg-[#0B0F17]">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold tracking-widest text-primary mb-3">FAQ</h2>
          <h3 className="text-3xl md:text-5xl font-bold tracking-tight">Questions, answered.</h3>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={\`item-\${i}\`} className="border-white/10 border-b">
              <AccordionTrigger className="text-left text-lg font-medium py-6 hover:text-primary transition-colors hover:no-underline text-white">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-slate-400 text-base leading-relaxed pb-6">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
`,
    'CTASection.tsx': `
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
          <Link to="/dashboard">
            <Button size="lg" className="h-14 px-8 text-base rounded-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] transition-all border-none">
              Start Assessment <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-full border-white/20 hover:bg-white/10 bg-[#101522] text-white">
              Explore Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
`,
    'Footer.tsx': `
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
`
};

for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(outDir, filename), content.trim());
}
console.log('Marketing components generated successfully.');
