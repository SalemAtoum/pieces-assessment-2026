# Activepieces — Piece Framework

How an integration ("piece") is actually built. Framework source: `packages/pieces/framework/src/lib/`.

## 1. Anatomy

Pieces live in three trees, all Bun workspaces (`packages/pieces/{community,core,custom}/*`):

```
packages/pieces/community/<name>/
├── package.json          # @activepieces/piece-<name>, semver, deps
├── tsconfig.json         # extends ../../../../tsconfig.base.json
├── tsconfig.lib.json     # outDir ./dist, excludes *.test.ts
├── .eslintrc.json        # import-boundary rule (see §8)
└── src/
    ├── index.ts          # createPiece() — the ONLY export the loader reads
    ├── lib/auth.ts       # auth object; never inline in index.ts
    ├── lib/actions/      # one file per action
    ├── lib/trigger[s]/   # one file per trigger
    ├── lib/common/       # API client, dropdown props, types
    └── i18n/translation.json (+ <locale>.json)
```

Canonical example: `packages/pieces/community/airtable/` (33 actions, 2 triggers).
Minimal example: `packages/pieces/community/hackernews/src/index.ts` (1 action, `PieceAuth.None()`).

**`package.json` is load-bearing** — the runtime piece `name` and `version` come from it, **not**
from `createPiece()` (`packages/server/api/src/app/pieces/metadata/utils/file-pieces-utils.ts:118-140`).
Deps are always `@activepieces/pieces-common` + `@activepieces/pieces-framework` as `workspace:*`;
`main: ./dist/src/index.js`; scripts `build` (`tsc -p tsconfig.lib.json && cp package.json dist/`),
`bundle`, `lint`.

Both `lib/trigger/` (airtable) and `lib/triggers/` (intercom, stripe) exist in the wild — the CLI
generator emits `triggers/`.

## 2. SDK surface

**`createPiece`** (`piece.ts:76`) — `{ displayName, description, logoUrl, authors[], categories[],
auth, actions[], triggers[], minimumSupportedRelease?, events? }`. `minimumSupportedRelease` is
silently clamped up if invalid or too old. `auth` may be an **array** of auth properties (unique by
`type`) — that's how intercom offers OAuth2-or-token.

**`createAction`** (`action/action.ts:67`) — `{ name, displayName, description, props, run, test?,
auth?, requireAuth?, errorHandlingOptions?, outputSchema?, audience?, aiMetadata? }`.
`test` defaults to `run`. **`name` is permanent once published** (flows store it).

**`Property.*`** (`property/input/index.ts:71`) — `ShortText, LongText, MarkDown, Checkbox, Number,
Json, Array, Object, Dropdown, StaticDropdown, MultiSelectDropdown, StaticMultiSelectDropdown,
DynamicProperties, DateTime, File, Custom, Color`. Dynamic dropdowns take `refreshers` (prop names
that retrigger `options`) and must degrade gracefully:

```ts
tableId: Property.Dropdown<string, true, typeof airtableAuth>({
  auth: airtableAuth, displayName: 'Table', required: true,
  refreshers: ['base'],
  options: async ({ auth, base }): Promise<DropdownState<string>> => {
    if (!auth) return { disabled: true, options: [], placeholder: 'Please connect your account' };
    ...
  },
})
```

**`PieceAuth.*`** (`property/authentication/index.ts:33`) — `SecretText`, `OAuth2`, `BasicAuth`,
`CustomAuth`, `OIDC`, `None()`. All except `None` accept `validate`:

```ts
export const airtableAuth = PieceAuth.SecretText({
  displayName: 'Personal Access Token', required: true, description: `...`,
  validate: async (auth) => {
    try { await httpClient.sendRequest({ method: HttpMethod.GET, url: '...',
            authentication: { type: AuthenticationType.BEARER_TOKEN, token: auth.auth }});
          return { valid: true }; }
    catch (e) { return { valid: false, error: 'Invalid personal access token' }; }
  },
});
```

