import { createFileRoute } from '@tanstack/react-router';
import { Posture } from '@/components/sentinel-pages';
export const Route = createFileRoute('/posture')({
  head:()=>({meta:[
    {title:'Security Posture — SENTINEL'},
    {name:'description',content:'Compare security posture before and after remediation.'},
    {property:'og:title',content:'Security Posture — SENTINEL'},
    {property:'og:description',content:'Compare security posture before and after remediation.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><Posture/>,
});
