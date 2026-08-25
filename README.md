# Activepieces — Pieces Team take-home

This take-home mirrors your first month on the Pieces Team: you'll work on **real code
from three real integrations** (pieces) in the
[Activepieces](https://github.com/activepieces/activepieces) catalog.

- **Budget: 3–4 hours total.** Please don't spend more — we mean it.
- Each file tells you exactly what to do in a `YOUR TASK` comment.
- TypeScript strict mode; Node 20+.

## Setup

```bash
npm install
npm run build   # must pass before AND after your changes
npm test        # 7 checks — all fail now, all must pass when you're done
```

The tests only check structure. Passing them is the floor, not the goal — we grade
the judgment behind your choices by hand.

## Part 1 — Zoom: write the `outputSchema` · `src/part1-zoom/`

Both Zoom actions return a rich meeting object but declare no `outputSchema`, so users
and AI agents see raw untyped JSON.

- Write the schema for **both** actions (replace `outputSchema: undefined`).
- The real captured response is in `fixtures/meeting.json`.
- The `OutputSchema` type is in `src/ap/framework.ts`: nested objects use `children`,
  pick sensible `format`s, write human `label`s.

## Part 2 — Jira: give the AI agent a missing tool · `src/part2-jira/`

Activepieces actions double as MCP tools for AI agents. The team's AI-actions project
adds **agent atomics**: net-new `audience: 'ai'` actions that give agents affordances
humans never asked for (find-by-name, list-with-context, upsert, batch, missing verbs).
You'll do one full mini-cycle:

1. **`actions.ts` — audit the existing surface.** Classify all 9 real Jira actions
   (`READ` / `SEARCH` / `WRITE` / `DESTRUCTIVE`) + one sentence of reasoning each.
2. **`my-atomic.ts` — decide what's missing.** Fill the coverage map: at least 2
   atomics worth adding, each mapping 1:1 to a real Jira REST endpoint, plus any
   demote/skip calls.
3. **`my-atomic.ts` — build one of them.** A real `audience: 'ai'` action with
   classification, `aiMetadata`, narrow props, and a working `run()`.

## Part 3 — YouTube: fix the property form · `src/part3-youtube/`

YouTube's search action has 26 props rendered as one flat wall of fields. Apply the
new step-settings metadata — **metadata only, don't touch `run()`**:

- `advanced: true` on every prop that doesn't belong in the short essential form.
- `propertyGroups` grouping related props (display `'section'` recommended).
- `placeholder` where an example helps; `width: 'half'` where fields pair up.

## Resources — read the guide for the part you're on, first

The `resources/` folder vendors the **same internal guides the Pieces Team uses**.
Feel free to feed them to your AI tools.

| Part | Read | Official docs |
|---|---|---|
| 1 | `resources/output-schema-SKILL.md` → `output-schema-reference.md` (`output-schema-capture-recipes.md` if testing live) | [outputSchema](https://www.activepieces.com/docs/build-pieces/piece-reference/output-schema) |
| 2 | `resources/ai-action-skills/phase-3-atomics/SKILL.md` (method) → `atomic-templates.md` (archetypes) → `ai-ready-curation/RUBRIC.md` (the aiMetadata bar) | [aiMetadata](https://www.activepieces.com/docs/build-pieces/piece-reference/ai-metadata) |
| 3 | `resources/property-ui-selection.md` | [Properties](https://www.activepieces.com/docs/build-pieces/piece-reference/properties) |

New to the codebase? Start at
[Building pieces overview](https://www.activepieces.com/docs/build-pieces/building-pieces/overview)
and `resources/ai-action-skills/activepieces-codebase/`.

## Testing against the live APIs (optional, free)

The fixtures are enough to complete everything, but verifying live is a plus —
all three services are free:

| Service | Free path |
|---|---|
| **Jira Cloud** | [Free Atlassian site](https://www.atlassian.com/software/jira/free) (up to 10 users) + API token from account settings. |
| **YouTube** | Any Google account — YouTube Data API v3 has a free daily quota; `search.list` works with a plain API key. |
| **Zoom** | Free Basic account → [Zoom Marketplace](https://marketplace.zoom.us) → Build App → add `meeting:read`/`meeting:write` scopes. |

You can also register free on [cloud.activepieces.com](https://cloud.activepieces.com)
and look at how these pieces render in a real flow today.

## Submitting — a real PR on the real repo

Your submission is a **draft pull request to
[activepieces/activepieces](https://github.com/activepieces/activepieces)** — the same
fork-based flow the team and community contributors use. Get this repo's tests green
first, then transplant your work:

1. Fork `activepieces/activepieces`, branch `assessment/<your-github-handle>` off a
   fresh `main`.
2. Apply your work to the real pieces:
   - **Part 1** → create `packages/pieces/community/zoom/src/lib/output-schemas.ts`
     and wire `outputSchema:` into `find-meeting.ts` and `create-meeting.ts`
     (copy the pattern from `packages/pieces/community/gmail/src/lib/output-schemas.ts`).
   - **Part 2** → add your `classification:` to the matching actions in
     `packages/pieces/community/jira-cloud/src/lib/actions/`; add your new atomic as
     its own file there (adapted to the piece's real auth/client style) and register
     it in the piece's `src/index.ts` `actions:` array.
   - **Part 3** → apply your `advanced` / `propertyGroups` / `placeholder` / `width`
     edits to `packages/pieces/community/youtube/src/lib/actions/search.ts`.
3. You do **not** need to build or run the monorepo — this repo's tests are your
   verification, and CI typechecks the PR. Don't bump piece versions or touch
   anything outside the three pieces. (The team's full production recipe also does
   scope checks, connection tests, and version bumps — all out of scope here.)
4. Open the PR as **Draft**, titled `[assessment] feat(pieces): <your full name>`.
5. **The PR description must include a short HOW-I-WORKED section** (5–15 lines):
   your approach, what tools you used and how — AI tools are welcome, we use them
   daily, but **you must be able to explain every line you submit**; the interview
   includes a walkthrough of your PR — plus your Part 2 coverage-map reasoning and
   Part 3 essential-props reasoning.
6. Commit as you go, not one squashed dump — we read the history.
7. Reply to the assessment email with the PR link before your deadline.

Heads up: PRs on a public repo are visible to everyone, including other candidates.
We diff submissions against each other — the reasoning in your PR description is
what makes your work yours.

Questions? Reply to the email — asking good questions is a signal, not a penalty.
