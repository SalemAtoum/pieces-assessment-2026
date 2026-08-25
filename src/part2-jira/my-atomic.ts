import { createAction, Property } from '../ap/framework.js';

/**
 * PART 2 — step 2 of 2: give the agent a tool it's missing.
 *
 * This mirrors the team's real AI-actions (Phase 3) work: net-new
 * `audience: 'ai'` actions ("agent atomics") added BESIDE the existing ones,
 * so an AI agent gets affordances humans never asked for.
 *
 * READ FIRST (all vendored in this repo):
 *   resources/ai-action-skills/phase-3-atomics/SKILL.md          — the method
 *   resources/ai-action-skills/phase-3-atomics/atomic-templates.md — the 7 archetypes
 *   resources/ai-action-skills/ai-ready-curation/RUBRIC.md       — the aiMetadata bar
 *
 * YOUR TASKS:
 *  A. Fill `coverageMap` with AT LEAST TWO atomics worth adding to Jira Cloud
 *     (plus any demote/skip calls). Rules:
 *     - every atomic must map 1:1 to a REAL Jira Cloud REST endpoint
 *       (https://developer.atlassian.com/cloud/jira/platform/rest/v3/) — no invented APIs;
 *     - `archetype` from the templates: 'find-by-name' | 'list-with-context' |
 *       'upsert' | 'batch' | 'missing-verb' | 'partial-update' | 'async-job';
 *     - demote an existing action ONLY if your atomics fully cover its
 *       agent-relevant intents (the skill's demotion gate — when in doubt, don't).
 *  B. Implement ONE atomic from your map, below. Requirements:
 *     - `audience: 'ai'`, correct `classification`, `aiMetadata` that clears RUBRIC.md
 *       (what + when-to-pick-over-siblings + key constraint; `idempotent` derived
 *       from what run() actually does);
 *     - narrow, single-purpose props — every prop has a description;
 *     - run() calls the real endpoint (auth pattern below) and returns flat,
 *       consistently-keyed output (see output-quality guidance in the skill pack).
 */

export type AtomicArchetype =
  | 'find-by-name'
  | 'list-with-context'
  | 'upsert'
  | 'batch'
  | 'missing-verb'
  | 'partial-update'
  | 'async-job';

export type CoverageMapEntry = {
  kind: 'add' | 'demote' | 'skip';
  /** For 'add': your atomic's snake_case name. For 'demote'/'skip': the existing action's name. */
  name: string;
  archetype?: AtomicArchetype; // required for 'add'
  /** For 'add': the real vendor endpoint, e.g. 'GET /rest/api/3/project/search'. */
  vendorEndpoint?: string;
  rationale: string;
};

export const coverageMap: CoverageMapEntry[] = [
  // TODO (task A) — at least two 'add' entries; 'demote'/'skip' where you judge right.
];

/**
 * Auth: Jira Cloud uses basic auth. `context.auth` here is
 * `{ instanceUrl: string; email: string; apiToken: string }` — build the header with
 * `Authorization: Basic base64(email + ':' + apiToken)`.
 * (Free test site: https://www.atlassian.com/software/jira/free)
 */
export const myAtomic = createAction({
  name: 'todo_rename_me', // TODO (task B)
  displayName: 'TODO',
  description: 'TODO',
  audience: 'ai',
  // classification: TODO
  // aiMetadata: TODO
  props: {
    // TODO — narrow, single-purpose, every prop described
  },
  async run(context) {
    // TODO — call the real endpoint; return flat, well-shaped output
    throw new Error('not implemented');
  },
});
