import { createFileRoute } from '@tanstack/react-router';
import { Findings } from '@/components/sentinel-pages';
export const Route = createFileRoute('/findings/')({
  head:()=>({meta:[
    {title:'Findings Center — SENTINEL'},
    {name:'description',content:'Investigate evidence-backed security findings.'},
    {property:'og:title',content:'Findings Center — SENTINEL'},
    {property:'og:description',content:'Investigate evidence-backed security findings.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><Findings/>,
});
