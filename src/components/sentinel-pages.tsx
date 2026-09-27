import { useState } from "react";
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
import {
  findings as seedFindings,
  assessments as seedAssessments,
  evidence,
  assets,
  categories,
  severityData,
  type Finding,
  type Assessment,
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
const table = "w-full text-left text-xs";
const th = "border-b border-border px-4 py-3 font-medium text-muted-foreground";
const td = "border-b border-border/60 px-4 py-3.5 align-middle";
function exportText(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function Dashboard() {
  const { findings, assessments } = useSentinel();
  const navigate = useNavigate();
  return (
    <>
      <PageHeading
        title="Security Command Center"
        description="A clear view of your application security posture and assessment activity."
        actions={
          <>
            <Action icon={Download} onClick={() => navigate({ to: "/reports" })}>
              Export Report
            </Action>
            <Button size="sm" className="h-9 gap-2 text-xs" asChild>
              <Link to="/assessments/new">
                <Plus size={14} />
                New Assessment
              </Link>
            </Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Metric
          label="Security Score"
          value="72/100"
          change="+8%"
          icon={ShieldCheck}
          foot="vs. previous assessment"
        />
        <Metric
          label="Critical Findings"
          value="3"
          change="−2"
          tone="critical"
          icon={ShieldAlert}
          foot="Require immediate attention"
        />
        <Metric
          label="High Findings"
          value="12"
          change="−4"
          tone="high"
          icon={TriangleAlert}
          foot="Across 7 assets"
        />
        <Metric
          label="Open Findings"
          value="28"
          change="−11%"
          tone="violet"
          icon={Bug}
          foot="From 51 total findings"
        />
        <Metric
          label="Remediation Progress"
          value="68%"
          change="+14%"
          tone="success"
          icon={CheckCircle2}
          foot="28 fixes verified"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Security Posture Trend"
          sub="Security score over the last 30 days"
          action={<Badge tone="Completed">+18 points this month</Badge>}
        >
          <TrendChart />
        </Panel>
        <Panel title="Findings by Severity" sub="All validated and pending findings">
          <SeverityChart />
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Panel
          title="Vulnerability Distribution"
          sub="Finding categories across assessed assets"
          className="xl:col-span-1"
        >
          <CategoryChart />
        </Panel>
        <Panel
          title="Assessment Progress"
          sub="Current assessment portfolio"
          action={<SectionLink to="/assessments">View all</SectionLink>}
        >
          <div className="space-y-5">
            {assessments.slice(0, 4).map((a) => (
              <Link key={a.id} to="/assessments/$id" params={{ id: a.id }} className="block group">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate group-hover:text-primary">{a.name}</span>
                  <span className="shrink-0 text-muted-foreground">{a.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${a.progress}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            48 assets <span className="mx-2 text-subtle">·</span> 132 endpoints{" "}
            <span className="mx-2 text-subtle">·</span> 76 dependencies
          </div>
        </Panel>
        <Panel
          title="Top Risk Areas"
          sub="Concentration by application layer"
          action={<SectionLink to="/attack-surface">Explore map</SectionLink>}
        >
          <div className="space-y-4">
            {[
              { name: "Core API", risk: 91, tone: "bg-critical" },
              { name: "Admin endpoints", risk: 86, tone: "bg-high" },
              { name: "Identity & access", risk: 74, tone: "bg-medium" },
              { name: "Dependencies", risk: 42, tone: "bg-primary" },
            ].map((r) => (
              <div key={r.name}>
                <div className="mb-2 flex justify-between text-xs">
                  <span>{r.name}</span>
                  <span className="font-semibold">
                    {r.risk}
                    <span className="text-muted-foreground">/100</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${r.tone}`}
                    style={{ width: `${r.risk}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Recent Findings"
          sub="Latest evidence-backed security discoveries"
          action={<SectionLink to="/findings">View all findings</SectionLink>}
        >
          <div className="overflow-x-auto">
            <table className={table}>
              <thead>
                <tr>
                  {["Finding", "Severity", "Asset", "Status"].map((x) => (
                    <th key={x} className={th}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {findings.slice(0, 4).map((f) => (
                  <tr key={f.id} className="hover:bg-panel-hover">
                    <td className={td}>
                      <Link
                        to="/findings/$id"
                        params={{ id: f.id }}
                        className="font-medium hover:text-primary"
                      >
                        {f.title}
                      </Link>
                      <span className="mt-1 block text-[10px] text-muted-foreground">{f.id}</span>
                    </td>
                    <td className={td}>
                      <Badge tone={f.severity}>{f.severity}</Badge>
                    </td>
                    <td className={`${td} max-w-[160px] truncate text-muted-foreground`}>
                      {f.asset}
                    </td>
                    <td className={td}>
                      <Badge tone={f.status}>{f.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Recent Activity" sub="Latest events in your workspace">
          <div className="space-y-0">
            {[
              ["Finding discovered", "Missing Authorization Check · 2 hours ago"],
              ["Finding validated", "Exposed Debug Endpoint · 6 hours ago"],
              ["Fix verified", "Content Security Policy · Yesterday"],
              ["Assessment completed", "World Monitor · Yesterday"],
              ["Report generated", "Executive Security Report · 2 days ago"],
            ].map(([title, desc], i) => (
              <div key={title} className="flex gap-3 border-l border-border pb-5 pl-4 last:pb-0">
                <div
                  className={`-ml-[21px] mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-background ${i === 0 ? "bg-critical" : i === 2 ? "bg-success" : "bg-primary"}`}
                />
                <div>
                  <div className="text-xs font-medium">{title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
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
  const { addAssessment, notify } = useSentinel();
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
  const submit = (status: string) => {
    if (!name.trim()) {
      notify("Add an assessment name first.");
      setStep(0);
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
      progress: status === "Running" ? 8 : 0,
      lastRun: "27 Sep 2026",
    });
    notify(
      status === "Running"
        ? "Demo assessment created. No real scan was performed."
        : "Assessment saved as a local demo draft.",
    );
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
                placeholder="e.g. World Monitor Security Assessment"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Target application"
                  value={target}
                  set={setTarget}
                  placeholder="world-monitor.local"
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
                Select the area that this demonstration assessment represents.
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
                Choose which security categories are included in the mock assessment.
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
                prototype will not contact the target or run security checks. In a real assessment,
                confirm written authorization and keep all activity inside the agreed scope.
              </div>
              <label className="flex items-center gap-3 text-xs">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="accent-primary"
                />
                I confirm this is an authorized demonstration scope.
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
                Starting this assessment only creates a simulated runner. No network requests or
                scans occur.
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
                disabled={!authorized}
                onClick={() => submit("Running")}
              >
                Start Demo Assessment
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
  const { assessments, notify } = useSentinel();
  const a = assessments.find((x) => x.id === id);
  if (!a) return <Empty text="Assessment not found" />;
  const pipeline = [
    "Scope Validation",
    "Asset Discovery",
    "Static Analysis",
    "API Analysis",
    "Dependency Analysis",
    "Evidence Collection",
    "Finding Correlation",
    "Risk Calculation",
    "Report Preparation",
  ];
  return (
    <>
      <PageHeading
        eyebrow="ASSESSMENTS / EXECUTION"
        title={a.name}
        description={`${a.target} · ${a.status === "Running" ? "Simulated execution" : "Assessment run details"}`}
        actions={
          <>
            <Action
              icon={Download}
              onClick={() => notify("Assessment summary prepared in demo mode.")}
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
          sub="Observed processing stages in the demonstration run"
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
                ? "Demo assessment in progress. Results are simulated; no target was contacted."
                : "Assessment processing completed. Review the evidence-backed findings and coverage below."}
            </div>
            <div className="mt-5 space-y-3 text-xs">
              {[
                ["Assets discovered", "48"],
                ["Checks completed", "126 / 126"],
                ["Endpoints mapped", "132"],
                ["Dependencies inspected", "76"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Processing Log">
            <div className="space-y-3 font-mono text-[11px] text-muted-foreground">
              {[
                "09:42:15 · Risk calculation completed",
                "09:42:12 · Finding FND-001 correlated",
                "09:42:11 · Evidence chain EV-1042 captured",
                "09:41:32 · 132 endpoints indexed",
                "09:40:03 · Scope validation passed",
              ].map((x) => (
                <div key={x}>{x}</div>
              ))}
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
export function AttackSurface() {
  return (
    <>
      <PageHeading
        title="Attack Surface Map"
        description="Explore how assets, APIs, endpoints and dependencies connect."
        actions={<SectionLink to="/risk-graph">View risk relationships</SectionLink>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Discovered Assets" value="48" icon={Target} />
        <Metric label="API Endpoints" value="132" icon={Activity} />
        <Metric label="Dependencies" value="76" icon={GitBranch} tone="violet" />
        <Metric label="Exposed Assets" value="7" icon={ShieldAlert} tone="critical" />
      </div>
      <GraphView />
    </>
  );
}
export function RiskGraph() {
  return (
    <>
      <PageHeading
        title="Security Risk Graph"
        description="Trace the path from exposed assets through vulnerabilities to business impact."
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Risk Concentration" value="74%" icon={Target} tone="critical" />
        <Metric label="Critical Paths" value="3" icon={GitBranch} tone="high" />
        <Metric label="Exposed Assets" value="7" icon={ShieldAlert} />
        <Metric label="High-risk Dependencies" value="4" icon={Activity} tone="violet" />
      </div>
      <GraphView riskGraph />
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
              exportText(
                "sentinel-findings.csv",
                [
                  "ID,Finding,Severity,CVSS,Status",
                  ...rows.map((f) => `${f.id},"${f.title}",${f.severity},${f.cvss},${f.status}`),
                ].join("\n"),
              )
            }
          >
            Export Findings
          </Action>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {severityData.map((s, i) => (
          <div key={s.name} className="panel p-4">
            <div
              className={`text-xs font-medium ${severityColor[s.name as keyof typeof severityColor]}`}
            >
              {s.name}
            </div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">{s.value}</div>
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
            <table className={`${table} min-w-[860px]`}>
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
                    <th key={i} className={th}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => (
                  <tr key={f.id} className="hover:bg-panel-hover">
                    <td className={td}>
                      <Link
                        to="/findings/$id"
                        params={{ id: f.id }}
                        className="font-semibold hover:text-primary"
                      >
                        {f.title}
                      </Link>
                      <div className="mt-1 text-[10px] text-muted-foreground">{f.id}</div>
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
  const { findings, updateFinding, notify } = useSentinel();
  const f = findings.find((x) => x.id === id);
  const navigate = useNavigate();
  const [assign, setAssign] = useState(false),
    [owner, setOwner] = useState(f?.owner || "Unassigned");
  if (!f) return <Empty text="Finding not found" />;
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
                notify("Finding validated in this demo session.");
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
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={f.severity}>{f.severity} severity</Badge>
        <Badge>CVSS v4.0 · {f.cvss}</Badge>
        <Badge tone="Validated">{f.confidence} confidence</Badge>
        <Badge tone={f.status}>{f.status}</Badge>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Panel title="Executive Summary">
            <p className="text-sm leading-7 text-muted-foreground">{f.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="eyebrow">WHAT WAS FOUND</div>
                <p className="mt-2 text-xs leading-6">{f.summary}</p>
              </div>
              <div className="rounded-md border border-border bg-secondary p-4">
                <div className="eyebrow">WHY IT MATTERS</div>
                <p className="mt-2 text-xs leading-6">{f.impact}</p>
              </div>
            </div>
          </Panel>
          <Panel
            title="Evidence Chain"
            sub="Detection → proof → risk → fix → verification"
            action={
              <SectionLink to="/evidence/$id" params={{ id: f.evidence[0] }}>
                Open evidence viewer
              </SectionLink>
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
                        `${f.evidence.length} artifacts`,
                        `${f.cvss} CVSS score`,
                        f.status === "Verified" ? "Verified" : "Awaiting re-test",
                      ][i]
                    }
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {f.evidence.map((id) => (
                <Link
                  key={id}
                  to="/evidence/$id"
                  params={{ id }}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-xs hover:border-primary"
                >
                  <span>
                    <FileText size={14} className="mr-2 inline text-primary" />
                    {id}{" "}
                    <span className="ml-2 text-muted-foreground">
                      {evidence.find((e) => e.id === id)?.type}
                    </span>
                  </span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </Panel>
          <Panel title="Reproduction Steps">
            <ol className="space-y-3 text-xs leading-6 text-muted-foreground">
              <li>1. Sign in as an authorized non-admin test account.</li>
              <li>
                2. Request the affected resource: <code className="text-primary">{f.asset}</code>.
              </li>
              <li>3. Compare the observed response against the expected access control policy.</li>
              <li>4. Confirm the result using the linked redacted evidence artifacts.</li>
            </ol>
          </Panel>
          <Panel title="Technical Analysis">
            <p className="text-xs leading-6 text-muted-foreground">
              The observation was correlated across {f.evidence.length} evidence artifact
              {f.evidence.length === 1 ? "" : "s"}. The finding is assigned{" "}
              <strong className="text-foreground">{f.confidence.toLowerCase()} confidence</strong>{" "}
              based on reproducibility and available evidence. Severity is communicated
              independently using CVSS v4.0 and does not itself prove the finding.
            </p>
            <div className="mt-5 break-all rounded-md border border-border bg-secondary p-4 font-mono text-[11px] text-muted-foreground">
              CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:L
            </div>
          </Panel>
          <Panel title="Recommended Fix">
            <p className="text-sm leading-7 text-muted-foreground">{f.fix}</p>
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
              Part of the World Monitor application surface.
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
                  notify("Demo re-test queued; no security scan was run.");
                }}
                icon={Play}
              >
                Re-test
              </Action>
              <Action
                icon={Download}
                onClick={() =>
                  exportText(
                    `${f.id}.txt`,
                    `${f.title}\n${f.summary}\n\nEvidence: ${f.evidence.join(", ")}\nFix: ${f.fix}`,
                  )
                }
              >
                Export
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
              <option>Alex Morgan</option>
            </select>
          </label>
          <Button
            onClick={() => {
              updateFinding(id, { owner });
              notify(`Assigned to ${owner} for this demo session.`);
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
  const { notify } = useSentinel();
  const item = evidence.find((e) => e.id === activeId);
  if (!item) return <Empty text="Evidence not found" />;
  const related = evidence.filter((e) => e.finding === item.finding);
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
          Sensitive values are redacted in this demonstration.
        </span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[215px_minmax(0,1fr)_260px]">
        <Panel title="Evidence Timeline" sub="Select an artifact">
          <div className="space-y-2">
            {related.map((e) => (
              <Button
                key={e.id}
                variant="ghost"
                onClick={() => setActiveId(e.id)}
                className={`h-auto w-full flex-col items-start gap-1 rounded-md border p-3 text-left text-xs ${activeId === e.id ? "border-primary bg-accent" : "border-border bg-secondary"}`}
              >
                <span className="font-semibold">
                  {e.id} · {e.type}
                </span>
                <span className="text-[10px] font-normal text-muted-foreground">{e.time}</span>
              </Button>
            ))}
          </div>
        </Panel>
        <Panel
          title={item.type}
          sub={`${item.id} · ${item.source}`}
          action={
            <Action onClick={() => setCompare((v) => !v)} variant={compare ? "default" : "outline"}>
              Compare
            </Action>
          }
        >
          <div className="overflow-x-auto rounded-md border border-border bg-background p-4 sm:p-6">
            <pre className="min-h-[350px] whitespace-pre-wrap break-all font-mono text-[11px] leading-6 text-foreground sm:text-xs">
              {item.content}
            </pre>
          </div>
          {compare && (
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
                ["Assessment", "World Monitor"],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-border pb-3">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="mt-1 font-medium">{v}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Related Finding">
            <div className="text-sm font-medium">
              {seedFindings.find((f) => f.id === item.finding)?.title}
            </div>
            <div className="mt-2">
              <Badge tone={seedFindings.find((f) => f.id === item.finding)?.severity ?? "Informational"}>
                {seedFindings.find((f) => f.id === item.finding)?.severity}
              </Badge>
            </div>
            <div className="mt-5">
              <SectionLink to="/findings/$id" params={{ id: item.finding }}>
                Open investigation
              </SectionLink>
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
                    <div className="mt-1 text-[10px] text-muted-foreground">{f.id}</div>
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
                      <option>Alex Morgan</option>
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
                        notify("Demo remediation status updated.");
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
                        notify("Demo re-test requested. No real scan was run.");
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
  const [comparison, setComparison] = useState<"Before" | "After">("After");
  const data =
    comparison === "Before"
      ? { score: 54, critical: 6, high: 17, medium: 31 }
      : { score: 82, critical: 1, high: 6, medium: 19 };
  return (
    <>
      <PageHeading
        title="Security Posture"
        description="Measure the change in exposure as findings move through verification."
        actions={<SectionLink to="/reports">Open assessment report</SectionLink>}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Current Security Score"
          value="82/100"
          change="+28"
          icon={ShieldCheck}
          tone="success"
        />
        <Metric label="Risk Reduction" value="52%" icon={ArrowDownRight} tone="success" />
        <Metric label="Resolved Findings" value="28" icon={CheckCircle2} tone="success" />
        <Metric label="Coverage" value="86%" icon={Target} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Security Score Trend" sub="Progress across recent assessments">
          <TrendChart />
        </Panel>
        <Panel title="Open Vulnerabilities" sub="Reduction in unresolved findings">
          <TrendChart mode="open" />
        </Panel>
      </div>
      <div className="my-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-2">MEASURABLE IMPROVEMENT</div>
          <h2 className="text-xl font-semibold">Before vs After Security Posture</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Compare the initial assessment with the post-remediation re-test.
          </p>
        </div>
        <div className="flex rounded-md border border-border bg-secondary p-1">
          {(["Before", "After"] as const).map((v) => (
            <Button
              key={v}
              onClick={() => setComparison(v)}
              variant={comparison === v ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
            >
              {v}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_200px_1fr]">
        <div className={`panel p-6 ${comparison === "Before" ? "border-high" : ""}`}>
          <div className="eyebrow text-high">BEFORE REMEDIATION</div>
          <div className="mt-7 flex items-end gap-2">
            <strong className="text-5xl font-semibold">54</strong>
            <span className="mb-1 text-sm text-muted-foreground">/100 security score</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded bg-secondary">
            <div className="h-full w-[54%] rounded bg-high" />
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-border pt-5">
            {[
              ["Critical", "6", "text-critical"],
              ["High", "17", "text-high"],
              ["Medium", "31", "text-medium"],
            ].map(([k, v, c]) => (
              <div key={k}>
                <div className={`text-2xl font-semibold ${c}`}>{v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-2 text-center">
          <ArrowRight size={23} className="text-success" />
          <div className="text-2xl font-semibold text-success">+28</div>
          <div className="text-xs text-muted-foreground">score improvement</div>
          <div className="mt-2 rounded border border-success/25 bg-success/10 px-3 py-1.5 text-[11px] text-success">
            52% risk reduction
          </div>
        </div>
        <div className={`panel p-6 ${comparison === "After" ? "border-success" : ""}`}>
          <div className="eyebrow text-success">AFTER VERIFICATION</div>
          <div className="mt-7 flex items-end gap-2">
            <strong className="text-5xl font-semibold">82</strong>
            <span className="mb-1 text-sm text-muted-foreground">/100 security score</span>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded bg-secondary">
            <div className="h-full w-[82%] rounded bg-success" />
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-border pt-5">
            {[
              ["Critical", "1", "text-critical"],
              ["High", "6", "text-high"],
              ["Medium", "19", "text-medium"],
            ].map(([k, v, c]) => (
              <div key={k}>
                <div className={`text-2xl font-semibold ${c}`}>{v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title={`${comparison} Snapshot`} sub="Selected assessment state">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border border-border bg-secondary p-4">
              <div className="text-xs text-muted-foreground">Security score</div>
              <div className="mt-2 text-2xl font-semibold">{data.score}/100</div>
            </div>
            <div className="rounded border border-border bg-secondary p-4">
              <div className="text-xs text-muted-foreground">Critical + high</div>
              <div className="mt-2 text-2xl font-semibold">{data.critical + data.high}</div>
            </div>
          </div>
        </Panel>
        <Panel
          title="Security Category Coverage"
          sub="Assessment coverage across application layers"
        >
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                title={["Authorization", "API Security", "Dependencies", "Authentication"][i % 4]}
                key={i}
                className={`aspect-square rounded-sm ${i % 7 === 0 ? "bg-high/70" : i % 5 === 0 ? "bg-primary/40" : "bg-success/60"}`}
              />
            ))}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            86% of prioritized categories tested · 4 gaps remain
          </div>
        </Panel>
      </div>
    </>
  );
}
const reportTypes = [
  "Executive Security Report",
  "Technical Vulnerability Report",
  "Remediation Report",
  "Assessment Summary",
];
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
            onClick={() => {
              notify("Demo report preview generated.");
              navigate({ to: "/reports/$id", params: { id: "executive" } });
            }}
          >
            Generate Report
          </Action>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {reportTypes.map((x, i) => (
          <Link
            to="/reports/$id"
            params={{ id: ["executive", "technical", "remediation", "summary"][i] ?? "executive" }}
            key={x}
            className="panel block p-5 hover:border-primary"
          >
            <FileText size={20} className="text-primary" />
            <div className="mt-6 text-sm font-semibold">{x}</div>
            <div className="mt-2 text-xs text-muted-foreground">World Monitor · 27 Sep 2026</div>
            <div className="mt-5 text-xs text-primary">Preview report →</div>
          </Link>
        ))}
      </div>
      <Panel title="Generated Reports" sub="Report previews for the demonstration assessment">
        <div className="overflow-x-auto">
          <table className={`${table} min-w-[550px]`}>
            <thead>
              <tr>
                {["Report", "Assessment", "Generated", "Risk", "Status", "Actions"].map((x) => (
                  <th key={x} className={th}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportTypes.map((x, i) => (
                <tr key={x}>
                  <td className={td}>{x}</td>
                  <td className={`${td} text-muted-foreground`}>World Monitor</td>
                  <td className={td}>27 Sep 2026</td>
                  <td className={td}>
                    <Badge tone="High">Elevated</Badge>
                  </td>
                  <td className={td}>
                    <Badge tone="Completed">Ready</Badge>
                  </td>
                  <td className={td}>
                    <SectionLink
                      to="/reports/$id"
                      params={{ id: ["executive", "technical", "remediation", "summary"][i] }}
                    >
                      Preview
                    </SectionLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
export function ReportDetail({ id }: { id: string }) {
  const { notify } = useSentinel();
  const title =
    reportTypes[["executive", "technical", "remediation", "summary"].indexOf(id)] || "Executive Security Report";
  return (
    <>
      <PageHeading
        eyebrow="REPORTS / WORLD MONITOR"
        title={title}
        description="World Monitor Security Assessment · Generated 27 Sep 2026"
        actions={
          <>
            <Action
              icon={Download}
              onClick={() =>
                exportText(
                  `sentinel-${id}-report.txt`,
                  `${title}\nWorld Monitor Security Assessment\nScore: 72/100\nCritical: 3 | High: 12 | Medium: 18\n\n${seedFindings.map((f) => `${f.id}: ${f.title} — ${f.severity}\n${f.summary}`).join("\n\n")}`,
                )
              }
            >
              Export Report
            </Action>
            <Action
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                notify("Report preview link copied.");
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
              Evidence-driven assessment of world-monitor.local
            </p>
          </div>
          <ShieldCheck size={32} className="text-primary" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            ["Security Score", "72/100"],
            ["Critical", "3"],
            ["High", "12"],
            ["Remediation", "68%"],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="eyebrow">{k}</div>
              <div className="mt-2 text-2xl font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 space-y-9">
          {[
            [
              "Executive Summary",
              "The World Monitor assessment found 51 findings across 48 assets. The current security score is 72/100, with authorization and API security requiring the most urgent attention.",
            ],
            [
              "Assessment Scope",
              "Web application, API endpoints, dependencies, authentication, authorization, configuration, and client-side controls. 132 endpoints and 76 dependencies were represented in this assessment.",
            ],
            [
              "Risk Distribution",
              "3 critical · 12 high · 18 medium · 7 low · 11 informational findings. Severity is based on risk scoring; evidence confidence is assessed separately.",
            ],
            [
              "Critical Findings",
              "Missing Authorization Check: an authenticated non-admin user can access administrative records. Evidence artifacts EV-1042, EV-1043 and EV-1044 document the request, response and validation.",
            ],
            [
              "Evidence Summary",
              "Evidence artifacts include redacted HTTP requests, responses, scanner output, configuration observations and dependency information.",
            ],
            [
              "Remediation Status",
              "68% of remediation work is in progress or verified. Findings are only considered closed after a confirming re-test.",
            ],
            [
              "Before vs After",
              "Security score improved from 54 to 82 in the simulated post-remediation comparison; critical findings decreased from 6 to 1.",
            ],
            [
              "Recommendations",
              "Prioritize server-side authorization checks, remove production debug routes, update vulnerable dependencies and verify every fix with a re-test.",
            ],
            [
              "Technical Appendix",
              "CVSS v4.0 communicates standardized severity. It is not proof of exploitability; the evidence chain supports each finding.",
            ],
          ].map(([heading, body]) => (
            <section key={heading} className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold">{heading}</h3>
              <p className="mt-2 text-xs leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
        <div className="mt-10 border-t border-border pt-6 text-[11px] text-muted-foreground">
          SENTINEL · Demonstration report using mock data · Not a real security assessment
        </div>
      </div>
    </>
  );
}
export function Copilot() {
  const [text, setText] = useState(""),
    [messages, setMessages] = useState<{ who: string; text: string }[]>([
      {
        who: "assistant",
        text: "I can help explain the World Monitor assessment. Responses here are simulated suggestions based on the demo findings.",
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
  const send = (prompt: string) => {
    if (!prompt.trim()) return;
    const p = prompt.toLowerCase();
    const reply = p.includes("evidence")
      ? "Three redacted artifacts document the authorization gap: an analyst-level request, an HTTP 200 response exposing administrative records, and repeatable validation output."
      : p.includes("remediation") || p.includes("fix")
        ? "Suggested approach: enforce server-side role checks on all administrative routes, add negative authorization tests, deploy the change, then verify with a non-admin account."
        : p.includes("re-test")
          ? "During re-test, confirm the same non-admin request now returns 403, verify no sensitive fields are returned, and check that authorized admin access still works."
          : p.includes("previous")
            ? "The simulated baseline score was 54, compared with 82 after remediation. Critical findings decreased from 6 to 1."
            : p.includes("high risk")
              ? "The administrative endpoint exposes sensitive records to a lower-privilege account. This creates a direct access-control failure with potentially broad data impact."
              : "In simple terms, an ordinary signed-in user can reach an admin-only endpoint. The linked HTTP evidence shows the server returned user records instead of denying access.";
    setMessages((v) => [...v, { who: "user", text: prompt }, { who: "assistant", text: reply }]);
    setText("");
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
              Simulated suggestions · verify against linked evidence before acting
            </p>
          </div>
          <div className="scrollbar flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-md border p-4 text-xs leading-6 ${m.who === "user" ? "ml-auto border-primary/25 bg-accent" : "border-border bg-secondary"}`}
              >
                {m.who === "assistant" && (
                  <div className="eyebrow mb-2 text-primary">SIMULATED AI SUGGESTION</div>
                )}
                {m.text}
              </div>
            ))}
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
              <Button type="submit" size="sm">
                Send
              </Button>
            </form>
          </div>
        </div>
        <div className="space-y-4">
          <Panel title="Security Context">
            <div className="space-y-3 text-xs">
              {[
                ["Assessment", "World Monitor"],
                ["Selected finding", "Missing Authorization Check"],
                ["CVSS", "9.1 · Critical"],
                ["Evidence", "3 linked artifacts"],
                ["Affected asset", "/api/v1/admin/users"],
              ].map(([k, v]) => (
                <div key={k} className="border-b border-border pb-3">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="mt-1 break-all">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <SectionLink to="/findings/$id" params={{ id: "FND-001" }}>
                Inspect source finding
              </SectionLink>
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
        description="Manage your demonstration workspace preferences."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Profile">
          <div className="space-y-4">
            <Field label="Name" value="Alex Morgan" set={() => {}} placeholder="Name" />
            <Field label="Role" value="Security Analyst" set={() => {}} placeholder="Role" />
            <div className="text-xs text-muted-foreground">
              Demo profile · no account data is stored.
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
              ["Simulated AI suggestions", ai, setAi],
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
                    notify("Preference updated for this demo session.");
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
            verification before closure. Dark appearance is enabled for this demonstration.
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
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [remember, setRemember] = useState(true),
    [error, setError] = useState("");
  const signIn = () => {
    if (!email || !password) {
      setError("Enter an email and password, or continue with the demo.");
      return;
    }
    navigate({ to: "/dashboard" });
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-9 text-center">
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck size={27} />
          </div>
          <div className="text-xl font-bold tracking-[.12em]">SENTINEL</div>
          <div className="mt-2 text-xs text-muted-foreground">
            EVIDENCE-DRIVEN SECURITY ASSESSMENT
          </div>
        </div>
        <div className="panel p-7">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Access the Security Assessment Platform demo.
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
                className="mt-2 border-border bg-secondary"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-primary"
              />
              Remember me
            </label>
            {error && <p className="text-xs text-critical">{error}</p>}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            OR
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/dashboard" })}
            className="w-full"
          >
            Continue with demo
          </Button>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo access only · No real authentication is performed.
        </p>
      </div>
    </div>
  );
}
