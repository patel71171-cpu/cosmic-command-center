"""Integration test for the full assessment pipeline using example.com as demo target."""
import pytest
import asyncio
from app.services.scanner import SecurityScanner


@pytest.mark.asyncio
async def test_full_assessment_pipeline():
    """Test the complete assessment pipeline against example.com."""
    scanner = SecurityScanner("https://example.com", timeout=15.0)
    try:
        result = await scanner.run_full_assessment()

        # Verify result structure
        assert "target" in result
        assert "risk_score" in result
        assert "security_score" in result
        assert "findings" in result
        assert "evidence" in result
        assert "summary" in result

        # Verify summary
        summary = result["summary"]
        assert "total_findings" in summary
        assert "critical" in summary
        assert "high" in summary
        assert "medium" in summary
        assert "low" in summary

        # Verify findings have required fields
        for finding in result["findings"]:
            assert "id" in finding
            assert "title" in finding
            assert "severity" in finding
            assert "cvss" in finding
            assert "category" in finding

        # Verify evidence have required fields
        for ev in result["evidence"]:
            assert "id" in ev
            assert "type" in ev
            assert "content" in ev

    finally:
        await scanner.close()


@pytest.mark.asyncio
async def test_security_headers_check():
    """Test that security header checks produce findings."""
    scanner = SecurityScanner("https://example.com", timeout=15.0)
    try:
        result = await scanner.run_full_assessment()
        # example.com should have some missing headers
        header_findings = [f for f in result["findings"] if f["category"] == "Configuration"]
        assert len(header_findings) > 0
    finally:
        await scanner.close()


@pytest.mark.asyncio
async def test_ssl_check():
    """Test SSL/TLS checking."""
    scanner = SecurityScanner("https://example.com", timeout=15.0)
    try:
        result = await scanner.run_full_assessment()
        # Should have SSL info for HTTPS targets
        assert "ssl_info" in result
    finally:
        await scanner.close()
