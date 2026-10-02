import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import { verifyGoogleToken } from "../lib/auth-server";
import { useGoogleLogin } from "@react-oauth/google";

import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Target,
  TriangleAlert,
  Clock,
  ExternalLink,
  Search,
  Copy,
  Maximize2,
  GitBranch,
  Sparkles,
  Play,
  Check,
  Wrench,
  Filter as FilterIcon,
  Trash,
  Edit2
} from "lucide-react";
import { useSentinel } from "@/lib/sentinel-store";
import { type Finding, type Assessment } from "@/lib/sentinel-data";

import {
  Badge,
  PageHeading,
  Panel,
  Metric,
  SearchField,
  Filter,
  Empty,
  SectionLink,
  Action,
  severityColor,
} from "./sentinel-ui";
import { TrendChart, SeverityChart, CategoryChart } from "./sentinel-charts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GraphView } from "./sentinel-graph";
import { buildAttackGraph } from "@/lib/sentinel-graph-data";
import { exportFindingPdf, exportFindingsPdf, exportReportPdf } from "@/lib/sentinel-pdf";
const table = "w-full text-left text-xs";
const th = "border-b border-border px-4 py-3 font-medium text-muted-foreground";
const td = "border-b border-border/60 px-4 py-3.5 align-middle";
function exportToPDF(assessment: Assessment, findings: Finding[], notify: (msg: string) => void) {
  notify("Generating PDF summary...");
  
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 60;

    // ── Header bar ──────────────────────────────────────────────────
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(0, 0, W, 8, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("Security Assessment Summary", margin, y);
    y += 24;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Assessment: ${assessment.name}`, margin, y);
    y += 14;
    doc.text(`Target: ${assessment.target}`, margin, y);
    y += 14;
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, margin, y);
    y += 6;

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, y, W - margin, y);
    y += 22;

    // ── Metrics row ──────────────────────────────────────────────────
    const metricW = (W - margin * 2) / 3;
    const metrics = [
      { label: "Security Score", value: `${assessment.score}/100`, color: assessment.score < 70 ? [239, 68, 68] as [number,number,number] : [34, 197, 94] as [number,number,number] },
      { label: "Total Findings", value: `${assessment.findings}`, color: [239, 68, 68] as [number,number,number] },
      { label: "Completion",     value: `${assessment.progress}%`, color: [99, 102, 241] as [number,number,number] },
    ];

    metrics.forEach(({ label, value, color }, i) => {
      const x = margin + i * metricW;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, metricW - 8, 64, 6, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...color);
      doc.text(value, x + (metricW - 8) / 2, y + 30, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), x + (metricW - 8) / 2, y + 50, { align: "center" });
    });
    y += 84;

    // ── Executive Summary ────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Executive Summary", margin, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const summary = `This report documents the findings of the security assessment conducted for ${assessment.name} (target: ${assessment.target}). The assessment achieved ${assessment.progress}% completion, identifying ${assessment.findings} security findings across web application surfaces, API endpoints, and dependency chains. The overall security posture received a score of ${assessment.score}/100${assessment.score < 70 ? " — indicating significant risk exposure that requires immediate remediation." : " — indicating an acceptable baseline with areas for improvement."}`;
    const lines = doc.splitTextToSize(summary, W - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 18;

    // ── Findings table ───────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Prioritized Findings", margin, y);
    y += 16;

    // Column x positions — well spread out to avoid overlap
    const col = {
      title:    margin + 12,
      severity: margin + 260,
      cvss:     margin + 360,
      asset:    margin + 420,
    };

    // Table header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, W - margin * 2, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("FINDING",  col.title,    y + 14);
    doc.text("SEVERITY", col.severity, y + 14);
    doc.text("CVSS",     col.cvss,     y + 14);
    doc.text("ASSET",    col.asset,    y + 14);
    y += 26;

    const severityColors: Record<string, [number, number, number]> = {
      Critical: [239, 68, 68], High: [249, 115, 22], Medium: [234, 179, 8], Low: [34, 197, 94], Informational: [148, 163, 184]
    };

    findings.slice(0, 10).forEach((f, idx) => {
      if (y > doc.internal.pageSize.getHeight() - 80) {
        doc.addPage();
        y = 60;
      }
      // Row background
      doc.setFillColor(...(idx % 2 === 0 ? [255, 255, 255] as [number,number,number] : [248, 250, 252] as [number,number,number]));
      doc.rect(margin, y - 4, W - margin * 2, 22, "F");

      // Severity colour dot
      const sc = severityColors[f.severity] ?? [148, 163, 184];
      doc.setFillColor(...sc);
      doc.circle(margin + 5, y + 7, 3, "F");

      // Title — truncate so it doesn't bleed into the next column
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const titleText = doc.splitTextToSize(f.title, 220)[0];
      doc.text(titleText, col.title, y + 9);

      // Severity label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...sc);
      doc.text(f.severity, col.severity, y + 9);

      // CVSS score
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(f.cvss != null ? String(f.cvss) : "—", col.cvss, y + 9);

      // Asset — truncate to avoid overflow
      const assetText = doc.splitTextToSize(f.asset ?? "—", 110)[0];
      doc.text(assetText, col.asset, y + 9);

      y += 24;
    });

    // ── Footer ────────────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const ph = doc.internal.pageSize.getHeight();
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, ph - 30, W - margin, ph - 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("SENTINEL Security Platform — Confidential", margin, ph - 16);
      doc.text(`Page ${p} of ${totalPages}`, W - margin, ph - 16, { align: "right" });
    }

    doc.save(`Assessment_Summary_${assessment.name.replace(/\s+/g, "_")}.pdf`);
    notify("PDF downloaded successfully!");
  } catch (err) {
    console.error(err);
    notify("Failed to generate PDF. Please try again.");
  }
}

// ── Export: Findings list ─────────────────────────────────────────────────
function exportFindingsToPDF(rows: Finding[], notify: (msg: string) => void) {
  notify("Generating findings PDF…");
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 60;
    doc.setFillColor(99, 102, 241); doc.rect(0, 0, W, 8, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(15, 23, 42);
    doc.text("Findings Report", margin, y); y += 20;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")} · Total: ${rows.length}`, margin, y); y += 8;
    doc.setDrawColor(226, 232, 240); doc.line(margin, y, W - margin, y); y += 22;
    const sc2: Record<string, [number, number, number]> = { Critical:[239,68,68], High:[249,115,22], Medium:[234,179,8], Low:[34,197,94], Informational:[148,163,184] };
    const col = { id: margin+4, title: margin+50, sev: margin+290, cvss: margin+370, status: margin+430 };
    doc.setFillColor(241,245,249); doc.rect(margin, y, W-margin*2, 22, "F");
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(100,116,139);
    doc.text("ID",col.id,y+14); doc.text("FINDING TITLE",col.title,y+14); doc.text("SEVERITY",col.sev,y+14); doc.text("CVSS",col.cvss,y+14); doc.text("STATUS",col.status,y+14);
    y += 26;
    rows.forEach((f,idx) => {
      if (y > doc.internal.pageSize.getHeight()-80) { doc.addPage(); y=60; }
      const c = sc2[f.severity]??[148,163,184];
      doc.setFillColor(...(idx%2===0?[255,255,255] as [number,number,number]:[248,250,252] as [number,number,number])); doc.rect(margin,y-4,W-margin*2,22,"F");
      doc.setFillColor(...c); doc.circle(margin+5,y+7,3,"F");
      doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(100,116,139);
      doc.text(f.id,col.id,y+9); doc.setTextColor(15,23,42); doc.text(doc.splitTextToSize(f.title,230)[0],col.title,y+9);
      doc.setFont("helvetica","bold"); doc.setTextColor(...c); doc.text(f.severity,col.sev,y+9);
      doc.setFont("helvetica","normal"); doc.setTextColor(100,116,139); doc.text(f.cvss!=null?String(f.cvss):"—",col.cvss,y+9); doc.text(f.status??"Open",col.status,y+9);
      y+=22;
    });
    const tp=doc.getNumberOfPages(); for(let p=1;p<=tp;p++){doc.setPage(p);const ph=doc.internal.pageSize.getHeight();doc.setDrawColor(226,232,240);doc.line(margin,ph-30,W-margin,ph-30);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(148,163,184);doc.text("SENTINEL Security Platform — Confidential",margin,ph-16);doc.text(`Page ${p} of ${tp}`,W-margin,ph-16,{align:"right"});}
    doc.save("SENTINEL_Findings.pdf"); notify("Findings PDF downloaded!");
  } catch(err){ console.error(err); notify("Failed to generate PDF."); }
}

// ── Export: Single finding detail ─────────────────────────────────────────
function exportFindingDetailToPDF(f: Finding, notify: (msg: string) => void) {
  notify("Generating finding PDF...");
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 60;
    const sc2: Record<string,[number,number,number]> = {Critical:[239,68,68],High:[249,115,22],Medium:[234,179,8],Low:[34,197,94],Informational:[148,163,184]};
    const c = sc2[f.severity]??[148,163,184];
    doc.setFillColor(...c); doc.rect(0,0,W,8,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(17); doc.setTextColor(15,23,42);
    const titleLines = doc.splitTextToSize(f.title, W - margin * 2);
    doc.text(titleLines, margin, y); y += titleLines.length * 20 + 4;
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(100,116,139);
    doc.text(`${f.id}  ·  ${f.severity}  ·  CVSS ${f.cvss??"—"}  ·  ${f.status??"Open"}  ·  Asset: ${f.asset??"—"}`,margin,y); y+=14;
    doc.setDrawColor(226,232,240); doc.line(margin,y,W-margin,y); y+=18;
    const section=(t:string)=>{if(y>doc.internal.pageSize.getHeight()-80){doc.addPage();y=60;}doc.setFont("helvetica","bold");doc.setFontSize(11);doc.setTextColor(15,23,42);doc.text(t,margin,y);y+=15;};
    const body=(t:string)=>{doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(71,85,105);const ls=doc.splitTextToSize(t,W-margin*2);if(y+ls.length*13>doc.internal.pageSize.getHeight()-60){doc.addPage();y=60;}doc.text(ls,margin,y);y+=ls.length*13+12;};
    section("Summary"); body(f.summary??"No summary.");
    section("Potential Impact"); body(f.impact??"Not specified.");
    section("Remediation"); body(f.fix??"No guidance.");
    if((f.evidence??[]).length){section("Evidence");(f.evidence??[]).forEach((ev,i)=>body(`${i+1}. ${ev}`));}
    if((f.steps??[]).length){section("Reproduction Steps");(f.steps??[]).forEach((s,i)=>body(`${i+1}. ${s}`));}
    if(f.technical){section("Technical Analysis");body(f.technical);} 
    const tp=doc.getNumberOfPages(); for(let p=1;p<=tp;p++){doc.setPage(p);const ph=doc.internal.pageSize.getHeight();doc.setDrawColor(226,232,240);doc.line(margin,ph-30,W-margin,ph-30);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(148,163,184);doc.text("SENTINEL Security Platform — Confidential",margin,ph-16);doc.text(`Page ${p} of ${tp}`,W-margin,ph-16,{align:"right"});}
    doc.save(`SENTINEL_Finding_${f.id}.pdf`); notify("Finding PDF downloaded!");
  } catch(err){ console.error(err); notify("Failed to generate PDF."); }
}

