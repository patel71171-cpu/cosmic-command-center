import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Download, FileText, GitBranch, Network, Plus, Search, ShieldAlert, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from './sentinel-ui';
import { TrendChart, SeverityChart, CategoryChart } from './sentinel-charts';
import { useSentinel } from '@/lib/sentinel-store';
import { assets, type Finding } from '@/lib/sentinel-data';

const stats = [
  { label: 'Security score', value: '72', suffix: '/100', change: '+8 pts', positive: true, icon: ShieldCheck },
  { label: 'Critical findings', value: '03', suffix: '', change: '−2', positive: true, icon: ShieldAlert },
  { label: 'High findings', value: '12', suffix: '', change: '−4', positive: true, icon: Activity },
  { label: 'Open findings', value: '28', suffix: '', change: '−11%', positive: true, icon: Search },
  { label: 'Assets monitored', value: '48', suffix: '', change: '+6', positive: true, icon: Network },
  { label: 'Remediation', value: '68', suffix: '%', change: '+14%', positive: true, icon: CheckCircle2 },
];
const actions = [
  { label: 'Run assessment', to: '/assessments/new', icon: Plus },
  { label: 'Investigate findings', to: '/findings', icon: ShieldAlert },
  { label: 'Explore attack surface', to: '/attack-surface', icon: Network },
  { label: 'Prioritize fixes', to: '/remediation', icon: Wrench },
  { label: 'View risk graph', to: '/risk-graph', icon: GitBranch },
  { label: 'Generate report', to: '/reports', icon: FileText },
  { label: 'Open AI copilot', to: '/ai-copilot', icon: Sparkles },
] as const;
const severities = ['All', 'Critical', 'High', 'Medium', 'Low'] as const;

