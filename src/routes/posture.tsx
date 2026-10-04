import { createFileRoute } from '@tanstack/react-router';
import { Posture } from '@/components/sentinel-pages';
export const Route = createFileRoute('/posture')({
  head:()=>({meta:[
    {title:'Security Posture — SENTINEL'},
    {name:'description',content:'See where exposure concentrates and what to fix first.'},
    {property:'og:title',content:'Security Posture — SENTINEL'},
    {property:'og:description',content:'See where exposure concentrates and what to fix first.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><Posture/>,
});
