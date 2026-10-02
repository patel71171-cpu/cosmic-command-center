"""
SENTINEL — OSV (Open Source Vulnerabilities) scanner (SCA).
Feeds dependency manifests to the OSV batch API, maps CVEs/GHSAs to Findings.

Usage:
  findings = OsvScanner().scan("/sandbox/src")
  # auto-detects package-lock.json / requirements.txt / pom.xml / go.mod / Cargo.toml
"""
import json
import requests
from pathlib import Path
from typing import List, Dict
from .pipeline_models import Finding, Severity, ToolName, Evidence

OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"

MANIFESTS = {
    "package-lock.json": "npm", "yarn.lock": "npm",
    "requirements.txt": "PyPI", "Pipfile.lock": "PyPI", "poetry.lock": "PyPI",
    "pom.xml": "Maven", "package.json": "npm", "go.mod": "Go",
    "Cargo.lock": "crates.io", "composer.lock": "Packagist", "Gemfile.lock": "RubyGems",
}

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


class OsvScanner:
    def __init__(self, timeout: int = 30):
        self.timeout = timeout

    def scan(self, project_dir: str) -> List[Finding]:
        queries = self._collect_queries(Path(project_dir))
        if not queries:
            return []
        resp = requests.post(OSV_BATCH_URL,
                             json={"queries": queries}, timeout=self.timeout)
        resp.raise_for_status()
        return self._osv_to_findings(resp.json()["results"], queries)

    # ---------- manifest parsing ----------
    def _collect_queries(self, root: Path) -> List[Dict]:
        queries = []
        for name, ecosystem in MANIFESTS.items():
            for manifest in root.rglob(name):
                for pkg, ver in self._parse(manifest, name):
                    queries.append({"package": {"name": pkg, "ecosystem": ecosystem},
                                    "version": ver})
        return queries

    def _parse(self, path: Path, name: str):
        try:
            if name in ("package-lock.json", "yarn.lock"):
                data = json.loads(path.read_text())
                pkgs = data.get("packages") or data.get("dependencies") or {}
                for k, v in pkgs.items():
                    if k and v.get("version"):
                        yield k.replace("node_modules/", "").split("/")[-1] if "/" in k else k, v["version"]
            elif name in ("requirements.txt",):
                for line in path.read_text().splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "==" in line:
                        pkg, _, ver = line.partition("==")
                        yield pkg.strip(), ver.strip().split(";")[0].split(" ")[0]
            elif name in ("Pipfile.lock", "poetry.lock", "Cargo.lock", "composer.lock", "Gemfile.lock"):
                data = json.loads(path.read_text())
                pkgs = (data.get("default") or data.get("package") or
                        data.get("packages") or {})
                for pkg, meta in pkgs.items():
                    ver = meta.get("version", "").lstrip("=") if isinstance(meta, dict) else str(meta)
                    if ver:
                        yield pkg, ver
            elif name == "go.mod":
                for line in path.read_text().splitlines():
                    parts = line.strip().split()
                    if len(parts) >= 2 and not parts[0].startswith("//"):
                        yield parts[0].split("/")[-1], parts[1]
            elif name == "pom.xml":
                import re
                txt = path.read_text()
                for m in re.finditer(r"<dependency>.*?<artifactId>(.*?)</artifactId>.*?<version>(.*?)</version>.*?</dependency>", txt, re.S):
                    yield m.group(1).strip(), m.group(2).strip()
            elif name == "package.json":
                data = json.loads(path.read_text())
                for pkg, ver in (data.get("dependencies") or {}).items():
                    yield pkg, ver.lstrip("^~")
        except Exception:
            return  # skip unreadable manifests

    # ---------- OSV response -> Findings ----------
    def _osv_to_findings(self, results: List, queries: List[Dict]) -> List[Finding]:
        findings = []
        for query, vulns in zip(queries, results):
            pkg = query["package"]["name"]
            for v in (vulns or {}).get("vulns", []):
                sev = self._severity(v)
                findings.append(Finding(
                    title=f"{pkg}@{query['version']}: {v.get('summary', v['id'])}",
                    description=v.get("details", v.get("summary", ""))[:2000],
                    severity=sev,
                    owasp_wstg_ids=["WSTG-INPV"],      # vulnerable components
                    owasp_api_top10=["API10:2023"] if sev in (Severity.CRITICAL, Severity.HIGH) else [],
                    tool=ToolName.OSV,
                    evidence=[Evidence(source=ToolName.OSV, artifact_type="osv_vuln", raw=v)],
                    parameter=pkg,
                    fingerprint=f"osv:{pkg}:{v['id']}",
                    cve_ids=[a["value"] for a in v.get("aliases", []) if a["value"].startswith("CVE")],
                    references=[r["url"] for r in v.get("references", [])][:5],
                ))
        return findings

    @staticmethod
    def _severity(vuln: dict) -> Severity:
        score = 0.0
        for s in vuln.get("severity", []):
            if s.get("type", "").startswith("CVSS"):
                try:
                    from cvss import CVSS3
                    score = max(score, CVSS3(s["score"]).base_score)
                except Exception:
                    pass
        if score >= 9:   return Severity.CRITICAL
        if score >= 7:   return Severity.HIGH
        if score >= 4:   return Severity.MEDIUM
        if score > 0:    return Severity.LOW
        return Severity.MEDIUM  # no CVSS -> default medium
