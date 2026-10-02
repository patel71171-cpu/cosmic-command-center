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
            <AccordionItem key={i} value={`item-${i}`} className="border-white/10 border-b">
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
