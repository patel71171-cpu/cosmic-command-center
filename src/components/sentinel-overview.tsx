import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CheckCircle2, CircleDot, Download, Filter, Globe2, Radar, RefreshCw, Search, ShieldAlert, ShieldCheck, Siren, Target, X } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from './sentinel-ui';
import { useSentinel } from '@/lib/sentinel-store';
import { type Assessment, type Finding, type Severity } from '@/lib/sentinel-data';

const severityTones: Record<Severity, string> = { Critical: 'critical', High: 'high', Medium: 'medium', Low: 'success', Informational: 'muted-foreground' };
const severityOrder: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
const css = (name: string) => `var(--${name})`;
const chartTooltip = { contentStyle: { background: css('panel'), border: `1px solid ${css('border')}`, borderRadius: 6, color: css('foreground'), fontSize: 11 }, itemStyle: { color: css('foreground') } };

/** One point per assessment, oldest first. */
function buildTrend(findings: Finding[], assessments: Assessment[]) {
  return assessments
    .map((a) => {
      const scoped = findings.filter((f) => (f as any).assessment_id === a.id);
      return {
        date: a.lastRun,
        score: Math.round(a.score),
        risk: Math.round(a.risk_score ?? 0),
        open: scoped.filter((f) => f.status !== 'Verified').length,
      };
    })
    .reverse();
}

