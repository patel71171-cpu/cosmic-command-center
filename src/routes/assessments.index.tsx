import { createFileRoute } from '@tanstack/react-router';
import { Assessments } from '@/components/sentinel-pages';
export const Route = createFileRoute('/assessments/')({
  head:()=>({meta:[
    {title:'Security Assessments — SENTINEL'},
    {name:'description',content:'Track application security assessments and their outcomes.'},
    {property:'og:title',content:'Security Assessments — SENTINEL'},
    {property:'og:description',content:'Track application security assessments and their outcomes.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><Assessments/>,
});
