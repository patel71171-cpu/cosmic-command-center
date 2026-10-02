"""
SENTINEL — Semgrep scanner (SAST).
Runs INSIDE the sandbox on uploaded source / cloned repo, parses SARIF.
Prereq: `semgrep` binary available in sandbox (official image: returntocorp/semgrep).
Usage:
  findings = SemgrepScanner(workdir="/sandbox/src").scan()
"""
import json
import subprocess
from pathlib import Path
from typing import List
from .pipeline_models import Finding, Severity, ToolName, Evidence

# Semgrep severity -> our Severity
SEVERITY_MAP = {
    "ERROR": Severity.HIGH, "WARNING": Severity.MEDIUM,
    "INFO": Severity.LOW, "INVENTORY": Severity.INFO,
}

# Semgrep rule-id pattern -> OWASP WSTG + API Top 10
def _classify(rule_id: str) -> tuple:
    r = rule_id.lower()
    if "sqli" in r or "sql" in r:           return ["WSTG-INPV-005"], ["API8:2023"]
    if "xss" in r:                          return ["WSTG-INPV-002"], ["API8:2023"]
    if "csrf" in r:                         return ["WSTG-SESS-005"], ["API2:2023"]
    if "jwt" in r:                          return ["WSTG-ATHN-006"], ["API2:2023"]
    if "idor" in r or "bola" in r:          return ["WSTG-ATHZ-004"], ["API1:2023"]
    if "ssrf" in r:                         return ["WSTG-INPV-019"], ["API7:2023"]
    if "xxe" in r:                          return ["WSTG-INPV-008"], ["API8:2023"]
    if "command" in r or "exec" in r:       return ["WSTG-INPV-012"], ["API8:2023"]
    if "path-traversal" in r or "traversal" in r: return ["WSTG-ATHZ-001"], ["API1:2023"]
    if "secret" in r or "hardcoded" in r:   return ["WSTG-CRYP-003"], ["API6:2023"]
    if "crypto" in r or "tls" in r:         return ["WSTG-CRYP"],     ["API2:2023"]
    if "deserialization" in r or "pickle" in r: return ["WSTG-INPV-011"], ["API8:2023"]
    if "mass-assignment" in r or "binding" in r: return ["WSTG-INPV-021"], ["API3:2023"]
    if "logging" in r or "log4" in r:       return ["WSTG-ERRH"],    ["API8:2023"]
    if "cors" in r:                         return ["WSTG-CLNT-001"], ["API8:2023"]
    if "rate" in r or "throttle" in r:      return ["WSTG-BUSL-005"], ["API4:2023"]
    return ["WSTG-MISC"], []


class SemgrepScanner:
    def __init__(self, workdir: str, config: str = "auto"):
        self.workdir = Path(workdir)
        self.config = config  # "auto" = p/ci registry; or path to custom rules.yml

    def scan(self) -> List[Finding]:
        out_file = self.workdir / ".semgrep.sarif"
        cmd = ["semgrep", "--config", self.config, "--sarif", "-o", str(out_file),
               "--metrics=off", str(self.workdir)]
        subprocess.run(cmd, check=False, capture_output=True, timeout=1800)

        sarif = json.loads(out_file.read_text()) if out_file.exists() else {"runs": []}
        out_file.unlink(missing_ok=True)
        return self._sarif_to_findings(sarif)

    def _sarif_to_findings(self, sarif: dict) -> List[Finding]:
        findings = []
        for run in sarif.get("runs", []):
            rules = {r["id"]: r for r in run.get("tool", {}).get("driver", {}).get("rules", [])}
            for res in run.get("results", []):
                rule_id = res.get("ruleId", "unknown-rule")
                rule = rules.get(rule_id, {})
                loc = res["locations"][0]["physicalLocation"]
                file_path = loc["artifactLocation"]["uri"]
                region = loc.get("region", {})
                line = region.get("startLine", 0)
                level = res.get("level", "warning").upper()
                wstg, api = _classify(rule_id)

                findings.append(Finding(
                    title=rule.get("name") or rule_id,
                    description=rule.get("shortDescription", {}).get("text", rule_id),
                    severity=SEVERITY_MAP.get(level, Severity.LOW),
                    owasp_wstg_ids=wstg,
                    owasp_api_top10=api,
                    tool=ToolName.SEMGREP,
                    evidence=[Evidence(source=ToolName.SEMGREP,
                                       artifact_type="sarif_result", raw=res)],
                    path=f"{file_path}:{line}",
                    parameter=rule_id,
                    fingerprint=f"semgrep:{rule_id}:{file_path}:{line}",
                    references=rule.get("helpUri") and [rule["helpUri"]] or [],
                ))
        return findings
