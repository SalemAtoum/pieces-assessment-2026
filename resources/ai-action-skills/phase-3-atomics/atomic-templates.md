# Agent-atomic body idioms

The seven Phase-3 archetypes and how to author each `run()`. Canonical, working examples are the Gmail pilot atomics (`activepieces/packages/pieces/community/gmail/src/lib/actions/{list-labels,create-label,modify-labels,trash-message}-action.ts`). Match the target piece's auth/client/error style — these are idioms, not drop-in code.

General shape (all archetypes): resolve the vendor client from `context.auth` the way the piece already does, wrap the call in `try/catch` with per-status messages (`403` → scope/permission, `429` → rate limit, `404` → not found), return a **flat, table-ready** object/array (per piece-builder `output-quality.md`).

## 1. find-by-name / query
Wrap the vendor's NATIVE search/filter endpoint (e.g. a `q=`/`?query=` param). Build the query string from optional props, call the list/search endpoint, return a flat array. NOT embeddings. Existing `gmail_search_mail` is the model. `idempotent: true`.

## 2. list-with-context
A read that returns a collection enriched with the ids/fields downstream atomics need (resolve-name→id is the classic use). Map the raw items to a consistent flat key set; include a `count`. Example: `gmail_list_labels` returns `{labels:[{id,name,type,...}], count}` — the id-resolution prerequisite for label ops. `idempotent: true`.

## 3. upsert / get-or-create
Make `create` idempotent by checking first: list/lookup by the caller-supplied key → if found, return the existing record (with `created:false`) → else create (`created:true`). The idempotency is in THIS wrapper, not the bare endpoint (which usually 409s on duplicate). Example: `gmail_create_label` lists labels, returns the match or creates. `idempotent: true` (contingent on the wrapper — implement it).

## 4. batch
Operate on many items in one native batch call (e.g. `batchModify`, `:batchGet`, `values:batchUpdate`). Take array props (`Property.Array({displayName, required})` → cast `as string[]`), validate non-empty, call once, return `{success, <n>_count, ...}`. Respect the vendor's batch cap (Gmail batchModify ≤1000). Example: `gmail_modify_labels` (add/remove label-id lists across N message ids) — idempotent because re-applying the same labels is a no-op (`idempotent: true`); a batch *create* would be `false`.

## 5. missing-verb
A real vendor verb the piece simply lacks (delete/trash, archive, move, mark-read, forward, a status change). One endpoint, narrow props, clear safety framing in `aiMetadata` (prefer recoverable over destructive — e.g. trash over permanent delete). Example: `gmail_trash_message` (`users.messages.trash`, single id, recoverable). `idempotent` per the verb (trash = true since re-trashing is a no-op; a hard delete = false).

## 6. partial update / modify-by-id
An update verb whose fields are all optional (`update_draft`, `update_event`, `update_task`, `modify_testimonial`). **An omitted optional prop must leave the stored value alone** — this is the class the pieces team fixed three separate times after merge, so treat it as the default suspicion on every update atomic. A bare `PATCH` usually ignores absent keys, but a `PUT`/replace endpoint, a client that serializes `undefined`, or a low-fidelity read-before-write silently wipes fields instead.
- **Fetch-forward when the endpoint replaces rather than patches**: read the current record, merge your supplied props over it, send the union — and read at a fidelity that carries every field you re-send. gmail's update-draft had to move from `format:'metadata'` to raw-MIME parsing because metadata responses omit BCC and attachments, so an edit dropped them (`c77724a7`).
- **Optional booleans need three states.** `undefined` = leave alone, distinct from `true`/`false`. A plain `Property.Checkbox` collapses "unset" into `false` and force-writes it; model as `Property.StaticDropdown` with an unset option (google-calendar's guest-permission props, `fdeb5b9d`) and gate transmission on `x !== undefined`, never a truthy check (pubrio's `is_active`/`is_paused` were dropped whenever `false`).
- **Pin the revision when the vendor offers one** — google-docs' populate-table sends a `requiredRevisionId` writeControl so a concurrent edit fails the batch instead of silently overwriting it (`3bef58f6`).
- **Prove it in Tier-2, don't just implement it**: set exactly one optional field, re-read the record, and confirm every field you left unset survived — then repeat for a different field. A single "it returned SUCCEEDED" run cannot distinguish a correct partial update from one that wiped the rest.
`idempotent: true` — re-applying the same field values converges on the same state.

## 7. async job — start + poll
The vendor returns a **job/task id instead of the result** (Dropbox `*_batch`, Firecrawl crawl/batch-scrape, Apify actor runs, Reoon bulk verification). **Model it as two atomics, not one blocking call.** A single action that waits for completion is fragile against AP's action time limit, and a long job silently converts into a timeout the agent can't distinguish from a failure.
- **Start atomic** — fires the job, returns the id and nothing else pretending to be a result. `idempotent: false` (each call launches a new job). Its description must name the sibling poll atomic, or the agent is left holding an id with no next move.
- **Poll atomic** — one status read by id, returning status + results-so-far. `idempotent: true`. It is a *single read*, never an internal loop-until-done.
- If the vendor offers a bounded server-side wait (Apify's `waitForFinish`, max ~60s), expose it for short jobs only and keep the poll atomic as the real path for long ones.
- Surface failures separately from results when the vendor does (Firecrawl's crawl/batch **errors** endpoints) — a partial success that reports only the successes reads as a complete one.
Live bug for the file: firecrawl's crawl poll was written against the v1 response shape while the start call used v2, so polling never resolved (Greptile P1, fixed in `33cd6d1`).

## Props notes
- Simple string list: `Property.Array({ displayName, description, required })` → value is `unknown[]`; cast `as string[]`.
- Single id / name: `Property.ShortText`. Don't make agents type opaque ids without saying where to get them — point to the sibling atomic in the description ("obtain from Find Email" / "resolve via List Labels").
- **Vendor capability flags belong in the call, not the prop list.** When a flag has exactly one correct value for an agent (`supportsAllDrives`, `includeItemsFromAllDrives`), hardcode it. As an opt-in prop it becomes a trap: the agent has no way to know it must be set, so the atomic silently fails on the very cases the flag exists for. The pieces team removed google-drive's `include_team_drives` prop from 16 atomics and defaulted `supportsAllDrives: true` on both the files and permissions APIs (`a7a7ce0`, `7297463`) — until then every drive atomic failed on shared-drive files.
- `audience: 'ai'` on every atomic (explicit). `aiMetadata.idempotent` per the table in `phase-3-atomics/SKILL.md` step 4.
