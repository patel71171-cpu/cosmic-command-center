import { createFileRoute } from '@tanstack/react-router';
import { SentinelOverview } from '@/components/sentinel-overview';
export const Route = createFileRoute('/dashboard')({
  head: () => ({ meta: [
    { title: 'Security Command Center — SENTINEL' },
    { name: 'description', content: 'Track security posture, threats, assessments, assets and findings in one command center.' },
    { property: 'og:title', content: 'Security Command Center — SENTINEL' },
    { property: 'og:description', content: 'Track security posture, threats, assessments, assets and findings in one command center.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: SentinelOverview,
});
