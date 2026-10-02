"""
CVSS v4.0 Calculator
Delegates scoring to the official `cvss` library (FIRST spec implementation)
and keeps the friendly metric-name API used across SENTINEL.
"""
from cvss import CVSS4
from cvss.exceptions import CVSS4Error

# Legacy/edge-case value normalisation ------------------------------------
# v3 used UI:R (Required); v4 uses UI:P (Passive) / UI:A (Active).
_UI_MAP = {"R": "P", "X": "P"}
# Subsequent-system metrics are H/L/N in v4. Older callers passed
# sc="U" (scope unchanged) / sc="C" (scope changed) from the v3 model.
_SC_MAP = {"U": "N", "C": "H"}
# Attack Complexity v3 values that may leak through.
_AC_MAP = {"X": "L"}
_AT_MAP = {"X": "N"}
_PR_MAP = {"X": "N"}
_AV_MAP = {"X": "P"}
_V_MAP = {"X": "N"}

_SEVERITY_ORDER = ["None", "Low", "Medium", "High", "Critical"]


def _norm(value: str, mapping: dict, allowed: set, default: str) -> str:
    v = (value or "").upper()
    v = mapping.get(v, v)
    return v if v in allowed else default


def calculate_cvss4(
    av: str,  # Attack Vector: N, A, L, P
    ac: str,  # Attack Complexity: L, H
    at: str,  # Attack Requirements: N, A
    pr: str,  # Privileges Required: N, L, H
    ui: str,  # User Interaction: N, P, A
    vc: str,  # Vulnerable System Confidentiality: H, L, N
    vi: str,  # Vulnerable System Integrity: H, L, N
    va: str,  # Vulnerable System Availability: H, L, N
    sc: str,  # Subsequent System Confidentiality: H, L, N
    si: str,  # Subsequent System Integrity: H, L, N
    sa: str,  # Subsequent System Availability: H, L, N
) -> dict:
    """
    Calculate CVSS v4.0 base score and severity.
    Returns dict with score, severity, and vector string.
    """
    av = _norm(av, _AV_MAP, {"N", "A", "L", "P"}, "N")
    ac = _norm(ac, _AC_MAP, {"L", "H"}, "L")
    at = _norm(at, _AT_MAP, {"N", "A"}, "N")
    pr = _norm(pr, _PR_MAP, {"N", "L", "H"}, "N")
    ui = _norm(ui, _UI_MAP, {"N", "P", "A"}, "N")
    vc = _norm(vc, _V_MAP, {"H", "L", "N"}, "N")
    vi = _norm(vi, _V_MAP, {"H", "L", "N"}, "N")
    va = _norm(va, _V_MAP, {"H", "L", "N"}, "N")
    sc = _norm(sc, _SC_MAP, {"H", "L", "N"}, "N")
    si = _norm(si, _SC_MAP, {"H", "L", "N"}, "N")
    sa = _norm(sa, _SC_MAP, {"H", "L", "N"}, "N")

    vector = (
        f"CVSS:4.0/AV:{av}/AC:{ac}/AT:{at}/PR:{pr}/UI:{ui}"
        f"/VC:{vc}/VI:{vi}/VA:{va}/SC:{sc}/SI:{si}/SA:{sa}"
    )

    try:
        parsed = CVSS4(vector)
        score = round(float(parsed.base_score), 1)
        severity = str(parsed.severity)
    except CVSS4Error:
        # Never let a scoring failure break an assessment run.
        score = 0.0
        severity = "None"

    if not severity or severity not in _SEVERITY_ORDER:
        severity = _severity_for(score)

    return {
        "score": score,
        "severity": severity,
        "vector": vector,
        "metrics": {
            "AV": av, "AC": ac, "AT": at, "PR": pr, "UI": ui,
            "VC": vc, "VI": vi, "VA": va, "SC": sc, "SI": si, "SA": sa,
        },
    }


def _severity_for(score: float) -> str:
    if score >= 9.0:
        return "Critical"
    if score >= 7.0:
        return "High"
    if score >= 4.0:
        return "Medium"
    if score > 0:
        return "Low"
    return "None"


def likelihood_impact_matrix(cvss_score: float, exploitability: str, impact: str) -> dict:
    """
    Generate a plain-language risk understanding from CVSS score.
    """
    if cvss_score >= 9.0:
        likelihood = "Very High"
        impact_level = "Critical"
    elif cvss_score >= 7.0:
        likelihood = "High"
        impact_level = "High"
    elif cvss_score >= 4.0:
        likelihood = "Medium"
        impact_level = "Medium"
    elif cvss_score > 0:
        likelihood = "Low"
        impact_level = "Low"
    else:
        likelihood = "None"
        impact_level = "None"

    return {
        "likelihood": likelihood,
        "impact": impact_level,
        "risk_level": f"{likelihood} × {impact_level}",
        "explanation": (
            f"This vulnerability has a {likelihood.lower()} likelihood of exploitation "
            f"and would have a {impact_level.lower()} impact if exploited."
        ),
    }
