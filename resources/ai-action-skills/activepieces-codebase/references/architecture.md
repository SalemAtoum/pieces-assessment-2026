# Activepieces — Monorepo Architecture

Bun `1.3.3` + Turbo `2.9.14`. **No Nx** (root `AGENTS.md` says so explicitly). **No `apps/` directory** —
everything lives under `packages/`.

## Top-level layout

| Path | Contents |
|---|---|
| `packages/core/*` | Thin, framework-agnostic foundation: `utils`, `piece-types`, `formula`, `execution`, plus the thick `shared`. |
| `packages/shared` | **A symlink → `packages/core/shared`.** Not a workspace entry; `packages/core/*` registers it. |
| `packages/server/{api,worker,engine,utils}` | Backend: Fastify control plane, job consumer, sandboxed execution runtime, server utilities. |
| `packages/web` | The React frontend. (No `react-ui` package in this repo.) |
| `packages/pieces/{framework,common,community,core,custom}` | Piece SDK + shared helpers + 720 community pieces + 27 built-in pieces + an empty `custom/`. |
| `packages/cli` | `@activepieces/cli` — piece scaffolding/build/publish/sync. |
| `packages/ee/embed-sdk` | UMD embed SDK (`ee-embed-sdk`). `packages/ee/LICENSE` is the enterprise license. |
| `packages/tests-e2e` | Playwright + Checkly. |
| `tools/` | Build/CI scripts (`tools/scripts/pieces/*`, `tools/setup-dev.js`, codemods). |
| `deploy/`, `docs/`, `benchmark/`, `smoke-test/`, `.agents/`, `.claude/rules/` | Deploy manifests, docs, perf, agent skills/rules. |

## Dependency direction

Layering is **thin → thick**, enforced by per-package `no-restricted-imports`
(see `.claude/rules/core-packages.md`):

- **`@activepieces/core-utils`** (`packages/core/utils`) — `apId`, `isNil`, `tryCatch`,
  `ActivepiecesError`, `SeekPage`, `BaseModelSchema`. Zero AP deps.
- **`@activepieces/core-piece-types`** (`packages/core/piece-types`) — the piece contract:
  `TriggerStrategy`, `PackageType`, `AppConnectionType`, `ExecutionType`.
- **`@activepieces/core-formula`** (`packages/core/formula`) — the `{{ }}` expression evaluator.
- **`@activepieces/core-execution`** (`packages/core/execution`) — types/schemas/pure flow-graph
  operations only, **not a runtime**. Extracted from `shared` (ticket SRE-163).
- **`@activepieces/shared`** (`packages/core/shared`) — thick app-level layer (auth, platform,
  project, EE, connections). Its `src/index.ts` re-exports all of `core-utils` and `core-execution`
  for backward compat.
- **`api`** (`packages/server/api`) — Fastify + TypeORM + BullMQ. Depends on engine, shared,
  pieces-framework/common, server-utils, all `core-*`.
- **`worker`** (`packages/server/worker`) — job consumer + sandbox manager. **Does not depend on
  `@activepieces/engine`**; it installs the prebuilt bundle
  (`src/lib/cache/engine/engine-installer.ts`) and talks over a socket.
- **`@activepieces/engine`** (`packages/server/engine`) — the real execution runtime, esbuild-bundled
  to a single CJS file run as a sandbox child process.
- **`web`** — depends on `shared`, `pieces-framework`, `ee-embed-sdk`.
- **Pieces** depend **only** on `pieces-framework` + `pieces-common`. They may never import `shared`,
  `server*`, or `engine`.

## Build system

- Discovery is via bun **`workspaces`** in root `package.json`. Only `packages/core/*`,
  `packages/pieces/core/*`, `packages/pieces/community/*`, `packages/pieces/custom/*` are globs;
  every other package is listed individually.
- `turbo.json`: generic `build` / `lint` / `test` / `typecheck` / `serve` tasks apply to any workspace
  defining the matching script. Per-package overrides exist only for non-standard outputs:
  `web#build`, `api#build`, `@activepieces/engine#build`, `ee-embed-sdk#bundle`,
  `@activepieces/engine#test`.
