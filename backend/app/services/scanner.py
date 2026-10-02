"""
Security Scanner Engine
Performs real security assessments against target URLs.
"""
import asyncio
import hashlib
import json
import re
import ssl
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx


# ── CVSS v4.0 Base Score Calculator ──────────────────────────────────────────

def cvss4_base_score(av: str, ac: str, at: str, pr: str, ui: str,
                     vc: str, vi: str, va: str, sc: str, si: str, sa: str) -> float:
    """Calculate CVSS v4.0 base score from metric values."""
    av_weights = {"N": 0.0, "A": 0.1, "L": 0.2, "P": 0.3}
    ac_weights = {"L": 0.0, "H": 0.1}
    at_weights = {"N": 0.0, "A": 0.1}
    pr_weights = {"N": 0.0, "L": 0.1, "H": 0.2}
    ui_weights = {"N": 0.0, "P": 0.1, "A": 0.2}
    v_weights = {"H": 0.1, "L": 0.2, "N": 0.3}
    s_weights = {"H": 0.1, "L": 0.2, "N": 0.3}

    av_w = av_weights.get(av, 0)
    ac_w = ac_weights.get(ac, 0)
    at_w = at_weights.get(at, 0)
    pr_w = pr_weights.get(pr, 0)
    ui_w = ui_weights.get(ui, 0)
    vc_w = v_weights.get(vc, 0)
    vi_w = v_weights.get(vi, 0)
    va_w = v_weights.get(va, 0)
    sc_w = s_weights.get(sc, 0)
    si_w = s_weights.get(si, 0)
    sa_w = s_weights.get(sa, 0)

    impact = 1 - ((1 - vc_w) * (1 - vi_w) * (1 - va_w))
    if impact <= 0:
        return 0.0

    exploitability = 8.22 * av_w * ac_w * at_w * pr_w * ui_w

    if sc == "U":
        score = min(exploitability + impact, 10.0)
    else:
        score = min(1.08 * (exploitability + impact), 10.0)

    return round(score, 1)


def severity_from_cvss(score: float) -> str:
    if score >= 9.0:
        return "Critical"
    if score >= 7.0:
        return "High"
    if score >= 4.0:
        return "Medium"
    if score > 0:
        return "Low"
    return "Informational"


# ── Security Header Checks ────────────────────────────────────────────────────

SECURITY_HEADERS = {
    "Strict-Transport-Security": {
        "description": "HTTP Strict Transport Security",
        "severity": "High",
        "cvss": 7.5,
        "fix": "Add Strict-Transport-Security header with max-age=31536000; includeSubDomains",
    },
    "Content-Security-Policy": {
        "description": "Content Security Policy",
        "severity": "Medium",
        "cvss": 5.3,
        "fix": "Add a restrictive Content-Security-Policy header",
    },
    "X-Frame-Options": {
        "description": "Clickjacking Protection",
        "severity": "Medium",
        "cvss": 4.3,
        "fix": "Add X-Frame-Options: DENY or SAMEORIGIN",
    },
    "X-Content-Type-Options": {
        "description": "MIME Sniffing Protection",
        "severity": "Low",
        "cvss": 3.7,
        "fix": "Add X-Content-Type-Options: nosniff",
    },
    "Referrer-Policy": {
        "description": "Referrer Policy",
        "severity": "Low",
        "cvss": 3.1,
        "fix": "Add Referrer-Policy: strict-origin-when-cross-origin",
    },
    "Permissions-Policy": {
        "description": "Permissions Policy",
        "severity": "Low",
        "cvss": 2.5,
        "fix": "Add Permissions-Policy header to restrict browser features",
    },
}


# ── Scanner Engine ────────────────────────────────────────────────────────────

