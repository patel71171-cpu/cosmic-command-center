import { createFileRoute } from '@tanstack/react-router';
import { AssessmentDetail } from '@/components/sentinel-pages';
export const Route = createFileRoute('/assessments/$id')({
  head:()=>({meta:[
    {title:'Assessment Runner — SENTINEL'},
    {name:'description',content:'Review the assessment pipeline and coverage.'},
    {property:'og:title',content:'Assessment Runner — SENTINEL'},
    {property:'og:description',content:'Review the assessment pipeline and coverage.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><AssessmentDetail id={Route.useParams().id}/>,
});
