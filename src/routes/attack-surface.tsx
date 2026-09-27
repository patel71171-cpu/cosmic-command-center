import { createFileRoute } from '@tanstack/react-router';
import { AttackSurface } from '@/components/sentinel-pages';
export const Route = createFileRoute('/attack-surface')({
  head:()=>({meta:[
    {title:'Attack Surface Map — SENTINEL'},
    {name:'description',content:'Explore application assets, endpoints and dependencies.'},
    {property:'og:title',content:'Attack Surface Map — SENTINEL'},
    {property:'og:description',content:'Explore application assets, endpoints and dependencies.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><AttackSurface/>,
});
