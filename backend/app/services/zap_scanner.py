"""
SENTINEL — OWASP ZAP scanner (DAST).
Runs inside an isolated Docker sandbox. Maps every ZAP alert to
OWASP WSTG test IDs and OWASP API Security Top 10 categories.

Prereq (in sandbox): ZAP daemon listening on port 8090:
  docker run --network sentinel_scan -e ZAP_API_KEY=... owasp/zap2docker-stable \
      zap.sh -daemon -host 0.0.0.0 -port 8090 -config api.key=$ZAP_API_KEY

Usage:
  findings = ZapScanner(zap_url="http://zap:8090", api_key="...").scan("https://target")
"""
from typing import List

from .pipeline_models import Finding, Severity, ToolName, Evidence

try:
    from zapv2 import ZAPv2                       # pip install python-owasp-zap-v2
except ImportError:  # ZAP client lives in the scan sandbox, not the API host
    ZAPv2 = None


# ZAP alert-ID prefix -> OWASP WSTG chapter
WSTG_MAP = {
    "0":   ["WSTG-INFO"],  # Information Disclosure
    "10000": ["WSTG-CLNT"], # Client/browser issues (example: ReDoS)
    "10010": ["WSTG-SESS"], # Cookie flags
    "10011": ["WSTG-SESS"], # Cookie without SameSite
    "10015": ["WSTG-SESS"], # Incomplete backward cache protection
    "10016": ["WSTG-CONF"], # Web Browser XSS Protection
    "10017": ["WSTG-CLNT"], # Cross-Domain JavaScript Source File Inclusion
    "10019": ["WSTG-CONF"], # Content-Type header missing
    "10020": ["WSTG-SESS"], # Anti-clickjacking header
    "10021": ["WSTG-SESS"], # X-Content-Type-Options
    "10023": ["WSTG-INFO"], # Information Disclosure: debug errors
    "10024": ["WSTG-INFO"], # Information Disclosure: sensitive info in URL
    "10025": ["WSTG-INFO"], # Information Disclosure: sensitive info in HTTP referer
    "10026": ["WSTG-CONF"], # HTTP Parameter Override
    "10027": ["WSTG-INFO"], # Suspicious comments
    "10028": ["WSTG-INFO"], # Open redirect
    "10029": ["WSTG-INFO"], # Cookie poisoning
    "10032": ["WSTG-CRYP"], # Viewstate without MAC
    "10034": ["WSTG-ATHN"], # Weak authentication
    "10035": ["WSTG-CRYP"], # Strict-Transport-Security
    "10036": ["WSTG-CONF"], # Server leaks version
    "10037": ["WSTG-CONF"], # Server leaks info via X-Powered-By
    "10038": ["WSTG-CRYP"], # Content-Security-Policy
    "10040": ["WSTG-APIT"], # HttpOnly cookie
    "10045": ["WSTG-BUSL"], # Insecure JS form validation (port scan example)
    "10048": ["WSTG-APIT"], # Remote Code Execution
    "10049": ["WSTG-BUSL"], # Image data exfil via CSS
    "10052": ["WSTG-CRYP"], # X-ChromeLogger-Data
    "10054": ["WSTG-CRYP"], # Cookie without SameSite (dup handled)
    "10055": ["WSTG-CONF"], # CSP scanner
    "10056": ["WSTG-ATHZ"], # X-Debug-Token
    "10057": ["WSTG-ATHZ"], # Username hash found
    "10061": ["WSTG-INPV"], # Base64 disclosure
    "10062": ["WSTG-ATHN"], # JWT weaknesses
    "10063": ["WSTG-ATHN"], # Feature policy
    "10070": ["WSTG-INPV"], # Vulnerable JS libraries
    "10094": ["WSTG-INPV"], # Base64 disclosure (alt)
    "10095": ["WSTG-INPV"], # Backup file disclose
    "10096": ["WSTG-INPV"], # Timestamp disclosure
    "10097": ["WSTG-INPV"], # Hash disclosure
    "10098": ["WSTG-INPV"], # Cross-Domain Misconfiguration
    "10099": ["WSTG-INPV"], # Source code disclosure
    "10104": ["WSTG-CRYP"], # Weak TLS/SSL ciphers
    "10105": ["WSTG-INPV"], # Weak file permissions
    "10106": ["WSTG-INPV"], # Suspicious path traversal
    "10107": ["WSTG-INPV"], # Server-side include
    "10108": ["WSTG-INPV"], # Reverse proxy bypass
    "10109": ["WSTG-INPV"], # JSONP endpoint
    "10110": ["WSTG-INPV"], # JS library vulns
    "10201": ["WSTG-INPV"], # SSI injection
    "10202": ["WSTG-INPV"], # XPath injection
    "10203": ["WSTG-INPV"], # XXE
    "10204": ["WSTG-INPV"], # SSRF
    "10205": ["WSTG-INPV"], # Remote file inclusion
    "40009": ["WSTG-INPV"], # Server side include
    "40012": ["WSTG-INPV"], # Cross site scripting (reflected)
    "40013": ["WSTG-INPV"], # Session fixation
    "40014": ["WSTG-INPV"], # Cross site scripting (persistent)
    "40015": ["WSTG-INPV"], # LDAP injection
    "40016": ["WSTG-INPV"], # WebSocket XSS
    "40017": ["WSTG-INPV"], # SQL injection (hypersonic)
    "40018": ["WSTG-INPV"], # SQL injection
    "40019": ["WSTG-INPV"], # SQL injection MySQL
    "40020": ["WSTG-INPV"], # SQL injection Hypersonic (dup)
    "40021": ["WSTG-INPV"], # SQL injection Oracle
    "40022": ["WSTG-INPV"], # SQL injection PostgreSQL
    "40023": ["WSTG-INPV"], # SQL injection MsSQL
    "40024": ["WSTG-INPV"], # SQL injection SQLite
    "40025": ["WSTG-INPV"], # Proxy disclosure
    "40026": ["WSTG-INPV"], # Cross site scripting DOM
    "40027": ["WSTG-INPV"], # SQL injection MsSQL (alt)
    "40028": ["WSTG-INPV"], # EL injection
    "40029": ["WSTG-INPV"], # HPP
    "40030": ["WSTG-INPV"], # SOAP action spoofing
    "40031": ["WSTG-INPV"], # XML external entity
    "40032": ["WSTG-INPV"], # XSS JSON
    "40033": ["WSTG-INPV"], # NoSQL injection
    "40034": ["WSTG-INPV"], # Session fixation (alt)
    "40035": ["WSTG-INPV"], # SSRF (alt)
    "40036": ["WSTG-INPV"], # JWT (alt)
    "40038": ["WSTG-INPV"], # Bypassing 403
    "40039": ["WSTG-INPV"], # NoSQL injection (alt)
    "40040": ["WSTG-INPV"], # CORS misconfig
    "40041": ["WSTG-INPV"], # File upload XSS
    "40042": ["WSTG-INPV"], # Spring4Shell
    "40043": ["WSTG-INPV"], # Log4Shell
    "40044": ["WSTG-INPV"], # SSRF (via XXE)
    "50001": ["WSTG-APIT"], # API SOAP
    "6":     ["WSTG-ATHZ"], # Path traversal
    "7":     ["WSTG-INPV"], # Remote include
    "90001": ["WSTG-INPV"], # Buffer overflow
    "90002": ["WSTG-INPV"], # Format string error
    "90019": ["WSTG-INPV"], # Server-side include
    "90020": ["WSTG-INPV"], # Remote OS command injection
    "90021": ["WSTG-INPV"], # XPath injection (alt)
    "90022": ["WSTG-INPV"], # Application error disclosure
    "90023": ["WSTG-INPV"], # XML external entity (alt)
    "90024": ["WSTG-INPV"], # Generic padding oracle
    "90025": ["WSTG-INPV"], # Expression language injection
    "90026": ["WSTG-INPV"], # CRLF injection
    "90027": ["WSTG-INPV"], # CBOR
    "90028": ["WSTG-INPV"], # Insecure HTTP methods
    "90029": ["WSTG-INPV"], # SOAP XML injection
    "90030": ["WSTG-INPV"], # SOAP XML attachment
    "90033": ["WSTG-INPV"], # Loosely scoped cookie
}