> **`context.auth` is a resolved connection object, not a string** (`context/index.ts:54-65`).
> `auth.secret_text` for SecretText; `auth.props.*` for CustomAuth. Note the asymmetry: inside
> `validate` the SecretText value is `auth.auth`; inside `run` it is `context.auth.secret_text`.
> Treating it as a bare string is the single most common piece bug.

`ActionContext` (`context/index.ts:222-258`) provides `auth, propsValue, store, files, connections,
project, flows, step, server, tags, output, agent, run{ id, stop, respond, createWaitpoint,
waitForWaitpoint }, executionType`. `run.pause` / `generateResumeUrl` are deprecated in favour of
waitpoints.

## 3. Triggers

`TriggerStrategy` = `POLLING | WEBHOOK | APP_WEBHOOK | MANUAL`.
Catalog usage: WEBHOOK 765, POLLING 434, APP_WEBHOOK 36, MANUAL 1.

**`run()` must return an array** — enforced by the signature (`trigger/trigger.ts:55`:
`Promise<unknown[]>`); each element becomes one flow run.

**`sampleData` is mandatory** (even `{}`). It drives `testStrategy`: with no `test()`, WEBHOOK falls
back to `TriggerTestStrategy.SIMULATION`; POLLING/MANUAL always get `TEST_FUNCTION` with a default
`test` of `() => [sampleData]` (`trigger.ts:140-166`).

- **Polling** — use `pollingHelper` from `@activepieces/pieces-common` with
  `DedupeStrategy.TIMEBASED` (emit `{ epochMilliSeconds, data }`) or `LAST_ITEM` (`{ id, data }`).
  `onEnable/onDisable/run/test` all delegate. Example:
  `airtable/src/lib/trigger/new-record.trigger.ts`. Polling context also exposes
  `setSchedule({ cronExpression })`.
- **Webhook** — register in `onEnable` using `context.webhookUrl`, persist the id in `context.store`,
  delete in `onDisable`; `run` returns `[context.payload.body]`. See
  `packages/pieces/community/stripe/src/lib/trigger/new-customer.ts`. Webhook-only extras:
  `handshakeConfiguration`/`onHandshake` (challenge-response) and `renewConfiguration`/`onRenew`
  (`WebhookRenewStrategy.CRON`).
- **App-webhook** — one platform-level webhook shared across all connections. The trigger calls
  `context.app.createListeners({ events, identifierValue })`
  (`intercom/src/lib/triggers/new-lead.ts`), and the piece supplies `events: { parseAndReply, verify }`
  in `createPiece` to route and HMAC-verify incoming payloads (`intercom/src/index.ts:126-149`).

## 4. HTTP and SSRF

Pieces use `httpClient` from `@activepieces/pieces-common` (2492 files).
`HttpRequest` = `{ method, url, headers?, body?, queryParams?, authentication?, timeout?, retries?,
responseType?, followRedirects? }`. `AuthenticationType` is only `BEARER_TOKEN | BASIC` —
API-key-in-header goes in `headers`. Implementation is native `fetch`
(`packages/pieces/common/src/lib/http/core/fetch-http-client.ts`); `AxiosHttpClient` is a
back-compat alias.

**`safeHttp` is NOT for pieces.** It lives in `packages/server/utils/src/safe-http.ts` and the rule
(`.claude/rules/safe-http.md`, `AGENTS.md:55`) scopes it to `packages/server/{api,worker,utils}`.
Zero pieces use it, and the piece eslint boundary bans `@activepieces/server*` outright. Pieces get
SSRF protection transparently from the engine's global guard
(`packages/server/engine/src/lib/network/ssrf-guard.ts`, active when `AP_NETWORK_MODE=STRICT`).
45 piece files still call raw `fetch` and 6 use `axios` — not linted against, just less idiomatic.

`createCustomApiCallAction` (`packages/pieces/common/src/lib/helpers/index.ts:139`) is the standard
escape-hatch action; 464 pieces include it. It sets `audience: 'human'` internally.

## 5. `outputSchema`, `aiMetadata`, `audience` — the AI/MCP surface