- **`tsconfig.base.json`** (78 KB, 2141 lines) is the path registry: ~727 keys, 717 `@activepieces/*`,
  each mapping to **source** (`packages/.../src/index.ts`), not `dist`. Note
  `@activepieces/engine → packages/server/engine/src/main.ts`. **`strict` is NOT set in the base
  config** — each package opts in.

### Wiring a new package

1. Dir + `src/index.ts`
2. `workspaces` entry (unless glob-covered)
3. `package.json` with `main: ./dist/src/index.js` and `build`/`lint` scripts
4. `tsconfig.json` extending the base + `tsconfig.lib.json`
5. `.eslintrc.json`
6. **`tsconfig.base.json` paths entry**
7. If the frontend consumes it: also `packages/web/vite.config.mts` alias, `tsconfig.app.json`,
   `tsconfig.spec.json`
8. Add to the hard-coded `lint-core` / `test-unit` filter lists in root `package.json` for CI coverage

## Domain concepts → files

Schemas are **Zod 4** everywhere (TypeBox is dead in this repo despite stale root deps).

- **Flow / FlowVersion / FlowRun** — `packages/core/execution/src/lib/flows/flow.ts`,
  `.../flows/flow-version.ts`, `.../flow-run/flow-run.ts`.
  Server: `packages/server/api/src/app/flows/{flow,flow-version,flow-run}/`.
- **Action / step** — `packages/core/execution/src/lib/flows/actions/action.ts`;
  `FlowActionType` = `CODE | PIECE | LOOP_ON_ITEMS | ROUTER`.
- **Trigger** — `packages/core/execution/src/lib/flows/triggers/trigger.ts`;
  `TriggerStrategy` (`POLLING | WEBHOOK | APP_WEBHOOK | MANUAL`) in
  `packages/core/piece-types/src/lib/trigger.ts`, with a **duplicate enum** in
  `packages/core/shared/src/lib/automation/trigger/index.ts`.
  Server dispatch: `packages/server/api/src/app/trigger/trigger-source/flow-trigger-side-effect.ts`.
- **Connection / piece auth** —
  `packages/core/shared/src/lib/automation/app-connection/app-connection.ts`;
  `PieceAuth.*` in `packages/pieces/framework/src/lib/property/authentication/index.ts`.
- **Project / Platform / User** — `packages/core/shared/src/lib/management/project/project.ts`,
  `.../platform/platform.model.ts`, `.../core/user/user.ts`; entities colocated at
  `packages/server/api/src/app/{project,platform,user}/*.entity.ts`.
- **Engine execution model** — `packages/server/engine/src/lib/handler/flow-executor.ts` drives the
  loop, dispatching to `code-executor.ts` / `loop-executor.ts` / `piece-executor.ts` /
  `router-executor.ts`. Operations dispatcher: `src/lib/operations/index.ts`. Trigger hooks:
  `src/lib/helper/trigger-helper.ts`. Bundled by `esbuild.config.mjs` into two artifacts
  (`main.js` with proxy dispatcher, `main-noproxy.js`).
- **Queue** — BullMQ. Producer `packages/server/api/src/app/workers/job-queue/job-queue.ts`,
  broker `job-broker.ts`; worker side `packages/server/worker/src/lib/execute/job-registry.ts`,
  sandbox in `src/lib/sandbox/{fork,isolate}.ts`.
- **MCP / agent surface** — `packages/server/api/src/app/mcp/`: `mcp-server-builder.ts`,
  `mcp/tools/` (47 `ap-*.ts` tools), OAuth at `mcp/oauth/*` mounted at domain root in
  `src/app/server.ts`. Embedding-based tool search in `src/app/tool-search/`.
- **Piece SDK** — `createPiece` → `packages/pieces/framework/src/lib/piece.ts`;
  `createAction`/`createTrigger` → `src/lib/{action/action.ts,trigger/trigger.ts}`;
  `Property.*` → `src/lib/property/input/index.ts`; contexts → `src/lib/context/index.ts`;
  `outputSchema` → `src/lib/output-schema.ts`.

