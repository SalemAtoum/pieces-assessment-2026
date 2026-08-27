export const meta = {
  name: 'ai-ready-batch-1',
  description: 'Curate aiMetadata + audience:both on AP pieces (curate->verify pipeline) per the curation spec',
  phases: [{ title: 'Curate' }, { title: 'Verify' }],
}

// EDIT ME: absolute path to your local activepieces checkout
const REPO = '/absolute/path/to/activepieces'
const parsePieces = (a) => {
  if (Array.isArray(a)) return a
  if (typeof a === 'string' && a.trim()) {
    try { const p = JSON.parse(a); if (Array.isArray(p)) return p } catch (e) { /* fall through */ }
    return a.split(/[\s,]+/).filter(Boolean)
  }
  return ['gmail', 'telegram-bot']
}
const PIECES = parsePieces(args)

const MANIFEST_SCHEMA = {
  type: 'object',
  required: ['piece', 'version_from', 'version_to', 'objects'],
  properties: {
    piece: { type: 'string' },
    version_from: { type: 'string' },
    version_to: { type: 'string' },
    skipped_custom_api_call: { type: 'boolean' },
    objects: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'type', 'file', 'description'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['action', 'trigger'] },
          file: { type: 'string' },
          audience: { type: ['string', 'null'] },
          idempotent: { type: ['boolean', 'null'] },
          description: { type: 'string' },
        },
      },
    },
    notes: { type: 'string' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['piece', 'ok', 'issues', 'idempotent_mismatches', 'summary'],
  properties: {
    piece: { type: 'string' },
    ok: { type: 'boolean' },
    completeness_ok: { type: 'boolean' },
    mechanics_ok: { type: 'boolean' },
    audience_ok: { type: 'boolean' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'object', 'problem'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          object: { type: 'string' },
          problem: { type: 'string' },
        },
      },
    },
    idempotent_mismatches: {
      type: 'array',
      items: {
        type: 'object',
        required: ['action', 'written', 'derived'],
        properties: {
          action: { type: 'string' },
          written: { type: ['boolean', 'null'] },
          derived: { type: 'boolean' },
          reason: { type: 'string' },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const curatePrompt = (piece) => `You are curating AI metadata for the Activepieces piece \`${piece}\`. Repo root: ${REPO}

GOAL: make this piece agent-ready with ADDITIVE metadata only. Never change runtime behavior, logic, imports, or formatting beyond the inserted fields.

SOURCE OF TRUTH: read \`${REPO}/packages/pieces/community/${piece}/src/index.ts\`. The \`createPiece({ actions:[...], triggers:[...] })\` arrays list every action/trigger. Definition files may live in \`src/lib/actions/\` OR \`src/lib/action/\` (singular) OR be inline. Resolve each entry to its createAction/createTrigger object.

DO NOT TOUCH \`customApiCall\` (the entry built by \`createCustomApiCallAction(...)\`). Skip it entirely — its audience fencing is handled by a separate codemod.

FOR EACH ACTION (except customApiCall):
1. Open its file; read displayName, description, props, and the run() body (and any common/ helpers it calls).
2. Insert TWO fields into its \`createAction({...})\` object, immediately AFTER the \`description:\` line, in this order:
   audience: 'both',
   aiMetadata: { description: '<agent desc>', idempotent: <true|false> },
3. Agent description — BALANCED house style, 1-3 sentences: (a) what it does and on what — and if it has more than one materially different MODE of operation, name them in a clause so the agent knows the option exists (e.g. empty search value = fetch-all vs. filter to matches; a source/mode prop that switches between picking from a list and passing a raw ID; a trigger that fires on any of several configurable event types); a clause naming the mode, NOT a prop-by-prop walkthrough, (b) when an agent should choose it, (c) the key constraint or critical input. State idempotency in prose. NO inline input/output example. Do NOT describe the return shape/schema (separate stream owns that). Write for an agent picking among hundreds of tools — not the builder UI. Do not just echo the human description.
4. idempotent: true if repeating the call with the same input is safe and yields the same result with no extra side effect (GET / lookup / list / search, or an upsert keyed on a stable id). false if it creates/sends/appends/mutates on each call. DERIVE from run() (the HTTP method/operation), not the action name.
5. The \`audience\` value is ALWAYS \`'both'\` for these actions (they are agent-visible). Do not use 'human' or 'ai'.

FOR EACH TRIGGER: insert this block immediately AFTER its \`description:\` line (use this exact multi-line shape for consistency):
   aiMetadata: {
     description: '<agent desc>',
   },
Describe when the event fires and what it represents. NO idempotent, NO audience (triggers do not support audience).

PACKAGE.JSON (\`${REPO}/packages/pieces/community/${piece}/package.json\`): patch-bump the version (x.y.z -> x.y.(z+1)) — required because the action/trigger files changed. Do NOT add an \`aiReady\` flag (dropped from the curation contract 2026-06-09; decoupled).

Use the Edit tool for every change; keep edits minimal and additive. When done, RETURN the manifest (one object row per action/trigger you edited; for actions record audience:'both' and the idempotent boolean; for triggers record audience:null and idempotent:null; set skipped_custom_api_call true if you skipped one).`

const verifyPrompt = (piece, manifest) => `Adversarially verify the AI-metadata curation of piece \`${piece}\`. Repo root: ${REPO}. Do NOT edit any files — verification only.

The curator reported this manifest:
${JSON.stringify(manifest)}

CHECKS:
1. COMPLETENESS — read \`${REPO}/packages/pieces/community/${piece}/src/index.ts\`. Every action in the actions array EXCEPT customApiCall must now have a non-empty \`aiMetadata.description\` in its definition file; every trigger likewise. Report any missing as blocker issues.
2. RUBRIC — open the edited files and judge each description against the balanced style: states what + when-to-call + a constraint, written for an agent, not a copy of the human description, no return-shape spec, no oversized example. Also, when an action/trigger has more than one materially different mode of operation (read run()/props to confirm), the description should name those modes in a clause; flag a missed material mode (minor), but do NOT require prop-by-prop detail. Flag non-compliant ones (major/minor).
3. IDEMPOTENT — for each action, independently read its run() and derive idempotent (true = GET/lookup/list/search/upsert-by-stable-id; false = create/send/append/mutate). Compare to the written value; list every mismatch.
4. AUDIENCE — every agent-visible action must have \`audience: 'both'\`; triggers must have NO audience field; customApiCall must be untouched. Flag any deviation (set audience_ok accordingly).
5. MECHANICS — confirm the package.json version changed vs upstream/main (run: \`cd ${REPO} && git diff upstream/main -- packages/pieces/community/${piece}/package.json\`) and that it does NOT add an \`aiReady\` flag (dropped from the contract). Confirm customApiCall was NOT modified.

Return the verdict. Set ok=false if any blocker, idempotent mismatch, or audience deviation exists.`

const results = await pipeline(
  PIECES,
  (piece) => agent(curatePrompt(piece), { label: `curate:${piece}`, phase: 'Curate', schema: MANIFEST_SCHEMA }),
  (manifest, piece) => agent(verifyPrompt(piece, manifest), { label: `verify:${piece}`, phase: 'Verify', schema: VERDICT_SCHEMA })
        .then((verdict) => ({ piece, manifest, verdict }))
)

return results.filter(Boolean)