**`outputSchema`** (`framework/src/lib/output-schema.ts` — types only, no helpers) is a
**presentation** schema. Not JSON Schema, not validation.
Shape: `{ fields: OutputSchemaField[], itemLabel? }` where a field is
`{ key, label?, value?, format?, description?, dynamicKey?, labelKey?, currency?, children?, listItems? }`;
`format` ∈ `email|url|date|datetime|number|boolean|image|html|currency|filesize|duration`.

```ts
outputSchema: { fields: [
  { key: 'subject', label: 'Subject' },
  { key: 'from', label: 'From', format: 'email' },
  { key: 'attachments', label: 'Attachments',
    listItems: [{ key: 'fileName' }, { key: 'size', format: 'filesize' }] },
]}
```

It drives the builder's Smart Output Viewer + Data Selector
(`packages/web/src/features/pieces/hooks/use-piece-output-schema.ts`) and the MCP
`ap_get_piece_props` output-field hints. Runtime validation is `z.custom<OutputSchema>()` — i.e. none.
Docs: `docs/build-pieces/piece-reference/output-schema.mdx`.
**Adoption is near-zero** — this is exactly what the pieces-dashboard outputSchema rollout targets.

**`aiMetadata`** (`piece-metadata.ts:53`) = `{ description?: string; idempotent?: boolean }`, allowed
on actions **and** triggers. `description` is written for an agent choosing among hundreds of tools
(what / when-to-pick-over-siblings / key constraint); `idempotent` maps to the MCP `idempotentHint`.
Server-side it **overrides the piece description in the pgvector retrieval doc**
(`packages/server/api/src/app/tool-search/retrieval-doc.ts`) and renders as `AI hint:` / `Idempotent:`
in `ap_get_piece_props`.

**`audience`** (`piece-metadata.ts:50`) = `'human' | 'ai' | 'both'`, **actions only**
(`TriggerBase = Omit<ActionBase,'audience'>`). Its sole runtime effect: `ap_search_actions` excludes
`'human'` (`packages/server/api/src/app/mcp/tools/ap-search-actions.ts:25`); NULL is treated as
`'both'`. No UI effect.

The `-ai.ts` action variants (61 files across stripe/github/airtable/trello/…) replace dropdowns with
flat `ShortText`/`Json` props and name a sibling "(Agent)" discovery action in the description —
**agents can't drive refresher dropdowns**, which is the whole reason these variants exist.

> **Uncertain:** high `aiMetadata`/`audience` adoption counts observed in the local fork are largely
> fork-local AI-ready enrichment; upstream coverage is lower. Check live before quoting numbers.

`context.agent.tools({ tools, model })` wraps piece actions as AI-SDK tools whose input schema is
`{ instruction: string }`; a nested LLM extracts real props. It uses `pieceAction.description`,
**not** `aiMetadata.description` (`packages/server/engine/src/lib/tools/index.ts:37`) — looks like an
oversight worth filing.

## 6. i18n

`src/i18n/translation.json` is an identity map of English → English, **generated, not hand-written**:

```bash
npm run cli pieces generate-translation-file <PIECE_FOLDER>
```

It extracts the paths in `pieceTranslation.pathsToValuesToTranslate` (`framework/src/lib/i18n.ts:51`) —
piece/auth/action/trigger `description` + `displayName`, prop `displayName`/`description`, and
static-dropdown option `label` — truncating keys to `MAX_KEY_LENGTH_FOR_CORWDIN`. Locale files are
`<locale>.json` siblings, synced via Crowdin (`crowdin.yml`). All 720 community + 27 core pieces
have `translation.json`; 719 also have `es.json`.

## 7. Registration

1. **`tsconfig.base.json`** — add alphabetically; build fails without it:
   `"@activepieces/piece-<name>": ["packages/pieces/community/<name>/src/index.ts"]`
2. **Bun workspaces** — `packages/pieces/community/*` is a glob, so a new dir with a `package.json`
   is auto-included; `--filter=@activepieces/piece-*` picks it up with no manifest edit.
