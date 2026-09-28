import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage } from "@/components/marketing/MarketingPage";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "SENTINEL | Evidence-Driven Security Assessment" },
    { name: "description", content: "Discover risk, build evidence, remediate with confidence, and verify the result." },
    { property: "og:title", content: "SENTINEL | Evidence-Driven Security Assessment" },
    { property: "og:description", content: "Discover risk, build evidence, remediate with confidence, and verify the result." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MarketingPage,
});
