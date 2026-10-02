"""Quick test for the SENTINEL scanner."""
import asyncio
from app.scanner import run_assessment


async def main():
    # Test against a local target or example.com
    target = "https://example.com"
    print(f"Scanning {target}...")
    result = await run_assessment(target)
    print(f"\nScan complete in {result['scan_duration']}s")
    print(f"Risk Score: {result['risk_score']}/100")
    print(f"Security Score: {result['security_score']}/100")
    print(f"Findings: {result['summary']['total_findings']}")
    print(f"  Critical: {result['summary']['critical']}")
    print(f"  High: {result['summary']['high']}")
    print(f"  Medium: {result['summary']['medium']}")
    print(f"  Low: {result['summary']['low']}")
    print(f"Endpoints discovered: {result['summary']['endpoints_discovered']}")
    print(f"Assets discovered: {result['summary']['assets_discovered']}")
    print("\nFindings:")
    for f in result["findings"]:
        print(f"  [{f['severity']}] {f['id']}: {f['title']} (CVSS: {f['cvss']})")


if __name__ == "__main__":
    asyncio.run(main())
