import { jsPDF } from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import type { Assessment, Finding } from './sentinel-data';

/**
 * Client-side PDF exports. Every export is built from live workspace rows —
 * findings, assessments and evidence counts recorded by real scans.
 *
 * Layout rules (learned the hard way): every table column gets an explicit
 * width that sums to the printable width (182mm on A4 with 14mm margins),
 * long URLs wrap instead of stretching their column, and severity cells are
 * colour-filled without shrinking their column.
 */

const PAGE_WIDTH = 210;
const MARGIN = 14;
const PRINTABLE = PAGE_WIDTH - MARGIN * 2; // 182
const BOTTOM = 282;

const BRAND: [number, number, number] = [30, 41, 59];
const ACCENT: [number, number, number] = [79, 70, 229];
const MUTED: [number, number, number] = [100, 116, 139];

const SEVERITY_FILL: Record<string, [number, number, number]> = {
  Critical: [220, 38, 38],
  High: [234, 88, 12],
  Medium: [217, 119, 6],
  Low: [101, 163, 13],
  Informational: [107, 114, 128],
};

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SENTINEL', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Evidence-driven security assessment', 14, 19);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 14, 28);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(subtitle, 14, 40);
  doc.setTextColor(0, 0, 0);
  return 46;
}

function footer(doc: jsPDF, label: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, 14, 290);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: 'right' });
  }
}

function finalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function sectionHeading(doc: jsPDF, text: string, y: number): number {
  if (y > BOTTOM - 20) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text(text, 14, y);
  return y + 2;
}

function paragraph(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const lines = doc.splitTextToSize(text || '—', PRINTABLE);
  for (const line of lines) {
    if (y > BOTTOM) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 14, y);
    y += 5;
  }
  return y + 4;
}

function severityTableStyle() {
  return {
    theme: 'grid' as const,
    headStyles: { fillColor: BRAND as [number, number, number], fontSize: 8 },
    bodyStyles: { fontSize: 8, cellPadding: 2, valign: 'middle' as const, overflow: 'linebreak' as const },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data: CellHookData) => {
      if (data.section !== 'body' || data.column.index !== 1) return;
      const fill = SEVERITY_FILL[String(data.cell.raw ?? '')];
      if (!fill) return;
      data.cell.styles.fillColor = fill;
      data.cell.styles.textColor = [255, 255, 255];
      data.cell.styles.fontStyle = 'bold';
    },
  };
}

export function exportFindingsPdf(title: string, subtitle: string, findings: Finding[]) {
  const doc = new jsPDF();
  let y = header(doc, title, subtitle);

  const bySeverity: Record<string, number> = {};
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;

  y = sectionHeading(doc, 'Summary', y);
  autoTable(doc, {
    ...severityTableStyle(),
    startY: y,
    head: [['Severity', 'Count']],
    body: ['Critical', 'High', 'Medium', 'Low', 'Informational']
      .filter((sev) => (bySeverity[sev] ?? 0) > 0)
      .map((sev) => [sev, String(bySeverity[sev])]),
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: PRINTABLE - 120 } },
  });
  // Total row as a separate one-line table keeps its styling independent.
  autoTable(doc, {
    startY: finalY(doc),
    head: [],
    body: [[{ content: 'Total findings', styles: { fontStyle: 'bold' as const } }, { content: String(findings.length), styles: { fontStyle: 'bold' as const } }]],
    theme: 'grid',
    bodyStyles: { fontSize: 9, fillColor: [241, 245, 249] },
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: PRINTABLE - 120 } },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = finalY(doc) + 10;

  y = sectionHeading(doc, `Findings (${findings.length})`, y);
  autoTable(doc, {
    ...severityTableStyle(),
    startY: y,
    head: [['#', 'Finding', 'Severity', 'CVSS', 'Asset', 'Status']],
    body: findings.map((f, i) => [
      String(i + 1),
      f.title,
      f.severity,
      String(f.cvss),
      f.asset,
      f.status,
    ]),
    // Widths sum to PRINTABLE (182): finding titles get the room, long asset
    // URLs wrap inside their own column instead of stretching the table.
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 64 },
      2: { cellWidth: 24 },
      3: { cellWidth: 14 },
      4: { cellWidth: 44, overflow: 'linebreak' as const },
      5: { cellWidth: 26 },
    },
  });

  footer(doc, 'SENTINEL · Findings export · Confidential — authorized personnel only');
  doc.save('sentinel-findings.pdf');
}