function Panel({ title, note, action, children, className = '' }: { title: string; note?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`command-panel flex min-w-0 flex-col ${className}`}><div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3"><div className="min-w-0"><h2 className="truncate text-[12px] font-semibold text-foreground">{title}</h2>{note && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{note}</p>}</div>{action}</div><div className="flex min-h-0 flex-1 flex-col p-4">{children}</div></section>;
}
function Kpi({ label, value, sub, icon: Icon, tone = 'primary', direction = 'up' }: { label: string; value: string; sub: string; icon: typeof Activity; tone?: string; direction?: 'up' | 'down' }) {
  return <div className="command-panel relative min-w-0 px-4 py-3.5"><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-medium uppercase text-muted-foreground">{label}</span><Icon size={15} className={`shrink-0 text-${tone}`} /></div><div className="mt-3 flex items-end justify-between gap-2"><strong className="truncate text-[25px] leading-none font-semibold tabular-nums text-foreground">{value}</strong><span className={`flex shrink-0 items-center text-[10px] text-${tone}`}>{direction === 'up' ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}</span></div><p className="mt-2 truncate text-[10px] text-muted-foreground">{sub}</p></div>;
}
import { exportFindingsPdf } from '@/lib/sentinel-pdf';
export function SentinelOverview() {
  const { findings, assessments, selectedAssessment, setSelectedAssessment, updateFinding, notify, backendConnected, refreshData } = useSentinel();
  const [period, setPeriod] = useState<'7D' | '30D' | '90D'>('30D');
  const [severity, setSeverity] = useState('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Finding | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState('Just now');
  const active = assessments.find(a => a.id === selectedAssessment) ?? assessments[0];
  const fullTrend = useMemo(() => buildTrend(findings, assessments), [findings, assessments]);
  const visibleTrend = period === '7D' ? fullTrend.slice(-4) : fullTrend;
  const filtered = useMemo(() => findings.filter(f => (severity === 'All' || f.severity === severity) && `${f.title} ${f.asset} ${f.id}`.toLowerCase().includes(query.toLowerCase())), [findings, severity, query]);

  /**
   * The triage table shows one scan, not the whole history. An assessment counts
   * as "latest" by completion time, falling back to creation time for scans that
   * are still running.
   */
  const lastRunAssessment = useMemo(() => {
    const stamp = (a: Assessment) => {
      const parsed = Date.parse(a.completed_at ?? a.lastRun ?? '');
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    const ranked = [...assessments].sort((a, b) => {
      const diff = stamp(b) - stamp(a);
      return diff !== 0 ? diff : (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });
    return ranked[0] ?? null;
  }, [assessments]);

  const lastRunFindings = useMemo(() => {
    if (!lastRunAssessment) return findings;
    const scoped = findings.filter(f => (f as any).assessment_id === lastRunAssessment.id);
    // Legacy findings may predate the assessment link; fall back rather than
    // showing an empty table.
    return scoped.length ? scoped : findings;
  }, [findings, lastRunAssessment]);

  const lastRunFiltered = useMemo(
    () =>
      lastRunFindings.filter(
        f =>
          (severity === 'All' || f.severity === severity) &&
          `${f.title} ${f.asset} ${f.id}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [lastRunFindings, severity, query],
  );
  const open = findings.filter(f => f.status !== 'Verified').length;
  const assetCount = new Set(findings.map(f => f.asset).filter(Boolean)).size;

  /**
   * Remediation state. The severity donut answers "what is wrong"; this answers
   * "what do I fix next" — the open findings ranked by CVSS, plus a single
   * linear progress bar for the fixed/open split.
   */
  const verifiedCount = findings.length - open;
  const remediationPct = findings.length
    ? Math.round((verifiedCount / findings.length) * 100)
    : 0;
  const priorityQueue = [...findings]
    .filter(f => f.status !== 'Verified')
    .sort((a, b) => {
      // Rank by severity band first, then CVSS, so Critical work floats up.
      const band = (s: Severity) => severityOrder.indexOf(s);
      return band(a.severity) - band(b.severity) || b.cvss - a.cvss;
    })
    .slice(0, 5);
  const counts = severityOrder.map(name => ({ name, value: findings.filter(f => f.severity === name).length, color: css(severityTones[name]) }));
  const categoryCounts = [...new Set(findings.map(f => f.category))].map(name => ({ name, count: findings.filter(f => f.category === name).length }));
  const assetRows = [...new Set(findings.map(f => f.asset).filter(Boolean))]
    .map((asset) => {
      const rows = findings.filter(f => f.asset === asset);
      return {
        asset,
        risk: Math.round(rows.reduce((m, f) => Math.max(m, f.cvss), 0) * 10),
        count: rows.length,
      };
    })
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 5);
  const topAsset = assetRows[0];
  // Round-robin the three event types so the feed reads as a mixed timeline
  // instead of five identical scan completions.
  const runDate = (iso?: string, fallback?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (fallback ?? '');
  const runEvents = [
    assessments.map((a) => ({ title: 'Assessment completed', desc: a.name, tone: 'low', time: runDate(a.completed_at, a.lastRun) })),
    findings.filter(f => f.severity === 'Critical').map((f) => ({ title: 'Critical finding recorded', desc: f.title, tone: 'critical', time: f.detected })),
    findings.filter(f => f.status === 'Verified').map((f) => ({ title: 'Finding verified', desc: f.title, tone: 'success', time: f.detected })),
  ].filter(group => group.length > 0);
  const events: { title: string; desc: string; tone: string; time: string }[] = [];
  for (let i = 0; i < 5 && runEvents.length > 0; i++) {
    const group = runEvents[i % runEvents.length];
    if (!group) break;
    const pick = group[Math.floor(i / runEvents.length)] ?? group[0];
    if (pick) events.push(pick);
  }
  const statusAction = (finding: Finding) => { const status = finding.status === 'Verified' ? 'Open' : 'Verified'; updateFinding(finding.id, { status }); setSelected({ ...finding, status }); notify(`${finding.id} marked ${status.toLowerCase()}`); };
  return <div className="space-y-4 pb-10">
    <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 xl:flex-row xl:items-end">
      <div className="min-w-0"><div className="mb-2.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-primary"><span className={`h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_10px_var(--success)] ${backendConnected ? "bg-success" : "bg-medium"}`}/> <span>Security operations / Overview</span><span className={`rounded border px-1.5 py-0.5 text-[9px] tracking-[.1em] ${backendConnected ? "border-success/30 bg-success/10 text-success" : "border-primary/30 bg-primary/10 text-primary"}`}>{backendConnected ? "LIVE DATA" : "OFFLINE"}</span></div><h1 className="text-[25px] font-semibold leading-[1.15] tracking-[-.015em] text-foreground sm:text-[30px]">SENTINEL<span className="ml-2 font-normal tracking-[-.01em] text-muted-foreground">/ Command Center</span></h1><p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground">One view of exposure, assessments, incidents, and remediation.</p></div>
      <div className="flex flex-wrap items-center gap-2"><select aria-label="Assessment" className="h-8 max-w-[210px] rounded-md border border-border bg-secondary px-2 text-[11px] text-foreground" value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)}>{assessments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><Button variant="outline" size="sm" title="Refresh view" aria-label="Refresh view" onClick={() => { setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); refreshData().then(() => notify(backendConnected ? 'Dashboard refreshed from live data' : 'Refreshed — backend offline')); }}><RefreshCw size={14}/></Button><Button size="sm" onClick={() => exportFindingsPdf('Workspace Findings', `${active?.name ?? 'All assessments'} · ${filtered.length} findings`, filtered)}><Download size={14}/> Export PDF</Button></div>
    </div>
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6"><Kpi label="Security score" value={`${active?.score ?? 0}/100`} sub={`Risk score ${active?.risk_score ?? 0}/100`} icon={ShieldCheck} tone="success"/><Kpi label="Critical issues" value={String(findings.filter(f => f.severity === 'Critical' && f.status !== 'Verified').length)} sub="Needs immediate action" icon={Siren} tone="critical" direction="down"/><Kpi label="Open findings" value={String(open)} sub={`${findings.length} total in workspace`} icon={ShieldAlert} tone="high" direction="down"/><Kpi label="Assets monitored" value={String(assetCount)} sub={`${findings.length} findings across ${assessments.length} assessments`} icon={Globe2} tone="low"/><Kpi label="Active scans" value={String(assessments.filter(a => a.status === 'Running').length)} sub={`Across ${assessments.length} assessments`} icon={Radar} tone="primary"/><Kpi label="Remediated" value={String(findings.filter(f => f.status === 'Verified').length)} sub="Verified fixes" icon={CheckCircle2} tone="success"/></div>
    <div className="grid gap-3 lg:grid-cols-12">
      <Panel title="Security posture" note="Score and risk movement over time" className="lg:col-span-6" action={<div className="flex gap-0.5 rounded border border-border bg-secondary p-0.5">{(['7D','30D','90D'] as const).map(p => <Button key={p} variant={period === p ? 'secondary' : 'ghost'} size="sm" className={`h-6 px-2 text-[10px] ${period === p ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => setPeriod(p)}>{p}</Button>)}</div>}><div className="min-h-[190px] w-full flex-1"><ResponsiveContainer width="100%" height="100%"><AreaChart data={visibleTrend} margin={{ top: 4, right: 8, bottom: 8, left: -12 }}><defs><linearGradient id="score-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={css('primary')} stopOpacity={.28}/><stop offset="100%" stopColor={css('primary')} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke={css('border')} strokeDasharray="3 5" vertical={false}/><XAxis dataKey="date" tick={{ fill: css('muted-foreground'), fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} tick={{ fill: css('muted-foreground'), fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip {...chartTooltip}/><Area dataKey="score" stroke={css('primary')} fill="url(#score-fill)" strokeWidth={2.5} name="Security score"/><Area dataKey="risk" stroke={css('high')} fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" name="Risk index"/></AreaChart></ResponsiveContainer></div><div className="mt-1 flex items-center gap-4 text-[10px] text-muted-foreground"><span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary"/>Security score</span><span><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-high"/>Risk index</span><span className="ml-auto">Updated {lastRefreshed}</span></div></Panel>
      <Panel title="Findings by severity" note="Current issue distribution" className="lg:col-span-3"><div className="relative min-h-[150px] flex-1"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={counts} innerRadius={48} outerRadius={65} dataKey="value" stroke="none" paddingAngle={4}>{counts.map(c => <Cell key={c.name} fill={c.color}/>)}</Pie><Tooltip {...chartTooltip}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl font-semibold">{findings.length}</strong><span className="text-[9px] uppercase text-muted-foreground">findings</span></div></div><div className="mt-3 grid shrink-0 grid-cols-2 gap-2">{counts.map(c => <div key={c.name} className="flex items-center justify-between gap-2 text-[10px]"><span className="flex items-center gap-1.5 text-muted-foreground"><i className={`h-1.5 w-1.5 rounded-full bg-${severityTones[c.name as Severity]}`}/>{c.name}</span><b>{c.value}</b></div>)}</div></Panel>
      <Panel title="Needs attention" note="Highest risk open findings" className="lg:col-span-3" action={<Link to="/findings" className="text-primary" aria-label="View all findings"><ArrowRight size={15}/></Link>}>
        <div className="mb-3">
          <div className="mb-1.5 flex items-baseline justify-between text-[10px]">
            <span className="text-muted-foreground">Remediation</span>
            <span className="font-semibold tabular-nums">{remediationPct}%</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded bg-secondary">
            <div className="bg-success transition-[width] duration-700" style={{ width: `${remediationPct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
            <span><b className="text-success">{verifiedCount}</b> verified</span>
            <span><b className={open ? 'text-critical' : 'text-success'}>{open}</b> open</span>
          </div>
        </div>

        <div className="scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {priorityQueue.map(f => (
            <Link
              key={f.id}
              to="/findings/$id"
              params={{ id: f.id }}
              className="group flex items-start gap-2.5 rounded-md border border-border bg-secondary/40 px-2.5 py-2 transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
              <i className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-${severityTones[f.severity]}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium leading-tight text-foreground group-hover:text-primary">
                  {f.title}
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{f.asset || '—'}</span>
              </span>
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-muted-foreground">
                {f.cvss.toFixed(1)}
              </span>
            </Link>
          ))}
          {priorityQueue.length === 0 && (
            <p className="py-6 text-center text-[10px] text-muted-foreground">
              {findings.length ? 'All findings are verified. Nothing outstanding.' : 'No findings recorded yet.'}
            </p>
          )}
        </div>
      </Panel>
    </div>
    <div className="grid gap-3 lg:grid-cols-12">
      <Panel title="Threat activity" note="Open findings per assessment" className="lg:col-span-4">{visibleTrend.length ? <div className="h-[145px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={visibleTrend} margin={{top:4,right:0,left:-25,bottom:0}}><CartesianGrid vertical={false} stroke={css('border')} strokeDasharray="3 5"/><XAxis dataKey="date" tick={{ fill: css('muted-foreground'), fontSize: 9 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill: css('muted-foreground'), fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip {...chartTooltip}/><Bar dataKey="open" fill={css('high')} radius={[2,2,0,0]} name="Open findings"/></BarChart></ResponsiveContainer></div> : <div className="flex h-[145px] items-center justify-center text-[10px] text-muted-foreground">No assessments recorded yet.</div>}<div className="mt-2 flex justify-between border-t border-border pt-3 text-[10px]"><span className="text-muted-foreground">Open findings</span><span className="text-primary">{open} unresolved</span></div></Panel>
      <Panel title="Exposure by asset" note="Highest scoring asset per finding" className="lg:col-span-4" action={<Link to="/attack-surface" className="text-primary" aria-label="View attack surface"><ArrowRight size={15}/></Link>}><div className="space-y-2.5">{assetRows.map(a => <div key={a.asset} className="grid grid-cols-[minmax(0,1fr)_2fr_25px] items-center gap-2 text-[10px]"><span className="truncate text-muted-foreground">{a.asset}</span><div className="h-1.5 rounded bg-secondary"><div className={`h-full rounded ${a.risk >= 80 ? 'bg-critical' : a.risk >= 60 ? 'bg-high' : 'bg-primary'}`} style={{ width: `${a.risk}%` }}/></div><b className="text-right tabular-nums">{a.risk}</b></div>)}</div><div className="mt-3 border-t border-border pt-3 text-[10px] text-muted-foreground">Highest exposure <span className="float-right text-critical">{topAsset ? `${topAsset.asset} · ${topAsset.risk}/100` : '—'}</span></div></Panel>
      <Panel title="Vulnerability categories" note="Issues grouped by weakness" className="lg:col-span-4"><div className="space-y-2.5">{categoryCounts.slice(0,5).map((c,i) => <div key={c.name} className="grid grid-cols-[minmax(0,1fr)_2fr_16px] items-center gap-2 text-[10px]"><span className="truncate text-muted-foreground">{c.name}</span><div className="h-1.5 rounded bg-secondary"><div className={`h-full rounded ${i % 2 ? 'bg-low' : 'bg-violet'}`} style={{ width: `${Math.max(18,c.count / findings.length * 100)}%` }}/></div><b className="text-right">{c.count}</b></div>)}</div><div className="mt-3 border-t border-border pt-3 text-[10px] text-muted-foreground">{categoryCounts.length} categories tracked</div></Panel>
    </div>
    <div className="grid gap-3 lg:grid-cols-12">
      <Panel title="Findings intelligence" note={lastRunAssessment ? `Findings from the latest run · ${lastRunAssessment.name}` : 'Search, filter, inspect, and triage findings'} className="lg:col-span-8" action={<Link to="/findings" className="flex items-center gap-1 text-[10px] text-primary">All findings <ArrowRight size={12}/></Link>}><div className="mb-3 flex flex-wrap gap-2"><div className="relative min-w-[160px] flex-1"><Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground"/><input aria-label="Search findings" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search findings or assets" className="h-8 w-full rounded border border-border bg-secondary pl-8 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground"/></div><div className="relative"><Filter size={12} className="pointer-events-none absolute left-2 top-2.5 text-muted-foreground"/><select aria-label="Filter severity" value={severity} onChange={e => setSeverity(e.target.value)} className="h-8 rounded border border-border bg-secondary pl-7 pr-2 text-[11px] text-foreground"><option value="All">All severity</option>{severityOrder.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div><div className="scrollbar min-h-0 flex-1 overflow-auto"><table className="w-full min-w-[540px] text-left text-[11px]"><thead><tr className="border-b border-border text-[10px] uppercase text-muted-foreground"><th className="pb-2 font-medium">Finding</th><th className="pb-2 font-medium">Severity</th><th className="pb-2 font-medium">Asset</th><th className="pb-2 font-medium">Status</th><th className="pb-2 text-right font-medium">Inspect</th></tr></thead><tbody>{lastRunFiltered.map(f => <tr key={f.id} className="border-b border-border/60 last:border-0 hover:bg-panel-hover"><td className="py-2.5 pr-2"><span className="block font-medium text-foreground">{f.title}</span><span className="text-[9px] text-muted-foreground">{f.id}</span></td><td className="pr-2"><Badge tone={f.severity}>{f.severity}</Badge></td><td className="max-w-[145px] truncate pr-2 text-muted-foreground">{f.asset}</td><td className="pr-2"><Badge tone={f.status}>{f.status}</Badge></td><td className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7" title={`Inspect ${f.title}`} aria-label={`Inspect ${f.title}`} onClick={() => setSelected(f)}><ArrowRight size={13}/></Button></td></tr>)}</tbody></table>{lastRunFiltered.length === 0 && <div className="py-8 text-center text-xs text-muted-foreground">{query || severity !== 'All' ? 'No findings in this run match your search.' : 'This run recorded no findings.'}</div>}</div></Panel>
      <Panel title="Operations feed" note="Latest assessment events" className="lg:col-span-4" action={<Link to="/reports" className="flex items-center gap-1 text-[10px] text-primary">View reports <ArrowRight size={12}/></Link>}><div className="space-y-0">{events.map((e,i) => <div key={i} className="flex gap-3 border-l border-border pb-2 pl-3 last:pb-0"><span className={`-ml-[18px] grid h-3 w-3 shrink-0 place-items-center rounded-full bg-${e.tone} ring-4 ring-panel`}/><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-[11px]"><span className="truncate font-medium">{e.title}</span><span className="shrink-0 text-[9px] text-muted-foreground">{e.time}</span></div><p className="mt-1 truncate text-[10px] text-muted-foreground">{e.desc}</p></div></div>)}</div>{events.length === 0 && <p className="text-[10px] text-muted-foreground">No activity recorded yet.</p>}</Panel>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[10px] text-muted-foreground"><span>Sentinel Security Operations</span><span>{backendConnected ? 'Live data from SENTINEL API' : 'Backend offline — connect to load live data'}</span></div>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-w-lg border-border bg-panel text-foreground"><DialogHeader><DialogTitle className="pr-6 text-lg">{selected?.title}</DialogTitle></DialogHeader>{selected && <div className="space-y-4 text-xs"><div className="flex flex-wrap items-center gap-2"><Badge tone={selected.severity}>{selected.severity}</Badge><Badge tone={selected.status}>{selected.status}</Badge><span className="text-muted-foreground">{selected.id} · CVSS {selected.cvss}</span></div><div><div className="mb-1 text-[10px] uppercase text-muted-foreground">Asset</div><div>{selected.asset}</div></div><div><div className="mb-1 text-[10px] uppercase text-muted-foreground">Summary</div><p className="leading-relaxed text-muted-foreground">{selected.summary}</p></div><div><div className="mb-1 text-[10px] uppercase text-muted-foreground">Recommended fix</div><p className="leading-relaxed text-muted-foreground">{selected.fix}</p></div><div className="flex justify-between border-t border-border pt-4"><Button variant="outline" size="sm" onClick={() => statusAction(selected)}>{selected.status === 'Verified' ? 'Reopen finding' : 'Mark verified'}</Button><Button size="sm" asChild><Link to="/findings/$id" params={{ id: selected.id }}>Full investigation <ArrowRight size={13}/></Link></Button></div></div>}</DialogContent></Dialog>
  </div>;
}
