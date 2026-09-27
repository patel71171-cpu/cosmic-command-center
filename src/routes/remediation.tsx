import { createFileRoute } from '@tanstack/react-router';
import { Remediation } from '@/components/sentinel-pages';
export const Route = createFileRoute('/remediation')({
  head:()=>({meta:[
    {title:'Remediation Center — SENTINEL'},
    {name:'description',content:'Track fixes, ownership and verification.'},
    {property:'og:title',content:'Remediation Center — SENTINEL'},
    {property:'og:description',content:'Track fixes, ownership and verification.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><Remediation/>,
});
