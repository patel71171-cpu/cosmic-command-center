import { ResponsiveContainer,AreaChart,Area,CartesianGrid,XAxis,YAxis,Tooltip,PieChart,Pie,Cell,BarChart,Bar } from 'recharts';
import { useSentinel } from '@/lib/sentinel-store';

const css=(name:string)=>`var(--${name})`;const colors=[css('critical'),css('high'),css('medium'),css('low'),css('muted-foreground')];
const tooltip={contentStyle:{background:'var(--panel)',border:'1px solid var(--border)',borderRadius:6,fontSize:11,color:'var(--foreground)'},itemStyle:{color:'var(--foreground)'}};

export function TrendChart({mode='score'}:{mode?:'score'|'risk'|'open'}){
  const { trend } = useSentinel();
  return <div className="h-[230px] w-full" role="img" aria-label={`${mode} trend across September`}><ResponsiveContainer><AreaChart key={mode} data={trend} margin={{top:8,right:5,left:-22,bottom:0}}><defs><linearGradient id={`fill-${mode}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={css('success')} stopOpacity={.24}/><stop offset="100%" stopColor={css('success')} stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5"/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill:css('muted-foreground'),fontSize:10}} interval="preserveStartEnd"/><YAxis tickLine={false} axisLine={false} domain={mode==='score'?[40,90]:[0,80]} tick={{fill:css('muted-foreground'),fontSize:10}}/><Tooltip {...tooltip}/><Area dataKey={mode} type="monotone" stroke={css('success')} strokeWidth={2.5} fill={`url(#fill-${mode})`} dot={false} activeDot={{r:4}}/></AreaChart></ResponsiveContainer></div>
}

export function SeverityChart(){
  const { severityData } = useSentinel();
  const total = severityData.reduce((acc, curr) => acc + curr.value, 0);
  return <div className="flex min-h-[230px] flex-col items-center gap-4 sm:flex-row"><div className="relative h-[200px] w-full min-w-0 flex-none sm:min-w-[190px] sm:flex-1" role="img" aria-label={`Findings by severity`}><ResponsiveContainer><PieChart><Pie data={severityData} dataKey="value" innerRadius={66} outerRadius={86} paddingAngle={3} stroke="none">{severityData.map((_,i)=><Cell key={i} fill={colors[i]}/>)}</Pie><Tooltip {...tooltip}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl">{total}</strong><span className="text-[10px] text-muted-foreground">TOTAL FINDINGS</span></div></div><div className="w-full space-y-2 sm:w-[126px]">{severityData.map((d,i)=><div key={d.name} className="flex items-center justify-between gap-3 text-[11px]"><span className="flex items-center gap-2 text-muted-foreground"><i className="h-2 w-2 rounded-sm" style={{background:colors[i]}}/>{d.name}</span><span className="font-semibold">{d.value}</span></div>)}</div></div>
}

export function CategoryChart(){
  const { categories } = useSentinel();
  return <div className="h-[230px] w-full" role="img" aria-label="Vulnerabilities by category"><ResponsiveContainer><BarChart data={categories} layout="vertical" margin={{top:0,right:8,left:15,bottom:0}}><CartesianGrid horizontal={false} strokeDasharray="3 5"/><XAxis type="number" tickLine={false} axisLine={false} tick={{fill:css('muted-foreground'),fontSize:10}}/><YAxis dataKey="name" type="category" width={95} tickLine={false} axisLine={false} tick={{fill:css('muted-foreground'),fontSize:10}}/><Tooltip {...tooltip} cursor={false}/><Bar dataKey="count" fill={css('primary')} radius={[0,3,3,0]} barSize={13}/></BarChart></ResponsiveContainer></div>
}
