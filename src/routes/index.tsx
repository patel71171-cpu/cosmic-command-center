import { createFileRoute, redirect } from '@tanstack/react-router';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'SENTINEL — Security Command Center' },
    { name: 'description', content: 'Explore the SENTINEL security operations command center.' },
    { property: 'og:title', content: 'SENTINEL — Security Command Center' },
    { property: 'og:description', content: 'Explore the SENTINEL security operations command center.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  beforeLoad: () => { throw redirect({ to: '/dashboard' }); },
});
