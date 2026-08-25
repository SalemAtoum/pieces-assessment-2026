# Activepieces — Pieces Team take-home

Welcome! This take-home mirrors the actual work you'd do in your first month on the
Pieces Team. You'll work on **real code vendored from three real integrations**
(pieces) in the [Activepieces](https://github.com/activepieces/activepieces) catalog.

- **Budget: 3–4 hours.** Please don't spend more — we mean it.
- **Every file tells you exactly what to do** in a `YOUR TASK` comment.
- TypeScript strict mode; Node 20+.

## Setup

```bash
npm install
npm run build   # should pass before AND after your changes
npm test        # 6 checks — all fail now, all should pass when you're done
```

The tests are structural self-checks only. Passing them is the floor, not the goal —
we grade the judgment behind your choices by hand.

## The three parts

### Part 1 — `src/part1-zoom/` · outputSchema (~1–1.5h)

Both Zoom actions return a rich meeting object but declare no `outputSchema`, so
users (and AI agents) see untyped output. Write the schema for both actions.
A captured real response is in `fixtures/meeting.json`. Study the
`OutputSchema` type in `src/ap/framework.ts` — nested objects use `children`,
and pick sensible `format`s and `label`s.

### Part 2 — `src/part2-jira/` · AI-action metadata (~1h)

Activepieces actions double as MCP tools for AI agents. Classify all 9 real
Jira Cloud actions (`READ` / `SEARCH` / `WRITE` / `DESTRUCTIVE`), write
`aiMetadata` for any 3, and one sentence of reasoning for each call.
Think like the agent: "if I call this twice by accident, what happens?"

### Part 3 — `src/part3-youtube/` · step-settings UI (~1h)

YouTube's search action has 26 props rendered as one flat wall of fields.
Apply the new step-settings metadata: essential/Advanced split,
`propertyGroups`, placeholders, widths. Metadata only — don't touch `run()`.

## Resources — read these first

Work the way the team works: read the guide for the part you're on, then do the part.
The `resources/` folder vendors the **same internal guides the Pieces Team uses**
(from the [Activepieces repo](https://github.com/activepieces/activepieces), `.agents/skills/`).
Feel free to feed them to your AI tools — that's what they're for.

| Part | Vendored guide(s) | Official docs |
|---|---|---|
| Start here | — | [Building pieces overview](https://www.activepieces.com/docs/build-pieces/building-pieces/overview) |
| 1 · outputSchema | `resources/output-schema-SKILL.md`, `output-schema-reference.md`, `output-schema-capture-recipes.md` (for live capture) | [outputSchema reference](https://www.activepieces.com/docs/build-pieces/piece-reference/output-schema) |
| 2 · AI actions | `resources/ai-metadata-guide.md` + the full **AI-actions skill pack** in `resources/ai-action-skills/` (start with `ai-ready-curation/RUBRIC.md` — it is the bar your aiMetadata is graded against) | [aiMetadata reference](https://www.activepieces.com/docs/build-pieces/piece-reference/ai-metadata) |
| 3 · UI | `resources/property-ui-selection.md` | [Properties reference](https://www.activepieces.com/docs/build-pieces/piece-reference/properties) |

## Testing against the live APIs (optional, free)

You can complete everything with the provided fixtures, but verifying against the
real APIs is a plus and every one of these services is free:

| Service | Free path |
|---|---|
| **Jira Cloud** | [Free Atlassian site](https://www.atlassian.com/software/jira/free) (up to 10 users) + API token from account settings. |
| **YouTube** | Any Google account — YouTube Data API v3 has a free daily quota; `search.list` even works with a plain API key. |
| **Zoom** | Free Basic account → [Zoom Marketplace](https://marketplace.zoom.us) → Build App → add `meeting:read`/`meeting:write` scopes. |

You can also register a free account on [cloud.activepieces.com](https://cloud.activepieces.com)
and poke at the real Zoom / YouTube / Jira pieces in a flow to see how props render today.

## AI tools

Use whatever you want — we do, daily. Two rules:

1. **You must be able to explain every line you submit.** The follow-up interview
   includes a walkthrough of your submission; "the AI wrote it" is an instant no.
2. Add a `HOW-I-WORKED.md` (5–15 lines): how you approached it, what tools you
   used and how, which decisions were yours, and your Part 3 essential-props
   reasoning (task 4 there).

## Submitting

1. Push to a GitHub repo — public, or private with
   [`ibrahim-abuznaid`](https://github.com/ibrahim-abuznaid) invited.
2. Real commits as you go, not one squashed dump — we read the history.
3. Reply to the assessment email with the repo link before your deadline.

Questions? Reply to the email — asking good questions is a signal, not a penalty.
