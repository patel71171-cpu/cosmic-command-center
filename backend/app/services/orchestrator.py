"""
SENTINEL — Pipeline orchestrator.
One "Run Assessment" job executes ZAP + Semgrep + OSV in parallel,
then aggregates + deduplicates into one Finding list.

Usage (Celery task wrapper):
    from pipeline.orchestrator import run_assessment
    run_assessment.delay(target_url="https://juice-shop", source_dir="/sandbox/src")

Or synchronous (demo/tests):
    findings = run_assessment("https://juice-shop", "/sandbox/src", sync=True)
"""
import hashlib
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from .pipeline_models import Finding, ToolName

try:  # ZAP client is optional — only needed when a ZAP daemon is available
    from .zap_scanner import ZapScanner
except Exception:  # pragma: no cover - depends on sandbox extras
    ZapScanner = None

try:  # Semgrep binary is optional
    from .semgrep_scanner import SemgrepScanner
except Exception:  # pragma: no cover - depends on sandbox extras
    SemgrepScanner = None

try:  # OSV scanner needs network access to the OSV API
    from .osv_scanner import OsvScanner
except Exception:  # pragma: no cover - depends on sandbox extras
    OsvScanner = None


def _dedupe_key(f: Finding) -> str:
    """Stable dedup key: same vuln from different tools collapses into one Finding."""
    raw = f"{f.title.lower().strip()}|{(f.path or '').split('?')[0].lower()}|{f.parameter or ''}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _merge(into: Finding, other: Finding) -> Finding:
    """Merge duplicate findings: union evidence, ids, refs; keep max severity."""
    rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}
    if rank[other.severity.value] > rank[into.severity.value]:
        into.severity = other.severity
    into.evidence += other.evidence
    into.owasp_wstg_ids = sorted(set(into.owasp_wstg_ids + other.owasp_wstg_ids))
    into.owasp_api_top10 = sorted(set(into.owasp_api_top10 + other.owasp_api_top10))
    into.cve_ids = sorted(set(into.cve_ids + other.cve_ids))
    into.references = sorted(set(into.references + other.references))
    return into


def _run_tool(tool: ToolName, target_url: Optional[str], source_dir: Optional[str]):
    try:
        if tool == ToolName.ZAP and target_url:
            if ZapScanner is None:
                raise RuntimeError("ZAP client not installed (pip install python-owasp-zap-v2)")
            return ZapScanner().scan(target_url)
        if tool == ToolName.SEMGREP and source_dir:
            if SemgrepScanner is None:
                raise RuntimeError("Semgrep not installed")
            return SemgrepScanner(source_dir).scan()
        if tool == ToolName.OSV and source_dir:
            if OsvScanner is None:
                raise RuntimeError("OSV scanner not available")
            return OsvScanner().scan(source_dir)
    except Exception as e:
        print(f"[PIPELINE] {tool.value} failed: {e}")
    return []


def run_assessment(target_url: Optional[str] = None,
                   source_dir: Optional[str] = None,
                   sync: bool = False) -> List[Finding]:
    """
    Executes all applicable scanners IN PARALLEL, aggregates and dedupes.
    Returns the final Finding list (to be saved to PostgreSQL by the API layer).
    """
    tools = [t for t, ok in [
        (ToolName.ZAP, bool(target_url)),
        (ToolName.SEMGREP, bool(source_dir)),
        (ToolName.OSV, bool(source_dir)),
    ] if ok]

    print(f"[PIPELINE] Starting assessment: {tools}")
    if sync:
        results = {t: _run_tool(t, target_url, source_dir) for t in tools}
    else:
        with ThreadPoolExecutor(max_workers=3) as pool:
            results = dict(zip(tools, pool.map(
                lambda t: _run_tool(t, target_url, source_dir), tools)))

    # ---- aggregate + dedupe ----
    merged: dict[str, Finding] = {}
    for tool in tools:
        for f in results.get(tool, []):
            key = _dedupe_key(f)
            if key in merged:
                _merge(merged[key], f)
            else:
                merged[key] = f

    findings = list(merged.values())
    print(f"[PIPELINE] Done: {sum(len(v) for v in results.values())} raw "
          f"-> {len(findings)} deduped findings")
    return findings
