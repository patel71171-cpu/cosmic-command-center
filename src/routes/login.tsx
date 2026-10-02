import { createFileRoute } from '@tanstack/react-router';
import { Login } from '@/components/sentinel-pages';
export const Route = createFileRoute('/login')({
  head:()=>({meta:[
    {title:'Sign In — SENTINEL'},
    {name:'description',content:'Enter the SENTINEL security assessment platform.'},
    {property:'og:title',content:'Sign In — SENTINEL'},
    {property:'og:description',content:'Enter the SENTINEL security assessment platform.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><Login/>,
});
