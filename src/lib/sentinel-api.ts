/**
 * SENTINEL API Client
 * Connects the frontend to the FastAPI backend.
 */
import type { Assessment, AssessmentEndpoint, Finding, EvidenceItem } from './sentinel-data';

export type InvestigationReport = {
  executive_summary: string;
  why_it_matters: string;
  remediation: string;
  reproduction_steps: string[];
  technical_analysis: string;
  retest_checklist: string[];
};

const API_BASE = '/api';
const TOKEN_KEY = 'sentinel_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable (private mode) — session-only token
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options?.headers as Record<string, string>) || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = body.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
          : `API error: ${res.status}`;
    const error: any = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export interface ScanResult {
  target: string;
  scan_duration: number;
  scan_timestamp: string;
  risk_score: number;
  security_score: number;
  findings: Finding[];
  evidence: any[];
  assets: any[];
  endpoints: any[];
  headers: Record<string, string>;
  ssl_info: any;
  summary: {
    total_findings: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
    endpoints_discovered: number;
    assets_discovered: number;
  };
}

export interface AssessmentResult {
  id: string;
  name: string;
  target: string;
  status: string;
  findings: number;
  score: number;
  progress: number;
  lastRun: string;
  risk_score: number;
  scan_duration: number;
  summary: ScanResult['summary'];
}

interface RawAssessment {
  id: string;
  target_id?: string;
  target?: string;
  name: string;
  status: string;
  progress?: number;
  findings?: number;
  findings_count?: number;
  score?: number;
  security_score?: number;
  risk_score?: number;
  scan_duration?: number;
  created_at?: string;
  completed_at?: string;
  methodology?: string;
  last_run?: string;
  lastRun?: string;
  error_message?: string | null;
}

