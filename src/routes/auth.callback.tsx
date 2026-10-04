import { createFileRoute } from '@tanstack/react-router';
import { GoogleCallback } from '@/components/sentinel-pages';
export const Route = createFileRoute('/auth/callback')({
  head:()=>({meta:[
    {title:'Signing In — SENTINEL'},
    {name:'description',content:'Completing sign in with Google.'},
    {name:'robots',content:'noindex'},
  ]}),
  component:()=><GoogleCallback/>,
});