## Tests and lint

- **Runner is Vitest everywhere** (no Jest). Frontend: `packages/web/test/` (mirrors src).
  Shared: `packages/core/shared/test/`. API: `packages/server/api/test/{unit,integration/{ce,ee,cloud},helpers}`.
- `npm run test-unit` (engine + shared + web); `npm run test-api` → `test-ce`/`test-ee`/`test-cloud`
  + `check-migrations`. Integration scripts `cat .env.tests` — that file is gitignored and absent,
  so they fail out of the box.
- E2E: `npm run test:e2e` → `packages/tests-e2e/playwright.config.ts`. `AP_EDITION` selects
  `scenarios/ce` vs `scenarios/ee`; it boots `npm run dev` itself. `checkly.config.ts` reuses the
  same specs as production synthetic monitors.
- Lint: root `.eslintrc.json` (bans `lodash`) vs the leaner `.eslintrc.base.json` (web + embed-sdk).
  `packages/server/api/.eslintrc.json` is strictest (4-space indent, no semicolons,
  `no-console: error`, `no-explicit-any: error`) and `packages/core/shared` extends it.
  `packages/web/.eslintrc.json` enforces import zones (`src/features` may not import `src/app`).
- CI: `.github/workflows/ci.yml` — `lint-core`, conditional `lint-pieces` (only when
  framework/common changed), targeted builds, then a 3-way parallel test fan-out. A second job runs
  tool-search tests against real `pgvector/pgvector:pg16` because the main job uses PGLite.

## Trip hazards

1. **`packages/shared` is a symlink.** Edit `packages/core/shared/`; `tsconfig.base.json` and Vite
   both point at the real path.
2. **`tsconfig.base.json` is the hand-maintained piece manifest and it has drifted**: ~49 pieces on
   disk have no entry, 8 entries point at deleted dirs (`piece-agent`, `piece-read-file`, …),
   7 keys are missing the `@` scope (`activepieces/piece-snowflake`), and one key is literally
   `Aminos`. A missing entry makes the build fail.
3. **TypeORM migrations are registered by a hand-written import list**, not a glob —
   `getMigrations()` in `packages/server/api/src/app/database/postgres-connection.ts` (~lines 399-790).
   `migration/sqlite/` is legacy, kept only for the SQLite→PGLite migration.
4. **Piece version bumps are mandatory** on any change to an existing piece. Action/trigger `name`
   fields are permanent. Rules live in `.agents/skills/piece-builder/SKILL.md`, not
   `packages/pieces/CLAUDE.md`.
5. **Engine errors must be `ExecutionError` subclasses** — a plain `Error` is silently swallowed by
   `tryCatchAndThrowOnEngineError` (`packages/server/engine/CLAUDE.md`).
6. **evlog fields are grouped by entity**: `flowRun: { id }`, never `flowRunId`. Reserved keys
   (`service`, `error`, `requestId`, …) must never be set manually.
7. **Services are namespaces, not classes** — `export const xService = (log) => ({...})`, and file
   order is mandated (imports → repo → exported const → helpers → types). See `packages/server/STYLE.md`.
8. **Stale docs**: `packages/server/AGENTS.md` says TypeBox (code is Zod +
   `fastify-type-provider-zod`); `packages/core/execution/CLAUDE.md` calls itself a stub (it has
   66 files); `packages/web/{CLAUDE,AGENTS}.md` say React 18 (package.json pins 19). All root/package
   `CLAUDE.md` files are symlinks to `AGENTS.md`.
9. **Route prefixes belong in `*.module.ts`**, never inline in
   `packages/server/api/src/app/app.ts`; use `POST` for creates *and* updates.
10. `turbo.json`'s `lint.inputs` uses `../../.eslintrc.json`, the wrong depth for 3-deep packages
    like `packages/core/*` — root eslint edits won't invalidate their cache.