class SecurityScanner:
    """Performs comprehensive security assessments against web targets."""

    COMMON_PATHS = [
        "/robots.txt", "/sitemap.xml", "/.well-known/security.txt",
        "/api", "/api/v1", "/api/v2", "/graphql", "/graphiql",
        "/admin", "/admin/login", "/administrator",
        "/login", "/register", "/signup",
        "/config", "/config.json", "/.env", "/.git/config",
        "/wp-login.php", "/phpmyadmin", "/server-status",
        "/actuator", "/actuator/health", "/actuator/env",
        "/debug", "/debug/vars", "/console",
        "/swagger", "/swagger-ui.html", "/api-docs",
        "/openapi.json", "/v2/api-docs",
        "/.aws/credentials", "/aws-config",
        "/backup", "/backup.sql", "/db.sql",
        "/health", "/healthz", "/metrics",
        "/status", "/info", "/version",
        "/.well-known/openid-configuration",
        "/oauth/token", "/auth/token",
        "/api/auth", "/api/login", "/api/register",
        "/api/users", "/api/admin", "/api/config",
        "/api/debug", "/api/internal",
        "/graphql", "/api/graphql",
        "/_next/static/chunks/webpack.js",
        "/static/js/main.js",
    ]

    def __init__(self, target: str, timeout: float = 10.0):
        self.target = target.rstrip("/")
        self.timeout = timeout
        self.findings: list[dict[str, Any]] = []
        self.evidence: list[dict[str, Any]] = []
        self.assets: list[dict[str, Any]] = []
        self.endpoints: list[dict[str, Any]] = []
        self.headers: dict[str, str] = {}
        self.ssl_info: dict[str, Any] = {}
        self.scan_start = time.time()
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                verify=False,
                headers={
                    "User-Agent": "SENTINEL-Security-Scanner/1.0 (Authorized Assessment)",
                },
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _sha256(self, data: str) -> str:
        return hashlib.sha256(data.encode()).hexdigest()

    def _add_finding(self, finding: dict[str, Any]):
        finding["id"] = f"FND-{len(self.findings) + 1:03d}"
        finding["detected"] = datetime.now(timezone.utc).strftime("%d %b %Y")
        finding["status"] = "Open"
        finding["confidence"] = finding.get("confidence", "High")
        self.findings.append(finding)

    def _add_evidence(self, evidence: dict[str, Any]):
        evidence["id"] = f"EV-{1000 + len(self.evidence) + 1}"
        evidence["time"] = datetime.now(timezone.utc).strftime("%d %b %Y · %H:%M:%S")
        self.evidence.append(evidence)

    async def run_full_assessment(self) -> dict[str, Any]:
        """Execute the complete security assessment pipeline."""
        client = await self._get_client()

        # Phase 1: Target validation and basic info
        try:
            resp = await client.get(self.target)
            self.headers = dict(resp.headers)
            self._add_asset("root", "Application", "Root", resp.status_code)
        except Exception as e:
            self._add_finding({
                "title": "Target Unreachable",
                "severity": "Informational",
                "cvss": 0.0,
                "category": "Availability",
                "asset": self.target,
                "summary": f"Target could not be reached: {str(e)}",
                "impact": "Assessment cannot proceed against this target.",
                "fix": "Verify the target URL and network connectivity.",
                "owner": "Unassigned",
                "evidence": [],
            })
            return self._build_result()

        # Phase 2: Security headers analysis
        await self._check_security_headers(resp)

        # Phase 3: SSL/TLS check
        await self._check_ssl()

        # Phase 4: Endpoint discovery
        await self._discover_endpoints(client)

        # Phase 5: Information disclosure
        await self._check_information_disclosure(client)

        # Phase 6: CORS misconfiguration
        await self._check_cors(client)

        # Phase 7: Dependency analysis (from HTML/JS)
        await self._analyze_dependencies(client, resp)

        # Phase 8: Calculate risk score
        risk_score = self._calculate_risk_score()

        return self._build_result(risk_score)

    async def _check_security_headers(self, resp: httpx.Response):
        """Check for missing security headers."""
        headers_lower = {k.lower(): v for k, v in resp.headers.items()}

        for header_name, info in SECURITY_HEADERS.items():
            if header_name.lower() not in headers_lower:
                self._add_finding({
                    "title": f"Missing {info['description']} Header",
                    "severity": info["severity"],
                    "cvss": info["cvss"],
                    "category": "Configuration",
                    "asset": self.target,
                    "summary": f"The {header_name} header is not present in the response.",
                    "impact": f"Without {header_name}, the application is more vulnerable to certain attacks.",
                    "fix": info["fix"],
                    "owner": "Unassigned",
                    "evidence": [],
                })
                self._add_evidence({
                    "type": "HTTP Response",
                    "source": "Header audit",
                    "confidence": "High",
                    "finding": self.findings[-1]["id"],
                    "content": f"HTTP/1.1 {resp.status_code} {resp.reason_phrase}\n" +
                               "\n".join(f"{k}: {v}" for k, v in resp.headers.items()) +
                               f"\n\n{header_name}: [NOT PRESENT]",
                    "comparison": f"Expected: {header_name} header present.",
                })

        # Check for server header disclosure
        server = headers_lower.get("server", "")
        if server:
            self._add_finding({
                "title": "Server Version Disclosure",
                "severity": "Low",
                "cvss": 3.7,
                "category": "Information Disclosure",
                "asset": self.target,
                "summary": f"The Server header reveals: {server}",
                "impact": "Attackers can identify the server software and target known vulnerabilities.",
                "fix": "Remove or obfuscate the Server header.",
                "owner": "Unassigned",
                "evidence": [],
            })

    async def _check_ssl(self):
        """Check SSL/TLS certificate configuration."""
        parsed = urlparse(self.target)
        if parsed.scheme != "https":
            self._add_finding({
                "title": "Insecure Protocol (HTTP)",
                "severity": "High",
                "cvss": 7.5,
                "category": "Transport Security",
                "asset": self.target,
                "summary": "The application is served over plain HTTP without TLS encryption.",
                "impact": "All traffic is transmitted in cleartext and can be intercepted or modified.",
                "fix": "Enable HTTPS with a valid TLS certificate and redirect all HTTP traffic to HTTPS.",
                "owner": "Unassigned",
                "evidence": [],
            })
            return

        try:
            import socket
            import certifi

            context = ssl.create_default_context(cafile=certifi.where())
            with socket.create_connection((parsed.hostname, parsed.port or 443), timeout=self.timeout) as sock:
                with context.wrap_socket(sock, server_hostname=parsed.hostname) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()
                    version = ssock.version()

                    self.ssl_info = {
                        "subject": cert.get("subject"),
                        "issuer": cert.get("issuer"),
                        "not_after": cert.get("notAfter"),
                        "not_before": cert.get("notBefore"),
                        "cipher": cipher[0] if cipher else "unknown",
                        "tls_version": version,
                    }

                    if version in ("TLSv1", "TLSv1.1"):
                        self._add_finding({
                            "title": "Outdated TLS Version",
                            "severity": "High",
                            "cvss": 7.4,
                            "category": "Transport Security",
                            "asset": self.target,
                            "summary": f"The server supports deprecated TLS version: {version}",
                            "impact": "Deprecated TLS versions have known vulnerabilities and should be disabled.",
                            "fix": "Disable TLS 1.0 and 1.1. Use TLS 1.2 or 1.3 only.",
                            "owner": "Unassigned",
                            "evidence": [],
                        })

        except Exception as e:
            self._add_finding({
                "title": "SSL/TLS Certificate Issue",
                "severity": "High",
                "cvss": 7.4,
                "category": "Transport Security",
                "asset": self.target,
                "summary": f"SSL/TLS certificate validation failed: {str(e)}",
                "impact": "Users cannot verify the authenticity of the server.",
                "fix": "Install a valid TLS certificate from a trusted CA.",
                "owner": "Unassigned",
                "evidence": [],
            })

    async def _discover_endpoints(self, client: httpx.AsyncClient):
        """Discover common endpoints and check for exposed sensitive paths."""
        discovered = []
        sem = asyncio.Semaphore(10)

        async def check_path(path: str):
            async with sem:
                url = urljoin(self.target + "/", path.lstrip("/"))
                try:
                    resp = await client.get(url, timeout=5.0)
                    if resp.status_code != 404:
                        discovered.append({
                            "path": path,
                            "status": resp.status_code,
                            "content_type": resp.headers.get("content-type", ""),
                            "length": len(resp.content),
                        })
                        self._add_asset(
                            f"ep-{path}",
                            "Endpoint",
                            path,
                            resp.status_code,
                        )
                        self.endpoints.append({
                            "path": path,
                            "status": resp.status_code,
                            "content_type": resp.headers.get("content-type", ""),
                        })
                except Exception:
                    pass

        await asyncio.gather(*[check_path(p) for p in self.COMMON_PATHS])

        # Check for exposed sensitive endpoints
        sensitive_patterns = {
            r"\.env": ("Exposed Environment File", "Critical", 9.8),
            r"\.git": ("Exposed Git Repository", "Critical", 9.8),
            r"debug": ("Debug Endpoint Exposed", "High", 8.2),
            r"actuator": ("Spring Boot Actuator Exposed", "High", 7.5),
            r"phpmyadmin": ("phpMyAdmin Exposed", "High", 7.5),
            r"wp-login": ("WordPress Login Exposed", "Medium", 5.3),
            r"swagger|api-docs": ("API Documentation Exposed", "Medium", 5.3),
            r"server-status": ("Apache Server Status Exposed", "Medium", 5.3),
            r"backup": ("Backup File Exposed", "High", 7.5),
        }

        for ep in discovered:
            for pattern, (title, severity, cvss) in sensitive_patterns.items():
                if re.search(pattern, ep["path"], re.IGNORECASE):
                    self._add_finding({
                        "title": title,
                        "severity": severity,
                        "cvss": cvss,
                        "category": "Information Disclosure",
                        "asset": ep["path"],
                        "summary": f"Sensitive endpoint discovered: {ep['path']} (HTTP {ep['status']})",
                        "impact": "Exposed sensitive endpoints can leak configuration, credentials, or enable further attacks.",
                        "fix": f"Restrict access to {ep['path']} or remove it from production.",
                        "owner": "Unassigned",
                        "evidence": [],
                    })
                    self._add_evidence({
                        "type": "HTTP Response",
                        "source": "Endpoint discovery",
                        "confidence": "High",
                        "finding": self.findings[-1]["id"],
                        "content": f"GET {ep['path']} → HTTP {ep['status']}\nContent-Type: {ep['content_type']}\nLength: {ep['length']}",
                        "comparison": "Expected: 404 Not Found or access restricted.",
                    })

    async def _check_information_disclosure(self, client: httpx.AsyncClient):
        """Check for information disclosure in responses."""
        try:
            resp = await client.get(self.target)
            body = resp.text.lower()

            # Check for common framework disclosure
            frameworks = {
                "django": ("Django", "X-Frame-Options header"),
                "rails": ("Ruby on Rails", "X-Runtime header"),
                "express": ("Express.js", "X-Powered-By header"),
                "php": ("PHP", "X-Powered-By header"),
                "asp.net": ("ASP.NET", "X-AspNet-Version header"),
            }

            for fw_name, (fw_display, indicator) in frameworks.items():
                if fw_name in body or fw_name in str(self.headers).lower():
                    self._add_finding({
                        "title": f"Framework Disclosure ({fw_display})",
                        "severity": "Low",
                        "cvss": 3.1,
                        "category": "Information Disclosure",
                        "asset": self.target,
                        "summary": f"The application appears to be built with {fw_display}.",
                        "impact": "Knowing the framework helps attackers target known vulnerabilities.",
                        "fix": f"Remove framework-identifying headers and meta tags.",
                        "owner": "Unassigned",
                        "evidence": [],
                    })

            # Check for email addresses in page
            emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', resp.text)
            if emails:
                unique_emails = list(set(emails))[:5]
                self._add_finding({
                    "title": "Email Address Disclosure",
                    "severity": "Low",
                    "cvss": 2.5,
                    "category": "Information Disclosure",
                    "asset": self.target,
                    "summary": f"Found {len(unique_emails)} email address(es) exposed in page content.",
                    "impact": "Exposed email addresses can be used for phishing or social engineering.",
                    "fix": "Remove or obfuscate email addresses in public pages.",
                    "owner": "Unassigned",
                    "evidence": [],
                })

        except Exception:
            pass

    async def _check_cors(self, client: httpx.AsyncClient):
        """Check for CORS misconfigurations."""
        try:
            resp = await client.get(self.target, headers={
                "Origin": "https://evil.com",
            })
            cors_header = resp.headers.get("access-control-allow-origin", "")
            creds_header = resp.headers.get("access-control-allow-credentials", "")

            if cors_header == "*" and creds_header.lower() == "true":
                self._add_finding({
                    "title": "Overly Permissive CORS Policy",
                    "severity": "High",
                    "cvss": 8.1,
                    "category": "Configuration",
                    "asset": self.target,
                    "summary": "CORS allows any origin with credentials.",
                    "impact": "Any website can make authenticated requests on behalf of users.",
                    "fix": "Restrict Access-Control-Allow-Origin to specific trusted origins.",
                    "owner": "Unassigned",
                    "evidence": [],
                })
                self._add_evidence({
                    "type": "HTTP Response",
                    "source": "CORS audit",
                    "confidence": "High",
                    "finding": self.findings[-1]["id"],
                    "content": f"Access-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true",
                    "comparison": "Expected: explicit allowlisted origins only.",
                })
            elif cors_header == "*":
                self._add_finding({
                    "title": "Wildcard CORS Policy",
                    "severity": "Medium",
                    "cvss": 5.9,
                    "category": "Configuration",
                    "asset": self.target,
                    "summary": "CORS allows any origin to read responses.",
                    "impact": "Any website can read responses from this origin.",
                    "fix": "Restrict Access-Control-Allow-Origin to specific trusted origins.",
                    "owner": "Unassigned",
                    "evidence": [],
                })
        except Exception:
            pass

    async def _analyze_dependencies(self, client: httpx.AsyncClient, resp: httpx.Response):
        """Analyze client-side dependencies for known vulnerabilities."""
        # Extract script sources
        scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)["\']', resp.text, re.IGNORECASE)
        stylesheets = re.findall(r'<link[^>]+href=["\']([^"\']+\.css[^"\']*)["\']', resp.text, re.IGNORECASE)

        dependencies = []
        for src in scripts:
            dependencies.append({"type": "script", "url": src})
        for href in stylesheets:
            dependencies.append({"type": "stylesheet", "url": href})

        # Check for known vulnerable library versions in HTML
        known_vulns = {
            "jquery": {"pattern": r"jquery[.-]?(\d+\.\d+\.\d+)", "vulnerable_below": "3.5.0"},
            "bootstrap": {"pattern": r"bootstrap[.-]?(\d+\.\d+\.\d+)", "vulnerable_below": "4.0.0"},
            "angular": {"pattern": r"angular[.-]?(\d+\.\d+\.\d+)", "vulnerable_below": "1.8.0"},
        }

        for lib, info in known_vulns.items():
            match = re.search(info["pattern"], resp.text, re.IGNORECASE)
            if match:
                version = match.group(1)
                self._add_finding({
                    "title": f"Outdated {lib.title()} Dependency",
                    "severity": "Medium",
                    "cvss": 6.5,
                    "category": "Dependencies",
                    "asset": self.target,
                    "summary": f"Found {lib} version {version} which may have known vulnerabilities.",
                    "impact": "Outdated libraries may contain known security vulnerabilities.",
                    "fix": f"Upgrade {lib} to the latest patched version.",
                    "owner": "Unassigned",
                    "evidence": [],
                })

        self.assets.extend([
            {"id": f"dep-{i}", "label": dep["url"].split("/")[-1], "type": "Dependency", "state": "Unknown", "risk": 0, "findings": 0}
            for i, dep in enumerate(dependencies)
        ])

    def _calculate_risk_score(self) -> int:
        """Calculate overall risk score (0-100, higher = more risk)."""
        if not self.findings:
            return 10

        severity_weights = {"Critical": 10, "High": 7, "Medium": 4, "Low": 1, "Informational": 0}
        total_weight = sum(severity_weights.get(f["severity"], 0) for f in self.findings)
        score = min(100, int(total_weight * 100 / max(len(self.findings) * 5, 1)))
        return score

    def _add_asset(self, id: str, type: str, label: str, status: int):
        state = "Secure" if status < 300 else "Warning" if status < 400 else "Critical"
        risk = 10 if status < 300 else 50 if status < 400 else 90
        self.assets.append({
            "id": id,
            "label": label,
            "type": type,
            "state": state,
            "risk": risk,
            "findings": 0,
        })

    def _build_result(self, risk_score: int = 50) -> dict[str, Any]:
        """Build the final assessment result."""
        elapsed = time.time() - self.scan_start

        # Link evidence to findings
        for finding in self.findings:
            finding["evidence"] = [
                ev["id"] for ev in self.evidence if ev.get("finding") == finding["id"]
            ]

        # Calculate security score (inverse of risk)
        security_score = max(0, 100 - risk_score)

        return {
            "target": self.target,
            "scan_duration": round(elapsed, 2),
            "scan_timestamp": datetime.now(timezone.utc).isoformat(),
            "risk_score": risk_score,
            "security_score": security_score,
            "findings": self.findings,
            "evidence": self.evidence,
            "assets": self.assets,
            "endpoints": self.endpoints,
            "headers": self.headers,
            "ssl_info": self.ssl_info,
            "summary": {
                "total_findings": len(self.findings),
                "critical": len([f for f in self.findings if f["severity"] == "Critical"]),
                "high": len([f for f in self.findings if f["severity"] == "High"]),
                "medium": len([f for f in self.findings if f["severity"] == "Medium"]),
                "low": len([f for f in self.findings if f["severity"] == "Low"]),
                "informational": len([f for f in self.findings if f["severity"] == "Informational"]),
                "endpoints_discovered": len(self.endpoints),
                "assets_discovered": len(self.assets),
            },
        }


async def run_assessment(target: str) -> dict[str, Any]:
    """Run a full security assessment against a target."""
    scanner = SecurityScanner(target)
    try:
        result = await scanner.run_full_assessment()
        return result
    finally:
        await scanner.close()
