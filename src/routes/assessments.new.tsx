import { createFileRoute } from '@tanstack/react-router';
import { NewAssessment } from '@/components/sentinel-pages';
export const Route = createFileRoute('/assessments/new')({
  head:()=>({meta:[
    {title:'Create New Assessment — SENTINEL'},
    {name:'description',content:'Configure an authorized security assessment.'},
    {property:'og:title',content:'Create New Assessment — SENTINEL'},
    {property:'og:description',content:'Configure an authorized security assessment.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><NewAssessment/>,
});
