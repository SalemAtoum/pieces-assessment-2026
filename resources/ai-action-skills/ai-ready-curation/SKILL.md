---
name: ai-ready-curation
description: Backfill AI-ready metadata (aiMetadata.description + idempotent + audience:'both') across existing Activepieces pieces in batched PRs, via a curate→verify subagent workflow. Use when running a Phase-2 AI-field batch, adding aiMetadata/audience to existing pieces, or scaling the curation to more pieces. NOT for authoring a brand-new piece (use piece-builder) or for output-schema work (Ahmed's stream).
---

# AI-ready curation (Phase 2 batches)

> **Status:** Phase 2 curation is **COMPLETE & FULLY MERGED (2026-06-12)** across the catalog — status lives in `PROGRESS.md`. This skill is retained for any future batch.

Bulk-curate existing pieces so agents can read them: add `aiMetadata` to every action + trigger, `audience: 'both'` to every action, and patch-bump. Ships in **batched PRs of 15–20 pieces**. The per-object bar lives in **[RUBRIC.md](RUBRIC.md)** — read it before curating. (No `aiReady` flag — dropped from the contract 2026-06-09; see [[ai-ready-curation-method]] / execution_plan Phase 2.)

## Quick start

```bash
# 1. fresh branch off the LATEST upstream (never an old branch)
cd <ap-repo> && git fetch upstream && git checkout -b feat/ai-ready-batch-N upstream/main
```
Then run `scripts/batch-workflow.js` via the Workflow tool, passing the piece slugs as `args`
(edit `REPO` in the script first). It runs a **curate → verify pipeline**, one Opus agent per piece:
the curator edits files + returns a manifest; an independent verifier re-checks completeness, the
rubric, re-derives `idempotent` from `run()`, and confirms mechanics. `args` is parsed robustly
(array or stringified array). Then verify + PR (below).

## Picking the batch

**Alphabetical-exhaustive (from batch-5, 2026-06-10).** The goal is full-catalog coverage, so walk it systematically instead of by usage — this makes "what's left" trivial to see (you're at a letter) and decisions automatic.

1. **Compute the done-set empirically** — union of curated pieces across the open AI-field branches + anything already carrying `aiMetadata` on `upstream/main`:
   ```bash
   ( for b in $(git branch -r | grep 'origin/feat/ai-ready-batch-'); do \
       git diff upstream/main "$b" --name-only -- 'packages/pieces/community/*/package.json'; done; \
     git grep -l aiMetadata upstream/main -- 'packages/pieces/community/*/src/**' ) \
     | sed -E 's#.*/community/([^/]+)/.*#\1#' | sort -u
   ```
2. List `packages/pieces/community/` **alphabetically**, drop the done-set, take the next N **eligible**.
3. **Eligible** = a real integration with **1–20 real `createAction` defs** (`grep -rh 'createAction(' src | grep -v import | wc -l`). **Skip:** raw-LLM-completion / generic-AI wrappers (`ai`, `claude`, `cohere`, `*-openai`, `amazon-bedrock`, `cometapi`, … → codemod #7 tags them `audience:'human'`); pure utility/transform/core (`*-helper`, `json`, `csv`, `storage`, `webhook`, `delay`, …); **0-real-action** trigger-only pieces; and **25+ action monsters** (defer to a focused batch). **Keep** AI-*service* APIs with distinct actions (transcription, vision, voice, image-gen) — they're real integrations, not askLLM wrappers.

(Batches 1–4 were usage-ranked from `pieces-ai-ready/Top Pieces.csv`; that pool is exhausted at the top, hence the switch to alphabetical.)

- A piece sits in **≤1 open PR at a time** (Ibrahim's AI-field stream vs Ahmed's output-schema stream — see [[phase2-two-stream-rollout]]).

## The contract (per piece)

| Target | Edit |
|---|---|
| Each action except `customApiCall` | `audience: 'both',` + `aiMetadata: { description, idempotent },` after `description:` |
| `customApiCall` | **untouched** (deferred to codemod #7) |
| Each trigger | `aiMetadata: { description },` only (no audience, no idempotent) |
| `package.json` | patch bump **only** (no `aiReady` flag — dropped from the contract 2026-06-09) |

**Enumerate from `src/index.ts`** (`createPiece({ actions, triggers })`) — the source of truth. Files live in `src/lib/actions/` **or** `src/lib/action/` (singular) **or** inline; a dir-glob undercounts (telegram-bot showed 6 by glob, 19 in index.ts).

## Verify (the agents are not trusted)

```bash
files=$(git diff upstream/main --name-only -- '*.ts')
npx eslint $files                       # must be 0 ERRORS (pre-existing warnings ok)
```
**Type-check gotcha:** a piece's `tsconfig.lib.json` sets `"paths": {}` and `node_modules` may lack the linked framework, so `tsc -p .../tsconfig.lib.json` falsely reports `aiMetadata does not exist`. Instead type-check with the **root paths** (framework → source): write a temp tsconfig at repo root extending `./tsconfig.base.json` with `include` = the touched pieces' `src/**/*.ts`, then `npx tsc -p` it — expect **0 `aiMetadata`/`audience` errors** (an `expr-eval` missing-dep error is an unrelated local artifact).

Then sanity-check counts and build the review manifest:
```bash
git diff upstream/main --shortstat                         # additive only
python3 scripts/build-manifest.py upstream/main batch-N-manifest.csv
```
Confirm: `audience:'both'` count == action count; `aiMetadata` count == actions+triggers; **no `aiReady` flag added**; **0 `index.ts` changed**.

## PR

One PR per batch. **The PR body must follow `.github/pull_request_template.md`** — a `Breaking change check` job fails the PR unless the "Breaking change?" *and* "Security impact?" sections are present with exactly one box ticked (`- [x]`). For a metadata-only curation batch both are `no` — precedent: #14435 (112-action `audience` flip) declared no/no. Editing the body retriggers the job. Labels `skip-changelog` + an area label. **Most area labels carry an emoji prefix upstream** — `--add-label area/third-party-pieces` fails "not found"; pass `'🧩 area/third-party-pieces'`, or use `area/core-pieces` for a `core/`-tier batch (that one exists un-prefixed too). `gh` aborts the *whole* edit if any single label is unknown, so add them one call at a time (verified on #14528, 2026-07-31). **No-AI voice** (no "Co-Authored-By: Claude", no emojis). Push with `SKIP_CHECK=1 git push origin HEAD` — **not** `CLAUDE_PUSH=yes` (that runs the full husky gate, which fails locally on the env-broken `@activepieces/engine#test` → push rejected; verify your own gates first — tsc, eslint, relevant vitest). Amr merges. The manifest CSV stays in the AP-Ai-ready workspace — **not** in the PR.

## After a batch

Update `PROGRESS.md` (task 2.3 tranche row) **in the same session** — invoke the `tracking-docs` skill first.