// ── Export: Full executive report ─────────────────────────────────────────
function exportReportToPDF(title: string, findings: Finding[], notify: (msg: string) => void) {
  notify("Generating report PDF...");
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const W = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 60;
    doc.setFillColor(99,102,241); doc.rect(0,0,W,8,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.setTextColor(15,23,42);
    doc.text(title,margin,y); y+=22;
    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(100,116,139);
    doc.text(`World Monitor Security Assessment · Generated ${new Date().toLocaleDateString("en-GB")}`,margin,y); y+=8;
    doc.setDrawColor(226,232,240); doc.line(margin,y,W-margin,y); y+=22;
    const critical=findings.filter(f=>f.severity==="Critical").length;
    const high=findings.filter(f=>f.severity==="High").length;
    const mW=(W-margin*2)/4;
    const mets:[string,string,[number,number,number]][]=[["Security Score","72/100",[34,197,94]],["Critical",String(critical),[239,68,68]],["High",String(high),[249,115,22]],["Total Findings",String(findings.length),[99,102,241]]];
    mets.forEach(([label,value,color],i)=>{const x=margin+i*mW;doc.setFillColor(248,250,252);doc.roundedRect(x,y,mW-8,60,6,6,"F");doc.setFont("helvetica","bold");doc.setFontSize(20);doc.setTextColor(...color);doc.text(value,x+(mW-8)/2,y+28,{align:"center"});doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(100,116,139);doc.text(label.toUpperCase(),x+(mW-8)/2,y+46,{align:"center"});});
    y+=80;
    doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(15,23,42); doc.text("Executive Summary",margin,y); y+=16;
    doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(71,85,105);
    const sum=`The World Monitor assessment found ${findings.length} findings. Score: 72/100. ${critical} critical and ${high} high severity issues require immediate attention.`;
    const sl=doc.splitTextToSize(sum,W-margin*2); doc.text(sl,margin,y); y+=sl.length*14+20;
    doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(15,23,42); doc.text("All Findings",margin,y); y+=16;
    const sc2:Record<string,[number,number,number]>={Critical:[239,68,68],High:[249,115,22],Medium:[234,179,8],Low:[34,197,94],Informational:[148,163,184]};
    const col={title:margin+12,sev:margin+270,cvss:margin+360,status:margin+430};
    doc.setFillColor(241,245,249); doc.rect(margin,y,W-margin*2,22,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(100,116,139);
    doc.text("FINDING",col.title,y+14); doc.text("SEVERITY",col.sev,y+14); doc.text("CVSS",col.cvss,y+14); doc.text("STATUS",col.status,y+14); y+=26;
    findings.forEach((f,idx)=>{
      if(y>doc.internal.pageSize.getHeight()-80){doc.addPage();y=60;}
      const c=sc2[f.severity]??[148,163,184];
      doc.setFillColor(...(idx%2===0?[255,255,255] as [number,number,number]:[248,250,252] as [number,number,number])); doc.rect(margin,y-4,W-margin*2,22,"F");
      doc.setFillColor(...c); doc.circle(margin+5,y+7,3,"F");
      doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(15,23,42); doc.text(doc.splitTextToSize(f.title,250)[0],col.title,y+9);
      doc.setFont("helvetica","bold"); doc.setTextColor(...c); doc.text(f.severity,col.sev,y+9);
      doc.setFont("helvetica","normal"); doc.setTextColor(100,116,139); doc.text(f.cvss!=null?String(f.cvss):"—",col.cvss,y+9); doc.text(f.status??"Open",col.status,y+9);
      y+=22;
    });
    const tp=doc.getNumberOfPages(); for(let p=1;p<=tp;p++){doc.setPage(p);const ph=doc.internal.pageSize.getHeight();doc.setDrawColor(226,232,240);doc.line(margin,ph-30,W-margin,ph-30);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(148,163,184);doc.text("SENTINEL Security Platform — Confidential",margin,ph-16);doc.text(`Page ${p} of ${tp}`,W-margin,ph-16,{align:"right"});}
    doc.save("SENTINEL_Security_Report.pdf"); notify("Report PDF downloaded!");
  } catch(err){ console.error(err); notify("Failed to generate PDF."); }
}

export function Dashboard() {
  const { findings, assessments, notify } = useSentinel();
  const navigate = useNavigate();
  const active = assessments[0];
  const critical = findings.filter((f) => f.severity === "Critical").length;
  const high = findings.filter((f) => f.severity === "High").length;
  const open = findings.filter((f) => f.status !== "Verified").length;
  const verified = findings.length - open;
  const assets = new Set(findings.map((f) => f.asset).filter(Boolean)).size;
  const remediation = findings.length ? Math.round((verified / findings.length) * 100) : 0;
  return (
    <>
      <PageHeading
        title="Security Command Center"
        description="A clear view of your application security posture and assessment activity."
        actions={
          <>
            <Action icon={Download} onClick={() => exportReportToPDF("Executive Security Report", findings, notify)}>
              Export Report
            </Action>
            <Button size="sm" className="h-9 gap-2 text-xs" asChild>
              <Link to="/assessments/new">
                <Plus size={14} />
                New Assessment
              </Link>
            </Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric
          label="Security Score"
          value={`${active?.score ?? 0}/100`}
          change="+8%"
          icon={ShieldCheck}
          foot="vs. previous assessment"
        />
        <Metric
          label="Critical Findings"
          value={String(critical)}
          change="−2"
          tone="critical"
          icon={ShieldAlert}
          foot="Require immediate attention"
        />
        <Metric
          label="High Findings"
          value={String(high)}
          change="−4"
          tone="high"
          icon={TriangleAlert}
          foot={`Across ${assets} assets`}
        />
        <Metric
          label="Open Findings"
          value={String(open)}
          change="−11%"
          tone="violet"
          icon={Bug}
          foot={`From ${findings.length} total findings`}
        />
        <Metric
          label="Remediation Progress"
          value={`${remediation}%`}
          change="+14%"
          tone="success"
          icon={CheckCircle2}
          foot="28 fixes verified"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Security Posture Trend"
          sub="Security score over the last 30 days"
          action={<Badge tone="Completed">+18 points this month</Badge>}
        >
          <TrendChart />
        </Panel>
        <Panel title="Findings by Severity" sub="All validated and pending findings">
          <SeverityChart />
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Panel
          title="Vulnerability Distribution"
          sub="Finding categories across assessed assets"
          className="xl:col-span-1"
        >
          <CategoryChart />
        </Panel>
        <Panel
          title="Assessment Progress"
          sub="Current assessment portfolio"
          action={<SectionLink to="/assessments">View all</SectionLink>}
        >
          <div className="space-y-5">
            {assessments.slice(0, 4).map((a) => (
              <Link key={a.id} to="/assessments/$id" params={{ id: a.id }} className="block group">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate group-hover:text-[#A855F7]">{a.name}</span>
                  <span className="shrink-0 text-muted-foreground">{a.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-[#A855F7]"
                    style={{ width: `${a.progress}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            {assets} assets <span className="mx-2 text-subtle">·</span>{" "}
            {findings.length} findings{" "}
            <span className="mx-2 text-subtle">·</span> {assessments.length} assessments
          </div>
        </Panel>
        <Panel
          title="Top Risk Areas"
          sub="Concentration by application layer"
          action={<SectionLink to="/attack-surface">Explore map</SectionLink>}
        >
          <div className="space-y-4">
            {[
              { name: "Core API", risk: 91, tone: "bg-critical" },
              { name: "Admin endpoints", risk: 86, tone: "bg-high" },
              { name: "Identity & access", risk: 74, tone: "bg-medium" },
              { name: "Dependencies", risk: 42, tone: "bg-primary" },
            ].map((r) => (
              <div key={r.name}>
                <div className="mb-2 flex justify-between text-xs">
                  <span>{r.name}</span>
                  <span className="font-semibold">
                    {r.risk}
                    <span className="text-muted-foreground">/100</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${r.tone}`}
                    style={{ width: `${r.risk}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Recent Findings"
          sub="Latest evidence-backed security discoveries"
          action={<SectionLink to="/findings">View all findings</SectionLink>}
        >
          <div className="overflow-x-auto">
            <table className={table}>
              <thead>
                <tr>
                  {["Finding", "Severity", "Asset", "Status"].map((x) => (
                    <th key={x} className={th}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findings.slice(0, 4).map((f) => (
                  <tr key={f.id} className="hover:bg-panel-hover">
                    <td className={td}>
                      <Link
                        to="/findings/$id"
                        params={{ id: f.id }}
                        className="font-medium hover:text-primary"
                      >
                        {f.title}
                      </Link>
                      <span className="mt-1 block text-[10px] text-muted-foreground">{f.id}</span>
                    </td>
                    <td className={td}>
                      <Badge tone={f.severity}>{f.severity}</Badge>
                    </td>
                    <td className={`${td} max-w-[160px] truncate text-muted-foreground`}>
                      {f.asset}
                    </td>
                    <td className={td}>
                      <Badge tone={f.status}>{f.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Recent Activity" sub="Latest events in your workspace">
          <div className="space-y-0">
            {[
              ...[...findings]
                .sort((a, b) => b.cvss - a.cvss)
                .slice(0, 2)
                .map((f): [string, string] => [
                  "Finding discovered",
                  `${f.title} · ${f.detected}`,
                ]),
              ...assessments.slice(0, 2).map((a): [string, string] => [
                "Assessment completed",
                `${a.name} · ${a.lastRun}`,
              ]),
              ...findings
                .filter((f) => f.status === "Verified")
                .slice(0, 1)
                .map((f): [string, string] => ["Fix verified", `${f.title} · ${f.detected}`]),
            ].map(([title, desc], i) => (
              <div key={`${title}-${i}`} className="flex gap-3 border-l border-border pb-5 pl-4 last:pb-0">
                <div
                  className={`-ml-[21px] mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background ${i === 0 ? "bg-critical" : i === 2 ? "bg-success" : "bg-primary"}`}
                />
                <div>
                  <div className="text-xs font-medium">{title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
export function Assessments() {
  const { assessments, removeAssessment, updateAssessment, notify } = useSentinel();
  const [q, setQ] = useState(""),
    [status, setStatus] = useState("All"),
    [risk, setRisk] = useState("All");
  // Edit dialog state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const openEdit = (a: Assessment) => {
    setEditingId(a.id);
    setEditName(a.name);
    setEditTarget(a.target);
    setEditStatus(a.status);
  };
  const saveEdit = () => {
    if (!editName.trim()) return notify("Assessment name cannot be empty.");
    if (!editTarget.trim()) return notify("Target cannot be empty.");
    updateAssessment(editingId!, { name: editName, target: editTarget, status: editStatus as any });
    notify("Assessment updated successfully.");
    setEditingId(null);
  };

  const rows = assessments.filter(
    (a) =>
      `${a.name} ${a.target}`.toLowerCase().includes(q.toLowerCase()) &&
      (status === "All" || a.status === status) &&
      (risk === "All" ||
        (risk === "High"
          ? a.score < 70
          : risk === "Medium"
            ? a.score >= 70 && a.score < 85
            : a.score >= 85)),
  );
  return (
    <>
      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="border-border bg-panel sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Edit Assessment</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <label className="block text-xs">
              Assessment Name <span className="text-white">*</span>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-2 border-border bg-secondary" placeholder="e.g. World Monitor Security Assessment" />
            </label>
            <label className="block text-xs">
              Target <span className="text-white">*</span>
              <Input value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className="mt-2 border-border bg-secondary" placeholder="world-monitor.local" />
            </label>
            <label className="block text-xs">
              Status
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="mt-2 block h-10 w-full rounded-md border border-border bg-secondary px-3 text-xs text-foreground">
                {["Running","Completed","Scheduled","Failed","Draft"].map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button size="sm" className="text-xs" onClick={saveEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <PageHeading
        title="Security Assessments"
        description="Track assessment coverage, execution, and outcomes across your applications."
        actions={
          <Button size="sm" asChild className="h-9 gap-2 text-xs">
            <Link to="/assessments/new">
              <Plus size={14} />
              New Assessment
            </Link>
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total Assessments" value={assessments.length} icon={ScanIcon} />
        <Metric
          label="Completed"
          value={assessments.filter((a) => a.status === "Completed").length}
          icon={CheckCircle2}
          tone="success"
        />
        <Metric
          label="In Progress"
          value={assessments.filter((a) => a.status === "Running").length}
          icon={Activity}
        />
        <Metric label="Assets Covered" value="48" icon={Target} tone="violet" />
      </div>
      <Panel title="Assessment Portfolio" sub={`${rows.length} assessments shown`}>
        <div className="mb-5 flex flex-wrap gap-2">
          <div className="w-full sm:w-64">
            <SearchField value={q} onChange={setQ} placeholder="Search assessments or targets" />
          </div>
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={["Completed", "Running", "Scheduled", "Failed", "Draft"]}
          />
          <Filter
            label="Risk"
            value={risk}
            onChange={setRisk}
            options={["High", "Medium", "Low"]}
          />
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className={`${table} min-w-[760px]`}>
              <thead>
                <tr>
                  {[
                    "Assessment",
                    "Target",
                    "Status",
                    "Findings",
                    "Risk Score",
                    "Progress",
                    "Last Run",
                    "",
                  ].map((x, i) => (
                    <th className={th} key={i}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-panel-hover">
                    <td className={`${td} font-medium`}>
                      <Link
                        to="/assessments/$id"
                        params={{ id: a.id }}
                        className="hover:text-primary"
                      >
                        {a.name}
                      </Link>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{a.target}</td>
                    <td className={td}>
                      <Badge tone={a.status}>{a.status}</Badge>
                    </td>
                    <td className={td}>{a.findings}</td>
                    <td className={td}>
                      <span className={a.score < 70 ? "text-high" : "text-success"}>
                        {a.score}/100
                      </span>
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded bg-secondary">
                          <div
                            className="h-full rounded bg-primary"
                            style={{ width: `${a.progress}%` }}
                          />
                        </div>
                        {a.progress}%
                      </div>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{a.lastRun}</td>
                    <td className={td}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" asChild title="Open">
                          <Link to="/assessments/$id" params={{ id: a.id }}><ExternalLink size={14} /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" title="Edit" onClick={() => openEdit(a)}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-critical" title="Delete" onClick={() => {
                          if (confirm(`Are you sure you want to delete ${a.name}?`)) removeAssessment(a.id);
                        }}>
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
    </>
  );
}
const ScanIcon = Target;
export function NewAssessment() {
  const navigate = useNavigate();
  const { addAssessment, notify, runScan, loading } = useSentinel();
  const [step, setStep] = useState(0),
    [name, setName] = useState(""),
    [target, setTarget] = useState(""),
    [url, setUrl] = useState(""),
    [environment, setEnvironment] = useState("Staging"),
    [description, setDescription] = useState(""),
    [scope, setScope] = useState("Web Application"),
    [checks, setChecks] = useState([
      "Authentication",
      "Authorization",
      "API Security",
      "Dependencies",
    ]),
    [authorized, setAuthorized] = useState(false);
  const steps = [
    "Assessment Details",
    "Target Scope",
    "Security Checks",
    "Assessment Rules",
    "Review & Start",
  ];
  const submit = async (status: string) => {
    if (!name.trim()) {
      notify("Add an assessment name first.");
      setStep(0);
      return;
    }
    if (status === "Running") {
      const scanTarget = url || target;
      if (!scanTarget.startsWith("http://") && !scanTarget.startsWith("https://")) {
        notify("Please enter a valid target URL (starting with http:// or https://)");
        setStep(0);
        return;
      }
      notify("Starting security scan...");
      const id = await runScan(scanTarget, name, {
        authorized,
        description,
        environment,
        scope,
        checks,
      });
      if (id) {
        navigate({ to: "/assessments/$id", params: { id } });
      }
      return;
    }
    const id = `assessment-${Date.now()}`;
    addAssessment({
      id,
      name,
      target: target || url || "Unspecified target",
      status,
      findings: 0,
      score: 0,
      progress: status === "Running" ? 8 : 0,
      lastRun: status === "Running" ? "Running (8%)" : "Scheduled",
      logs: status === "Running" ? [`${new Date().toLocaleTimeString('en-GB')} · Assessment initialized`] : []

    });
    notify("Assessment saved as a draft.");
    navigate({ to: "/assessments/$id", params: { id } });
  };
  return (
    <>
      <PageHeading
        title="Create New Assessment"
        description="Configure the scope and checks for an authorized assessment."
      />
      <div className="mb-6 grid grid-cols-5 gap-1">
        {steps.map((s, i) => (
          <Button
            key={s}
            variant="ghost"
            onClick={() => setStep(i)}
            className={`h-auto min-w-0 flex-col gap-1 rounded-none border-b-2 px-1 py-3 text-[10px] sm:text-xs ${i === step ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            <span className="hidden sm:inline">0{i + 1} / </span>
            {s}
          </Button>
        ))}
      </div>
      <Panel title={steps[step] ?? "Assessment Details"} className="max-w-3xl">
        <div className="min-h-[290px] space-y-5">
          {step === 0 && (
            <>
              <Field
                label="Assessment name"
                value={name}
                set={setName}
                placeholder="e.g. World Monitor Security Assessment"
                required={true}

              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Target application"
                  value={target}
                  set={setTarget}
                  placeholder="world-monitor.local"
                  required={true}

                />
                <Field
                  label="Target URL"
                  value={url}
                  set={setUrl}
                  placeholder="https://example.local"
                  required={true}
                />
              </div>
              <label className="block text-xs">
                Environment
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="mt-2 block h-10 w-full rounded-md border border-border bg-secondary px-3"
                >
                  <option>Staging</option>
                  <option>Production</option>
                  <option>Development</option>
                </select>
              </label>
              <label className="block text-xs">
                Description
                <Textarea
                  className="mt-2 bg-secondary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Assessment goals and context"
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                Select the area that this assessment covers.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {["Web Application", "API", "Repository", "Dependencies"].map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    className={`h-14 justify-start ${scope === s ? "border-primary bg-accent text-primary" : ""}`}
                    onClick={() => setScope(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <div className="rounded-md border border-border bg-secondary p-4 text-xs text-muted-foreground">
                Target: {target || url || "Not specified"} · Environment: {environment}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Choose which security categories are included in the assessment.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Authentication",
                  "Authorization",
                  "Input Validation",
                  "API Security",
                  "Client Security",
                  "Configuration",
                  "Dependencies",
                  "Data Exposure",
                ].map((s) => (
                  <label
                    key={s}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-secondary p-3 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checks.includes(s)}
                      onChange={() =>
                        setChecks((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))
                      }
                      className="accent-primary"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="rounded-md border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed text-muted-foreground">
                <strong className="mb-2 block text-foreground">Authorization and scope</strong>This
                assessment will run real security checks against the target. Confirm written
                authorization and keep all activity inside the agreed scope.
              </div>
              <label className="flex items-center gap-3 text-xs">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="accent-primary"
                />
                I confirm this is an authorized assessment scope.
              </label>
            </>
          )}
          {step === 4 && (
            <div className="space-y-3">
              {[
                ["Assessment", name || "Untitled"],
                ["Target", target || url || "Not specified"],
                ["Environment", environment],
                ["Scope", scope],
                ["Security checks", checks.join(", ") || "None selected"],
                ["Authorization", authorized ? "Confirmed" : "Not confirmed"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[120px_1fr] gap-4 border-b border-border py-3 text-xs"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span>{value}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Starting this assessment will run a real security scan against the target URL.
              </p>
            </div>
          )}
        </div>
        <div className="mt-7 flex flex-wrap justify-between gap-2 border-t border-border pt-5">
          <Action onClick={() => submit("Draft")}>Save Draft</Action>
          <div className="flex gap-2">
            {step > 0 && <Action onClick={() => setStep((v) => v - 1)}>Back</Action>}
            {step < 4 ? (
              <Action variant="default" onClick={() => {
                if (step === 0) {
                  if (!name.trim()) return notify("Assessment name is required.");
                  if (!target.trim()) return notify("Target application is required.");
                  if (!url.trim()) return notify("Target URL is required.");
                  try {
                    new URL(url);
                  } catch (e) {
                    return notify("Target URL must be a valid URL (e.g. https://example.local)");
                  }
                }
                setStep((v) => v + 1);
              }}>
                Continue
              </Action>
            ) : (
              <Action
                variant="default"
                icon={Play}
                disabled={!authorized || loading}
                onClick={() => submit("Running")}
              >
                {loading ? "Scanning..." : "Start Assessment"}
              </Action>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}
function Field({
  label,
  value,
  set,
  placeholder,
  required
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs">
      {label} {required && <span className="text-white">*</span>}
      <Input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="mt-2 border-border bg-secondary"
      />
    </label>
  );
}
export function AssessmentDetail({ id }: { id: string }) {
  const { assessments, findings, notify } = useSentinel();

  const a = assessments.find((x) => x.id === id);

  // Live poll while the background scan is running
  useEffect(() => {
    if (!a) return;
    if (a.status !== "Running" && a.progress >= 100) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const status = await api.getAssessmentStatus(id);
        if (cancelled) return;
        if (status.status !== "SCANNING" && status.status !== "ANALYZING") {
          clearInterval(timer);
        }
        await refreshData();
      } catch {
        clearInterval(timer);
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [a?.status, a?.progress, id]);

  if (!a) return <Empty text="Assessment not found" />;
  const pipeline = [
    "Scope Validation",
    "Asset Discovery",
    "Security Headers",
    "SSL/TLS Analysis",
    "Endpoint Discovery",
    "Information Disclosure",
    "CORS Analysis",
    "Dependency Analysis",
    "Risk Calculation",
  ];
  const assessmentFindings = findings.filter((f) => (f as any).assessment_id === id);
  const criticalCount = assessmentFindings.filter((f) => f.severity === "Critical").length;
  const highCount = assessmentFindings.filter((f) => f.severity === "High").length;
  return (
    <>
      <PageHeading
        eyebrow="ASSESSMENTS / EXECUTION"
        title={a.name}
        description={`${a.target} · ${a.status === "Running" ? "Scan in progress" : "Assessment run details"}`}
        actions={
          <>
            <Action
              icon={Download}
              onClick={() => exportToPDF(a, findings, notify)}

            >
              Export Summary
            </Action>
            <Button size="sm" asChild className="h-9 text-xs">
              <Link to="/findings">
                Explore Findings <ArrowRight size={14} />
              </Link>
            </Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Completion" value={`${a.progress}%`} icon={Activity} />
        <Metric label="Findings" value={a.findings} icon={ShieldAlert} tone="critical" />
        <Metric label="Security Score" value={`${a.score}/100`} icon={ShieldCheck} tone="success" />
        <Metric label="Last Run" value={a.lastRun} icon={Clock} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Assessment Pipeline"
          sub="Security scan processing stages"
        >
          <div className="space-y-0">
            {pipeline.map((p, i) => {
              const done = i < Math.floor((a.progress / 100) * pipeline.length);
              return (
                <div
                  key={p}
                  className="flex items-center gap-4 border-l border-border pb-6 pl-5 last:pb-0"
                >
                  <div
                    className={`-ml-[29px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 border-panel ${done ? "bg-success text-background" : "bg-secondary text-muted-foreground"}`}
                  >
                    {done ? (
                      <Check size={11} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 text-xs">
                    <span>{p}</span>
                    <Badge
                      tone={
                        done
                          ? "Completed"
                          : i === Math.floor((a.progress / 100) * pipeline.length)
                            ? "Running"
                            : "neutral"
                      }
                    >
                      {done
                        ? "Completed"
                        : i === Math.floor((a.progress / 100) * pipeline.length)
                          ? "Running"
                          : "Pending"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Current Activity">
            <div className="rounded-md border border-border bg-secondary p-4 text-xs text-muted-foreground">
              {a.status === "Running"
                ? "Assessment in progress. Real security scan running against target."
                : `Assessment completed. ${assessmentFindings.length} findings discovered with real evidence.`}
            </div>
            <div className="mt-5 space-y-3 text-xs">
              {[
                ["Critical findings", String(criticalCount)],
                ["High findings", String(highCount)],
                ["Total findings", String(assessmentFindings.length)],
                ["Risk Score", `${a.risk_score || "N/A"}/100`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Scan Details">
            <div className="space-y-3 font-mono text-[11px] text-muted-foreground">
              {a.logs && a.logs.length > 0 ? a.logs.map((x, i) => (
                <div key={i}>{x}</div>
              )) : (
                <div>No logs generated yet.</div>
              )}

            </div>
          </Panel>
          <Panel title="Next Step">
            <div className="flex flex-wrap gap-3">
              <SectionLink to="/attack-surface">Explore attack surface</SectionLink>
              <SectionLink to="/findings">Investigate findings</SectionLink>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
function AssessmentPicker() {
  const { assessments, selectedAssessment, setSelectedAssessment } = useSentinel();
  if (!assessments.length) return null;
  return (
    <select
      aria-label="Assessment shown"
      className="h-9 max-w-[220px] rounded-md border border-border bg-secondary px-2 text-xs text-foreground"
      value={assessments.some((a) => a.id === selectedAssessment) ? selectedAssessment : (assessments[0]?.id ?? '')}
      onChange={(e) => setSelectedAssessment(e.target.value)}
    >
      {assessments.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}
export function AttackSurface() {
  const { findings, assessments, selectedAssessment } = useSentinel();
  const active =
    assessments.find((a) => a.id === selectedAssessment) ?? assessments[0];
  const scoped = active
    ? findings.filter((f) => !f.assessment_id || f.assessment_id === active.id)
    : [];
  const graph = useMemo(
    () => buildAttackGraph(findings, assessments, active?.id),
    [findings, assessments, active?.id],
  );
  const pages = graph.nodes.filter((n) => n.type === 'Endpoint').length;
  const problems = graph.nodes.filter((n) => n.type === 'Finding').length;
  const exposed = graph.nodes.filter((n) => n.state === 'Critical' || n.state === 'Vulnerable').length;
  return (
    <>
      <PageHeading
        title="Attack Surface Map"
        description={
          active
            ? `Application workflow for ${active.target} — pages reached, then the problems found on each page.`
            : 'Run an assessment to map an application.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AssessmentPicker />
            <SectionLink to="/risk-graph">View risk relationships</SectionLink>
          </div>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Workflow Pages" value={String(pages)} icon={Target} />
        <Metric label="Problems Found" value={String(problems)} icon={Activity} />
        <Metric
          label="Total Findings"
          value={String(scoped.length)}
          icon={GitBranch}
          tone="violet"
        />
        <Metric
          label="Exposed Nodes"
          value={String(exposed)}
          icon={ShieldAlert}
          tone="critical"
        />
      </div>
      <GraphView
        nodes={graph.nodes}
        edges={graph.edges}
        findings={scoped}
        assessmentName={active?.name ?? ''}
      />
    </>
  );
}
export function RiskGraph() {
  const { findings, assessments, selectedAssessment } = useSentinel();
  const active =
    assessments.find((a) => a.id === selectedAssessment) ?? assessments[0];
  const scoped = active
    ? findings.filter((f) => !f.assessment_id || f.assessment_id === active.id)
    : [];
  const graph = useMemo(
    () => buildAttackGraph(findings, assessments, active?.id),
    [findings, assessments, active?.id],
  );
  const highRisk = scoped.filter((f) => f.severity === "Critical" || f.severity === "High");
  const critical = scoped.filter((f) => f.severity === "Critical").length;
  const exposed = new Set(scoped.map((f) => f.asset).filter(Boolean)).size;
  const riskyDeps = highRisk.filter((f) => /depend/i.test(f.category || "")).length;
  return (
    <>
      <PageHeading
        title="Security Risk Graph"
        description={
          active
            ? `Risk workflow for ${active.target} — follow the path from the target through exposed pages to each finding.`
            : 'Trace the path from exposed assets through vulnerabilities to business impact.'
        }
        actions={<AssessmentPicker />}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Risk Concentration"
          value={`${scoped.length ? Math.round((highRisk.length / scoped.length) * 100) : 0}%`}
          icon={Target}
          tone="critical"
        />
        <Metric label="Critical Paths" value={String(critical)} icon={GitBranch} tone="high" />
        <Metric label="Exposed Assets" value={String(exposed)} icon={ShieldAlert} />
        <Metric
          label="High-risk Dependencies"
          value={String(riskyDeps)}
          icon={Activity}
          tone="violet"
        />
      </div>
      <GraphView
        nodes={graph.nodes}
        edges={graph.edges}
        riskGraph
        defaultRiskOnly
        findings={scoped}
        assessmentName={active?.name ?? ''}
      />
    </>
  );
}
export function Findings() {
  const { findings, severityData, notify } = useSentinel();
  const [q, setQ] = useState(""),
    [severity, setSeverity] = useState("All"),
    [category, setCategory] = useState("All"),
    [status, setStatus] = useState("All"),
    [confidence, setConfidence] = useState("All");
  const rows = findings.filter(
    (f) =>
      `${f.title} ${f.id} ${f.asset}`.toLowerCase().includes(q.toLowerCase()) &&
      (severity === "All" || severity === f.severity) &&
      (category === "All" || category === f.category) &&
      (status === "All" || status === f.status) &&
      (confidence === "All" || confidence === f.confidence),
  );
  return (
    <>
      <PageHeading
        title="Findings Center"
        description="Investigate vulnerabilities with traceable evidence and clear remediation context."
        actions={
          <Action
            icon={Download}
            onClick={() => exportFindingsToPDF(rows, notify)}

          >
            Export PDF
          </Action>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {(
          ["Critical", "High", "Medium", "Low", "Informational"] as const
        ).map((name) => (
          <div key={name} className="panel p-4">
            <div
              className={`text-xs font-medium ${severityColor[name]}`}
            >
              {name}
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">
              {findings.filter((f) => f.severity === name).length}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">total findings</div>
          </div>
        ))}
      </div>
      <Panel
        title="All Findings"
        sub={`${rows.length} of ${findings.length} featured findings shown`}
      >
        <div className="mb-5 flex flex-wrap gap-2">
          <div className="w-full sm:w-60">
            <SearchField value={q} onChange={setQ} placeholder="Search findings or assets" />
          </div>
          <Filter
            label="Severity"
            value={severity}
            onChange={setSeverity}
            options={["Critical", "High", "Medium", "Low", "Informational"]}
          />
          <Filter
            label="Category"
            value={category}
            onChange={setCategory}
            options={[...new Set(findings.map((f) => f.category))]}
          />
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={["Open", "Validated", "In progress", "Verified"]}
          />
          <Filter
            label="Confidence"
            value={confidence}
            onChange={setConfidence}
            options={["High", "Medium", "Low"]}
          />
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className={`${table} w-full`}>
              <thead>
                <tr>
                  {[
                    "Finding",
                    "Severity",
                    "CVSS",
                    "Confidence",
                    "Category",
                    "Asset",
                    "Status",
                    "Detected",
                    "",
                  ].map((x, i) => (
                    <th key={i} className={`${th} whitespace-nowrap`}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id} className="hover:bg-panel-hover">
                    <td className={`${td} min-w-[200px]`}>
                      <Link
                        to="/findings/$id"
                        params={{ id: f.id }}
                        className="font-semibold break-words hover:text-primary"
                      >
                        {f.title}
                      </Link>
                      <div
                        className="mt-1 max-w-[220px] truncate text-[10px] text-muted-foreground"
                        title={f.id}
                      >
                        {f.id}
                      </div>
                    </td>
                    <td className={td}>
                      <Badge tone={f.severity}>{f.severity}</Badge>
                    </td>
                    <td className={`${td} font-semibold`}>{f.cvss}</td>
                    <td className={td}>
                      <span className="text-muted-foreground">{f.confidence}</span>
                    </td>
                    <td className={td}>{f.category}</td>
                    <td className={`${td} max-w-[140px] truncate text-muted-foreground`}>
                      {f.asset}
                    </td>
                    <td className={td}>
                      <Badge tone={f.status}>{f.status}</Badge>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{f.detected}</td>
                    <td className={td}>
                      <SectionLink to="/findings/$id" params={{ id: f.id }}>
                        Investigate
                      </SectionLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
    </>
  );
}
export function FindingDetail({ id }: { id: string }) {
  const { findings, updateFinding, notify, evidence } = useSentinel();

  const f = findings.find((x) => x.id === id);
  const active = assessments.find((a) => a.id === f?.assessment_id) ?? assessments[0];
  const navigate = useNavigate();
  const [assign, setAssign] = useState(false),
    [owner, setOwner] = useState(f?.owner || "Unassigned");
  const [evItems, setEvItems] = useState<EvidenceItem[]>([]);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [question, setQuestion] = useState("");
  useEffect(() => {
    let cancelled = false;
    setEvItems([]);
    api
      .getFindingEvidence(id)
      .then((rows) => {
        if (!cancelled) setEvItems(rows);
      })
      .catch(() => {
        if (!cancelled) setEvItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  // Show a previously generated investigation, if one was saved for this finding.
  useEffect(() => {
    if (!f?.analysis) {
      setReport(null);
      return;
    }
    try {
      setReport(JSON.parse(f.analysis));
    } catch {
      setReport(null);
    }
  }, [f?.analysis]);
  const investigate = async () => {
    if (investigating) return;
    setInvestigating(true);
    try {
      const result = await api.investigateFinding(id, question.trim() || undefined);
      setReport(result);
      notify("Investigation generated from the linked evidence.");
    } catch (err: any) {
      notify(`Investigation failed: ${err?.message || "local model unavailable"}`);
    } finally {
      setInvestigating(false);
    }
  };
  if (!f) return <Empty text="Finding not found" />;
  const evidenceIds = evItems.length ? evItems.map((e) => e.id) : f.evidence;
  return (
    <>
      <PageHeading
        eyebrow={`FINDINGS / ${f.id}`}
        title={f.title}
        description={`${f.category} · ${f.asset}`}
        actions={
          <>
            <Action
              onClick={() => {
                updateFinding(id, { status: "Validated" });
                notify("Finding validated.");
              }}
              icon={Check}
            >
              Mark Validated
            </Action>
            <Action onClick={() => setAssign(true)}>Assign</Action>
            <Action
              variant="default"
              onClick={() => navigate({ to: "/remediation" })}
              icon={Wrench}
            >
              Remediate
            </Action>
            <Action
              onClick={investigate}
              disabled={investigating}
              icon={Sparkles}
              variant="outline"
            >
              {investigating
                ? "Investigating…"
                : report
                  ? "Re-run investigation"
                  : "Investigate with AI"}
            </Action>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={f.severity}>{f.severity} severity</Badge>
        <Badge>CVSS v4.0 · {f.cvss}</Badge>
        <Badge tone="Validated">{f.confidence} confidence</Badge>
        <Badge tone={f.status}>{f.status}</Badge>
      </div>
      {!report && (
        <div className="mb-5 rounded-md border border-primary/30 bg-accent/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <div className="eyebrow mb-2 text-primary">AI INVESTIGATION</div>
              <p className="text-xs leading-6 text-muted-foreground">
                Generate an executive summary, remediation plan, reproduction steps and
                re-test checklist from the linked evidence using the local model.
              </p>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Optional: ask a specific question about this finding…"
                className="mt-3 border-border bg-secondary text-xs"
              />
            </div>
            <Button onClick={investigate} disabled={investigating} size="sm" className="h-9">
              {investigating ? "Investigating…" : "Generate investigation"}
            </Button>
          </div>
        </div>
      )}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Panel
            title="Executive Summary"
            sub={report ? "Generated from the linked evidence" : "Scanner observation"}
            action={
              report ? (
                <Action
                  onClick={investigate}
                  disabled={investigating}
                  icon={Sparkles}
                  variant="outline"
                >
                  {investigating ? "Regenerating…" : "Regenerate"}
                </Action>
              ) : undefined
            }
          >
            <p className="text-sm leading-7 text-muted-foreground">
              {report?.executive_summary || f.summary}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="eyebrow">WHAT WAS FOUND</div>
                <p className="mt-2 text-xs leading-6">
                  {report?.executive_summary || f.summary}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="eyebrow">WHY IT MATTERS</div>
                <p className="mt-2 text-xs leading-6">
                  {report?.why_it_matters || f.impact}
                </p>
              </div>
            </div>
          </Panel>
          <Panel
            title="Evidence Chain"
            sub="Detection → proof → risk → fix → verification"
            action={
              evidenceIds.length ? (
                <SectionLink to="/evidence/$id" params={{ id: evidenceIds[0] }}>
                  Open evidence viewer
                </SectionLink>
              ) : undefined
            }
          >
            <div className="grid gap-2 sm:grid-cols-4">
              {["01 Detection", "02 Evidence", "03 Risk", "04 Verification"].map((x, i) => (
                <div key={x} className="rounded-md border border-border bg-secondary p-3">
                  <div className="text-[10px] text-primary">{x}</div>
                  <div className="mt-2 text-xs font-medium">
                    {
                      [
                        "Confirmed observation",
                        `${evidenceIds.length} artifacts`,
                        `${f.cvss} CVSS score`,
                        f.status === "Verified" ? "Verified" : "Awaiting re-test",
                      ][i]
                    }
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {evidenceIds.length === 0 && (
                <p className="rounded-md border border-border bg-secondary px-4 py-3 text-xs text-muted-foreground">
                  No evidence artifacts are linked to this finding yet.
                </p>
              )}
              {evidenceIds.map((evidenceId) => (
                <Link
                  key={evidenceId}
                  to="/evidence/$id"
                  params={{ id: evidenceId }}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-xs hover:border-primary"
                >
                  <span>
                    <FileText size={14} className="mr-2 inline text-primary" />
                    {evidenceId}{" "}
                    <span className="ml-2 text-muted-foreground">
                      {evItems.find((e) => e.id === evidenceId)?.type ??
                        evidence.find((e) => e.id === evidenceId)?.type}
                    </span>
                  </span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Reproduction Steps">
            <ol className="space-y-3 text-xs leading-6 text-muted-foreground">
              {(report?.reproduction_steps ?? []).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
              {!report && (
                <li>
                  No reproduction steps recorded — generate an investigation to derive them
                  from the linked evidence.
                </li>
              )}
            </ol>
          </Panel>
          <Panel title="Technical Analysis">
            <p className="text-xs leading-6 text-muted-foreground">
              {report?.technical_analysis ||
                `The observation was correlated across ${evidenceIds.length} evidence artifact${
                  evidenceIds.length === 1 ? "" : "s"
                }. The finding is assigned ${f.confidence.toLowerCase()} confidence based on
                reproducibility and available evidence. Severity is communicated independently
                using CVSS v4.0 and does not itself prove the finding.`}
            </p>
            <div className="mt-5 break-all rounded-md border border-border bg-secondary p-4 font-mono text-[11px] text-muted-foreground">
              {f.cvss_vector || "CVSS vector not recorded"}
            </div>
            {report?.retest_checklist?.length ? (
              <div className="mt-5 border-t border-border pt-4">
                <div className="eyebrow mb-3">RE-TEST CHECKLIST</div>
                <ul className="space-y-2 text-xs leading-6 text-muted-foreground">
                  {report.retest_checklist.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">{i + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>
          <Panel title="Recommended Fix">
            <p className="text-sm leading-7 text-muted-foreground">
              {report?.remediation || f.fix || "No remediation recorded."}
            </p>
            <div className="mt-4 border-t border-border pt-4">
              <SectionLink to="/remediation">Track remediation</SectionLink>
            </div>
          </Panel>
          <Panel title="Related Findings">
            {findings
              .filter((x) => x.id !== id)
              .slice(0, 2)
              .map((x) => (
                <Link
                  key={x.id}
                  to="/findings/$id"
                  params={{ id: x.id }}
                  className="flex items-center justify-between border-b border-border py-3 text-xs last:border-0 hover:text-primary"
                >
                  <span>{x.title}</span>
                  <Badge tone={x.severity}>{x.severity}</Badge>
                </Link>
              ))}
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Risk Assessment">
            <div className={`text-4xl font-semibold ${severityColor[f.severity]}`}>
              {f.cvss}
              <span className="text-base text-muted-foreground">/10</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">CVSS v4.0 severity score</div>
            <div className="mt-5 space-y-3 border-t border-border pt-4 text-xs">
              {[
                ["Severity", f.severity],
                ["Confidence", f.confidence],
                ["Evidence artifacts", String(f.evidence.length)],
                ["Category", f.category],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Affected Asset">
            <div className="text-sm font-medium break-all">{f.asset}</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Recorded against this assessment target.
            </p>
            <div className="mt-4">
              <SectionLink to="/attack-surface">View attack surface</SectionLink>
            </div>
          </Panel>
          <Panel title="Potential Impact">
            <p className="text-xs leading-6 text-muted-foreground">{f.impact}</p>
          </Panel>
          <Panel title="Verification Status">
            <Badge tone={f.status}>{f.status}</Badge>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              A fix is only considered closed after a re-test confirms it.
            </p>
            <div className="mt-4 flex gap-2">
              <Action
                onClick={() => {
                  updateFinding(id, { status: "In progress" });
                  notify("Re-test queued.");
                }}
                icon={Play}
              >
                Re-test
              </Action>
              <Action
                icon={Download}
                onClick={() => exportFindingDetailToPDF(f, notify)}

              >
                Export PDF
              </Action>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Owner: {f.owner}</div>
          </Panel>
        </div>
      </div>
      <Dialog open={assign} onOpenChange={setAssign}>
        <DialogContent className="border-border bg-panel">
          <DialogHeader>
            <DialogTitle>Assign finding</DialogTitle>
          </DialogHeader>
          <label className="text-xs">
            Owner
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="mt-2 block h-10 w-full rounded border border-border bg-secondary px-3"
            >
              <option>Unassigned</option>
              <option>Priya Shah</option>
              <option>Arjun Mehta</option>
              <option>Nisha Rao</option>
              <option>Alex Morgan</option>
            </select>
          </label>
          <Button
            onClick={() => {
              updateFinding(id, { owner });
              notify(`Assigned to ${owner}.`);
              setAssign(false);
            }}
          >
            Save assignment
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function EvidenceViewer({ id }: { id: string }) {
  const [activeId, setActiveId] = useState(id),
    [compare, setCompare] = useState(false),
    [expanded, setExpanded] = useState(false);
  const { notify, evidence, findings } = useSentinel();
  const item = evidence.find((e) => e.id === activeId);

  if (!item) return <Empty text="Evidence not found" />;
  const related = items;
  const relatedFinding =
    findings.find((f) => f.id === item.finding) ??
    seedFindings.find((f) => f.id === item.finding);
  const assessmentLabel = relatedFinding
    ? (assessments.find((a) => a.id === relatedFinding.assessment_id)?.target ??
      relatedFinding.asset)
    : "—";
  return (
    <>
      <PageHeading
        eyebrow={`EVIDENCE / ${item.id}`}
        title="Evidence Viewer"
        description="Trace the observation and inspect the proof behind a finding."
        actions={
          <>
            <Action
              icon={Copy}
              onClick={() => {
                navigator.clipboard.writeText(item.content);
                notify("Redacted evidence copied.");
              }}
            >
              Copy
            </Action>
            <Action icon={Maximize2} onClick={() => setExpanded(true)}>
              Expand
            </Action>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone="Validated">{item.confidence} confidence</Badge>
        <Badge>{item.type}</Badge>
        <span className="text-xs text-muted-foreground">
          Sensitive values are redacted.
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[215px_minmax(0,1fr)_260px]">
        <Panel title="Evidence Timeline" sub="Select an artifact">
          <div className="space-y-2">
            {related.map((e) => (
              <Button
                key={e.id}
                variant="ghost"
                onClick={() => setActiveId(e.id)}
                className={`h-auto w-full flex-col items-start gap-1 rounded-md border p-3 text-left text-xs ${activeId === e.id ? "border-primary bg-accent" : "border-border bg-secondary"}`}
              >
                <span className="font-semibold">
                  {e.id} · {e.type}
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">{e.time}</span>
              </Button>
            ))}
          </div>
        </Panel>
        <Panel
          title={item.type}
          sub={`${item.id} · ${item.source}`}
          action={
            item.comparison ? (
              <Action onClick={() => setCompare((v) => !v)} variant={compare ? "default" : "outline"}>
                Compare
              </Action>
            ) : undefined
          }
        >
          <div className="overflow-x-auto rounded-md border border-border bg-background p-4 sm:p-6">
            <pre className="min-h-[350px] whitespace-pre-wrap break-all font-mono text-[11px] leading-6 text-foreground sm:text-xs">
              {item.content}
            </pre>
          </div>
          {compare && item.comparison && (
            <div className="mt-4 rounded-md border border-primary/30 bg-accent/40 p-4">
              <div className="eyebrow mb-2 text-primary">EXPECTED VS OBSERVED</div>
              <p className="text-xs leading-6">{item.comparison}</p>
            </div>
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title="Evidence Metadata">
            <div className="space-y-4 text-xs">
              {[
                ["Source", item.source],
                ["Captured", item.time],
                ["Confidence", item.confidence],
                ["Type", item.type],
                ["Assessment", assessmentLabel],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-border pb-3">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="mt-1 font-medium">{v}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Related Finding">
            <div className="text-sm font-medium">
              {findings.find((f) => f.id === item.finding)?.title}
            </div>
            <div className="mt-2">
              <Badge tone={findings.find((f) => f.id === item.finding)?.severity ?? "Informational"}>
                {findings.find((f) => f.id === item.finding)?.severity}

              </Badge>
            </div>
            <div className="mt-5">
              {relatedFinding && (
                <SectionLink to="/findings/$id" params={{ id: relatedFinding.id }}>
                  Open investigation
                </SectionLink>
              )}
            </div>
          </Panel>
        </div>
      </div>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-auto border-border bg-panel">
          <DialogHeader>
            <DialogTitle>
              {item.id} · {item.type}
            </DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-all rounded-md border border-border bg-background p-5 font-mono text-xs leading-6">
            {item.content}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function Remediation() {
  const { findings, updateFinding, notify } = useSentinel();
  const [status, setStatus] = useState("All");
  const rows = findings.filter((f) => status === "All" || f.status === status);
  return (
    <>
      <PageHeading
        title="Remediation Center"
        description="Move findings from assigned fixes to verified resolution."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Open Remediation" value="28" icon={ShieldAlert} tone="critical" />
        <Metric label="In Progress" value="12" icon={Activity} />
        <Metric label="Completed" value="28" icon={CheckCircle2} tone="success" />
        <Metric label="Overdue" value="4" icon={Clock} tone="high" />
      </div>
      <Panel
        title="Remediation Queue"
        sub="A finding closes only when a re-test verifies the fix"
        action={
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={["Open", "Validated", "In progress", "Verified"]}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className={`${table} min-w-[760px]`}>
            <thead>
              <tr>
                {[
                  "Finding",
                  "Owner",
                  "Priority",
                  "Status",
                  "Due Date",
                  "Progress",
                  "Verification",
                ].map((x) => (
                  <th key={x} className={th}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f, i) => (
                <tr key={f.id} className="hover:bg-panel-hover">
                  <td className={td}>
                    <Link
                      to="/findings/$id"
                      params={{ id: f.id }}
                      className="font-medium hover:text-primary"
                    >
                      {f.title}
                    </Link>
                    <div className="mt-1 text-[10px] text-muted-foreground">{f.id}</div>
                  </td>
                  <td className={td}>
                    <select
                      aria-label={`Owner for ${f.title}`}
                      value={f.owner}
                      onChange={(e) => {
                        updateFinding(f.id, { owner: e.target.value });
                        notify(`Assigned to ${e.target.value}.`);
                      }}
                      className="rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Unassigned">Unassigned</option>
                      <option value="Priya Shah">Priya Shah</option>
                      <option value="Arjun Mehta">Arjun Mehta</option>
                      <option value="Nisha Rao">Nisha Rao</option>
                      <option value="Alex Morgan">Alex Morgan</option>
                    </select>
                  </td>
                  <td className={td}>
                    <Badge tone={f.severity}>{f.severity}</Badge>
                  </td>
                  <td className={td}>
                    <select
                      aria-label={`Status for ${f.title}`}
                      value={f.status}
                      onChange={(e) => {
                        updateFinding(f.id, { status: e.target.value });
                        notify("Remediation status updated.");
                      }}
                      className="rounded border border-border bg-secondary p-1 text-xs"
                    >
                      <option>Open</option>
                      <option>Validated</option>
                      <option>In progress</option>
                      <option>Fix submitted</option>
                      <option>Verified</option>
                    </select>
                  </td>
                  <td className={`${td} text-muted-foreground`}>{28 + i} Sep 2026</td>
                  <td className={td}>
                    <div className="h-1.5 w-20 rounded bg-secondary">
                      <div
                        className="h-full rounded bg-success"
                        style={{
                          width:
                            f.status === "Verified"
                              ? "100%"
                              : f.status === "In progress"
                                ? "60%"
                                : "20%",
                        }}
                      />
                    </div>
                  </td>
                  <td className={td}>
                    <Action
                      onClick={() => {
                        updateFinding(f.id, { status: "Fix submitted" });
                        notify("Re-test requested.");
                      }}
                    >
                      Re-test
                    </Action>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
export function Posture() {
  const [comparison, setComparison] = useState<"Before" | "After">("After");
  const { findings, assessments } = useSentinel();
  const active = assessments[0];
  const score = Math.round(active?.score ?? 0);
  const verified = findings.filter((f) => f.status === "Verified");
  const open = findings.filter((f) => f.status !== "Verified");
  const bySeverity = (rows: typeof findings) => ({
    critical: rows.filter((f) => f.severity === "Critical").length,
    high: rows.filter((f) => f.severity === "High").length,
    medium: rows.filter((f) => f.severity === "Medium").length,
  });
  // "Before" is the baseline the scan produced (every finding unresolved);
  // "After" is what is still unresolved once verification has run.
  const before = { score, ...bySeverity(findings) };
  const after = { score, ...bySeverity(open) };
  const data = comparison === "Before" ? before : after;
  const remediatedPct = findings.length
    ? Math.round((verified.length / findings.length) * 100)
    : 0;
  const evidenceCoverage = findings.length
    ? Math.round(
        (findings.filter((f) => f.evidence.length > 0).length / findings.length) * 100,
      )
    : 0;
  const categoryCells = [
    ...new Set(findings.map((f) => f.category || "General")),
  ].map((name) => {
    const rows = findings.filter((f) => (f.category || "General") === name);
    const unresolved = rows.filter((f) => f.status !== "Verified");
    const risky = unresolved.some(
      (f) => f.severity === "Critical" || f.severity === "High",
    );
    return {
      name,
      open: unresolved.length,
      className: !unresolved.length
        ? "bg-success/60"
        : risky
          ? "bg-high/70"
          : "bg-primary/40",
    };
  });
  const categoriesAtRisk = categoryCells.filter((c) => c.open > 0).length;
  return (
    <>
      <PageHeading
        title="Security Posture"
        description="Measure the change in exposure as findings move through verification."
        actions={<SectionLink to="/reports">Open assessment report</SectionLink>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Current Security Score"
          value={`${score}/100`}
          change={`${verified.length} verified`}
          icon={ShieldCheck}
          tone="success"
        />
        <Metric
          label="Risk Reduction"
          value={`${remediatedPct}%`}
          icon={ArrowDownRight}
          tone="success"
        />
        <Metric
          label="Resolved Findings"
          value={String(verified.length)}
          icon={CheckCircle2}
          tone="success"
        />
        <Metric label="Coverage" value={`${evidenceCoverage}%`} icon={Target} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Security Score Trend" sub="Progress across recent assessments">
          <TrendChart />
        </Panel>
        <Panel title="Open Vulnerabilities" sub="Reduction in unresolved findings">
          <TrendChart mode="open" />
        </Panel>
      </div>
      <div className="my-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-2">MEASURABLE IMPROVEMENT</div>
          <h2 className="text-xl font-semibold">Before vs After Security Posture</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Compare the initial assessment with the post-remediation re-test.
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_200px_1fr]">
        <div className="panel border-high p-6">
          <div className="eyebrow text-high">BEFORE REMEDIATION</div>
          <div className="mt-7 flex items-end gap-2">
            <strong className="text-5xl font-semibold">{before.score}</strong>
            <span className="mb-1 text-sm text-muted-foreground">/100 security score</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded bg-secondary">
            <div className="h-full rounded bg-high" style={{ width: `${before.score}%` }} />
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-border pt-5">
            {[
              ["Critical", String(before.critical), "text-critical"],
              ["High", String(before.high), "text-high"],
              ["Medium", String(before.medium), "text-medium"],
            ].map(([k, v, c]) => (
              <div key={k}>
                <div className={`text-2xl font-semibold ${c}`}>{v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-2 text-center">
          <ArrowRight size={23} className="text-success" />
          <div className="text-2xl font-semibold text-success">+{verified.length}</div>
          <div className="text-xs text-muted-foreground">findings verified</div>
          <div className="mt-2 rounded border border-success/25 bg-success/10 px-3 py-1.5 text-[11px] text-success">
            {remediatedPct}% remediated
          </div>
        </div>
        <div className="panel border-success p-6">
          <div className="eyebrow text-success">AFTER VERIFICATION</div>
          <div className="mt-7 flex items-end gap-2">
            <strong className="text-5xl font-semibold">{after.score}</strong>
            <span className="mb-1 text-sm text-muted-foreground">/100 security score</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded bg-secondary">
            <div className="h-full rounded bg-success" style={{ width: `${after.score}%` }} />
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-border pt-5">
            {[
              ["Critical", String(after.critical), "text-critical"],
              ["High", String(after.high), "text-high"],
              ["Medium", String(after.medium), "text-medium"],
            ].map(([k, v, c]) => (
              <div key={k}>
                <div className={`text-2xl font-semibold ${c}`}>{v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Risk Reduction by Security Category" sub="Pre vs post-remediation exposure — sorted by improvement">
          <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground mt-4 mb-2">
            <span className="ml-[130px] text-high/80">BEFORE</span>
            <span className="mr-14 text-success">AFTER</span>
          </div>
          <div className="space-y-4">
            {[
              { name: "Authorization", before: 80, after: 30, beforeVal: 14, afterVal: 5, drop: "-64%" },
              { name: "Authentication", before: 78, after: 30, beforeVal: 13, afterVal: 5, drop: "-62%" },
              { name: "Data Exposure", before: 76, after: 30, beforeVal: 13, afterVal: 5, drop: "-61%" },
              { name: "API Security", before: 66, after: 32, beforeVal: 11, afterVal: 6, drop: "-51%" },
              { name: "Dependencies", before: 55, after: 40, beforeVal: 9, afterVal: 7, drop: "-28%" },
            ].map((cat) => (
              <div key={cat.name} className="flex items-center text-xs">
                <div className="w-[130px] font-medium">{cat.name}</div>
                <div className="flex-1 relative h-6 mr-4">
                  <div className="absolute top-0 h-2 bg-high/70 rounded-r" style={{width: `${cat.before}%`}}>
                    <span className="absolute -right-4 top-[-2px] text-[10px] text-muted-foreground">{cat.beforeVal}</span>
                  </div>
                  <div className="absolute bottom-0 h-2 bg-success/80 rounded-r" style={{width: `${cat.after}%`}}>
                    <span className="absolute -right-3 top-[-2px] text-[10px] text-muted-foreground">{cat.afterVal}</span>
                  </div>
                </div>
                <div className="w-12 text-center rounded-full bg-success/10 border border-success/30 text-success text-[10px] py-0.5 font-bold">
                  {cat.drop}
                </div>
              </div>
            ))}
            {categoryCells.length === 0 && (
              <div className="col-span-full text-xs text-muted-foreground">
                No categories recorded yet.
              </div>
            )}
          </div>
          <div className="flex justify-between items-center text-xs border-t border-border mt-6 pt-4">
            <span className="text-muted-foreground">Average risk reduction</span>
            <span className="font-bold text-success text-sm">53%</span>
          </div>
        </Panel>
        <Panel title="Remaining Security Risk" sub="Analysis of residual exposure">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-8 mt-2">
              <div className="relative h-32 w-32 flex-shrink-0">
                <svg width="128" height="128" viewBox="0 0 100 100" className="-rotate-90">
                  <circle cx="50" cy="50" r="38" fill="none" strokeWidth="12" className="stroke-secondary/40" />
                  <circle cx="50" cy="50" r="38" fill="none" strokeWidth="12" className="stroke-medium" strokeDasharray="171.3 238.76" />
                  <circle cx="50" cy="50" r="38" fill="none" strokeWidth="12" className="stroke-high" strokeDasharray="52.1 238.76" strokeDashoffset="-174.3" />
                  <circle cx="50" cy="50" r="38" fill="none" strokeWidth="12" className="stroke-critical" strokeDasharray="6.3 238.76" strokeDashoffset="-229.4" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-1">
                  <div className="text-[28px] font-bold leading-none">26</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-1">open<br/>findings</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[9px] uppercase font-bold text-muted-foreground mb-3">Open By Severity</div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-16 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-critical" /> Critical</div>
                    <div className="flex-1"><div className="h-1.5 rounded-full bg-gradient-to-r from-critical/40 to-critical w-[5%]" /></div>
                    <div className="font-bold">1</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-16 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-high" /> High</div>
                    <div className="flex-1"><div className="h-1.5 rounded-full bg-gradient-to-r from-high/40 to-high w-[25%]" /></div>
                    <div className="font-bold">6</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-16 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-medium" /> Medium</div>
                    <div className="flex-1"><div className="h-1.5 rounded-full bg-gradient-to-r from-medium/40 to-medium w-[90%]" /></div>
                    <div className="font-bold">19</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-critical/30 bg-critical/5 p-4 flex items-center justify-between mt-2">
              <div>
                <div className="text-[9px] uppercase font-bold text-critical mb-1">Critical Path Requiring Attention</div>
                <div className="font-bold text-sm mb-1">API Authorization</div>
                <div className="text-xs text-muted-foreground">1 unresolved critical finding &mdash; full access control bypass risk</div>
              </div>
              <Link to="/remediation" className="inline-flex items-center justify-center whitespace-nowrap px-3 h-7 text-xs font-medium text-success transition-colors hover:bg-success/10 rounded">
                View remediation plan &rarr;
              </Link>
            </div>

          </div>
        </Panel>
      </div>
    </>
  );
}
export function Reports() {
  const { notify } = useSentinel();
  const navigate = useNavigate();
  return (
    <>
      <PageHeading
        title="Security Reports"
        description="Review evidence-backed assessment outcomes and remediation progress."
        actions={
          <Action
            icon={Plus}
            variant="default"
            disabled
            onClick={() => notify("Run an assessment to generate a report.")}
          >
            Generate Report
          </Action>
        }
      />
      <ReportList />
    </>
  );
}

function ReportList() {
  const { assessments, findings } = useSentinel();
  if (!assessments.length) {
    return (
      <div className="panel flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        No assessments yet — run a scan to generate a report.
      </div>
    );
  }
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {assessments.map((a) => {
        const rows = findings.filter((f) => (f as any).assessment_id === a.id);
        const critical = rows.filter((f) => f.severity === "Critical").length;
        const high = rows.filter((f) => f.severity === "High").length;
        return (
          <Link
            to="/reports/$id"
            params={{ id: a.id }}
            key={a.id}
            className="panel block p-5 hover:border-primary"
          >
            <FileText size={20} className="text-primary" />
            <div className="mt-6 text-sm font-semibold">{a.name}</div>
            <div className="mt-2 truncate text-xs text-muted-foreground">{a.target}</div>
            <div className="mt-4 flex items-center gap-3 text-xs">
              <Badge tone="High">{Math.round(a.risk_score ?? 0)} risk</Badge>
              <span className="text-muted-foreground">
                {critical}C · {high}H
              </span>
            </div>
            <div className="mt-5 text-xs primary">Preview report →</div>
          </Link>
        );
      })}
    </div>
  );
}
export function ReportDetail({ id }: { id: string }) {
  const { notify, findings } = useSentinel();
  const title =
    reportTypes[["executive", "technical", "remediation", "summary"].indexOf(id)] || "Executive Security Report";

  return (
    <>
      <PageHeading
        eyebrow={`REPORTS / ${assessment.name.toUpperCase()}`}
        title={title}
        description={`${assessment.target} · Generated ${generated}`}
        actions={
          <>
            <Action
              icon={Download}
              onClick={() => exportReportToPDF(title, findings, notify)}

            >
              Export PDF
            </Action>
            <Action
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                notify("Report link copied.");
              }}
            >
              Share
            </Action>
          </>
        }
      />
      <div className="mx-auto max-w-4xl rounded-md border border-border bg-panel p-6 shadow-xl sm:p-10">
        <div className="flex items-start justify-between border-b border-border pb-8">
          <div>
            <div className="text-sm font-bold tracking-[.12em] text-primary">SENTINEL</div>
            <h2 className="mt-8 text-2xl font-semibold sm:text-3xl">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Evidence-driven assessment of {assessment.target}
            </p>
          </div>
          <ShieldCheck size={32} className="text-primary" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k}>
              <div className="eyebrow">{k}</div>
              <div className="mt-2 text-2xl font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 space-y-9">
          {sections.map(([heading, body]) => (
            <section key={heading} className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold">{heading}</h3>
              <p className="mt-2 text-xs leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-[11px] text-muted-foreground">
          SENTINEL · Evidence-backed assessment report · {rows.length} findings · {evidenceCount} evidence artifacts
        </div>
      </div>
    </>
  );
}
export function Copilot() {
  const { findings } = useSentinel();

  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [messages, setMessages] = useState<{ who: string; text: string }[]>([
      {
        who: "assistant",
        text: "Hi! I'm Copilot, your AI security assistant. I'm connected to your local Ollama instance and can answer questions about the World Monitor assessment findings.",

      },
    ]),
    [loading, setLoading] = useState(false),
    [ollamaModel, setOllamaModel] = useState("llama3"),
    [ollamaStatus, setOllamaStatus] = useState<"unknown" | "ok" | "error">("unknown");

  // Check Ollama availability on mount
  useEffect(() => {
    fetch("http://localhost:11434/api/tags")
      .then((r) => r.json())
      .then((data) => {
        const models: string[] = (data.models || []).map((m: any) => m.name);
        if (models.length > 0) {
          setOllamaModel(models[0]);
          setOllamaStatus("ok");
        } else {
          setOllamaStatus("error");
        }
      })
      .catch(() => setOllamaStatus("error"));
  }, []);

  const prompts = [
    "Explain this vulnerability in simple terms",
    "Why is this finding high risk?",
    "Summarize the evidence",
    "Suggest a remediation approach",
    "Compare this finding with previous assessments",
    "What should we verify during re-test?",
  ];

  const buildContext = () => {
    const topFindings = findings.slice(0, 5).map(f =>
      `- ${f.id}: ${f.title} (${f.severity}, CVSS ${f.cvss}, status: ${f.status}, asset: ${f.asset})`
    ).join("\n");
    return `Current assessment: World Monitor Security Assessment.\nTop findings:\n${topFindings}`;

  };

  const send = async (prompt: string) => {
    if (!prompt.trim() || loading) return;
    setText("");
    setLoading(true);

    const userMsg = { who: "user", text: prompt };
    const assistantMsg = { who: "assistant", text: "" };
    setMessages((v) => [...v, userMsg, assistantMsg]);

    const systemPrompt = `Your name is Copilot. You are a helpful AI security analyst assistant embedded in SENTINEL, a security assessment platform. ${buildContext()} Always be concise, technical where appropriate, and helpful.`;

    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.filter(m => m.who !== "assistant" || m.text).map(m => ({
              role: m.who === "user" ? "user" : "assistant",
              content: m.text,
            })),
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok || !response.body) throw new Error("Ollama error");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            const token: string = json.message?.content || "";
            if (token) {
              setMessages((v) => {
                const copy = [...v];
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  text: copy[copy.length - 1].text + token,
                };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((v) => {
        const copy = [...v];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          text: "⚠️ Could not connect to Ollama. Make sure Ollama is running locally on port 11434 and a model is pulled (e.g. `ollama run llama3`).",
        };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeading
        title="AI Security Copilot"
        description="Explore contextual explanations and remediation suggestions for the current assessment."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_285px]">
        <div className="panel flex min-h-[590px] flex-col">
          <div className="border-b border-border p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={17} className="text-primary" /> Assessment conversation
              </div>
              <div className="flex items-center gap-2">
                {ollamaStatus === "ok" && (
                  <span className="flex items-center gap-1.5 rounded border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Ollama · {ollamaModel}
                  </span>
                )}
                {ollamaStatus === "error" && (
                  <span className="flex items-center gap-1.5 rounded border border-critical/30 bg-critical/10 px-2 py-0.5 text-[10px] font-semibold text-critical">
                    <span className="h-1.5 w-1.5 rounded-full bg-critical" />
                    Ollama offline
                  </span>
                )}
                {ollamaStatus === "unknown" && (
                  <span className="text-[10px] text-muted-foreground">Connecting…</span>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Powered by Ollama — responses are generated by your local model

            </p>
          </div>
          <div className="scrollbar flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-md border p-4 text-xs leading-6 ${m.who === "user" ? "ml-auto border-primary/25 bg-accent" : "border-border bg-secondary"}`}
              >
                {m.who === "assistant" && (
                  <div className="eyebrow mb-2 text-primary">COPILOT</div>

                )}
                {m.text || (loading && i === messages.length - 1 ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                    </span>
                    Thinking…
                  </span>
                ) : "")}
              </div>
            ))}
            {busy && (
              <div className="max-w-[85%] rounded-md border border-border bg-secondary p-4 text-xs text-muted-foreground">
                <div className="eyebrow mb-2 text-primary">SENTINEL ASSISTANT</div>
                Thinking…
              </div>
            )}
          </div>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {prompts.slice(0, 3).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant="outline"
                  onClick={() => send(p)}
                  className="h-auto whitespace-normal py-2 text-left text-[11px]"
                >
                  {p}
                </Button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
              className="flex gap-2"
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={loading ? "Copilot is thinking…" : "Ask Copilot about this assessment…"}
                disabled={loading}
                className="border-border bg-secondary text-xs"
              />
              <Button type="submit" size="sm" disabled={loading || !text.trim()}>
                {loading ? "…" : "Send"}

              </Button>
            </form>
          </div>
        </div>
        <div className="space-y-4">
          <Panel title="Security Context">
            <div className="space-y-3 text-xs">
              {[
                ["Assessment", active?.name ?? "—"],
                ["Selected finding", top?.title ?? "—"],
                ["CVSS", top ? `${top.cvss} · ${top.severity}` : "—"],
                ["Evidence", top ? `${top.evidence.length} linked artifacts` : "—"],
                ["Affected asset", top?.asset ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-border pb-3">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="mt-1 break-all">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              {top && (
                <SectionLink to="/findings/$id" params={{ id: top.id }}>
                  Inspect source finding
                </SectionLink>
              )}
            </div>
          </Panel>
          <Panel title="Suggested Questions">
            <div className="space-y-2">
              {prompts.slice(3).map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  onClick={() => send(p)}
                  className="h-auto w-full justify-start whitespace-normal p-2 text-left text-xs text-muted-foreground"
                >
                  {p}
                </Button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
export function SettingsPage() {
  const { notify, userName, setUserName } = useSentinel();
  const [alerts, setAlerts] = useState(true),
    [digest, setDigest] = useState(true),
    [ai, setAi] = useState(true);
  return (
    <>
      <PageHeading
        title="Settings"
        description="Manage your workspace preferences."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Profile">
          <div className="space-y-4">
            <label className="block text-xs">
              Name
              <Input
                value={userName}
                readOnly
                className="mt-2 border-border bg-secondary opacity-70 cursor-not-allowed"
              />
            </label>
            <label className="block text-xs">
              Role
              <Input
                value="Security Analyst"
                readOnly
                className="mt-2 border-border bg-secondary opacity-70 cursor-not-allowed"
              />
            </label>
            <div className="text-xs text-muted-foreground">
              Demo profile · profile settings are read-only.

            </div>
          </div>
        </Panel>
        <Panel title="Assessment Preferences">
          <div className="space-y-4 text-xs">
            {[
              ["Default environment", "Staging"],
              ["Default scope", "Web Application"],
              ["Risk scoring", "CVSS v4.0"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-foreground">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Notifications">
          <div className="space-y-5">
            {[
              ["Critical finding alerts", alerts, setAlerts],
              ["Weekly assessment digest", digest, setDigest],
              ["AI assistant", ai, setAi],
            ].map(([label, value, set]: any) => (
              <label
                key={label}
                className="flex cursor-pointer items-center justify-between text-xs"
              >
                {label}
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => {
                    set(e.target.checked);
                    notify("Preference updated.");
                  }}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Security Rules & Appearance">
          <p className="text-xs leading-6 text-muted-foreground">
            Assessments use redacted evidence, separate severity from confidence, and require
            verification before closure.
          </p>
          <div className="mt-5 flex gap-2">
            <Badge tone="Completed">Dark mode</Badge>
            <Badge>Evidence-first</Badge>
          </div>
        </Panel>
      </div>
    </>
  );
}
export function Login() {
  const navigate = useNavigate();
  const { refreshData } = useSentinel();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [remember, setRemember] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;

    type Particle = { x: number; y: number; r: number; dx: number; dy: number; o: number; do_: number };
    let particles: Particle[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      const n = Math.floor((canvas.width * canvas.height) / 7500);
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2 + 0.5,
          dx: (Math.random() - 0.5) * 0.4,
          dy: -Math.random() * 0.6 - 0.2,
          o: Math.random(),
          do_: (Math.random() - 0.5) * 0.015,
        });
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx; p.y += p.dy;
        p.o += p.do_;
        if (p.o < 0.05) p.do_ = Math.abs(p.do_);
        if (p.o > 0.95) p.do_ = -Math.abs(p.do_);
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        // Large glowing orbs
        if (p.r > 2) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
          g.addColorStop(0, `rgba(160,80,240,${p.o * 0.9})`);
          g.addColorStop(1, `rgba(160,80,240,0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192,100,255,${p.o})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("resize", init);
    init(); tick();
    return () => { window.removeEventListener("resize", init); cancelAnimationFrame(raf); };
  }, []);

  const [termsAccepted, setTermsAccepted] = useState(false);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const signIn = () => {
    if (!email || !password) {
      setError("Enter an email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the terms and conditions to continue.");
      return;
    }
    setError("");
    navigate({ to: "/dashboard" });

  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google auth successful", tokenResponse);
      
      try {
        const result = await verifyGoogleToken({ data: { token: tokenResponse.access_token } });
        
        if (result.success) {
          console.log("Backend verification successful, user:", result.user);
          setError("");
          window.location.href = "/dashboard";
        } else {
          setError("Backend authentication failed.");
        }
      } catch (err) {
        console.error("Backend error:", err);
        setError("Server error during authentication.");
      }
    },
    onError: (error) => {
      console.error("Google auth failed", error);
      setError("Google authentication failed. Please try again.");
    },
  });

  const signInWithGoogle = () => {
    if (!termsAccepted) {
      setError("You must accept the terms and conditions to continue.");
      return;
    }
    setError("");
    googleLogin();
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Circuit board background — hue-rotate shifts from red → purple to match theme */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/login-bg.png')",
          filter: "hue-rotate(270deg) saturate(1.8) brightness(0.65)",
        }}
      />
      {/* Dark overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(140,50,220,0.18),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-background/50 pointer-events-none" />

      {/* Animated particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Login card */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo / Brand */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-grid h-14 w-14 place-items-center rounded-xl bg-primary/20 border border-primary/40 backdrop-blur shadow-lg shadow-primary/20">
              <ShieldCheck size={28} className="text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-[.15em] text-foreground">SENTINEL</div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
              Evidence-Driven Security Assessment
            </div>
          </div>
          {/* Glass card */}
          <div className="rounded-2xl border border-border/40 bg-panel/70 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <h1 className="text-xl font-semibold">Welcome back</h1>
            <p className="mt-1 text-xs text-muted-foreground">Access the Security Assessment Platform.</p>

            <form
              onSubmit={(e) => { e.preventDefault(); signIn(); }}
              className="mt-7 space-y-5"
            >
              <Field
                label="Email address"
                value={email}
                set={setEmail}
                placeholder="analyst@example.com"
              />
              <label className="block text-xs">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-2 border-border bg-secondary/60 backdrop-blur"
                />
              </label>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-primary"
                  />
                  Remember me
                </label>
                <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
              </div>
              
              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                  I agree to the <a href="#" className="text-primary hover:underline">Terms and Conditions</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                </label>
              </div>

              {error && <p className="text-xs text-critical">{error}</p>}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30">
                Sign in
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <div className="h-px flex-1 bg-border" />OR<div className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              onClick={signInWithGoogle}
              className="w-full border-border/60 hover:bg-accent/40 flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground/60">
            Sign in securely with Google to access the platform.
          </p>
        </div>

      </div>
    </div>
  );
}
