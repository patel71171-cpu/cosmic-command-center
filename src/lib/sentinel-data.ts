export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
export type Finding = { id: string; title: string; severity: Severity; cvss: number; confidence: string; category: string; asset: string; status: string; detected: string; summary: string; impact: string; fix: string; owner: string; evidence: string[]; assessment_id?: string; cvss_vector?: string; analysis?: string };
export type EvidenceItem = { id: string; type: string; time: string; source: string; confidence: string; finding: string; content: string; comparison?: string };
export type AssessmentEndpoint = { path: string; status: number; content_type?: string };
export type Assessment = { id: string; name: string; target: string; status: string; findings: number; score: number; progress: number; lastRun: string; risk_score?: number; scan_duration?: number; error_message?: string | null; completed_at?: string; methodology?: string; endpoints?: AssessmentEndpoint[] };

/**
 * The workspace is empty until the backend returns real records. Nothing here
 * is placeholder data — every row on screen comes from an actual assessment run.
 */
export const assessments: Assessment[] = [];
export const findings: Finding[] = [];
export const evidence: EvidenceItem[] = [];
