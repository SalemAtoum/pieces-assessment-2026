#!/usr/bin/env python3
"""Build a review manifest of aiMetadata curation from the git diff.

Scans every changed piece source file vs a base ref, extracts the *on-disk*
aiMetadata.description + idempotent + audience (the files are the source of
truth — agent-reported manifest text drifts), and writes a CSV.

Usage:
    python3 build-manifest.py [BASE_REF] [OUT_CSV]
        BASE_REF  default: upstream/main
        OUT_CSV   default: batch-manifest.csv
Run from the activepieces repo root.
"""
import csv, os, re, subprocess, sys

BASE = sys.argv[1] if len(sys.argv) > 1 else "upstream/main"
OUT = sys.argv[2] if len(sys.argv) > 2 else "batch-manifest.csv"

QUOTED = r"""('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")"""
DESC_RE = re.compile(r"aiMetadata:\s*\{\s*description:\s*" + QUOTED +
                     r"\s*(?:,\s*idempotent:\s*(true|false))?", re.DOTALL)
NAME_RE = re.compile(r"\bname:\s*" + QUOTED)


def unquote(s):
    q = s[0]
    return s[1:-1].replace("\\" + q, q).replace("\\\\", "\\")


def changed_files(base):
    out = subprocess.check_output(["git", "diff", "--name-only", base, "--",
                                   "packages/pieces/community/*/src/lib/*/*.ts"],
                                  text=True)
    return [f for f in out.splitlines() if f.endswith(".ts")]


rows = []
for fp in changed_files(BASE):
    txt = open(fp).read()
    m = DESC_RE.search(txt)
    if not m:
        continue                       # file changed but carries no aiMetadata
    parts = fp.split("/")
    piece = parts[parts.index("community") + 1]
    is_trigger = "createTrigger" in txt or "/trigger" in fp
    nm = NAME_RE.search(txt)
    rows.append({
        "piece": piece,
        "object": unquote(nm.group(1)) if nm else os.path.basename(fp)[:-3],
        "type": "trigger" if is_trigger else "action",
        "audience": "" if is_trigger else ("both" if "audience: 'both'" in txt else "?"),
        "idempotent": "" if m.group(2) is None else m.group(2),
        "description": unquote(m.group(1)),
        "file": fp,
    })

with open(OUT, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["piece", "object", "type", "audience",
                                      "idempotent", "description", "file"])
    w.writeheader()
    w.writerows(rows)

acts = sum(1 for r in rows if r["type"] == "action")
print(f"wrote {len(rows)} rows ({acts} actions, {len(rows)-acts} triggers) -> {OUT}")
