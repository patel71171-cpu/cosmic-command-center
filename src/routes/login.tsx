import { createFileRoute } from '@tanstack/react-router';
import { Login } from '@/components/sentinel-pages';
export const Route = createFileRoute('/login')({
  head:()=>({meta:[
    {title:'Demo Sign In — SENTINEL'},
    {name:'description',content:'Enter the SENTINEL security assessment demo.'},
    {property:'og:title',content:'Demo Sign In — SENTINEL'},
    {property:'og:description',content:'Enter the SENTINEL security assessment demo.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><Login/>,
});
