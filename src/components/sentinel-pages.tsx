import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
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
  notify("Generating finding PDF…");
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
  notify("Generating report PDF…");
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
          value="72/100"
          change="+8%"
          icon={ShieldCheck}
          foot="vs. previous assessment"
        />
        <Metric
          label="Critical Findings"
          value="3"
          change="−2"
          tone="critical"
          icon={ShieldAlert}
          foot="Require immediate attention"
        />
        <Metric
          label="High Findings"
          value="12"
          change="−4"
          tone="high"
          icon={TriangleAlert}
          foot="Across 7 assets"
        />
        <Metric
          label="Open Findings"
          value="28"
          change="−11%"
          tone="violet"
          icon={Bug}
          foot="From 51 total findings"
        />
        <Metric
          label="Remediation Progress"
          value="68%"
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
            48 assets <span className="mx-2 text-subtle">·</span> 132 endpoints{" "}
            <span className="mx-2 text-subtle">·</span> 76 dependencies
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
              ["Finding discovered", "Missing Authorization Check · 2 hours ago"],
              ["Finding validated", "Exposed Debug Endpoint · 6 hours ago"],
              ["Fix verified", "Content Security Policy · Yesterday"],
              ["Assessment completed", "World Monitor · Yesterday"],
              ["Report generated", "Executive Security Report · 2 days ago"],
            ].map(([title, desc], i) => (
              <div key={title} className="flex gap-3 border-l border-border pb-5 pl-4 last:pb-0">
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
  const { addAssessment, notify } = useSentinel();
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
  const submit = (status: string) => {
    if (!name.trim()) {
      notify("Add an assessment name first.");
      setStep(0);
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
    notify(
      status === "Running"
        ? "Demo assessment created. No real scan was performed."
        : "Assessment saved as a local demo draft.",
    );
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
                Select the area that this demonstration assessment represents.
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
                Choose which security categories are included in the mock assessment.
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
                prototype will not contact the target or run security checks. In a real assessment,
                confirm written authorization and keep all activity inside the agreed scope.
              </div>
              <label className="flex items-center gap-3 text-xs">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="accent-primary"
                />
                I confirm this is an authorized demonstration scope.
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
                Starting this assessment only creates a simulated runner. No network requests or
                scans occur.
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
                disabled={!authorized}
                onClick={() => submit("Running")}
              >
                Start Demo Assessment
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
  if (!a) return <Empty text="Assessment not found" />;
  const pipeline = [
    "Scope Validation",
    "Asset Discovery",
    "Static Analysis",
    "API Analysis",
    "Dependency Analysis",
    "Evidence Collection",
    "Finding Correlation",
    "Risk Calculation",
    "Report Preparation",
  ];
  return (
    <>
      <PageHeading
        eyebrow="ASSESSMENTS / EXECUTION"
        title={a.name}
        description={`${a.target} · ${a.status === "Running" ? "Simulated execution" : "Assessment run details"}`}
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
          sub="Observed processing stages in the demonstration run"
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
                ? "Demo assessment in progress. Results are simulated; no target was contacted."
                : "Assessment processing completed. Review the evidence-backed findings and coverage below."}
            </div>
            <div className="mt-5 space-y-3 text-xs">
              {[
                ["Assets discovered", "48"],
                ["Checks completed", "126 / 126"],
                ["Endpoints mapped", "132"],
                ["Dependencies inspected", "76"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Processing Log">
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
export function AttackSurface() {
  return (
    <>
      <PageHeading
        title="Attack Surface Map"
        description="Explore how assets, APIs, endpoints and dependencies connect."
        actions={<SectionLink to="/risk-graph">View risk relationships</SectionLink>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Discovered Assets" value="48" icon={Target} />
        <Metric label="API Endpoints" value="132" icon={Activity} />
        <Metric label="Dependencies" value="76" icon={GitBranch} tone="violet" />
        <Metric label="Exposed Assets" value="7" icon={ShieldAlert} tone="critical" />
      </div>
      <GraphView />
    </>
  );
}
export function RiskGraph() {
  return (
    <>
      <PageHeading
        title="Security Risk Graph"
        description="Trace the path from exposed assets through vulnerabilities to business impact."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Risk Concentration" value="74%" icon={Target} tone="critical" />
        <Metric label="Critical Paths" value="3" icon={GitBranch} tone="high" />
        <Metric label="Exposed Assets" value="7" icon={ShieldAlert} />
        <Metric label="High-risk Dependencies" value="4" icon={Activity} tone="violet" />
      </div>
      <GraphView riskGraph />
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
            Export Findings
          </Action>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {severityData.map((s, i) => (
          <div key={s.name} className="panel p-4">
            <div
              className={`text-xs font-medium ${severityColor[s.name as keyof typeof severityColor]}`}
            >
              {s.name}
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</div>
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
            <table className={`${table} min-w-[860px]`}>
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
                    <th key={i} className={th}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id} className="hover:bg-panel-hover">
                    <td className={td}>
                      <Link
                        to="/findings/$id"
                        params={{ id: f.id }}
                        className="font-semibold hover:text-primary"
                      >
                        {f.title}
                      </Link>
                      <div className="mt-1 text-[10px] text-muted-foreground">{f.id}</div>
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
  const navigate = useNavigate();
  const [assign, setAssign] = useState(false),
    [owner, setOwner] = useState(f?.owner || "Unassigned");
  if (!f) return <Empty text="Finding not found" />;
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
                notify("Finding validated in this demo session.");
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
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={f.severity}>{f.severity} severity</Badge>
        <Badge>CVSS v4.0 · {f.cvss}</Badge>
        <Badge tone="Validated">{f.confidence} confidence</Badge>
        <Badge tone={f.status}>{f.status}</Badge>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Panel title="Executive Summary">
            <p className="text-sm leading-7 text-muted-foreground">{f.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="eyebrow">WHAT WAS FOUND</div>
                <p className="mt-2 text-xs leading-6">{f.summary}</p>
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="eyebrow">WHY IT MATTERS</div>
                <p className="mt-2 text-xs leading-6">{f.impact}</p>
              </div>
            </div>
          </Panel>
          <Panel
            title="Evidence Chain"
            sub="Detection → proof → risk → fix → verification"
            action={
              <SectionLink to="/evidence/$id" params={{ id: f.evidence[0] }}>
                Open evidence viewer
              </SectionLink>
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
                        `${f.evidence.length} artifacts`,
                        `${f.cvss} CVSS score`,
                        f.status === "Verified" ? "Verified" : "Awaiting re-test",
                      ][i]
                    }
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {f.evidence.map((id) => (
                <Link
                  key={id}
                  to="/evidence/$id"
                  params={{ id }}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-xs hover:border-primary"
                >
                  <span>
                    <FileText size={14} className="mr-2 inline text-primary" />
                    {id}{" "}
                    <span className="ml-2 text-muted-foreground">
                      {evidence.find((e) => e.id === id)?.type}
                    </span>
                  </span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Reproduction Steps">
            <ol className="space-y-3 text-xs leading-6 text-muted-foreground">
              <li>1. Sign in as an authorized non-admin test account.</li>
              <li>
                2. Request the affected resource: <code className="text-primary">{f.asset}</code>.
              </li>
              <li>3. Compare the observed response against the expected access control policy.</li>
              <li>4. Confirm the result using the linked redacted evidence artifacts.</li>
            </ol>
          </Panel>
          <Panel title="Technical Analysis">
            <p className="text-xs leading-6 text-muted-foreground">
              The observation was correlated across {f.evidence.length} evidence artifact
              {f.evidence.length === 1 ? "" : "s"}. The finding is assigned{" "}
              <strong className="text-foreground">{f.confidence.toLowerCase()} confidence</strong>{" "}
              based on reproducibility and available evidence. Severity is communicated
              independently using CVSS v4.0 and does not itself prove the finding.
            </p>
            <div className="mt-5 break-all rounded-md border border-border bg-secondary p-4 font-mono text-[11px] text-muted-foreground">
              CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:L
            </div>
          </Panel>
          <Panel title="Recommended Fix">
            <p className="text-sm leading-7 text-muted-foreground">{f.fix}</p>
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
              Part of the World Monitor application surface.
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
                  notify("Demo re-test queued; no security scan was run.");
                }}
                icon={Play}
              >
                Re-test
              </Action>
              <Action
                icon={Download}
                onClick={() => exportFindingDetailToPDF(f, notify)}
              >
                Export
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
              notify(`Assigned to ${owner} for this demo session.`);
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
  const related = evidence.filter((e) => e.finding === item.finding);
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
          Sensitive values are redacted in this demonstration.
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
            <Action onClick={() => setCompare((v) => !v)} variant={compare ? "default" : "outline"}>
              Compare
            </Action>
          }
        >
          <div className="overflow-x-auto rounded-md border border-border bg-background p-4 sm:p-6">
            <pre className="min-h-[350px] whitespace-pre-wrap break-all font-mono text-[11px] leading-6 text-foreground sm:text-xs">
              {item.content}
            </pre>
          </div>
          {compare && (
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
                ["Assessment", "World Monitor"],
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
              <SectionLink to="/findings/$id" params={{ id: item.finding }}>
                Open investigation
              </SectionLink>
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
                        notify("Demo remediation status updated.");
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
                        notify("Demo re-test requested. No real scan was run.");
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
  const data =
    comparison === "Before"
      ? { score: 54, critical: 6, high: 17, medium: 31 }
      : { score: 82, critical: 1, high: 6, medium: 19 };
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
          value="82/100"
          change="+28"
          icon={ShieldCheck}
          tone="success"
        />
        <Metric label="Risk Reduction" value="52%" icon={ArrowDownRight} tone="success" />
        <Metric label="Resolved Findings" value="28" icon={CheckCircle2} tone="success" />
        <Metric label="Coverage" value="86%" icon={Target} />
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
            <strong className="text-5xl font-semibold">54</strong>
            <span className="mb-1 text-sm text-muted-foreground">/100 security score</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded bg-secondary">
            <div className="h-full w-[54%] rounded bg-high" />
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-border pt-5">
            {[
              ["Critical", "6", "text-critical"],
              ["High", "17", "text-high"],
              ["Medium", "31", "text-medium"],
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
          <div className="text-2xl font-semibold text-success">+28</div>
          <div className="text-xs text-muted-foreground">score improvement</div>
          <div className="mt-2 rounded border border-success/25 bg-success/10 px-3 py-1.5 text-[11px] text-success">
            52% risk reduction
          </div>
        </div>
        <div className="panel border-success p-6">
          <div className="eyebrow text-success">AFTER VERIFICATION</div>
          <div className="mt-7 flex items-end gap-2">
            <strong className="text-5xl font-semibold">82</strong>
            <span className="mb-1 text-sm text-muted-foreground">/100 security score</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded bg-secondary">
            <div className="h-full w-[82%] rounded bg-success" />
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-border pt-5">
            {[
              ["Critical", "1", "text-critical"],
              ["High", "6", "text-high"],
              ["Medium", "19", "text-medium"],
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
const reportTypes = [
  "Executive Security Report",
  "Technical Vulnerability Report",
  "Remediation Report",
  "Assessment Summary",
];
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
            onClick={() => {
              notify("Demo report preview generated.");
              navigate({ to: "/reports/$id", params: { id: "executive" } });
            }}
          >
            Generate Report
          </Action>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {reportTypes.map((x, i) => (
          <Link
            to="/reports/$id"
            params={{ id: ["executive", "technical", "remediation", "summary"][i] ?? "executive" }}
            key={x}
            className="panel block p-5 hover:border-primary"
          >
            <FileText size={20} className="text-primary" />
            <div className="mt-6 text-sm font-semibold">{x}</div>
            <div className="mt-2 text-xs text-muted-foreground">World Monitor · 27 Sep 2026</div>
            <div className="mt-5 text-xs text-primary">Preview report →</div>
          </Link>
        ))}
      </div>
      <Panel title="Generated Reports" sub="Report previews for the demonstration assessment">
        <div className="overflow-x-auto">
          <table className={`${table} min-w-[550px]`}>
            <thead>
              <tr>
                {["Report", "Assessment", "Generated", "Risk", "Status", "Actions"].map((x) => (
                  <th key={x} className={th}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportTypes.map((x, i) => (
                <tr key={x}>
                  <td className={td}>{x}</td>
                  <td className={`${td} text-muted-foreground`}>World Monitor</td>
                  <td className={td}>27 Sep 2026</td>
                  <td className={td}>
                    <Badge tone="High">Elevated</Badge>
                  </td>
                  <td className={td}>
                    <Badge tone="Completed">Ready</Badge>
                  </td>
                  <td className={td}>
                    <SectionLink
                      to="/reports/$id"
                      params={{ id: ["executive", "technical", "remediation", "summary"][i] }}
                    >
                      Preview
                    </SectionLink>
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
export function ReportDetail({ id }: { id: string }) {
  const { notify, findings } = useSentinel();
  const title =
    reportTypes[["executive", "technical", "remediation", "summary"].indexOf(id)] || "Executive Security Report";
  return (
    <>
      <PageHeading
        eyebrow="REPORTS / WORLD MONITOR"
        title={title}
        description="World Monitor Security Assessment · Generated 27 Sep 2026"
        actions={
          <>
            <Action
              icon={Download}
              onClick={() => exportReportToPDF(title, findings, notify)}
            >
              Export Report
            </Action>
            <Action
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                notify("Report preview link copied.");
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
              Evidence-driven assessment of world-monitor.local
            </p>
          </div>
          <ShieldCheck size={32} className="text-primary" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            ["Security Score", "72/100"],
            ["Critical", "3"],
            ["High", "12"],
            ["Remediation", "68%"],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="eyebrow">{k}</div>
              <div className="mt-2 text-2xl font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 space-y-9">
          {[
            [
              "Executive Summary",
              "The World Monitor assessment found 51 findings across 48 assets. The current security score is 72/100, with authorization and API security requiring the most urgent attention.",
            ],
            [
              "Assessment Scope",
              "Web application, API endpoints, dependencies, authentication, authorization, configuration, and client-side controls. 132 endpoints and 76 dependencies were represented in this assessment.",
            ],
            [
              "Risk Distribution",
              "3 critical · 12 high · 18 medium · 7 low · 11 informational findings. Severity is based on risk scoring; evidence confidence is assessed separately.",
            ],
            [
              "Critical Findings",
              "Missing Authorization Check: an authenticated non-admin user can access administrative records. Evidence artifacts EV-1042, EV-1043 and EV-1044 document the request, response and validation.",
            ],
            [
              "Evidence Summary",
              "Evidence artifacts include redacted HTTP requests, responses, scanner output, configuration observations and dependency information.",
            ],
            [
              "Remediation Status",
              "68% of remediation work is in progress or verified. Findings are only considered closed after a confirming re-test.",
            ],
            [
              "Before vs After",
              "Security score improved from 54 to 82 in the simulated post-remediation comparison; critical findings decreased from 6 to 1.",
            ],
            [
              "Recommendations",
              "Prioritize server-side authorization checks, remove production debug routes, update vulnerable dependencies and verify every fix with a re-test.",
            ],
            [
              "Technical Appendix",
              "CVSS v4.0 communicates standardized severity. It is not proof of exploitability; the evidence chain supports each finding.",
            ],
          ].map(([heading, body]) => (
            <section key={heading} className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold">{heading}</h3>
              <p className="mt-2 text-xs leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-[11px] text-muted-foreground">
          SENTINEL · Demonstration report using mock data · Not a real security assessment
        </div>
      </div>
    </>
  );
}
export function Copilot() {
  const { findings } = useSentinel();
  const [text, setText] = useState(""),
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
                ["Assessment", "World Monitor"],
                ["Selected finding", "Missing Authorization Check"],
                ["CVSS", "9.1 · Critical"],
                ["Evidence", "3 linked artifacts"],
                ["Affected asset", "/api/v1/admin/users"],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-border pb-3">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="mt-1 break-all">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <SectionLink to="/findings/$id" params={{ id: "FND-001" }}>
                Inspect source finding
              </SectionLink>
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
        description="Manage your demonstration workspace preferences."
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
              ["Simulated AI suggestions", ai, setAi],
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
                    notify("Preference updated for this demo session.");
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
            verification before closure. Dark appearance is enabled for this demonstration.
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
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [remember, setRemember] = useState(true),
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
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
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

  const signInWithGoogle = () => {
    if (!termsAccepted) {
      setError("You must accept the terms and conditions to continue.");
      return;
    }
    setError("");
    // Simulate Google auth
    navigate({ to: "/dashboard" });
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
            Demo access only · No real authentication is performed.
          </p>
        </div>
      </div>
    </div>
  );
}
