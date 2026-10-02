import type { Assessment, AssessmentEndpoint, Finding } from './sentinel-data';
import type { GraphEdgeInput, GraphNodeInput } from '@/components/sentinel-graph';

/**
 * Build the attack-surface graph for ONE assessment as its application workflow:
 *
 *   target (root) → discovered pages/endpoints → findings (the problems)
 *
 * Endpoints come from the scanner's discovery phase; findings attach to the page
 * whose path they were recorded against (or to the root when they describe the
 * target itself). Risk on every node derives from real CVSS scores.
 */

const MAX_ENDPOINTS = 14;
const MAX_FINDINGS = 24;

function assetPath(asset: string, target: string): string {
  if (!asset || asset === target) return '/';
  try {
    const base = new URL(target);
    const url = new URL(asset, base.origin);
    if (url.origin === base.origin) return url.pathname || '/';
  } catch {
    // asset is already a bare path
  }
  return asset.startsWith('/') ? asset : `/${asset}`;
}

function stateForSeverity(severity: string): string {
  if (severity === 'Critical') return 'Critical';
  if (severity === 'High') return 'Vulnerable';
  return 'Warning';
}

export function buildAttackGraph(
  allFindings: Finding[],
  assessments: Assessment[],
  assessmentId?: string,
) {
  const active = assessmentId
    ? (assessments.find((a) => a.id === assessmentId) ?? assessments[0])
    : assessments[0];
  if (!active) return { nodes: [] as GraphNodeInput[], edges: [] as GraphEdgeInput[], assessment: undefined };

  const findings = allFindings
    .filter((f) => !f.assessment_id || f.assessment_id === active.id)
    .slice(0, MAX_FINDINGS);

  const nodes: GraphNodeInput[] = [];
  const edges: GraphEdgeInput[] = [];
  const rootId = 'target-root';

  nodes.push({
    id: rootId,
    label: active.target,
    type: 'Application',
    state: active.status === 'Running' ? 'Warning' : 'Secure',
    risk: Math.round(active.risk_score ?? 0),
    findings: findings.length,
    x: 0,
    y: 300,
  });

  // ── Layer 1: discovered pages ──────────────────────────────────────────
  const endpoints: AssessmentEndpoint[] = [...(active.endpoints ?? [])]
    .sort((a, b) => {
      const interesting = (s: number) => (s !== 404 ? 0 : 1);
      return interesting(a.status) - interesting(b.status) || a.path.localeCompare(b.path);
    })
    .slice(0, MAX_ENDPOINTS);

  // Group findings by the page they belong to.
  const byPage = new Map<string, Finding[]>();
  const pageKey = (f: Finding) => assetPath(f.asset || '', active.target);
  for (const f of findings) {
    const key = pageKey(f);
    const rows = byPage.get(key);
    if (rows) rows.push(f);
    else byPage.set(key, [f]);
  }

  // Pages that have findings but were not in the discovery list still appear.
  for (const key of byPage.keys()) {
    if (key !== '/' && !endpoints.some((e) => e.path === key)) {
      endpoints.push({ path: key, status: 0 });
    }
  }

  const pageNodeId = (path: string, i: number) =>
    `page-${i}-${path.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase() || 'root'}`;

  const layer1Y = (i: number, n: number) => 60 + i * Math.max(130, 640 / Math.max(n, 1));

  endpoints.forEach((ep, i) => {
    const rows = byPage.get(ep.path) ?? [];
    const worst = rows.reduce((m, f) => Math.max(m, f.cvss), 0);
    const id = pageNodeId(ep.path, i);
    nodes.push({
      id,
      label: ep.path,
      type: 'Endpoint',
      state: rows.length
        ? stateForSeverity(rows.sort((a, b) => b.cvss - a.cvss)[0]?.severity ?? 'Low')
        : ep.status !== 0 && ep.status < 400
          ? 'Secure'
          : 'Warning',
      risk: rows.length ? Math.round(worst * 10) : ep.status !== 0 && ep.status < 400 ? 8 : 25,
      findings: rows.length,
      x: 330,
      y: layer1Y(i, endpoints.length),
    });
    edges.push([rootId, id]);
  });

  // ── Layer 2: the problems ──────────────────────────────────────────────
  let fi = 0;
  byPage.forEach((rows, path) => {
    const parentIdx = endpoints.findIndex((e) => e.path === path);
    const parentId = path === '/' ? rootId : pageNodeId(path, parentIdx);
    rows
      .sort((a, b) => b.cvss - a.cvss)
      .forEach((f) => {
        const id = `finding-${f.id.slice(0, 8)}`;
        nodes.push({
          id,
          label: f.title.length > 42 ? `${f.title.slice(0, 41)}…` : f.title,
          type: 'Finding',
          state: stateForSeverity(f.severity),
          risk: Math.round(f.cvss * 10),
          findings: 1,
          x: 660,
          y: 40 + fi * 120,
          detail: f.id,
        });
        edges.push([parentId, id]);
        fi += 1;
      });
  });

  return { nodes, edges, assessment: active };
}