export function exportFindingPdf(
  finding: Finding,
  assessmentName: string,
  evidenceCount: number,
) {
  const doc = new jsPDF();
  let y = header(doc, 'Finding Dossier', `${assessmentName} · ${finding.id.slice(0, 8)}`);

  autoTable(doc, {
    startY: y,
    head: [['Field', 'Detail']],
    body: [
      ['Title', finding.title],
      ['Severity', finding.severity],
      ['CVSS v4.0', String(finding.cvss)],
      ['Asset', finding.asset],
      ['Category', finding.category],
      ['Confidence', finding.confidence],
      ['Status', finding.status],
      ['Owner', finding.owner],
      ['Detected', finding.detected],
      ['Evidence artifacts', String(evidenceCount)],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND, fontSize: 9 },
    bodyStyles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' as const },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold' },
      1: { cellWidth: PRINTABLE - 48 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = finalY(doc) + 10;

  y = sectionHeading(doc, 'What was found', y);
  y = paragraph(doc, finding.summary, y);
  y = sectionHeading(doc, 'Why it matters', y);
  y = paragraph(doc, finding.impact, y);
  y = sectionHeading(doc, 'How to solve it', y);
  y = paragraph(doc, finding.fix, y);

  footer(doc, 'SENTINEL · Finding dossier · Confidential — authorized personnel only');
  doc.save(`sentinel-finding-${finding.id.slice(0, 8)}.pdf`);
}

export function exportReportPdf(assessment: Assessment, findings: Finding[]) {
  const doc = new jsPDF();
  const generated = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  let y = header(doc, assessment.name, `${assessment.target} · Generated ${generated}`);

  const verified = findings.filter((f) => f.status === 'Verified').length;
  const remediation = findings.length ? Math.round((verified / findings.length) * 100) : 0;
  const evidenceCount = findings.reduce((n, f) => n + f.evidence.length, 0);
  const count = (sev: string) => findings.filter((f) => f.severity === sev).length;

  // ── Score cards ────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['Security Score', 'Risk Score', 'Findings', 'Verified', 'Evidence']],
    body: [[
      `${Math.round(assessment.score)}/100`,
      `${Math.round(assessment.risk_score ?? 0)}/100`,
      String(findings.length),
      `${verified} (${remediation}%)`,
      String(evidenceCount),
    ]],
    theme: 'grid',
    headStyles: { fillColor: BRAND, fontSize: 8 },
    bodyStyles: { fontSize: 11, fontStyle: 'bold', halign: 'center' },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = finalY(doc) + 10;

  // ── Severity breakdown ─────────────────────────────────────────────────
  y = sectionHeading(doc, 'Severity breakdown', y);
  autoTable(doc, {
    ...severityTableStyle(),
    startY: y,
    head: [['Severity', 'Count', 'Share']],
    body: ['Critical', 'High', 'Medium', 'Low', 'Informational'].map((sev) => [
      sev,
      String(count(sev)),
      findings.length ? `${Math.round((count(sev) / findings.length) * 100)}%` : '—',
    ]),
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 56 },
      2: { cellWidth: PRINTABLE - 126 },
    },
  });
  y = finalY(doc) + 10;

  // ── Detailed findings with remediation ─────────────────────────────────
  y = sectionHeading(doc, 'Detailed findings — what to fix and how', y);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Finding (severity · CVSS)', 'Asset / status', 'How to solve it']],
    body: [...findings]
      .sort((a, b) => b.cvss - a.cvss)
      .map((f, i) => [
        String(i + 1),
        `${f.title}\n${f.severity} · CVSS ${f.cvss}`,
        `${f.asset}\n${f.status}`,
        f.fix || '—',
      ]),
    theme: 'grid',
    headStyles: { fillColor: BRAND, fontSize: 8 },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5, valign: 'top' as const, overflow: 'linebreak' as const },
    // Widths sum to PRINTABLE (182).
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 56 },
      2: { cellWidth: 42, overflow: 'linebreak' as const },
      3: { cellWidth: 76 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
  y = finalY(doc) + 10;

  // ── Evidence integrity + recommendations ───────────────────────────────
  y = sectionHeading(doc, 'Evidence integrity', y);
  y = paragraph(
    doc,
    `${evidenceCount} evidence artifacts are recorded for this assessment, including the raw scan log, captured HTTP responses and scanner output. Every record is SHA-256 hashed and linked into a tamper-evident chain that can be re-verified at any time from the evidence panel.`,
    y,
  );

  const fixes = [...new Set(findings.map((f) => f.fix).filter(Boolean))].slice(0, 6);
  if (fixes.length) {
    y = sectionHeading(doc, 'Prioritised recommendations', y);
    autoTable(doc, {
      startY: y,
      head: [['#', 'Recommendation']],
      body: fixes.map((fix, i) => [String(i + 1), fix]),
      theme: 'grid',
      headStyles: { fillColor: BRAND, fontSize: 9 },
      bodyStyles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' as const },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: PRINTABLE - 10 } },
      margin: { left: MARGIN, right: MARGIN },
    });
  }

  footer(doc, 'SENTINEL · Evidence-backed assessment report · Confidential — authorized personnel only');
  doc.save(`sentinel-report-${assessment.id.slice(0, 8)}.pdf`);
}
