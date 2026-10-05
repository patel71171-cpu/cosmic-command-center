"""Export the locally captured scan dataset into a versioned JSON fixture.

The 10 assessments in backend/sentinel.db were produced by real scanner runs
against real targets. That file is gitignored, so a fresh clone (and the Docker
image) starts with only the single example.com seed. This exports the captured
rows so seed.py can replay them offline.

Usage:
    cd backend
    python ../tools/export_seed_data.py
"""
import json
import os
import sqlite3

SRC = os.path.join("backend", "sentinel.db")
OUT_DIR = os.path.join("backend", "seed_data")
OUT = os.path.join(OUT_DIR, "assessments.json")


def rows(cur, sql):
    cur.execute(sql)
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def main():
    if not os.path.exists(SRC):
        raise SystemExit("No %s — run the app and scan some targets first." % SRC)

    con = sqlite3.connect(SRC)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    targets = rows(cur, "SELECT * FROM targets ORDER BY created_at")
    assessments = rows(cur, "SELECT * FROM assessments ORDER BY created_at")
    findings = rows(cur, "SELECT * FROM findings ORDER BY detected, id")

    # Evidence is keyed by assessment and ordered the way the chain was built.
    evidence = rows(
        cur,
        "SELECT id, finding_id, assessment_id, type, source, confidence, content, "
        "created_at FROM evidence ORDER BY created_at, id",
    )

    payload = {
        "note": (
            "Captured output from real SENTINEL scanner runs. Replayed by "
            "backend/seed.py so a fresh database matches the original workspace. "
            "Evidence content hashes and the hash chain are recomputed on import."
        ),
        "targets": targets,
        "assessments": assessments,
        "findings": findings,
        "evidence": evidence,
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=1, ensure_ascii=False, default=str)

    size = os.path.getsize(OUT)
    print("wrote %s" % OUT)
    print("  targets=%d assessments=%d findings=%d evidence=%d"
          % (len(targets), len(assessments), len(findings), len(evidence)))
    print("  size=%.1f KB" % (size / 1024.0))

    con.close()


if __name__ == "__main__":
    main()
