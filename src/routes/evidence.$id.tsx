import { createFileRoute } from '@tanstack/react-router';
import { EvidenceViewer } from '@/components/sentinel-pages';
export const Route = createFileRoute('/evidence/$id')({
  head:()=>({meta:[
    {title:'Evidence Viewer — SENTINEL'},
    {name:'description',content:'Inspect redacted evidence supporting a security finding.'},
    {property:'og:title',content:'Evidence Viewer — SENTINEL'},
    {property:'og:description',content:'Inspect redacted evidence supporting a security finding.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><EvidenceViewer id={Route.useParams().id}/>,
});