# Keyword -> OWASP API Security Top 10 (2023) category
API_TOP10_MAP = [
    (["bola", "object level", "idor", "path traversal", "mass assignment",
      "excessive data exposure", "6"], "API1:2023"),
    (["broken authentication", "jwt", "session fixation", "weak authentication",
      "34", "10062", "62", "feature policy", "63"], "API2:2023"),
    (["property", "mass assignment", "binding"], "API3:2023"),
    (["rate limit", "unrestricted resource", "resource consumption", "dos"], "API4:2023"),
    (["broken function level", "authorization", "function level"], "API5:2023"),
    (["sensitive", "pi", "personal data", "debug", "stack trace",
      "23", "24", "25"], "API6:2023"),
    (["ssrf", "server side request forgery"], "API7:2023"),
    (["injection", "sqli", "xss", "xxe", "nosql", "command injection",
      "ldap", "xpath", "ssi", "template", "log4shell"], "API8:2023"),
    (["improper inventory", "shadow api", "zombie"], "API9:2023"),
    (["unsafe consumption", "third party", "external api"], "API10:2023"),
]

SEVERITY_MAP = {
    "0": Severity.INFO, "1": Severity.LOW, "2": Severity.MEDIUM,
    "3": Severity.HIGH, "4": Severity.CRITICAL,
}