/** Backend status machine → UI display status */
function uiStatus(status?: string): string {
  if (!status) return 'Scheduled';
  const map: Record<string, string> = {
    DRAFT: 'Scheduled',
    SCANNING: 'Running',
    ANALYZING: 'Running',
    FINDINGS_READY: 'Completed',
    REMEDIATION: 'Completed',
    'RE-TESTING': 'Running',
    VERIFIED: 'Completed',
    FAILED: 'Failed',
    Completed: 'Completed',
    Running: 'Running',
    Scheduled: 'Scheduled',
  };
  return map[status] || status;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Normalise a backend assessment row into the shape the UI consumes. */
function mapAssessment(raw: RawAssessment): Assessment {
  let endpoints: AssessmentEndpoint[] | undefined;
  const rawEndpoints = (raw as { endpoints?: unknown }).endpoints;
  if (typeof rawEndpoints === 'string' && rawEndpoints) {
    try {
      const parsed = JSON.parse(rawEndpoints) as unknown;
      if (Array.isArray(parsed)) {
        endpoints = parsed
          .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
          .map((e) => ({
            path: String(e['path'] ?? '/'),
            status: Number(e['status'] ?? 0),
            content_type: typeof e['content_type'] === 'string' ? e['content_type'] : '',
          }));
      }
    } catch {
      endpoints = undefined;
    }
  } else if (Array.isArray(rawEndpoints)) {
    endpoints = rawEndpoints as AssessmentEndpoint[];
  }
  return {
    id: raw.id,
    name: raw.name,
    target: raw.target || raw.target_id || '—',
    status: uiStatus(raw.status),
    findings: raw.findings ?? raw.findings_count ?? 0,
    score: raw.score ?? raw.security_score ?? 0,
    progress: raw.progress ?? 0,
    lastRun: raw.lastRun || formatDate(raw.completed_at || raw.created_at || raw.last_run),
    risk_score: raw.risk_score ?? 0,
    scan_duration: raw.scan_duration ?? 0,
    error_message: raw.error_message ?? null,
    completed_at: raw.completed_at,
    methodology: raw.methodology,
    ...(endpoints ? { endpoints } : {}),
  } as Assessment;
}

interface RawFinding {
  id: string;
  assessment_id?: string;
  title: string;
  severity: string;
  cvss_score?: number;
  cvss?: number;
  cvss_vector?: string;
  confidence?: string;
  category?: string;
  asset?: string;
  status?: string;
  detected?: string;
  summary?: string;
  impact?: string;
  fix?: string;
  owner?: string;
  evidence?: string[];
  evidence_hashes?: string | null;
  remediation_status?: string;
  retest_status?: string;
  owasp_wstg?: string;
  owasp_api_top10?: string;
  source_tool?: string;
  cve_ids?: string | null;
  analysis?: string;
}

/** Normalise a backend finding row into the shape the UI consumes. */
function mapFinding(raw: RawFinding): Finding {
  return {
    id: raw.id,
    title: raw.title,
    severity: (raw.severity as Finding['severity']) || 'Informational',
    cvss: raw.cvss ?? raw.cvss_score ?? 0,
    confidence: raw.confidence || 'Medium',
    category: raw.category || 'General',
    asset: raw.asset || '—',
    status: raw.status || 'Open',
    detected: formatDate(raw.detected),
    summary: raw.summary || '',
    impact: raw.impact || '',
    fix: raw.fix || '',
    owner: raw.owner || 'Unassigned',
    evidence: raw.evidence || [],
    assessment_id: raw.assessment_id,
    remediation_status: raw.remediation_status,
    retest_status: raw.retest_status,
    owasp_wstg: raw.owasp_wstg,
    owasp_api_top10: raw.owasp_api_top10,
    source_tool: raw.source_tool,
    cvss_vector: raw.cvss_vector,
    analysis: raw.analysis,
  } as Finding;
}

/** Adapt a backend evidence row to the shape the evidence viewer renders. */
export function mapEvidence(raw: any): EvidenceItem {
  return {
    id: raw.id,
    type: raw.type || 'Evidence',
    time: raw.created_at ? formatDate(raw.created_at) : '—',
    source: raw.source || 'Unknown source',
    confidence: raw.confidence || 'Medium',
    finding: raw.finding_id || '',
    content: raw.content || '',
    ...(raw.comparison ? { comparison: String(raw.comparison) } : {}),
  };
}

export const api = {
  // Health check
  health: () => request<{ status: string }>('/health'),

  // Authenticate and store the bearer token
  login: async (email: string, password: string) => {
    const res = await request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.access_token);
    return res.user;
  },

  logout: () => setToken(null),

  // Scan a target
  scan: (target: string, checks?: string[]) =>
    request<ScanResult>('/scan', {
      method: 'POST',
      body: JSON.stringify({ target, checks }),
    }),

  // Create and run assessment
  createAssessment: async (data: {
    name: string;
    target: string;
    environment?: string;
    scope?: string;
    checks?: string[];
    description?: string | undefined;
    authorized?: boolean;
    authorization_ref?: string | undefined;
  }): Promise<Assessment> => {
    const raw = await request<RawAssessment>('/assessments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return mapAssessment(raw);
  },

  // List assessments
  listAssessments: async (): Promise<Assessment[]> => {
    const rows = await request<RawAssessment[]>('/assessments/');
    return rows.map(mapAssessment);
  },

  // Get assessment details
  getAssessment: async (id: string): Promise<Assessment> => {
    const raw = await request<RawAssessment>(`/assessments/${id}`);
    return mapAssessment(raw);
  },

  // Poll assessment status while a scan runs
  getAssessmentStatus: (id: string) =>
    request<{ id: string; status: string; progress: number; findings_count: number; risk_score: number }>(
      `/assessments/${id}/status`,
    ),

  // Trigger the scan pipeline for an assessment
  runAssessment: (id: string) =>
    request<{ detail: string; assessment_id: string }>(`/assessments/${id}/run`, { method: 'POST' }),

  // List findings
  listFindings: async (assessmentId?: string): Promise<Finding[]> => {
    const query = assessmentId ? `?assessment_id=${assessmentId}` : '';
    const rows = await request<RawFinding[]>(`/findings/${query}`);
    return rows.map(mapFinding);
  },

  // Get finding details
  getFinding: async (id: string): Promise<Finding> => {
    const raw = await request<RawFinding>(`/findings/${id}`);
    return mapFinding(raw);
  },

  // Update finding
  updateFinding: async (id: string, patch: { status?: string; owner?: string }): Promise<Finding> => {
    const raw = await request<RawFinding>(`/findings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return mapFinding(raw);
  },

  // Get evidence
  getEvidence: (id: string) => request<any>(`/evidence/${id}`),

  // Get every evidence artifact attached to a finding
  getFindingEvidence: async (findingId: string): Promise<EvidenceItem[]> => {
    const rows = await request<any[]>(`/findings/${findingId}/evidence`);
    return rows.map(mapEvidence);
  },

  // AI Copilot — proxied to the locally hosted Ollama model
  copilotChat: (message: string, history: { role: string; content: string }[] = []) =>
    request<{ reply: string; model: string }>('/copilot/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    }),

  // Generate an executive summary / remediation plan for a finding
  investigateFinding: (id: string, message?: string) =>
    request<InvestigationReport>(`/findings/${id}/investigate`, {
      method: 'POST',
      body: JSON.stringify({ message: message ?? '' }),
    }),

  // List assets
  listAssets: (assessmentId?: string) =>
    request<any[]>(`/assets${assessmentId ? `?assessment_id=${assessmentId}` : ''}`),

  // Retest assessment
  retestAssessment: (id: string) =>
    request<any>(`/assessments/${id}/retest`, { method: 'POST' }),

  // Get stats
  getStats: () =>
    request<{
      total_assessments: number;
      total_findings: number;
      open_findings: number;
      verified_findings: number;
      severity_counts: Record<string, number>;
    }>('/stats'),
};
