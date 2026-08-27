# Activepieces — Contribution, CI & Release Workflow

> Verified against **live upstream** (`gh` CLI) on 2026-07-27. The local checkout
> `activepieces-ai-ready` is a June-2026 fork snapshot and is **missing** `CODEOWNERS`,
> `close-external-prs.yml`, `greptile-draft-review.yml`, `pr-size.yml`, `breaking-change-check.yml`,
> `dast.yml`, `chat-evals.yml`, `release-cli.yml`, `publish-embed-sdk.yml`, and carries an outdated
> `pull_request_template.md` and `CONTRIBUTING.md`. **Always check `.github/` live.**

## 1. Headline policy: external PRs are auto-closed

`.github/workflows/close-external-prs.yml` closes any PR whose `author_association` is not
`OWNER` / `MEMBER` / `COLLABORATOR`, posting a templated note.
**Exemptions:** `user.type == 'Bot'`, and the **`keep-open`** label.

Upstream `CONTRIBUTING.md` documents this ("We've temporarily paused unsolicited pull requests").
Customers who negotiate over Slack get `keep-open` applied and are reopened.

> **Stale doc warning:** `docs/build-pieces/sharing-pieces/contribute.mdx` still says
> "Open a pull request… a maintainer will review your work closely" — this contradicts current policy.

A second job in the same file runs `actions/stale@v9` on `cron: '0 3 * * *'`: PRs go stale after
**60 days** and are closed immediately (`days-before-pr-close: 0`). Any comment, push, or reopen
resets the clock. The old `.github/stale.yml` (10/5 days, `Automatically Closed` label) still applies
to issues.

## 2. CI checks on a PR

| Check | Workflow | Notes |
|---|---|---|
| `main` | `ci.yml` | lint-core, build core, build changed pieces (turbo filters from diff), engine/shared tests, `test-ce test-ee test-cloud check-migrations`, `check-migration-rollback.ts`. If `pieces/framework` or `pieces/common` changed → `lint-pieces` + build **all** pieces |
| `tool-search (postgres)` | `ci.yml` | pgvector/pg16 service container job |
| `Validate PR title` | `validate-pr-title.yml` | `amannn/action-semantic-pull-request@v6.1.1` |
| `Breaking change check` | `breaking-change-check.yml` | see §3 |
| `PR size` | `pr-size.yml` | see §3 |
| `check-label` | `e2e.yml` | gates e2e on `ready-for-e2e`; `test-e2e-ce`/`test-e2e-ee` SKIPPED otherwise |
| `Setup-Preview-Environment` / `Remove-Preview-Environment` | `setup-environment.yml`, `remove-environment.yml` | only builds with the **`preview`** label; skipped for forks |
| `Deterministic gate` / `Live judge gate` | `chat-evals.yml` | path-filtered to chat worker code |
| `Validate publishable packages` | `validate-publishable-packages.yml` | `paths: packages/pieces/**` |
| `GitGuardian Security Checks`, `license/cla` (CLAassistant), `mergefreeze`, `Mintlify Deployment` | GitHub Apps | |
| `auto-merge-bot-pr` | `crowdin-pr-merger.yml` | translation PRs only |

> **Uncertain:** which of these are *formally required* is not readable —
> `branches/main/protection` returns 404 and `rulesets` returns `[]` for a write-level token.
> Requires admin to confirm.

## 3. Two enforcement scripts worth knowing

**`tools/scripts/breaking-change-check.ts`** — fails unless the PR body ticks **exactly one** box
under `### Breaking change?` *and* `### Security impact?`. Also enforces bidirectional agreement:
the `⛓️‍💥 breaking-change` label ⟺ a real entry (a `####` heading + body line) added to
`docs/install/reference/breaking-changes.mdx`.

