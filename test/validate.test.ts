/**
 * Structural self-checks. Passing these does NOT mean full marks — they catch
 * broken structure, not judgment. We grade judgment by hand.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { OutputSchemaField, OutputSchema } from '../src/ap/framework.js';
import { zoomFindMeeting } from '../src/part1-zoom/find-meeting.js';
import { zoomCreateMeeting } from '../src/part1-zoom/create-meeting.js';
import { jiraActions } from '../src/part2-jira/actions.js';
import { youtubeSearchAction } from '../src/part3-youtube/search.js';

const fixture = JSON.parse(
  readFileSync(new URL('../src/part1-zoom/fixtures/meeting.json', import.meta.url), 'utf-8'),
);

function checkKeys(fields: OutputSchemaField[], data: unknown, path: string[] = []): string[] {
  const missing: string[] = [];
  for (const f of fields) {
    const here = [...path, f.key].join('.');
    if (typeof data !== 'object' || data === null || !(f.key in (data as Record<string, unknown>))) {
      missing.push(here);
      continue;
    }
    const v = (data as Record<string, unknown>)[f.key];
    if (f.children) missing.push(...checkKeys(f.children, v, [...path, f.key]));
    if (f.listItems && Array.isArray(v) && v.length > 0) {
      missing.push(...checkKeys(f.listItems, v[0], [...path, f.key, '0']));
    }
  }
  return missing;
}

test('part 1: both zoom actions have a non-empty outputSchema', () => {
  for (const action of [zoomFindMeeting, zoomCreateMeeting]) {
    const schema = action.outputSchema as OutputSchema | undefined;
    assert.ok(schema, `${action.name}: outputSchema is still undefined`);
    assert.ok(schema.fields.length >= 8, `${action.name}: expected at least 8 top-level fields`);
  }
});

test('part 1: every outputSchema key exists in the fixture', () => {
  const schema = zoomFindMeeting.outputSchema as OutputSchema | undefined;
  if (!schema) assert.fail('outputSchema is still undefined');
  const missing = checkKeys(schema.fields, fixture);
  assert.deepEqual(missing, [], `keys not found in fixtures/meeting.json: ${missing.join(', ')}`);
});

test('part 2: all 9 jira actions are classified', () => {
  const unclassified = jiraActions.filter((a) => a.classification === null).map((a) => a.name);
  assert.deepEqual(unclassified, [], `unclassified: ${unclassified.join(', ')}`);
});

test('part 2: at least 3 actions have real aiMetadata', () => {
  const withMeta = jiraActions.filter(
    (a) => a.aiMetadata && (a.aiMetadata.description ?? '').length >= 80 && a.aiMetadata.idempotent !== undefined,
  );
  assert.ok(withMeta.length >= 3,
    `need >= 3 actions with aiMetadata (description >= 80 chars + idempotent set), found ${withMeta.length}`);
});

test('part 3: an essential/Advanced split exists', () => {
  const props = youtubeSearchAction.props;
  const advanced = Object.values(props).filter((p) => p.advanced === true).length;
  const total = Object.keys(props).length;
  assert.ok(advanced >= 5, `expected at least 5 advanced props, found ${advanced}`);
  assert.ok(advanced < total, 'not every prop can be Advanced — something must stay essential');
});

test('part 3: propertyGroups are structurally valid', () => {
  const groups = youtubeSearchAction.propertyGroups ?? [];
  assert.ok(groups.length >= 2, 'expected at least 2 property groups');
  const propNames = new Set(Object.keys(youtubeSearchAction.props));
  const seen = new Set<string>();
  for (const g of groups) {
    assert.ok(g.props.length > 0, `group "${g.key}" is empty`);
    for (const p of g.props) {
      assert.ok(propNames.has(p), `group "${g.key}" references unknown prop "${p}"`);
      assert.ok(!seen.has(p), `prop "${p}" appears in two groups`);
      seen.add(p);
    }
  }
});
