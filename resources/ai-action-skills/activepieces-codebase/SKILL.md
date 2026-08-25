---
name: activepieces-codebase
description: >-
  Context pack for working ON the Activepieces codebase (github.com/activepieces/activepieces) —
  monorepo architecture, the piece SDK, contribution/review workflow, release trains, and the
  Pieces team's ownership. Use this WHENEVER a task touches Activepieces as a codebase: building or
  fixing a piece, reviewing or opening a PR against the repo, reasoning about flows/triggers/actions/
  engine/MCP internals, piece versioning or publishing, CODEOWNERS and review assignment, or the
  Pieces team's process. Triggers on mentions of "activepieces", "AP repo", "piece"/"pieces" as
  integrations, `@activepieces/*` packages, `createPiece`/`createAction`/`createTrigger`, PIE-###
  tickets, or the pieces catalog. NOT for building automations with Activepieces as a product —
  use activepieces-mcp or activepieces-flow-planning for that.
---

# Activepieces — Codebase Context

Open-source, AI-first no-code automation platform (open-source Zapier alternative). Users build
**flows** from **pieces** (integrations). Pieces double as **MCP tools** for AI agents — that
dual role drives most current framework work.

## Ground truth, in priority order

1. **Live upstream**: `github.com/activepieces/activepieces` — use the `gh` CLI, it's authenticated.
2. **Your local checkout** of the AP repo (or the `activepieces-ai-ready` fork). A fork snapshot is
   fine for structure and SDK conventions, but **stale for `.github/`, CONTRIBUTING, and
   CODEOWNERS** — always check those live.
3. In-repo rules: root `AGENTS.md` (all `CLAUDE.md` are symlinks to it), `packages/pieces/CLAUDE.md`,
   `packages/server/STYLE.md`, `.claude/rules/*.md`.

## Read the reference files for depth

| File | Read when |
|---|---|
| `references/architecture.md` | Monorepo layout, package dependency rules, domain model → file paths, build/test setup. |
| `references/piece-framework.md` | Building or reviewing a piece: SDK surface, auth, triggers, `outputSchema`/`aiMetadata`, registration, DoD. |
| `references/contribution-workflow.md` | Opening/reviewing PRs, CI gates, labels, release & deploy cadence. |

## The 60-second orientation

- **Bun 1.3.3 + Turbo 2.9.14. No Nx. No `apps/` — everything is under `packages/`.**
- Layers, thin → thick, enforced by per-package `no-restricted-imports`:
  `core/utils` → `core/piece-types` → `core/formula` → `core/execution` → `shared` → `server/*` / `web`.
- **Pieces may import ONLY `@activepieces/pieces-framework` and `@activepieces/pieces-common`.**
  Importing `shared`, `server*`, `engine`, `core-*`, or `lodash` is a lint error.
- `packages/shared` is a **symlink** to `packages/core/shared`. Edit the real path.
- Schemas are **Zod 4** everywhere. TypeBox references in older docs are stale.
- Catalog: **720 community pieces + 27 core**, ~60% community-contributed.

## Traps that bite every time

1. **`tsconfig.base.json` is a hand-maintained manifest** of ~727 path entries. A new piece without
   an entry fails the build; the file has already drifted (missing entries, dead entries, unscoped keys).
2. **Piece version bumps are mandatory.** `find-changed-pieces.ts` defines "changed" as
   `name@version` not already on npm — **forget the bump and your change silently never ships.**
   Any removal or new required prop = MAJOR; everything else PATCH/MINOR.
3. **Action/trigger `name` fields are permanent** — flows persist them. Renaming breaks live flows.
4. **Triggers must return an array** and must set `sampleData` (even `{}`).
5. **`context.auth` is a resolved object, not a string** — `auth.secret_text` for SecretText inside
   `run()`, but `auth.auth` inside the `validate` callback. Classic bug.
6. **CI does NOT lint pieces or run piece tests** on a piece-only PR — only `tsc` via turbo. Run
   `npx turbo run lint --filter=@activepieces/piece-<name>` locally or nothing catches it.
7. **`safeHttp` is server-side only** (`packages/server/{api,worker,utils}`). Pieces use `httpClient`
   from `pieces-common` and get SSRF protection from the engine guard. Don't put `safeHttp` in a piece.
8. **Engine errors must be `ExecutionError` subclasses** — a plain `Error` gets silently swallowed.
9. **TypeORM migrations are registered by a hand-written import list**, not a glob
   (`postgres-connection.ts`, `getMigrations()`).

## Workflow essentials

- **External PRs are auto-closed** by `close-external-prs.yml` unless the author is
  OWNER/MEMBER/COLLABORATOR, a bot, or the PR carries **`keep-open`**. This is current policy;
  `docs/build-pieces/sharing-pieces/contribute.mdx` still contradicts it and is stale.
- **Reviewers are auto-assigned via `.github/CODEOWNERS`** (last-match-wins), one per PR by
  round-robin. `/packages/pieces/` → `@activepieces/pieces`.
- **SLA: first response within 2 business days.** Re-assign rather than sit on it.
  PRs idle **60 days** are auto-closed by the stale job.
- **Draft PRs are the intended default** — `greptile-draft-review.yml` posts `@greptileai review` on
  newly-opened drafts, so you get AI review before a human is assigned. Adoption is only partial today.
- **PR titles are Conventional Commits**, enforced by `validate-pr-title.yml` + local commitlint.
  Scope is the product area, not the package: `fix(pieces):`, `feat(quickbooks):`, `fix(framework):`.
- **Label exactly one of** `🌟 feature` / `🐛 bug` / `skip-changelog`, plus
  `🧩 area/third-party-pieces` or `🧩 area/core-pieces` for piece work.
- **Pieces ship continuously** — `release-pieces.yml` publishes to npm and pushes metadata to cloud
  within minutes of merge, independent of the weekly core release train.
  **Merged ≠ live** for core changes; for pieces, merged ≈ live.
- `packages/pieces` is **exempt from the PR-size limits** that gate other areas.

## Work tracking

Linear workspace `activepieces`. **Pieces** board = `PIE-###` (flat backlog, no cycles:
Triage → Backlog → Todo → In Progress → In Review → Done). Piece-related tickets also land on the
**GIT** board (support-fed, uses priorities). Branches auto-named `feature/pie-###` / `feature/git-###`.
Community pieces run through a bounty program (`💎 Bounty`, `$15`–`$200`, `💰 Rewarded`).

Known gap: **Linear captures only ~1/3 of real output** (issues aren't linked to PRs, and Done is
batch-closed in sweeps, so `completedAt` measures cleanup, not shipping). Never use Linear alone to
measure velocity — pull `gh` PRs and reviews.

## Dashboards

`ibrahim-abuznaid.github.io/pieces-dashboard` (repo: `github.com/ibrahim-abuznaid/pieces-dashboard`)
is canonical for the **outputSchema rollout** and **AI-actions coverage**. Auto-refreshes daily;
3-stage model (assigned → PR open → merged) derived from GitHub. Claims = one JSON edit + push.
