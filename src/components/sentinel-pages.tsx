import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Target,
  TriangleAlert,
  Clock,
  ExternalLink,
  Search,
  Copy,
  Maximize2,
  GitBranch,
  Sparkles,
  Play,
  Check,
  Wrench,
  Filter as FilterIcon,
} from "lucide-react";
import { useSentinel } from "@/lib/sentinel-store";
import { api, mapEvidence, type InvestigationReport } from "@/lib/sentinel-api";
import {
  findings as seedFindings,
  assessments as seedAssessments,
  evidence,
  type Finding,
  type Assessment,
  type EvidenceItem,
} from "@/lib/sentinel-data";
import {
  Badge,
  PageHeading,
  Panel,
  Metric,
  SearchField,
  Filter,
  Empty,
  SectionLink,
  Action,
  severityColor,
} from "./sentinel-ui";
import { TrendChart, SeverityChart, CategoryChart } from "./sentinel-charts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GraphView } from "./sentinel-graph";
import { buildAttackGraph } from "@/lib/sentinel-graph-data";
import { exportFindingPdf, exportFindingsPdf, exportReportPdf } from "@/lib/sentinel-pdf";
const table = "w-full text-left text-xs";
const th = "border-b border-border px-4 py-3 font-medium text-muted-foreground";
const td = "border-b border-border/60 px-4 py-3.5 align-middle";
export function Assessments() {
  const { assessments } = useSentinel();
  const [q, setQ] = useState(""),
    [status, setStatus] = useState("All"),
    [risk, setRisk] = useState("All");
  const rows = assessments.filter(
    (a) =>
      `${a.name} ${a.target}`.toLowerCase().includes(q.toLowerCase()) &&
      (status === "All" || a.status === status) &&
      (risk === "All" ||
        (risk === "High"
          ? a.score < 70
          : risk === "Medium"
            ? a.score >= 70 && a.score < 85
            : a.score >= 85)),
  );
  return (
    <>
      <PageHeading
        title="Security Assessments"
        description="Track assessment coverage, execution, and outcomes across your applications."
        actions={
          <Button size="sm" asChild className="h-9 gap-2 text-xs">
            <Link to="/assessments/new">
              <Plus size={14} />
              New Assessment
            </Link>
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total Assessments" value={assessments.length} icon={ScanIcon} />
        <Metric
          label="Completed"
          value={assessments.filter((a) => a.status === "Completed").length}
          icon={CheckCircle2}
          tone="success"
        />
        <Metric
          label="In Progress"
          value={assessments.filter((a) => a.status === "Running").length}
          icon={Activity}
        />
        <Metric label="Assets Covered" value="48" icon={Target} tone="violet" />
      </div>
      <Panel title="Assessment Portfolio" sub={`${rows.length} assessments shown`}>
        <div className="mb-5 flex flex-wrap gap-2">
          <div className="w-full sm:w-64">
            <SearchField value={q} onChange={setQ} placeholder="Search assessments or targets" />
          </div>
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={["Completed", "Running", "Scheduled", "Failed", "Draft"]}
          />
          <Filter
            label="Risk"
            value={risk}
            onChange={setRisk}
            options={["High", "Medium", "Low"]}
          />
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className={`${table} min-w-[760px]`}>
              <thead>
                <tr>
                  {[
                    "Assessment",
                    "Target",
                    "Status",
                    "Findings",
                    "Risk Score",
                    "Progress",
                    "Last Run",
                    "",
                  ].map((x, i) => (
                    <th className={th} key={i}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="hover:bg-panel-hover">
                    <td className={`${td} font-medium`}>
                      <Link
                        to="/assessments/$id"
                        params={{ id: a.id }}
                        className="hover:text-primary"
                      >
                        {a.name}
                      </Link>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{a.target}</td>
                    <td className={td}>
                      <Badge tone={a.status}>{a.status}</Badge>
                    </td>
                    <td className={td}>{a.findings}</td>
                    <td className={td}>
                      <span className={a.score < 70 ? "text-high" : "text-success"}>
                        {a.score}/100
                      </span>
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded bg-secondary">
                          <div
                            className="h-full rounded bg-primary"
                            style={{ width: `${a.progress}%` }}
                          />
                        </div>
                        {a.progress}%
                      </div>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{a.lastRun}</td>
                    <td className={td}>
                      <SectionLink to="/assessments/$id" params={{ id: a.id }}>
                        Open
                      </SectionLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
    </>
  );
}
const ScanIcon = Target;
export function NewAssessment() {
  const navigate = useNavigate();
  const { addAssessment, notify, runScan, loading } = useSentinel();
  const [step, setStep] = useState(0),
    [name, setName] = useState(""),
    [target, setTarget] = useState(""),
    [url, setUrl] = useState(""),
    [environment, setEnvironment] = useState("Staging"),
    [description, setDescription] = useState(""),
    [scope, setScope] = useState("Web Application"),
    [checks, setChecks] = useState([
      "Authentication",
      "Authorization",
      "API Security",
      "Dependencies",
    ]),
    [authorized, setAuthorized] = useState(false);
  const steps = [
    "Assessment Details",
    "Target Scope",
    "Security Checks",
    "Assessment Rules",
    "Review & Start",
  ];
  const submit = async (status: string) => {
    if (!name.trim()) {
      notify("Add an assessment name first.");
      setStep(0);
      return;
    }
    if (status === "Running") {
      const scanTarget = url || target;
      if (!scanTarget.startsWith("http://") && !scanTarget.startsWith("https://")) {
        notify("Please enter a valid target URL (starting with http:// or https://)");
        setStep(0);
        return;
      }
      notify("Starting security scan...");
      const id = await runScan(scanTarget, name, {
        authorized,
        description,
        environment,
        scope,
        checks,
      });
      if (id) {
        navigate({ to: "/assessments/$id", params: { id } });
      }
      return;
    }
    const id = `assessment-${Date.now()}`;
    addAssessment({
      id,
      name,
      target: target || url || "Unspecified target",
      status,
      findings: 0,
      score: 0,
      progress: 0,
      lastRun: "27 Sep 2026",
    });
    notify("Assessment saved as a draft.");
    navigate({ to: "/assessments/$id", params: { id } });
  };
  return (
    <>
      <PageHeading
        title="Create New Assessment"
        description="Configure the scope and checks for an authorized assessment."
      />
      <div className="mb-6 grid grid-cols-5 gap-1">
        {steps.map((s, i) => (
          <Button
            key={s}
            variant="ghost"
            onClick={() => setStep(i)}
            className={`h-auto min-w-0 flex-col gap-1 rounded-none border-b-2 px-1 py-3 text-[10px] sm:text-xs ${i === step ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            <span className="hidden sm:inline">0{i + 1} / </span>
            {s}
          </Button>
        ))}
      </div>
      <Panel title={steps[step] ?? "Assessment Details"} className="max-w-3xl">
        <div className="min-h-[290px] space-y-5">
          {step === 0 && (
            <>
              <Field
                label="Assessment name"
                value={name}
                set={setName}
                placeholder="e.g. Public Site Baseline Assessment"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Target application"
                  value={target}
                  set={setTarget}
                  placeholder="https://example.com"
                />
                <Field
                  label="Target URL"
                  value={url}
                  set={setUrl}
                  placeholder="https://example.local"
                />
              </div>
              <label className="block text-xs">
                Environment
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="mt-2 block h-10 w-full rounded-md border border-border bg-secondary px-3"
                >
                  <option>Staging</option>
                  <option>Production</option>
                  <option>Development</option>
                </select>
              </label>
              <label className="block text-xs">
                Description
                <Textarea
                  className="mt-2 bg-secondary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Assessment goals and context"
                />
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                Select the area that this assessment covers.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {["Web Application", "API", "Repository", "Dependencies"].map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    className={`h-14 justify-start ${scope === s ? "border-primary bg-accent text-primary" : ""}`}
                    onClick={() => setScope(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <div className="rounded-md border border-border bg-secondary p-4 text-xs text-muted-foreground">
                Target: {target || url || "Not specified"} · Environment: {environment}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Choose which security categories are included in the assessment.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Authentication",
                  "Authorization",
                  "Input Validation",
                  "API Security",
                  "Client Security",
                  "Configuration",
                  "Dependencies",
                  "Data Exposure",
                ].map((s) => (
                  <label
                    key={s}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-secondary p-3 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checks.includes(s)}
                      onChange={() =>
                        setChecks((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))
                      }
                      className="accent-primary"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="rounded-md border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed text-muted-foreground">
                <strong className="mb-2 block text-foreground">Authorization and scope</strong>This
                assessment will run real security checks against the target. Confirm written
                authorization and keep all activity inside the agreed scope.
              </div>
              <label className="flex items-center gap-3 text-xs">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="accent-primary"
                />
                I confirm this is an authorized assessment scope.
              </label>
            </>
          )}
          {step === 4 && (
            <div className="space-y-3">
              {[
                ["Assessment", name || "Untitled"],
                ["Target", target || url || "Not specified"],
                ["Environment", environment],
                ["Scope", scope],
                ["Security checks", checks.join(", ") || "None selected"],
                ["Authorization", authorized ? "Confirmed" : "Not confirmed"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[120px_1fr] gap-4 border-b border-border py-3 text-xs"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span>{value}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Starting this assessment will run a real security scan against the target URL.
              </p>
            </div>
          )}
        </div>
        <div className="mt-7 flex flex-wrap justify-between gap-2 border-t border-border pt-5">
          <Action onClick={() => submit("Draft")}>Save Draft</Action>
          <div className="flex gap-2">
            {step > 0 && <Action onClick={() => setStep((v) => v - 1)}>Back</Action>}
            {step < 4 ? (
              <Action variant="default" onClick={() => setStep((v) => v + 1)}>
                Continue
              </Action>
            ) : (
              <Action
                variant="default"
                icon={Play}
                disabled={!authorized || loading}
                onClick={() => submit("Running")}
              >
                {loading ? "Scanning..." : "Start Assessment"}
              </Action>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}
function Field({
  label,
  value,
  set,
  placeholder,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-xs">
      {label}
      <Input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="mt-2 border-border bg-secondary"
      />
    </label>
  );
}
export function AssessmentDetail({ id }: { id: string }) {
  const { assessments, findings, notify, refreshData } = useSentinel();
  const a = assessments.find((x) => x.id === id);

  // Live poll while the background scan is running
  useEffect(() => {
    if (!a) return;
    if (a.status !== "Running" && a.progress >= 100) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const status = await api.getAssessmentStatus(id);
        if (cancelled) return;
        if (status.status !== "SCANNING" && status.status !== "ANALYZING") {
          clearInterval(timer);
        }
        await refreshData();
      } catch {
        clearInterval(timer);
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [a?.status, a?.progress, id]);

  if (!a) return <Empty text="Assessment not found" />;
  const pipeline = [
    "Scope Validation",
    "Asset Discovery",
    "Security Headers",
    "SSL/TLS Analysis",
    "Endpoint Discovery",
    "Information Disclosure",
    "CORS Analysis",
    "Dependency Analysis",
    "Risk Calculation",
  ];
  const assessmentFindings = findings.filter((f) => (f as any).assessment_id === id);
  const criticalCount = assessmentFindings.filter((f) => f.severity === "Critical").length;
  const highCount = assessmentFindings.filter((f) => f.severity === "High").length;
  return (
    <>
      <PageHeading
        eyebrow="ASSESSMENTS / EXECUTION"
        title={a.name}
        description={`${a.target} · ${a.status === "Running" ? "Scan in progress" : "Assessment run details"}`}
        actions={
          <>
            <Action
              icon={Download}
              onClick={() => notify("Assessment summary exported.")}
            >
              Export Summary
            </Action>
            <Button size="sm" asChild className="h-9 text-xs">
              <Link to="/findings">
                Explore Findings <ArrowRight size={14} />
              </Link>
            </Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Completion" value={`${a.progress}%`} icon={Activity} />
        <Metric label="Findings" value={a.findings} icon={ShieldAlert} tone="critical" />
        <Metric label="Security Score" value={`${a.score}/100`} icon={ShieldCheck} tone="success" />
        <Metric label="Last Run" value={a.lastRun} icon={Clock} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Assessment Pipeline"
          sub="Security scan processing stages"
        >
          <div className="space-y-0">
            {pipeline.map((p, i) => {
              const done = i < Math.floor((a.progress / 100) * pipeline.length);
              return (
                <div
                  key={p}
                  className="flex items-center gap-4 border-l border-border pb-6 pl-5 last:pb-0"
                >
                  <div
                    className={`-ml-[29px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 border-panel ${done ? "bg-success text-background" : "bg-secondary text-muted-foreground"}`}
                  >
                    {done ? (
                      <Check size={11} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 text-xs">
                    <span>{p}</span>
                    <Badge
                      tone={
                        done
                          ? "Completed"
                          : i === Math.floor((a.progress / 100) * pipeline.length)
                            ? "Running"
                            : "neutral"
                      }
                    >
                      {done
                        ? "Completed"
                        : i === Math.floor((a.progress / 100) * pipeline.length)
                          ? "Running"
                          : "Pending"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel title="Current Activity">
            <div className="rounded-md border border-border bg-secondary p-4 text-xs text-muted-foreground">
              {a.status === "Running"
                ? "Assessment in progress. Real security scan running against target."
                : `Assessment completed. ${assessmentFindings.length} findings discovered with real evidence.`}
            </div>
            <div className="mt-5 space-y-3 text-xs">
              {[
                ["Critical findings", String(criticalCount)],
                ["High findings", String(highCount)],
                ["Total findings", String(assessmentFindings.length)],
                ["Risk Score", `${a.risk_score || "N/A"}/100`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Scan Details">
            <div className="space-y-3 font-mono text-[11px] text-muted-foreground">
              <div>Target: {a.target}</div>
              <div>Status: {a.status}</div>
              <div>Duration: {a.scan_duration ? `${a.scan_duration}s` : "N/A"}</div>
              <div>Score: {a.score}/100</div>
            </div>
          </Panel>
          <Panel title="Next Step">
            <div className="flex flex-wrap gap-3">
              <SectionLink to="/attack-surface">Explore attack surface</SectionLink>
              <SectionLink to="/findings">Investigate findings</SectionLink>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
function AssessmentPicker() {
  const { assessments, selectedAssessment, setSelectedAssessment } = useSentinel();
  if (!assessments.length) return null;
  return (
    <select
      aria-label="Assessment shown"
      className="h-9 max-w-[220px] rounded-md border border-border bg-secondary px-2 text-xs text-foreground"
      value={assessments.some((a) => a.id === selectedAssessment) ? selectedAssessment : (assessments[0]?.id ?? '')}
      onChange={(e) => setSelectedAssessment(e.target.value)}
    >
      {assessments.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}
export function AttackSurface() {
  const { findings, assessments, selectedAssessment } = useSentinel();
  const active =
    assessments.find((a) => a.id === selectedAssessment) ?? assessments[0];
  const scoped = active
    ? findings.filter((f) => !f.assessment_id || f.assessment_id === active.id)
    : [];
  const graph = useMemo(
    () => buildAttackGraph(findings, assessments, active?.id),
    [findings, assessments, active?.id],
  );
  const pages = graph.nodes.filter((n) => n.type === 'Endpoint').length;
  const problems = graph.nodes.filter((n) => n.type === 'Finding').length;
  const exposed = graph.nodes.filter((n) => n.state === 'Critical' || n.state === 'Vulnerable').length;
  return (
    <>
      <PageHeading
        title="Attack Surface Map"
        description={
          active
            ? `Application workflow for ${active.target} — pages reached, then the problems found on each page.`
            : 'Run an assessment to map an application.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AssessmentPicker />
            <SectionLink to="/risk-graph">View risk relationships</SectionLink>
          </div>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Workflow Pages" value={String(pages)} icon={Target} />
        <Metric label="Problems Found" value={String(problems)} icon={Activity} />
        <Metric
          label="Total Findings"
          value={String(scoped.length)}
          icon={GitBranch}
          tone="violet"
        />
        <Metric
          label="Exposed Nodes"
          value={String(exposed)}
          icon={ShieldAlert}
          tone="critical"
        />
      </div>
      <GraphView
        nodes={graph.nodes}
        edges={graph.edges}
        findings={scoped}
        assessmentName={active?.name ?? ''}
      />
    </>
  );
}
export function RiskGraph() {
  const { findings, assessments, selectedAssessment } = useSentinel();
  const active =
    assessments.find((a) => a.id === selectedAssessment) ?? assessments[0];
  const scoped = active
    ? findings.filter((f) => !f.assessment_id || f.assessment_id === active.id)
    : [];
  const graph = useMemo(
    () => buildAttackGraph(findings, assessments, active?.id),
    [findings, assessments, active?.id],
  );
  const highRisk = scoped.filter((f) => f.severity === "Critical" || f.severity === "High");
  const critical = scoped.filter((f) => f.severity === "Critical").length;
  const exposed = new Set(scoped.map((f) => f.asset).filter(Boolean)).size;
  const riskyDeps = highRisk.filter((f) => /depend/i.test(f.category || "")).length;
  return (
    <>
      <PageHeading
        title="Security Risk Graph"
        description={
          active
            ? `Risk workflow for ${active.target} — follow the path from the target through exposed pages to each finding.`
            : 'Trace the path from exposed assets through vulnerabilities to business impact.'
        }
        actions={<AssessmentPicker />}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Risk Concentration"
          value={`${scoped.length ? Math.round((highRisk.length / scoped.length) * 100) : 0}%`}
          icon={Target}
          tone="critical"
        />
        <Metric label="Critical Paths" value={String(critical)} icon={GitBranch} tone="high" />
        <Metric label="Exposed Assets" value={String(exposed)} icon={ShieldAlert} />
        <Metric
          label="High-risk Dependencies"
          value={String(riskyDeps)}
          icon={Activity}
          tone="violet"
        />
      </div>
      <GraphView
        nodes={graph.nodes}
        edges={graph.edges}
        riskGraph
        defaultRiskOnly
        findings={scoped}
        assessmentName={active?.name ?? ''}
      />
    </>
  );
}
export function Findings() {
  const { findings } = useSentinel();
  const [q, setQ] = useState(""),
    [severity, setSeverity] = useState("All"),
    [category, setCategory] = useState("All"),
    [status, setStatus] = useState("All"),
    [confidence, setConfidence] = useState("All");
  const rows = findings.filter(
    (f) =>
      `${f.title} ${f.id} ${f.asset}`.toLowerCase().includes(q.toLowerCase()) &&
      (severity === "All" || severity === f.severity) &&
      (category === "All" || category === f.category) &&
      (status === "All" || status === f.status) &&
      (confidence === "All" || confidence === f.confidence),
  );
  return (
    <>
      <PageHeading
        title="Findings Center"
        description="Investigate vulnerabilities with traceable evidence and clear remediation context."
        actions={
          <Action
            icon={Download}
            onClick={() =>
              exportFindingsPdf(
                'Findings Center',
                `${rows.length} of ${findings.length} findings · exported from live workspace`,
                rows,
              )
            }
          >
            Export PDF
          </Action>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {(
          ["Critical", "High", "Medium", "Low", "Informational"] as const
        ).map((name) => (
          <div key={name} className="panel p-4">
            <div
              className={`text-xs font-medium ${severityColor[name]}`}
            >
              {name}
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">
              {findings.filter((f) => f.severity === name).length}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">total findings</div>
          </div>
        ))}
      </div>
      <Panel
        title="All Findings"
        sub={`${rows.length} of ${findings.length} featured findings shown`}
      >
        <div className="mb-5 flex flex-wrap gap-2">
          <div className="w-full sm:w-60">
            <SearchField value={q} onChange={setQ} placeholder="Search findings or assets" />
          </div>
          <Filter
            label="Severity"
            value={severity}
            onChange={setSeverity}
            options={["Critical", "High", "Medium", "Low", "Informational"]}
          />
          <Filter
            label="Category"
            value={category}
            onChange={setCategory}
            options={[...new Set(findings.map((f) => f.category))]}
          />
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={["Open", "Validated", "In progress", "Verified"]}
          />
          <Filter
            label="Confidence"
            value={confidence}
            onChange={setConfidence}
            options={["High", "Medium", "Low"]}
          />
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className={`${table} w-full`}>
              <thead>
                <tr>
                  {[
                    "Finding",
                    "Severity",
                    "CVSS",
                    "Confidence",
                    "Category",
                    "Asset",
                    "Status",
                    "Detected",
                    "",
                  ].map((x, i) => (
                    <th key={i} className={`${th} whitespace-nowrap`}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id} className="hover:bg-panel-hover">
                    <td className={`${td} min-w-[200px]`}>
                      <Link
                        to="/findings/$id"
                        params={{ id: f.id }}
                        className="font-semibold break-words hover:text-primary"
                      >
                        {f.title}
                      </Link>
                      <div
                        className="mt-1 max-w-[220px] truncate text-[10px] text-muted-foreground"
                        title={f.id}
                      >
                        {f.id}
                      </div>
                    </td>
                    <td className={td}>
                      <Badge tone={f.severity}>{f.severity}</Badge>
                    </td>
                    <td className={`${td} font-semibold`}>{f.cvss}</td>
                    <td className={td}>
                      <span className="text-muted-foreground">{f.confidence}</span>
                    </td>
                    <td className={td}>{f.category}</td>
                    <td className={`${td} max-w-[140px] truncate text-muted-foreground`}>
                      {f.asset}
                    </td>
                    <td className={td}>
                      <Badge tone={f.status}>{f.status}</Badge>
                    </td>
                    <td className={`${td} text-muted-foreground`}>{f.detected}</td>
                    <td className={td}>
                      <SectionLink to="/findings/$id" params={{ id: f.id }}>
                        Investigate
                      </SectionLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
    </>
  );
}
export function FindingDetail({ id }: { id: string }) {
  const { findings, assessments, updateFinding, notify } = useSentinel();
  const f = findings.find((x) => x.id === id);
  const active = assessments.find((a) => a.id === f?.assessment_id) ?? assessments[0];
  const navigate = useNavigate();
  const [assign, setAssign] = useState(false),
    [owner, setOwner] = useState(f?.owner || "Unassigned");
  const [evItems, setEvItems] = useState<EvidenceItem[]>([]);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [question, setQuestion] = useState("");
  useEffect(() => {
    let cancelled = false;
    setEvItems([]);
    api
      .getFindingEvidence(id)
      .then((rows) => {
        if (!cancelled) setEvItems(rows);
      })
      .catch(() => {
        if (!cancelled) setEvItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  // Show a previously generated investigation, if one was saved for this finding.
  useEffect(() => {
    if (!f?.analysis) {
      setReport(null);
      return;
    }
    try {
      setReport(JSON.parse(f.analysis));
    } catch {
      setReport(null);
    }
  }, [f?.analysis]);
  const investigate = async () => {
    if (investigating) return;
    setInvestigating(true);
    try {
      const result = await api.investigateFinding(id, question.trim() || undefined);
      setReport(result);
      notify("Investigation generated from the linked evidence.");
    } catch (err: any) {
      notify(`Investigation failed: ${err?.message || "local model unavailable"}`);
    } finally {
      setInvestigating(false);
    }
  };
  if (!f) return <Empty text="Finding not found" />;
  const evidenceIds = evItems.length ? evItems.map((e) => e.id) : f.evidence;
  return (
    <>
      <PageHeading
        eyebrow={`FINDINGS / ${f.id}`}
        title={f.title}
        description={`${f.category} · ${f.asset}`}
        actions={
          <>
            <Action
              onClick={() => {
                updateFinding(id, { status: "Validated" });
                notify("Finding validated.");
              }}
              icon={Check}
            >
              Mark Validated
            </Action>
            <Action onClick={() => setAssign(true)}>Assign</Action>
            <Action
              variant="default"
              onClick={() => navigate({ to: "/remediation" })}
              icon={Wrench}
            >
              Remediate
            </Action>
            <Action
              onClick={investigate}
              disabled={investigating}
              icon={Sparkles}
              variant="outline"
            >
              {investigating
                ? "Investigating…"
                : report
                  ? "Re-run investigation"
                  : "Investigate with AI"}
            </Action>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={f.severity}>{f.severity} severity</Badge>
        <Badge>CVSS v4.0 · {f.cvss}</Badge>
        <Badge tone="Validated">{f.confidence} confidence</Badge>
        <Badge tone={f.status}>{f.status}</Badge>
      </div>
      {!report && (
        <div className="mb-5 rounded-md border border-primary/30 bg-accent/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <div className="eyebrow mb-2 text-primary">AI INVESTIGATION</div>
              <p className="text-xs leading-6 text-muted-foreground">
                Generate an executive summary, remediation plan, reproduction steps and
                re-test checklist from the linked evidence.
              </p>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Optional: ask a specific question about this finding…"
                className="mt-3 border-border bg-secondary text-xs"
              />
            </div>
            <Button onClick={investigate} disabled={investigating} size="sm" className="h-9">
              {investigating ? "Investigating…" : "Generate investigation"}
            </Button>
          </div>
        </div>
      )}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Panel
            title="Executive Summary"
            sub={report ? "Generated from the linked evidence" : "Scanner observation"}
            action={
              report ? (
                <Action
                  onClick={investigate}
                  disabled={investigating}
                  icon={Sparkles}
                  variant="outline"
                >
                  {investigating ? "Regenerating…" : "Regenerate"}
                </Action>
              ) : undefined
            }
          >
            <p className="text-sm leading-7 text-muted-foreground">
              {report?.executive_summary || f.summary}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="eyebrow">WHAT WAS FOUND</div>
                <p className="mt-2 text-xs leading-6">
                  {report?.executive_summary || f.summary}
                </p>
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="eyebrow">WHY IT MATTERS</div>
                <p className="mt-2 text-xs leading-6">
                  {report?.why_it_matters || f.impact}
                </p>
              </div>
            </div>
          </Panel>
          <Panel
            title="Evidence Chain"
            sub="Detection → proof → risk → fix → verification"
            action={
              evidenceIds.length ? (
                <SectionLink to="/evidence/$id" params={{ id: evidenceIds[0] }}>
                  Open evidence viewer
                </SectionLink>
              ) : undefined
            }
          >
            <div className="grid gap-2 sm:grid-cols-4">
              {["01 Detection", "02 Evidence", "03 Risk", "04 Verification"].map((x, i) => (
                <div key={x} className="rounded-md border border-border bg-secondary p-3">
                  <div className="text-[10px] text-primary">{x}</div>
                  <div className="mt-2 text-xs font-medium">
                    {
                      [
                        "Confirmed observation",
                        `${evidenceIds.length} artifacts`,
                        `${f.cvss} CVSS score`,
                        f.status === "Verified" ? "Verified" : "Awaiting re-test",
                      ][i]
                    }
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {evidenceIds.length === 0 && (
                <p className="rounded-md border border-border bg-secondary px-4 py-3 text-xs text-muted-foreground">
                  No evidence artifacts are linked to this finding yet.
                </p>
              )}
              {evidenceIds.map((evidenceId) => (
                <Link
                  key={evidenceId}
                  to="/evidence/$id"
                  params={{ id: evidenceId }}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-xs hover:border-primary"
                >
                  <span>
                    <FileText size={14} className="mr-2 inline text-primary" />
                    {evidenceId}{" "}
                    <span className="ml-2 text-muted-foreground">
                      {evItems.find((e) => e.id === evidenceId)?.type ??
                        evidence.find((e) => e.id === evidenceId)?.type}
                    </span>
                  </span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Reproduction Steps">
            <ol className="space-y-3 text-xs leading-6 text-muted-foreground">
              {(report?.reproduction_steps ?? []).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
              {!report && (
                <li>
                  No reproduction steps recorded — generate an investigation to derive them
                  from the linked evidence.
                </li>
              )}
            </ol>
          </Panel>
          <Panel title="Technical Analysis">
            <p className="text-xs leading-6 text-muted-foreground">
              {report?.technical_analysis ||
                `The observation was correlated across ${evidenceIds.length} evidence artifact${
                  evidenceIds.length === 1 ? "" : "s"
                }. The finding is assigned ${f.confidence.toLowerCase()} confidence based on
                reproducibility and available evidence. Severity is communicated independently
                using CVSS v4.0 and does not itself prove the finding.`}
            </p>
            <div className="mt-5 break-all rounded-md border border-border bg-secondary p-4 font-mono text-[11px] text-muted-foreground">
              {f.cvss_vector || "CVSS vector not recorded"}
            </div>
            {report?.retest_checklist?.length ? (
              <div className="mt-5 border-t border-border pt-4">
                <div className="eyebrow mb-3">RE-TEST CHECKLIST</div>
                <ul className="space-y-2 text-xs leading-6 text-muted-foreground">
                  {report.retest_checklist.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">{i + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>
          <Panel title="Recommended Fix">
            <p className="text-sm leading-7 text-muted-foreground">
              {report?.remediation || f.fix || "No remediation recorded."}
            </p>
            <div className="mt-4 border-t border-border pt-4">
              <SectionLink to="/remediation">Track remediation</SectionLink>
            </div>
          </Panel>
          <Panel title="Related Findings">
            {findings
              .filter((x) => x.id !== id)
              .slice(0, 2)
              .map((x) => (
                <Link
                  key={x.id}
                  to="/findings/$id"
                  params={{ id: x.id }}
                  className="flex items-center justify-between border-b border-border py-3 text-xs last:border-0 hover:text-primary"
                >
                  <span>{x.title}</span>
                  <Badge tone={x.severity}>{x.severity}</Badge>
                </Link>
              ))}
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel title="Risk Assessment">
            <div className={`text-4xl font-semibold ${severityColor[f.severity]}`}>
              {f.cvss}
              <span className="text-base text-muted-foreground">/10</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">CVSS v4.0 severity score</div>
            <div className="mt-5 space-y-3 border-t border-border pt-4 text-xs">
              {[
                ["Severity", f.severity],
                ["Confidence", f.confidence],
                ["Evidence artifacts", String(f.evidence.length)],
                ["Category", f.category],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Affected Asset">
            <div className="text-sm font-medium break-all">{f.asset}</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Recorded against this assessment target.
            </p>
            <div className="mt-4">
              <SectionLink to="/attack-surface">View attack surface</SectionLink>
            </div>
          </Panel>
          <Panel title="Potential Impact">
            <p className="text-xs leading-6 text-muted-foreground">{f.impact}</p>
          </Panel>
          <Panel title="Verification Status">
            <Badge tone={f.status}>{f.status}</Badge>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              A fix is only considered closed after a re-test confirms it.
            </p>
            <div className="mt-4 flex gap-2">
              <Action
                onClick={() => {
                  updateFinding(id, { status: "In progress" });
                  notify("Re-test queued.");
                }}
                icon={Play}
              >
                Re-test
              </Action>
              <Action
                icon={Download}
                onClick={() => exportFindingPdf(f, active?.name ?? 'Assessment', evidenceIds.length)}
              >
                Export PDF
              </Action>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Owner: {f.owner}</div>
          </Panel>
        </div>
      </div>
      <Dialog open={assign} onOpenChange={setAssign}>
        <DialogContent className="border-border bg-panel">
          <DialogHeader>
            <DialogTitle>Assign finding</DialogTitle>
          </DialogHeader>
          <label className="text-xs">
            Owner
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="mt-2 block h-10 w-full rounded border border-border bg-secondary px-3"
            >
              <option>Unassigned</option>
              <option>Priya Shah</option>
              <option>Arjun Mehta</option>
              <option>Nisha Rao</option>
              <option>Pratham Patel</option>
            </select>
          </label>
          <Button
            onClick={() => {
              updateFinding(id, { owner });
              notify(`Assigned to ${owner}.`);
              setAssign(false);
            }}
          >
            Save assignment
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function EvidenceViewer({ id }: { id: string }) {
  const [activeId, setActiveId] = useState(id),
    [compare, setCompare] = useState(false),
    [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<EvidenceItem[]>([]),
    [phase, setPhase] = useState<"loading" | "ready">("loading");
  const { notify, findings, assessments } = useSentinel();

  // Evidence lives in the backend; the bundled dataset is only a fallback for
  // artifacts that are not persisted anywhere.
  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setActiveId(id);
    (async () => {
      let loaded: EvidenceItem[] = [];
      try {
        const mapped = mapEvidence(await api.getEvidence(id));
        loaded = [mapped];
        if (mapped.finding) {
          try {
            const siblings = await api.getFindingEvidence(mapped.finding);
            if (siblings.length) loaded = siblings;
          } catch {
            // Keep the single artifact — the sibling lookup is best effort.
          }
        }
        // The scan log is written against the assessment, not the finding, so a
        // per-finding lookup never returns it. Pull the whole chain and keep the
        // run-level records alongside this finding's own artifacts.
        const owner = findings.find((f) => f.id === mapped.finding);
        if (owner?.assessment_id) {
          try {
            const chain = await api.getAssessmentEvidence(owner.assessment_id);
            const seen = new Set(loaded.map((e) => e.id));
            for (const row of chain) {
              if (!seen.has(row.id)) {
                seen.add(row.id);
                loaded = [...loaded, row];
              }
            }
          } catch {
            // The scan log is supplementary; finding artifacts still render.
          }
        }
      } catch {
        const seed = evidence.find((e) => e.id === id);
        loaded = seed ? evidence.filter((e) => e.finding === seed.finding) : [];
      }
      if (cancelled) return;
      setItems(loaded);
      setPhase("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [id, findings]);

  if (phase === "loading") return <Empty text="Loading evidence…" />;
  const item = items.find((e) => e.id === activeId) ?? items[0];
  if (!item) return <Empty text="Evidence not found" />;
  const related = items;
  const relatedFinding =
    findings.find((f) => f.id === item.finding) ??
    seedFindings.find((f) => f.id === item.finding);
  const assessmentLabel = relatedFinding
    ? (assessments.find((a) => a.id === relatedFinding.assessment_id)?.target ??
      relatedFinding.asset)
    : "—";
  return (
    <>
      <PageHeading
        eyebrow={`EVIDENCE / ${item.id}`}
        title="Evidence Viewer"
        description="Trace the observation and inspect the proof behind a finding."
        actions={
          <>
            <Action
              icon={Copy}
              onClick={() => {
                navigator.clipboard.writeText(item.content);
                notify("Redacted evidence copied.");
              }}
            >
              Copy
            </Action>
            <Action icon={Maximize2} onClick={() => setExpanded(true)}>
              Expand
            </Action>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone="Validated">{item.confidence} confidence</Badge>
        <Badge>{item.type}</Badge>
        <span className="text-xs text-muted-foreground">
          Sensitive values are redacted.
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[215px_minmax(0,1fr)_260px]">
        <Panel title="Evidence Timeline" sub="Select an artifact">
          <div className="scrollbar max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {related.map((e) => (
              <Button
                key={e.id}
                variant="ghost"
                onClick={() => setActiveId(e.id)}
                className={`h-auto w-full min-w-0 flex-col items-start gap-1 overflow-hidden rounded-md border p-3 text-left text-xs ${activeId === e.id ? "border-primary bg-accent" : "border-border bg-secondary"}`}
              >
                <span className="block w-full truncate font-semibold" title={e.id}>{e.id}</span>
                <span className="block w-full truncate text-[10px] font-normal text-muted-foreground">{e.type} · {e.time}</span>
              </Button>
            ))}
          </div>
        </Panel>
        <Panel
          title={item.type}
          sub={`${item.id} · ${item.source}`}
          action={
            item.comparison ? (
              <Action onClick={() => setCompare((v) => !v)} variant={compare ? "default" : "outline"}>
                Compare
              </Action>
            ) : undefined
          }
        >
          <div className="overflow-x-auto rounded-md border border-border bg-background p-4 sm:p-6">
            <pre className="min-h-[350px] max-h-[70vh] overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-6 text-foreground sm:text-xs">
              {item.content}
            </pre>
          </div>
          {compare && item.comparison && (
            <div className="mt-4 rounded-md border border-primary/30 bg-accent/40 p-4">
              <div className="eyebrow mb-2 text-primary">EXPECTED VS OBSERVED</div>
              <p className="text-xs leading-6">{item.comparison}</p>
            </div>
          )}
        </Panel>
        <div className="space-y-4">
          <Panel title="Evidence Metadata">
            <div className="space-y-4 text-xs">
              {[
                ["Source", item.source],
                ["Captured", item.time],
                ["Confidence", item.confidence],
                ["Type", item.type],
                ["Assessment", assessmentLabel],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-border pb-3">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="mt-1 font-medium">{v}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Related Finding">
            <div className="text-sm font-medium">{relatedFinding?.title}</div>
            <div className="mt-2">
              <Badge tone={relatedFinding?.severity ?? "Informational"}>
                {relatedFinding?.severity ?? "Informational"}
              </Badge>
            </div>
            <div className="mt-5">
              {relatedFinding && (
                <SectionLink to="/findings/$id" params={{ id: relatedFinding.id }}>
                  Open investigation
                </SectionLink>
              )}
            </div>
          </Panel>
        </div>
      </div>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-auto border-border bg-panel">
          <DialogHeader>
            <DialogTitle>
              {item.id} · {item.type}
            </DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-all rounded-md border border-border bg-background p-5 font-mono text-xs leading-6">
            {item.content}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function Remediation() {
  const { findings, updateFinding, notify } = useSentinel();
  const [status, setStatus] = useState("All");
  const rows = findings.filter((f) => status === "All" || f.status === status);
  return (
    <>
      <PageHeading
        title="Remediation Center"
        description="Move findings from assigned fixes to verified resolution."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Open Remediation" value="28" icon={ShieldAlert} tone="critical" />
        <Metric label="In Progress" value="12" icon={Activity} />
        <Metric label="Completed" value="28" icon={CheckCircle2} tone="success" />
        <Metric label="Overdue" value="4" icon={Clock} tone="high" />
      </div>
      <Panel
        title="Remediation Queue"
        sub="A finding closes only when a re-test verifies the fix"
        action={
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={["Open", "Validated", "In progress", "Verified"]}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className={`${table} min-w-[760px]`}>
            <thead>
              <tr>
                {[
                  "Finding",
                  "Owner",
                  "Priority",
                  "Status",
                  "Due Date",
                  "Progress",
                  "Verification",
                ].map((x) => (
                  <th key={x} className={th}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f, i) => (
                <tr key={f.id} className="hover:bg-panel-hover">
                  <td className={td}>
                    <Link
                      to="/findings/$id"
                      params={{ id: f.id }}
                      className="font-medium hover:text-primary"
                    >
                      {f.title}
                    </Link>
                    <div className="mt-1 max-w-[220px] truncate text-[10px] text-muted-foreground" title={f.id}>{f.id}</div>
                  </td>
                  <td className={td}>
                    <select
                      aria-label={`Owner for ${f.title}`}
                      value={f.owner}
                      onChange={(e) => updateFinding(f.id, { owner: e.target.value })}
                      className="max-w-[125px] bg-transparent text-xs"
                    >
                      <option>Unassigned</option>
                      <option>Priya Shah</option>
                      <option>Arjun Mehta</option>
                      <option>Nisha Rao</option>
                      <option>Pratham Patel</option>
                    </select>
                  </td>
                  <td className={td}>
                    <Badge tone={f.severity}>{f.severity}</Badge>
                  </td>
                  <td className={td}>
                    <select
                      aria-label={`Status for ${f.title}`}
                      value={f.status}
                      onChange={(e) => {
                        updateFinding(f.id, { status: e.target.value });
                        notify("Remediation status updated.");
                      }}
                      className="rounded border border-border bg-secondary p-1 text-xs"
                    >
                      <option>Open</option>
                      <option>Validated</option>
                      <option>In progress</option>
                      <option>Fix submitted</option>
                      <option>Verified</option>
                    </select>
                  </td>
                  <td className={`${td} text-muted-foreground`}>{28 + i} Sep 2026</td>
                  <td className={td}>
                    <div className="h-1.5 w-20 rounded bg-secondary">
                      <div
                        className="h-full rounded bg-success"
                        style={{
                          width:
                            f.status === "Verified"
                              ? "100%"
                              : f.status === "In progress"
                                ? "60%"
                                : "20%",
                        }}
                      />
                    </div>
                  </td>
                  <td className={td}>
                    <Action
                      onClick={() => {
                        updateFinding(f.id, { status: "Fix submitted" });
                        notify("Re-test requested.");
                      }}
                    >
                      Re-test
                    </Action>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-4">
        <Panel title="Verification Workflow">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
            {[
              "Finding",
              "Assigned",
              "Fix in Progress",
              "Fix Submitted",
              "Re-test",
              "Verified",
              "Closed",
            ].map((x, i) => (
              <div key={x} className="rounded border border-border bg-secondary p-3 text-xs">
                <span className="text-primary">0{i + 1}</span>
                <div className="mt-2">{x}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
export function Posture() {
  const { findings, assessments } = useSentinel();
  const active = assessments[0];
  const score = Math.round(active?.score ?? 0);
  const verified = findings.filter((f) => f.status === "Verified");
  const open = findings.filter((f) => f.status !== "Verified");
  const bySeverity = (rows: typeof findings) => ({
    critical: rows.filter((f) => f.severity === "Critical").length,
    high: rows.filter((f) => f.severity === "High").length,
    medium: rows.filter((f) => f.severity === "Medium").length,
  });
  const remediatedPct = findings.length
    ? Math.round((verified.length / findings.length) * 100)
    : 0;
  // Risk is not spread evenly across the estate, so the most useful posture
  // signal is where it concentrates. Rank unresolved findings by severity
  // weight (CVSS, with Critical floored so severity band breaks ties) and show
  // which asset carries each one.
  const severityWeight = (f: (typeof findings)[number]) =>
    (f.cvss || 0) + (f.severity === "Critical" ? 10 : f.severity === "High" ? 6 : 0);
  const priorityQueue = [...open]
    .sort((a, b) => severityWeight(b) - severityWeight(a))
    .slice(0, 12);
  const exposedAssets = [...new Set(open.map((f) => f.asset || "—"))]
    .map((asset) => {
      const rows = open.filter((f) => (f.asset || "—") === asset);
      const sev = bySeverity(rows);
      const worst = rows.reduce(
        (acc, f) => (acc && severityWeight(f) > severityWeight(acc) ? f : acc),
        rows[0],
      );
      return {
        asset,
        open: rows.length,
        critical: sev.critical,
        high: sev.high,
        worstCvss: worst?.cvss || 0,
        worstSeverity: worst?.severity || "Informational",
      };
    })
    .sort((a, b) => b.critical - a.critical || b.high - a.high || b.open - a.open);
  // Per-asset severity mix, used as a proportional bar.
  const assetBar = (a: { critical: number; high: number; open: number }) => {
    const rest = Math.max(0, a.open - a.critical - a.high);
    const parts = [
      ["bg-critical", a.critical],
      ["bg-high", a.high],
      ["bg-medium", rest],
    ].filter(([, n]) => (n as number) > 0) as [string, number][];
    return parts.map(([cls, n]) => ({ cls, pct: (n / a.open) * 100 }));
  };
  const evidenceCoverage = findings.length
    ? Math.round(
        (findings.filter((f) => f.evidence.length > 0).length / findings.length) * 100,
      )
    : 0;
  const categoryCells = [
    ...new Set(findings.map((f) => f.category || "General")),
  ].map((name) => {
    const rows = findings.filter((f) => (f.category || "General") === name);
    const unresolved = rows.filter((f) => f.status !== "Verified");
    const risky = unresolved.some(
      (f) => f.severity === "Critical" || f.severity === "High",
    );
    return {
      name,
      open: unresolved.length,
      className: !unresolved.length
        ? "bg-success/60"
        : risky
          ? "bg-high/70"
          : "bg-primary/40",
    };
  });
  const categoriesAtRisk = categoryCells.filter((c) => c.open > 0).length;
  return (
    <>
      <PageHeading
        title="Security Posture"
        description="See where exposure concentrates and what to fix first."
        actions={<SectionLink to="/reports">Open assessment report</SectionLink>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Current Security Score"
          value={`${score}/100`}
          change={`${verified.length} verified`}
          icon={ShieldCheck}
          tone="success"
        />
        <Metric
          label="Risk Reduction"
          value={`${remediatedPct}%`}
          icon={ArrowDownRight}
          tone="success"
        />
        <Metric
          label="Resolved Findings"
          value={String(verified.length)}
          icon={CheckCircle2}
          tone="success"
        />
        <Metric label="Coverage" value={`${evidenceCoverage}%`} icon={Target} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Security Score Trend" sub="Progress across recent assessments">
          <TrendChart />
        </Panel>
        <Panel title="Open Vulnerabilities" sub="Reduction in unresolved findings">
          <TrendChart mode="open" />
        </Panel>
      </div>
      <div className="my-7">
        <div className="eyebrow mb-2">WHERE RISK CONCENTRATES</div>
        <h2 className="text-xl font-semibold">Remediation Priority</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Unresolved findings ranked by CVSS, and the assets carrying them.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Panel
          title="Priority Remediation Queue"
          sub={`Highest-risk unresolved findings${open.length > priorityQueue.length ? ` · showing top ${priorityQueue.length} of ${open.length}` : ""}`}
          className="flex min-w-0 flex-col"
        >
          {priorityQueue.length ? (
            <div className="-mx-1 max-h-[420px] min-h-0 flex-1 overflow-y-auto pr-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-panel">
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium">Finding</th>
                    <th className="pb-2 pr-2 font-medium">Asset</th>
                    <th className="pb-2 pr-2 font-medium">Owner</th>
                    <th className="pb-2 text-right font-medium">CVSS</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityQueue.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-border/50 transition-colors last:border-0 hover:bg-secondary/60"
                    >
                      <td className="py-2 pr-2 align-top">
                        <div className="flex items-start gap-2">
                          <Badge tone={f.severity}>{f.severity.slice(0, 4)}</Badge>
                          <span className="min-w-0 leading-snug">{f.title}</span>
                        </div>
                      </td>
                      <td className="max-w-[170px] truncate py-2 pr-2 align-top text-muted-foreground">
                        {f.asset}
                      </td>
                      <td className="py-2 pr-2 align-top text-muted-foreground">
                        {f.owner}
                      </td>
                      <td className="py-2 text-right align-top font-semibold tabular-nums">
                        {(f.cvss || 0).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="Nothing unresolved — every finding has been verified." />
          )}
        </Panel>

        <Panel
          title="Exposure By Asset"
          sub="Where unresolved findings cluster, worst severity first"
          className="flex min-w-0 flex-col"
        >
          {exposedAssets.length ? (
            <div className="max-h-[420px] min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {exposedAssets.map((a) => (
                <div key={a.asset}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-xs">{a.asset}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {a.open} open
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded bg-secondary">
                    {assetBar(a).map((seg, i) => (
                      <div
                        key={i}
                        className={seg.cls}
                        style={{ width: `${seg.pct}%` }}
                        title={`${seg.pct.toFixed(0)}%`}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">
                      worst {a.worstCvss.toFixed(1)} {a.worstSeverity.toLowerCase()}
                    </span>
                    {a.critical > 0 && (
                      <span className="text-critical">{a.critical} critical</span>
                    )}
                    {a.high > 0 && <span className="text-high">{a.high} high</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No unresolved findings to attribute to an asset." />
          )}
        </Panel>
      </div>
      <div className="mt-4">
        <Panel
          title="Security Category Coverage"
          sub="Assessment coverage across application layers"
        >
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {categoryCells.map((c) => (
              <div
                title={`${c.name} — ${c.open} open`}
                key={c.name}
                className={`aspect-square rounded-sm ${c.className}`}
              />
            ))}
            {categoryCells.length === 0 && (
              <div className="col-span-full text-xs text-muted-foreground">
                No categories recorded yet.
              </div>
            )}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            {categoryCells.length} categories tracked · {categoriesAtRisk} with open findings
          </div>
        </Panel>
      </div>
    </>
  );
}
export function Reports() {
  const { notify } = useSentinel();
  const navigate = useNavigate();
  return (
    <>
      <PageHeading
        title="Security Reports"
        description="Review evidence-backed assessment outcomes and remediation progress."
        actions={
          <Action
            icon={Plus}
            variant="default"
            disabled
            onClick={() => notify("Run an assessment to generate a report.")}
          >
            Generate Report
          </Action>
        }
      />
      <ReportList />
    </>
  );
}

function ReportList() {
  const { assessments, findings } = useSentinel();
  if (!assessments.length) {
    return (
      <div className="panel flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        No assessments yet — run a scan to generate a report.
      </div>
    );
  }
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {assessments.map((a) => {
        const rows = findings.filter((f) => (f as any).assessment_id === a.id);
        const critical = rows.filter((f) => f.severity === "Critical").length;
        const high = rows.filter((f) => f.severity === "High").length;
        return (
          <Link
            to="/reports/$id"
            params={{ id: a.id }}
            key={a.id}
            className="panel block p-5 hover:border-primary"
          >
            <FileText size={20} className="text-primary" />
            <div className="mt-6 text-sm font-semibold">{a.name}</div>
            <div className="mt-2 truncate text-xs text-muted-foreground">{a.target}</div>
            <div className="mt-4 flex items-center gap-3 text-xs">
              <Badge tone="High">{Math.round(a.risk_score ?? 0)} risk</Badge>
              <span className="text-muted-foreground">
                {critical}C · {high}H
              </span>
            </div>
            <div className="mt-5 text-xs primary">Preview report →</div>
          </Link>
        );
      })}
    </div>
  );
}
export function ReportDetail({ id }: { id: string }) {
  const { notify, findings } = useSentinel();
  const assessment = useSentinel().assessments.find((a) => a.id === id);
  const title = assessment ? `${assessment.name} — Report` : "Assessment Report";
  if (!assessment) return <Empty text="Assessment not found" />;
  const rows = findings.filter((f) => (f as any).assessment_id === assessment.id);
  const bySeverity = (sev: string) => rows.filter((f) => f.severity === sev).length;
  const verified = rows.filter((f) => f.status === "Verified").length;
  const remediation = rows.length ? Math.round((verified / rows.length) * 100) : 0;
  const evidenceCount = rows.reduce((n, f) => n + f.evidence.length, 0);
  const top = [...rows].sort((a, b) => b.cvss - a.cvss).slice(0, 3);
  const recommendations = [...new Set(rows.map((f) => f.fix).filter(Boolean))].slice(0, 4);
  const generated = assessment.completed_at
    ? new Date(assessment.completed_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const stats: [string, string][] = [
    ["Security Score", `${Math.round(assessment.score)}/100`],
    ["Critical", String(bySeverity("Critical"))],
    ["High", String(bySeverity("High"))],
    ["Remediation", `${remediation}%`],
  ];
  const sections: [string, string][] = [
    [
      "Executive Summary",
      `The ${assessment.name} assessment against ${assessment.target} recorded ${rows.length} findings across ${new Set(rows.map((f) => f.asset)).size} assets. The security score is ${Math.round(assessment.score)}/100 with a risk score of ${Math.round(assessment.risk_score ?? 0)}/100. ${bySeverity("Critical")} critical and ${bySeverity("High")} high severity findings require attention.`,
    ],
    [
      "Assessment Scope",
      `Target ${assessment.target} in a ${assessment.methodology ? "configured" : "default"} environment. The scan covered security headers, TLS configuration, endpoint discovery, information disclosure, CORS policy and client-side dependencies. Scan duration ${assessment.scan_duration ?? 0}s.`,
    ],
    [
      "Risk Distribution",
      `${bySeverity("Critical")} critical · ${bySeverity("High")} high · ${bySeverity("Medium")} medium · ${bySeverity("Low")} low · ${bySeverity("Informational")} informational. Severity is derived from the CVSS v4.0 base score; evidence confidence is assessed separately.`,
    ],
    [
      "Critical Findings",
      top.length
        ? top
            .map(
              (f) =>
                `${f.title} (${f.severity}, CVSS ${f.cvss}) — ${f.evidence.length} linked evidence artifact${f.evidence.length === 1 ? "" : "s"}.`,
            )
            .join(" ")
        : "No findings were recorded by this assessment.",
    ],
    [
      "Evidence Summary",
      `${evidenceCount} evidence artifacts are recorded and hash-chained for this assessment, including the raw scan log, captured HTTP responses, scanner output and configuration observations.`,
    ],
    [
      "Remediation Status",
      `${remediation}% of findings are verified. Findings are only considered closed after a confirming re-test.`,
    ],
    [
      "Recommendations",
      recommendations.length
        ? recommendations.join(" ")
        : "No remediation guidance is recorded yet — investigate a finding to generate it.",
    ],
    [
      "Technical Appendix",
      "CVSS v4.0 communicates standardized severity. It is not proof of exploitability; the evidence chain supports each finding.",
    ],
  ];
  return (
    <>
      <PageHeading
        eyebrow={`REPORTS / ${assessment.name.toUpperCase()}`}
        title={title}
        description={`${assessment.target} · Generated ${generated}`}
        actions={
          <>
            <Action
              icon={Download}
              onClick={() => exportReportPdf(assessment, rows)}
            >
              Export PDF
            </Action>
            <Action
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                notify("Report link copied.");
              }}
            >
              Share
            </Action>
          </>
        }
      />
      <div className="mx-auto max-w-4xl rounded-md border border-border bg-panel p-6 shadow-xl sm:p-10">
        <div className="flex items-start justify-between border-b border-border pb-8">
          <div>
            <div className="text-sm font-bold tracking-[.12em] text-primary">SENTINEL</div>
            <h2 className="mt-8 text-2xl font-semibold sm:text-3xl">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Evidence-driven assessment of {assessment.target}
            </p>
          </div>
          <ShieldCheck size={32} className="text-primary" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k}>
              <div className="eyebrow">{k}</div>
              <div className="mt-2 text-2xl font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 space-y-9">
          {sections.map(([heading, body]) => (
            <section key={heading} className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold">{heading}</h3>
              <p className="mt-2 text-xs leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-[11px] text-muted-foreground">
          SENTINEL · Evidence-backed assessment report · {rows.length} findings · {evidenceCount} evidence artifacts
        </div>
      </div>
    </>
  );
}
export function Copilot() {
  const { findings, assessments, selectedAssessment } = useSentinel();
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [messages, setMessages] = useState<{ who: string; text: string }[]>([
      {
        who: "assistant",
        text: "I can help explain the current assessment — findings, CVSS v4.0 severity, evidence and remediation. Ask me anything about what the scan found.",
      },
    ]);
  const prompts = [
    "Explain this vulnerability in simple terms",
    "Why is this finding high risk?",
    "Summarize the evidence",
    "Suggest a remediation approach",
    "Compare this finding with previous assessments",
    "What should we verify during re-test?",
  ];

  const active = assessments.find((a) => a.id === selectedAssessment) ?? assessments[0];
  const scoped = findings.filter((f) => (f as any).assessment_id === active?.id);
  const top = [...(scoped.length ? scoped : findings)].sort((a, b) => b.cvss - a.cvss)[0];

  const send = async (prompt: string) => {
    const question = prompt.trim();
    if (!question || busy) return;
    setMessages((v) => [...v, { who: "user", text: question }]);
    setText("");
    setBusy(true);
    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.who === "assistant" ? "assistant" : "user",
        content: m.text,
      }));
      const { reply } = await api.copilotChat(question, history);
      setMessages((v) => [...v, { who: "assistant", text: reply }]);
    } catch (err: any) {
      setMessages((v) => [
        ...v,
        {
          who: "assistant",
          text: `I could not reach the reasoning service for that one (${err?.message || "request failed"}). Please try again in a moment.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        title="AI Security Copilot"
        description="Explore contextual explanations and remediation suggestions for the current assessment."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_285px]">
        <div className="panel flex min-h-[590px] flex-col">
          <div className="border-b border-border p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={17} className="text-primary" /> Assessment conversation
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Verify against linked evidence before acting
            </p>
          </div>
          <div className="scrollbar flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-md border p-4 text-xs leading-6 ${m.who === "user" ? "ml-auto border-primary/25 bg-accent" : "border-border bg-secondary"}`}
              >
                {m.who === "assistant" && (
                  <div className="eyebrow mb-2 text-primary">SENTINEL ASSISTANT</div>
                )}
                {m.text}
              </div>
            ))}
            {busy && (
              <div className="max-w-[85%] rounded-md border border-border bg-secondary p-4 text-xs text-muted-foreground">
                <div className="eyebrow mb-2 text-primary">SENTINEL ASSISTANT</div>
                Thinking…
              </div>
            )}
          </div>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {prompts.slice(0, 3).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant="outline"
                  onClick={() => send(p)}
                  className="h-auto whitespace-normal py-2 text-left text-[11px]"
                >
                  {p}
                </Button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
              className="flex gap-2"
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask about this assessment..."
                className="border-border bg-secondary text-xs"
              />
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Thinking…" : "Send"}
              </Button>
            </form>
          </div>
        </div>
        <div className="space-y-4">
          <Panel title="Security Context">
            <div className="space-y-3 text-xs">
              {[
                ["Assessment", active?.name ?? "—"],
                ["Selected finding", top?.title ?? "—"],
                ["CVSS", top ? `${top.cvss} · ${top.severity}` : "—"],
                ["Evidence", top ? `${top.evidence.length} linked artifacts` : "—"],
                ["Affected asset", top?.asset ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-border pb-3">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="mt-1 break-all">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              {top && (
                <SectionLink to="/findings/$id" params={{ id: top.id }}>
                  Inspect source finding
                </SectionLink>
              )}
            </div>
          </Panel>
          <Panel title="Suggested Questions">
            <div className="space-y-2">
              {prompts.slice(3).map((p) => (
                <Button
                  key={p}
                  variant="ghost"
                  onClick={() => send(p)}
                  className="h-auto w-full justify-start whitespace-normal p-2 text-left text-xs text-muted-foreground"
                >
                  {p}
                </Button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
export function SettingsPage() {
  const { notify } = useSentinel();
  const [alerts, setAlerts] = useState(true),
    [digest, setDigest] = useState(true),
    [ai, setAi] = useState(true);
  return (
    <>
      <PageHeading
        title="Settings"
        description="Manage your workspace preferences."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Profile">
          <div className="space-y-4">
            <Field label="Name" value="Pratham Patel" set={() => {}} placeholder="Name" />
            <Field label="Role" value="Security Analyst" set={() => {}} placeholder="Role" />
            <div className="text-xs text-muted-foreground">
              Seeded profile · stored locally.
            </div>
          </div>
        </Panel>
        <Panel title="Assessment Preferences">
          <div className="space-y-4 text-xs">
            {[
              ["Default environment", "Staging"],
              ["Default scope", "Web Application"],
              ["Risk scoring", "CVSS v4.0"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border pb-3">
                <span className="text-muted-foreground">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Notifications">
          <div className="space-y-5">
            {[
              ["Critical finding alerts", alerts, setAlerts],
              ["Weekly assessment digest", digest, setDigest],
              ["AI assistant", ai, setAi],
            ].map(([label, value, set]: any) => (
              <label
                key={label}
                className="flex cursor-pointer items-center justify-between text-xs"
              >
                {label}
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => {
                    set(e.target.checked);
                    notify("Preference updated.");
                  }}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="Security Rules & Appearance">
          <p className="text-xs leading-6 text-muted-foreground">
            Assessments use redacted evidence, separate severity from confidence, and require
            verification before closure.
          </p>
          <div className="mt-5 flex gap-2">
            <Badge tone="Completed">Dark mode</Badge>
            <Badge>Evidence-first</Badge>
          </div>
        </Panel>
      </div>
    </>
  );
}
export function Login() {
  const navigate = useNavigate();
  const { refreshData } = useSentinel();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [remember, setRemember] = useState(true),
    [termsAccepted, setTermsAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Circuit board background with drifting glowing particles.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;

    type Particle = { x: number; y: number; r: number; dx: number; dy: number; o: number; do_: number };
    let particles: Particle[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      const n = Math.floor((canvas.width * canvas.height) / 7500);
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2 + 0.5,
          dx: (Math.random() - 0.5) * 0.4,
          dy: -Math.random() * 0.6 - 0.2,
          o: Math.random(),
          do_: (Math.random() - 0.5) * 0.015,
        });
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.o += p.do_;
        if (p.o < 0.05) p.do_ = Math.abs(p.do_);
        if (p.o > 0.95) p.do_ = -Math.abs(p.do_);
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        // Larger motes get a soft bloom so the field reads as depth, not noise.
        if (p.r > 2) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
          g.addColorStop(0, `rgba(160,80,240,${p.o * 0.9})`);
          g.addColorStop(1, `rgba(160,80,240,0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(192,100,255,${p.o})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("resize", init);
    init();
    tick();
    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Surface any error the backend redirected back to us, and find out whether
  // Google sign-in is available before rendering that button.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get("google_error");
    if (googleError) {
      setError(
        googleError === "access_denied"
          ? "Google sign-in was cancelled."
          : decodeURIComponent(googleError.replace(/\+/g, " ")),
      );
      // Strip it so a refresh does not re-show the stale message.
      window.history.replaceState({}, "", "/login");
    }
    api
      .googleAuthConfigured()
      .then(setGoogleReady)
      .catch(() => setGoogleReady(false));
  }, []);

  const validateEmail = (value: string) =>
    String(value)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      );

  const signIn = async () => {
    if (!email || !password) {
      setError("Enter an email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the terms and conditions to continue.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.login(email.trim(), password);
      // Pull live data now that we hold a token.
      await refreshData();
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!termsAccepted) {
      setError("You must accept the terms and conditions to continue.");
      return;
    }
    setError("");

    // Credentials present: hand off to Google for a real identity check.
    if (googleReady) {
      // Full-page redirect — Google is a different origin, and the backend
      // hands the result back to /auth/callback.
      window.location.href = "/api/auth/google/start";
      return;
    }

    // DEMO FALLBACK — no GOOGLE_CLIENT_ID/SECRET configured.
    //
    // Signs in as the pre-seeded demo account so the flow can be walked through
    // without a Google Cloud project. This performs NO identity check: anyone
    // who can load the page becomes that account, and it holds admin rights.
    // Real OAuth takes over automatically once credentials are set, so do not
    // ship a build where this branch is still reachable.
    setBusy(true);
    try {
      await api.login("admin@sentinel.local", "admin123");
      await refreshData();
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Sign in failed - is the backend running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Circuit board background — hue-rotate shifts the source art onto the theme */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/login-bg.png')",
          filter: "hue-rotate(270deg) saturate(1.8) brightness(0.65)",
        }}
      />
      {/* Dark overlay for depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(140,50,220,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-background/50" />

      {/* Animated particle canvas */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />

      {/* Login card */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo / Brand */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-grid h-14 w-14 place-items-center rounded-xl border border-primary/40 bg-primary/20 shadow-lg shadow-primary/20 backdrop-blur">
              <ShieldCheck size={28} className="text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-[.15em] text-foreground">SENTINEL</div>
            <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
              Evidence-Driven Security Assessment
            </div>
          </div>

          {/* Glass card */}
          <div className="rounded-2xl border border-border/40 bg-panel/70 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <h1 className="text-xl font-semibold">Welcome back</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Access the Security Assessment Platform.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                signIn();
              }}
              className="mt-7 space-y-5"
            >
              <Field
                label="Email address"
                value={email}
                set={setEmail}
                placeholder="analyst@example.com"
              />
              <label className="block text-xs">
                Password
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-2 border-border bg-secondary/60 backdrop-blur"
                />
              </label>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-primary"
                  />
                  Remember me
                </label>
                <a href="#" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 accent-primary"
                />
                <label
                  htmlFor="terms"
                  className="cursor-pointer text-xs leading-tight text-muted-foreground"
                >
                  I agree to the{" "}
                  <a href="#" className="text-primary hover:underline">
                    Terms and Conditions
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>

              {error && <p className="text-xs text-critical">{error}</p>}

              <Button
                type="submit"
                className="w-full bg-primary shadow-lg shadow-primary/30 hover:bg-primary/90"
                disabled={busy}
              >
                {busy ? "Signing in." : "Sign in"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              OR
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              onClick={signInWithGoogle}
              disabled={busy}
              title={
                googleReady
                  ? "Sign in with your Google account"
                  : "Google OAuth is not configured yet \u2014 signing in as the demo account. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env for real Google sign-in."
              }
              className="flex w-full items-center gap-2 border-border/60 hover:bg-accent/40"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Landing route for Google's redirect. The backend sends a single-use code
 * here; we swap it for a SENTINEL token and drop the code from the URL before
 * it can linger in history.
 */
export function GoogleCallback() {
  const navigate = useNavigate();
  const { refreshData } = useSentinel();
  const [message, setMessage] = useState("Completing sign-in with Google.");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (!code) {
        setMessage("No sign-in code was returned. Please try again.");
        return;
      }
      try {
        await api.exchangeGoogleCode(code);
        // Remove the one-time code from the address bar now it is spent.
        window.history.replaceState({}, "", "/auth/callback");
        if (cancelled) return;
        await refreshData();
        if (cancelled) return;
        navigate({ to: "/dashboard", replace: true });
      } catch (err: any) {
        if (!cancelled) setMessage(err.message || "Google sign-in failed.");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="cosmic-bg relative flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="relative z-10">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck size={27} />
        </div>
        <div className="text-lg font-bold tracking-[.12em]">SENTINEL</div>
        <p className="mt-4 max-w-sm text-xs text-muted-foreground">{message}</p>
        <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
        <Button className="mt-8" variant="outline" onClick={() => navigate({ to: "/login" })}>
          Back to sign in
        </Button>
      </div>
    </div>
  );
}