3. **Runtime discovery is a filesystem scan** — not tsconfig, not a manifest. Dev: `filePiecesUtils`
   recursively finds folders containing `package.json` (ignoring `node_modules`, `dist`, `framework`,
   `common`), requires `<piece>/dist/src/index`, and runs `extractPieceFromModule`. Gated by
   `AP_DEV_PIECES=<name>` in `packages/server/api/.env`; `dev-piece-watcher.ts` hot-rebuilds on change.
   Production self-host pulls from `https://cloud.activepieces.com/api/v1/pieces/registry` — a new
   piece only appears after `release-pieces.yml` publishes it.
4. **Version bump** — required on every change to an existing piece.
   MAJOR = any removal, a new required prop, or changed behaviour; PATCH/MINOR = new action/trigger,
   optional prop, new output attribute, bug fix
   (`docs/build-pieces/piece-reference/piece-versioning.mdx`).
   `find-changed-pieces.ts` defines "changed" purely as `name@version` not in the registry —
   **forget the bump and your change silently never ships.**

**Generators**: `npm run create-piece | create-action | create-trigger`
(`packages/cli/src/lib/commands/`). They scaffold files but do **not** wire actions/triggers into
`index.ts` or add the `tsconfig.base.json` entry. Three known generator drifts: it writes
`@activepieces/shared` as a dep (banned by the piece lint rule), emits an `.eslintrc.json` with empty
`rules: {}` (missing the boundary rule all existing pieces have), and lowercases display names after
the first char.

## 8. Testing and definition of done

**Lint boundary** — every piece `.eslintrc.json` carries:

```json
"no-restricted-imports": ["error", { "patterns": [
  "lodash", "lodash/*", "@activepieces/core-*", "@activepieces/server*",
  "@activepieces/engine", "@activepieces/shared" ]}]
```

The framework re-exports ~100 foundation symbols (`isNil`, `apId`, `tryCatch`, `PieceCategory`,
`ExecutionType`, …) precisely so pieces never reach past that line. There are no custom eslint
plugins in the repo.

**Tests** are optional (`docs/build-pieces/misc/testing-pieces.mdx`), Vitest 3.0.8, using
`createMockActionContext` from the framework:

```ts
const ctx = createMockActionContext({ propsValue: { inputDate: '2024-06-15 12:30:45', ... } });
expect(await formatDateAction.run(ctx)).toEqual({ result: '2024-06-15T12:30:45' });
```

The helper hardcodes `auth: undefined` and cannot inject auth or HTTP mocks, so pieces testing
authenticated calls (coupa, workday) `vi.spyOn(httpClient, 'sendRequest')` and cast their own context.
Coverage is 19 of 747 pieces / 56 test files, concentrated in `packages/pieces/core/*`.

### What CI actually enforces on a piece-only PR

| Gate | Enforced? |
|---|---|
| `tsc` typecheck via `turbo run build --filter=@activepieces/piece-<name>` | **Yes** (`ci.yml`) |
| ESLint on the piece | **No** — `lint-pieces` only runs when `pieces/framework` or `pieces/common` changed; `lint-core` excludes pieces |
| Piece unit tests | **No** — CI only runs `test` for `@activepieces/engine` and `@activepieces/shared` |
| Version bump | **Yes** — `validate-publishable-packages.yml` → `packagePrePublishChecks` throws `package version not incremented` |
| `min/maximumSupportedRelease` semver validity | Release-time only (`tools/scripts/utils/piece-script-utils.ts`) |
| Conventional PR title; `area/third-party-pieces` label | Title automated; label by convention |

**Practical DoD** — build *and* lint green locally, since CI won't catch lint:

```bash
npx turbo run build --filter=@activepieces/piece-<name>
npx turbo run lint  --filter=@activepieces/piece-<name>
```

`.husky/pre-push` additionally runs `lint-core` + `lint-affected` + `test-unit` + `test-api` —
`lint-affected` is the one path that lints a changed piece, and it only fires locally.
