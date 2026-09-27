import { createFileRoute } from '@tanstack/react-router';
import { Reports } from '@/components/sentinel-pages';
export const Route = createFileRoute('/reports/')({
  head:()=>({meta:[
    {title:'Security Reports — SENTINEL'},
    {name:'description',content:'Review security assessment reports and evidence.'},
    {property:'og:title',content:'Security Reports — SENTINEL'},
    {property:'og:description',content:'Review security assessment reports and evidence.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><Reports/>,
});
