"""Unit tests for CVSS v4.0 calculator."""
import pytest
from app.services.cvss import calculate_cvss4, likelihood_impact_matrix


def test_cvss4_critical_score():
    """Test a critical vulnerability score."""
    result = calculate_cvss4(
        av="N", ac="L", at="N", pr="N", ui="N",
        vc="H", vi="H", va="H", sc="U", si="N", sa="N"
    )
    assert result["score"] >= 9.0
    assert result["severity"] == "Critical"
    assert "CVSS:4.0" in result["vector"]


def test_cvss4_high_score():
    """Test a high severity score."""
    result = calculate_cvss4(
        av="N", ac="L", at="N", pr="L", ui="N",
        vc="H", vi="H", va="N", sc="U", si="N", sa="N"
    )
    assert 7.0 <= result["score"] < 9.0
    assert result["severity"] == "High"


def test_cvss4_medium_score():
    """Test a medium severity score."""
    result = calculate_cvss4(
        av="N", ac="L", at="N", pr="N", ui="A",
        vc="L", vi="L", va="N", sc="U", si="N", sa="N"
    )
    assert 4.0 <= result["score"] < 7.0
    assert result["severity"] == "Medium"


def test_cvss4_low_score():
    """Test a low severity score."""
    result = calculate_cvss4(
        av="A", ac="H", at="N", pr="H", ui="R",
        vc="L", vi="N", va="N", sc="U", si="N", sa="N"
    )
    assert 0 < result["score"] < 4.0
    assert result["severity"] == "Low"


def test_cvss4_none_score():
    """Test no impact."""
    result = calculate_cvss4(
        av="N", ac="L", at="N", pr="N", ui="N",
        vc="N", vi="N", va="N", sc="U", si="N", sa="N"
    )
    assert result["score"] == 0.0
    assert result["severity"] == "None"


def test_cvss4_scope_changed():
    """Test scope changed multiplier."""
    result_unchanged = calculate_cvss4(
        av="N", ac="L", at="N", pr="N", ui="N",
        vc="H", vi="H", va="H", sc="U", si="N", sa="N"
    )
    result_changed = calculate_cvss4(
        av="N", ac="L", at="N", pr="N", ui="N",
        vc="H", vi="H", va="H", sc="C", si="N", sa="N"
    )
    assert result_changed["score"] > result_unchanged["score"]


def test_likelihood_impact_matrix():
    """Test risk matrix generation."""
    result = likelihood_impact_matrix(9.5, "high", "high")
    assert result["likelihood"] == "Very High"
    assert result["impact"] == "Critical"
    assert "Very High" in result["risk_level"]


def test_cvss4_vector_format():
    """Test vector string format."""
    result = calculate_cvss4(
        av="N", ac="L", at="N", pr="N", ui="N",
        vc="H", vi="H", va="H", sc="U", si="N", sa="N"
    )
    assert result["vector"].startswith("CVSS:4.0/")
    assert "AV:N" in result["vector"]
    assert "AC:L" in result["vector"]
