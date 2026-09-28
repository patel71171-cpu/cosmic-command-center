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