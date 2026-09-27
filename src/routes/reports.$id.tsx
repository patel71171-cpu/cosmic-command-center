import { createFileRoute } from '@tanstack/react-router';
import { ReportDetail } from '@/components/sentinel-pages';
export const Route = createFileRoute('/reports/$id')({
  head:()=>({meta:[
    {title:'Security Assessment Report — SENTINEL'},
    {name:'description',content:'Preview a professional evidence-backed security report.'},
    {property:'og:title',content:'Security Assessment Report — SENTINEL'},
    {property:'og:description',content:'Preview a professional evidence-backed security report.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><ReportDetail id={Route.useParams().id}/>,
});
