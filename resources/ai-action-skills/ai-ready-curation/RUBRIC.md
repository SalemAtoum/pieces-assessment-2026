# Curation rubric — the bar every object must hit

## `aiMetadata.description` — Balanced house style

1–3 sentences, written **for an agent choosing among hundreds of tools**, not for the builder UI. Cover, in order:

1. **What** it does and on what object — and, if it has more than one materially different **mode of operation**, name them in a clause so the agent knows the option exists (e.g. an empty search value fetches all rows vs. filters to matches; a `source`/`mode` prop that switches between picking from a list and passing a raw ID; a trigger that fires on any of several configurable event types). A clause naming the mode — **not** a prop-by-prop walkthrough.
2. **When** an agent should pick it (and, when relevant, which sibling action to prefer instead).
3. The **key constraint** or critical required input.
4. **Idempotency** stated in prose ("Read-only and idempotent." / "Not idempotent: each call …").

**Do not:** echo the human `description`; describe the return shape/schema (that's the separate `outputSchema` stream); inline large input/output examples. A short clarifying fragment (`(e.g. [[KEY]] or {{KEY}})`) is within tolerance; a full worked example is not.

Good (from batch-1):

- **google-sheets / find_rows** — *"Searches a worksheet for rows whose value in a chosen column matches a search value (exact or contains), returning up to a requested number of matches. Use to locate rows before reading, updating, or deleting them; leave the search value empty to fetch rows sequentially. Read-only and idempotent."*
- **notion / create_database_item** — *"Creates a new row (page) in a specific Notion database, setting its property fields and optionally appending body content. Use when an agent must add a structured record (task, contact, ticket) to a known database; requires the target database_id and field values matching that database schema. Not idempotent: each call creates a separate item, so guard against duplicates."*
- **supabase / create_row** — *"Inserts a new row into a Postgres table via the Supabase REST API … Use to add a record when you do not need to match or replace an existing one (use Upsert Row for insert-or-update). Not idempotent: each call appends another row and will error on unique-constraint … violations."*

## `idempotent` (actions only)

Derive from `run()` (the HTTP method / operation), **not** the action name:

- **`true`** — GET / lookup / list / search / read; or upsert keyed on a stable id; or DELETE / set-state operations that converge to the same end state (delete, pin, unpin, set-value).
- **`false`** — create / send / append / forward / "quick-add" — anything that produces a new entity or side effect each call.

A healthy batch lands roughly half-and-half; an all-`true` or all-`false` result means the agent guessed from names. (A batch of **core utility** pieces legitimately skews `true` — wave-2 landed 86T/27F — because pure transforms dominate.)

### Actions that write a file — locked 2026-07-31

An action that ends in `context.files.write` is **`true`** when its output *content* is a deterministic function of its input. Metadata that differs per call does **not** make it `false` — e.g. `pdf-lib` sets `ModificationDate = new Date()` inside `updateInfoDict()` on every `save()` (`updateMetadata` defaults to `true`), and `zip.js` defaults `lastModDate` to `new Date()`. The bytes differ; the document doesn't.

`false` is reserved for **content** nondeterminism (model sampling, randomized ciphertext, uuid/random/password generation, clock reads) or a genuine external side effect (a remote job, a send).

Two consequences:
- The **description must not claim byte-determinism** — say "repeating the call produces the same merged content", not "the merge is deterministic".
- **Reads that return bytes** (`sftp/readFileContent`, `tables/downloadTable`, `*/read-file`) are `true` for the ordinary read reason.

Why this line: the rule's other reading ("produces a new file entity per call → `false`") marks pure local transforms non-idempotent and discourages retries that are in fact safe. The merged catalog was split 37 `true` / 29 `false` on file-writing actions before this decision, but its `false` set is almost entirely *remote* API conversions (cloudconvert, carbone, bedrock) and its `true` set is reads — so precedent never covered local transforms. Decided by ibrahim on the wave-2 core batch after an A/B surfaced two models reading the ambiguity differently.

## `audience` (actions only)

- Every agent-visible action → **`audience: 'both'`** (written explicitly — the metadata is consumed raw, so a filter only sees the value if it's physically present; an omitted field is absent from the serialized metadata).
- **Triggers** take no `audience` field (the framework `TriggerBase` omits it).
- **`customApiCall`** (the `createCustomApiCallAction(...)` entry) is **left untouched** — its `'human'` fencing needs a shared-helper change and is handled by the separate codemod (Phase-1 task #7). It is the only action left without an `audience`.
- `'human'` / `'ai'` exceptions are **not** part of this content pass (`'human'` utilities come from `ai_irrelevant_actions.csv` via the codemod; `'ai'`-only atomics are Phase 3).

## `package.json`

**Patch-bump the version** (CI's `package-pre-publish-checks.ts` throws "version not incremented" if a package's code changes without a version change). Do **not** add an `aiReady` flag — it was dropped from the curation contract (2026-06-09; decoupled, see execution_plan Phase 2).
