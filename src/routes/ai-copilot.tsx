import { createFileRoute } from '@tanstack/react-router';
import { Copilot } from '@/components/sentinel-pages';
export const Route = createFileRoute('/ai-copilot')({
  head:()=>({meta:[
    {title:'AI Security Copilot — SENTINEL'},
    {name:'description',content:'Explore security explanations and suggestions.'},
    {property:'og:title',content:'AI Security Copilot — SENTINEL'},
    {property:'og:description',content:'Explore security explanations and suggestions.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><Copilot/>,
});
