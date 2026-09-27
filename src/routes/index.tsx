import { createFileRoute } from "@tanstack/react-router";
import { CommandDashboard } from "@/components/command-dashboard";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Security Command Center — SENTINEL" },
    { name: "description", content: "Monitor security posture, findings, assets, and assessments in one command center." },
    { property: "og:title", content: "Security Command Center — SENTINEL" },
    { property: "og:description", content: "Monitor security posture, findings, assets, and assessments in one command center." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CommandDashboard,
});