class ZapScanner:
    def __init__(self, zap_url: str = "http://zap:8090", api_key: str = ""):
        self.zap = ZAPv2(apikey=api_key, proxies={"http": zap_url, "https": zap_url})

    def scan(self, target: str, max_spider_minutes: int = 5) -> List[Finding]:
        """Full workflow: access target -> spider -> active scan -> harvest alerts."""
        print(f"[ZAP] Accessing target {target}")
        self.zap.urlopen(target)

        print("[ZAP] Spidering...")
        scan_id = self.zap.spider.scan(target)
        while int(self.zap.spider.status(scan_id)) < 100:
            pass  # poll; in prod add sleep + timeout

        print("[ZAP] Active scanning...")
        ascan_id = self.zap.ascan.scan(target)
        while int(self.zap.ascan.status(ascan_id)) < 100:
            pass  # poll; in prod add sleep + timeout

        return self._alerts_to_findings(target)

    def _alerts_to_findings(self, target: str) -> List[Finding]:
        findings = []
        for alert in self.zap.core.alerts():
            plugin_id = str(alert.get("pluginId", ""))
            name = alert.get("name", "Unknown")
            findings.append(Finding(
                title=name,
                description=alert.get("description", "")[:2000],
                severity=SEVERITY_MAP.get(str(alert.get("risk", "0")), Severity.INFO),
                owasp_wstg_ids=WSTG_MAP.get(plugin_id, ["WSTG-MISC"]),
                owasp_api_top10=self._api_top10(plugin_id, name),
                tool=ToolName.ZAP,
                evidence=[Evidence(source=ToolName.ZAP, artifact_type="zap_alert", raw=alert)],
                target_url=target,
                path=alert.get("uri"),
                parameter=alert.get("param") or None,
                fingerprint=f"zap:{plugin_id}:{alert.get('uri','')}:{alert.get('param','')}",
                references=[r.strip() for r in (alert.get("reference") or "").split("\n") if r.strip()],
            ))
        return findings

    @staticmethod
    def _api_top10(plugin_id: str, name: str) -> List[str]:
        haystack = f"{plugin_id} {name}".lower()
        return [cat for keys, cat in API_TOP10_MAP if any(k in haystack for k in keys)]
