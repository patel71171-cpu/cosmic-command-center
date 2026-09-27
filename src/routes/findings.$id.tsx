import { createFileRoute } from '@tanstack/react-router';
import { FindingDetail } from '@/components/sentinel-pages';
export const Route = createFileRoute('/findings/$id')({
  head:()=>({meta:[
    {title:'Finding Investigation — SENTINEL'},
    {name:'description',content:'Inspect evidence, risk, impact and fixes for a security finding.'},
    {property:'og:title',content:'Finding Investigation — SENTINEL'},
    {property:'og:description',content:'Inspect evidence, risk, impact and fixes for a security finding.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><FindingDetail id={Route.useParams().id}/>,
});