function Widget({title,detail,action,children,className=''}:{title:string;detail?:string;action?:React.ReactNode;children:React.ReactNode;className?:string}) {
  return <section className={`dashboard-panel ${className}`}><div className="dashboard-panel-header flex min-w-0 items-center justify-between gap-2"><div className="min-w-0"><h2 className="truncate text-[13px] font-bold text-foreground">{title}</h2>{detail && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{detail}</p>}</div>{action}</div><div className="dashboard-panel-body">{children}</div></section>;
}
function downloadSnapshot(findings: Finding[]) {
  const content = ['SENTINEL SECURITY SNAPSHOT', 'Demo assessment data · World Monitor', '', 'FINDINGS', ...findings.map(f => `${f.id} | ${f.severity} | ${f.title} | ${f.asset} | ${f.status}`)].join('\n');
  const url = URL.createObjectURL(new Blob([content], {type:'text/plain'}));
  const anchor = document.createElement('a'); anchor.href=url; anchor.download='sentinel-security-snapshot.txt'; anchor.click(); URL.revokeObjectURL(url);
}
export function CommandDashboard() {
  const { findings, assessments } = useSentinel();
  const [severity, setSeverity] = useState<(typeof severities)[number]>('All');
  const [query, setQuery] = useState('');
  const [trendMode, setTrendMode] = useState<'score'|'risk'|'open'>('score');
  const filtered = useMemo(() => findings.filter(f => (severity==='All'||f.severity===severity) && `${f.title} ${f.asset} ${f.id}`.toLowerCase().includes(query.toLowerCase())), [findings,severity,query]);
  return <div className="space-y-3">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pb-2 sm:flex sm:items-center sm:justify-between">
      <div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase text-primary"><span className="h-1.5 w-1.5 rounded-full bg-success"/>Security operations / Overview</div><h1 className="text-xl font-extrabold leading-tight text-foreground sm:text-2xl">Security Command Center</h1><p className="mt-1 text-[11px] text-muted-foreground">World Monitor · Assessment data overview</p></div>
      <div className="flex shrink-0 items-center gap-2"><Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" title="Download snapshot" onClick={()=>downloadSnapshot(filtered)}><Download size={14}/><span className="hidden sm:inline">Export</span></Button><Button size="sm" className="h-8 gap-1.5 text-xs" asChild><Link to="/assessments/new"><Plus size={14}/><span className="hidden sm:inline">New assessment</span></Link></Button></div>
    </div>
    <div className="dashboard-scroll flex items-center gap-2 border-b border-border pb-3">
      <span className="shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">Portfolio overview</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">{assessments.length} assessments · 48 assets</span>
      <span className="ml-auto shrink-0 rounded border border-success/25 bg-success/10 px-2 py-1 text-[10px] font-bold text-success">● DEMO DATA</span>
    </div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-6">{stats.map((s,i)=><div className="dashboard-metric" key={s.label}><div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-muted-foreground"><span className="truncate">{s.label}</span><s.icon size={14} className={i===1?'shrink-0 text-critical':'shrink-0 text-primary'}/></div><div className="mt-3 flex items-end justify-between gap-1"><div className="text-[26px] font-extrabold leading-none text-foreground">{s.value}<span className="ml-0.5 text-xs font-medium text-muted-foreground">{s.suffix}</span></div><span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-success">{s.positive?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>} {s.change}</span></div></div>)}</div>
    <div className="dashboard-grid dashboard-grid-top">
      <Widget title="Security posture trend" detail="Score, risk, and open findings over time" action={<div className="flex shrink-0 rounded border border-border bg-secondary p-0.5">{(['score','risk','open'] as const).map(mode=><Button key={mode} size="sm" variant={trendMode===mode?'secondary':'ghost'} className={`h-6 px-2 text-[10px] capitalize ${trendMode===mode?'text-primary':''}`} onClick={()=>setTrendMode(mode)}>{mode}</Button>)}</div>}><TrendChart mode={trendMode}/></Widget>
      <Widget title="Findings by severity" detail="Validated and pending"><SeverityChart/></Widget>
      <Widget title="Exposure by category" detail="Finding concentration"><CategoryChart/></Widget>
    </div>
    <div className="dashboard-grid dashboard-grid-top">
      <Widget title="Assessment progress" detail="Current security portfolio" action={<Link to="/assessments" className="shrink-0 text-[10px] font-semibold text-primary hover:underline">View all <ArrowRight className="inline" size={11}/></Link>}><div className="space-y-4 pt-1">{assessments.map(a=><Link to="/assessments/$id" params={{id:a.id}} key={a.id} className="block group"><div className="mb-1.5 flex justify-between gap-2 text-[11px]"><span className="truncate font-medium group-hover:text-[#38bdf8]">{a.name}</span><span className="shrink-0 text-muted-foreground">{a.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-[#38bdf8]" style={{width:`${a.progress}%`}}/></div></Link>)}</div></Widget>
      <Widget title="Highest-risk assets" detail="Prioritized by exposure" action={<Link to="/attack-surface" className="shrink-0 text-[10px] font-semibold text-primary hover:underline">Explore <ArrowRight className="inline" size={11}/></Link>}><div className="space-y-3">{[...assets].sort((a,b)=>b.risk-a.risk).slice(0,5).map(a=><div className="flex items-center gap-3" key={a.id}><div className="min-w-0 flex-1"><div className="flex justify-between text-[11px]"><span className="truncate">{a.label}</span><span className="ml-2 text-muted-foreground">{a.type}</span></div><div className="mt-1.5 h-1.5 rounded-full bg-secondary"><div className={`h-full rounded-full ${a.risk>85?'bg-critical':a.risk>65?'bg-high':'bg-primary'}`} style={{width:`${a.risk}%`}}/></div></div><span className={`w-7 text-right text-xs font-bold ${a.risk>85?'text-critical':'text-high'}`}>{a.risk}</span></div>)}</div></Widget>
      <Widget title="Quick actions" detail="Security workflows in one place"><div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-1">{actions.map(a=><Button key={a.to} asChild variant="ghost" className="h-8 w-full justify-start gap-2 px-2 text-[11px] font-medium text-muted-foreground hover:text-primary"><Link to={a.to}><a.icon size={14}/>{a.label}<ArrowRight size={12} className="ml-auto"/></Link></Button>)}</div></Widget>
    </div>
    <div className="dashboard-grid dashboard-grid-bottom">
      <Widget title="Recent findings" detail="Search and filter evidence-backed discoveries" action={<Link to="/findings" className="shrink-0 text-[10px] font-semibold text-primary hover:underline">All findings <ArrowRight className="inline" size={11}/></Link>}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground"/><Input aria-label="Search findings" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search findings or assets" className="h-8 pl-8 text-xs"/></div><select aria-label="Filter severity" value={severity} onChange={e=>setSeverity(e.target.value as typeof severity)} className="h-8 rounded border border-border bg-secondary px-2 text-xs text-foreground">{severities.map(s=><option key={s} value={s}>{s==='All'?'All severities':s}</option>)}</select></div>
        <div className="dashboard-scroll"><table className="w-full min-w-[550px] text-left text-[11px]"><thead><tr className="border-b border-border text-muted-foreground"><th className="py-2 font-semibold">Finding</th><th className="py-2 font-semibold">Severity</th><th className="py-2 font-semibold">Asset</th><th className="py-2 font-semibold">Status</th></tr></thead><tbody>{filtered.map(f=><tr key={f.id} className="border-b border-border/50 last:border-0"><td className="py-2.5 pr-3"><Link to="/findings/$id" params={{id:f.id}} className="font-semibold hover:text-primary">{f.title}</Link><span className="block text-[10px] text-muted-foreground">{f.id}</span></td><td className="py-2.5 pr-3"><Badge tone={f.severity}>{f.severity}</Badge></td><td className="max-w-[130px] truncate py-2.5 pr-3 text-muted-foreground">{f.asset}</td><td className="py-2.5"><Badge tone={f.status}>{f.status}</Badge></td></tr>)}</tbody></table>{filtered.length===0&&<div className="py-8 text-center text-xs text-muted-foreground">No findings match this filter.</div>}</div>
      </Widget>
      <Widget title="Operations feed" detail="Latest workspace activity"><div className="space-y-0">{[['Critical finding discovered','Missing Authorization Check','2h ago'],['Finding validated','Exposed Debug Endpoint','6h ago'],['Fix verified','Content Security Policy','Yesterday'],['Assessment completed','World Monitor','Yesterday'],['Report generated','Executive Security Report','2 days ago']].map(([title,detail,time],i)=><div key={title} className="flex gap-3 border-l border-border pb-5 pl-4 last:pb-0"><span className={`-ml-[21px] mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background ${i===0?'bg-critical':i===2?'bg-success':'bg-primary'}`}/><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-[11px]"><span className="truncate font-semibold">{title}</span><span className="shrink-0 text-[10px] text-muted-foreground">{time}</span></div><div className="mt-1 truncate text-[10px] text-muted-foreground">{detail}</div></div></div>)}</div></Widget>
    </div>
  </div>;
}
