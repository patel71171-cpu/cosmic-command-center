import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/components/sentinel-pages';
export const Route = createFileRoute('/settings')({
  head:()=>({meta:[
    {title:'Settings — SENTINEL'},
    {name:'description',content:'Manage SENTINEL preferences.'},
    {property:'og:title',content:'Settings — SENTINEL'},
    {property:'og:description',content:'Manage SENTINEL preferences.'},
    {property:'og:type',content:'website'},
    {name:'twitter:card',content:'summary_large_image'}
  ]}),
  component:()=><SettingsPage/>,
});