**`tools/scripts/pr-size-check.ts`** — per-area line budgets:
engine/worker/execution **300**, `core/shared` **250**, `server/api` **600**, `packages/web` **1200**.
**`packages/pieces` is explicitly exempt** ("pieces are @pieces-owned, self-contained, and low blast
radius"). Bypass label: **`large-pr-ok`**. Excludes `bun.lock`, `package-lock.json`,
`i18n/translation.json`, `locales/`, `.snap`, `dist/`.

## 4. Review automation

- **Greptile** (`greptile-apps`) is the only AI reviewer. `greptile-draft-review.yml` comments
  `@greptileai review` on newly-opened **draft** PRs (Greptile skips drafts by default). Posts a
  `Greptile Review` status check. **Advisory — a human still approves.**
- **CLAassistant** — CLA signature check on external PRs.
- **dependabot** — `chore(deps):` PRs, labelled `dependencies` + `javascript`.
- **GitGuardian**, **MergeFreeze**, **Mintlify** apps.
- No CodeRabbit, no Copilot review, no changeset bot. Changelog is **release-drafter**.

## 5. Branch, title and label conventions

**Titles** are Conventional Commits, enforced by the semantic-PR action and locally by `commitlint`
(`@commitlint/config-conventional`) via husky `commit-msg`.
Observed distribution over 150 merged PRs: `fix(scope)` 62, `feat(scope)` 36, `feat` 10,
`chore(scope)` 9, `fix` 7, `docs` 5, `ci` 5, `revert` 4.
**Scopes are product areas, not `piece-x`** — real examples: `fix(pieces):`, `fix(ghostcms):`,
`feat(quickbooks):`, `fix(mcp):`, `fix(framework):`, `fix(schedule):`.

**Branches** (not CI-enforced): `fix/*` 42, `automated/*` 29, `feat/*` 23, `feature/*` 19,
`chore/*` 7, `docs/*` 5, plus `revert-<PR#>-<slug>` for GitHub-generated reverts.
`feature/pie-367` shows occasional Linear-ID branches (Linear auto-generates these).
Husky `pre-push` blocks direct pushes to `main`.

**Drafts:** handbook intent is **draft-first** — no human is assigned until "Ready for review", while
Greptile reviews immediately. Adoption is partial (7 of 60 open PRs are drafts). Opening as draft is
the recommended default: you get AI review before consuming a teammate's round-robin slot.

**Labels — `AGENTS.md ## Pull Requests` mandates** exactly one of `🌟 feature` / `🐛 bug` /
`skip-changelog`, plus `🧩 area/third-party-pieces` or `🧩 area/core-pieces` for piece work.

## 6. Label taxonomy actually in use

**PRs** (last 150): `🐛 bug` 53, `skip-changelog` 40, `automated` 28, `🌟 feature` 25,
`🧩 area/third-party-pieces` 21, `🛟 support` 13, `🧩 area/core-pieces` 10, `translations` 5,
`auto-merge` 5, `keep-open` 2, `📚 documentation` 2, `dependencies` 2.

**Issues** (last 120): `🐛 bug` 51, `keep-open` 44, `🔄  area/flows` 35 (note double space),
`🌟 feature` 33, `🛟 support` 23, `🛠️  area/infrastructure` 14 (double space),
`🏢 area/management` 13, `💫 priority` 11, `🧩 area/third-party-pieces` 9, `🤖 area/ai` 8.

**Areas:** `🔄  area/flows`, `🧩 area/third-party-pieces`, `🧩 area/core-pieces`, `🤖 area/ai`,
`📦 area/tables`, `🧬 area/embedding`, `🏢 area/management`, `🛠️  area/infrastructure`,
`🙋 area/human-in-loop`, `🎨 area/design-debt`, `area/engine`, `area/DX`, `🌀 area/misc`,
plus a duplicate lowercase `area/core-pieces`.

**Bounty:** `💎 Bounty`, `🙋 Bounty claim`, `💰 Rewarded`, and amount labels
`$15 $20 $25 $30 $35 $40 $50 $55 $60 $70 $80 $100 $150 $200`.

> **`source/*` labels do NOT exist upstream** — that taxonomy is Linear-side only.

**Gates/ops:** `keep-open`, `large-pr-ok`, `preview`, `ready-for-e2e`, `skip-changelog`, `auto-merge`,
`automated`, `⛓️‍💥 breaking-change`, `release`, `pre-release`, `blocked`,
`blocked: waiting-response`, `planned-next-release`.

`.github/release-drafter.yml` excludes `skip-changelog`, `release`, `pre-release`; categorises by
`🧩 area/*-pieces` → "🔌 Pieces", `⛓️‍💥 breaking-change`, `🌟 feature`, `🐛 bug`, `✨ polishing`,
`📚 documentation`, `🧹 clean up`.

## 7. Release & deploy — pieces ship on a *different* cycle from core

**Pieces: continuous, per-merge.** `release-pieces.yml` fires on push to `main` touching
`packages/pieces/**` or `packages/core/shared/**`. It runs `find-changed-pieces.ts`, builds,
`publish-pieces-to-npm.ts`, then `update-pieces-metadata.ts` against `AP_CLOUD_API_KEY` — pushing new
piece versions to **cloud within minutes of merge**, independent of the core release train.
`@activepieces/shared`, `pieces-common`, `pieces-framework` are **no longer published to npm**
(pieces are self-contained bundles inlining them). Discord `DISCORD_ON_CALL_WEBHOOK` alert on failure.

**Core: weekly train**, no release branches, everything merges to `main`:

| When | What |
|---|---|
| Mon–Thu 09:00–17:00 UTC | merge → auto-deploy staging (`stg.activepieces.com`), image `${version}.${sha}.beta` via Depot + Kamal |
| 17:00–09:00 UTC | staging **freeze** — merges land in `main` only |
| **Thu 17:00 UTC** | staging image + commit tagged `release-candidate` |
| Daily 09:00 UTC | canary from `main` → `canary.activepieces.com`; breaking migrations block it |
| **Sun 09:00 UTC** | canary rebuilt, `release-candidate` → production (`cloud.activepieces.com`), `deploy/cloud/YYYY-MM-DD` branch created |
| **Mon 09:00 UTC** | `continuous-delivery-release.yml` publishes the self-hosted release: re-tags the RC image to Docker Hub + GHCR, runs `release-drafter@v7` with `publish: true` |

> **Doc/code discrepancies:** the handbook says self-hosted publishes **Monday 09:00 UTC**, but
> `continuous-delivery-release.yml` has `cron: '0 14 * * 2'` (**Tuesday 14:00 UTC**). And
> `continuous-delivery-cloud.yml`'s Sunday cron is **commented out** — promotion appears to be
> `workflow_dispatch`-driven in practice.

**Overrides:** hotfix on `deploy/cloud/YYYY-MM-DD` + `cloud-hotfix` dispatch (refuses within 1h of a
scheduled promotion); `emergency-cloud-deploy.yml`; `continuous-delivery-rollback{,-canary}.yml`;
`release-self-hosted.yml` for off-cycle tags.

## 8. Other automation

- **`automated` label** = PR produced by the automated Claude ticket-to-PR workflow — 28 of the last
  150 merged, all authored by `majewskibartosz` on `automated/fix-git-####-*` branches mapping to
  `GIT-####` Linear tickets. *The workflow itself is not in `.github/workflows` — location uncertain.*
- `generate-translations.yml` (daily 15:05) → shards → `reusable-finalize-translations-pr.yml` →
  `crowdin-pr-merger.yml` auto-merges (`translations` + `auto-merge`).
- `closed-issue-reply.yaml`, `delete-workflow-runs.yml`, `dast.yml` (03:00 UTC, inside the deploy
  freeze), `benchmark.yml`, `smoke-test.yml`, `sync-betterstack-playwright.yml`.
- **Issue templates:** `bug_report.md`, `feature_request.md`, `mcp_bounty.md`, `piece-request.md`.
  The latter two apply a `pieces` label that **does not exist** in `gh label list` — it silently no-ops.
