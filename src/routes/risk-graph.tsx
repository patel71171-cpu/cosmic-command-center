import { createFileRoute } from '@tanstack/react-router';
import { RiskGraph } from '@/components/sentinel-pages';
export const Route = createFileRoute('/risk-graph')({
  head:()=>({meta:[
    {title:'Security Risk Graph — SENTINEL'},
    {name:'description',content:'Trace relationships between assets, vulnerabilities and impact.'},
    {property:'og:title',content:'Security Risk Graph — SENTINEL'},
    {property:'og:description',content:'Trace relationships between assets, vulnerabilities and impact.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><RiskGraph/>,
});
