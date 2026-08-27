import { createAction, Property } from '../ap/framework.js';
import { HttpMethod, httpClient } from '../ap/http.js';

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
  name: string;
  archetype?: AtomicArchetype;
  vendorEndpoint?: string;
  rationale: string;
};

export const coverageMap: CoverageMapEntry[] = [
  {
    kind: 'add',
    name: 'find_user_by_query',
    archetype: 'find-by-name',
    vendorEndpoint: 'GET /rest/api/3/user/search',
    rationale:
      'AI agents need to look up Atlassian account IDs by human names or email strings before invoking assign_issue or create_issue.',
  },
  {
    kind: 'add',
    name: 'list_transitions_for_issue',
    archetype: 'missing-verb',
    vendorEndpoint: 'GET /rest/api/3/issue/{issueId}/transitions',
    rationale:
      'Enables AI agents to query the dynamic list of valid transition IDs for a given issue state before calling transition_issue.',
  },
  {
    kind: 'skip',
    name: 'markdown_to_jira_format',
    rationale:
      'LLM agents produce Jira-compatible markup natively within context; no standalone tool execution is required.',
  },
];

export const myAtomic = createAction({
  name: 'find_user_by_query',
  displayName: 'Find Jira User by Query',
  description:
    'Search for Jira Cloud users by name, email address, or username to retrieve their account IDs.',
  audience: 'ai',
  classification: 'SEARCH',
  aiMetadata: {
    description:
      'Searches Jira Cloud users matching a text query (name or email string) and returns their account IDs and display names. Use this before assign_issue or create_issue when only a person name is provided. Read-only and idempotent.',
    idempotent: true,
  },
  props: {
    query: Property.ShortText({
      displayName: 'Search Query',
      description: 'The username, display name, or email string to search for.',
      required: true,
    }),
    maxResults: Property.Number({
      displayName: 'Max Results',
      description: 'The maximum number of matching users to return (default is 10).',
      required: false,
      defaultValue: 10,
    }),
  },
  async run(context) {
    const auth = context.auth as { instanceUrl: string; email: string; apiToken: string };
    const basicAuth = btoa(`${auth.email}:${auth.apiToken}`);
    const cleanBaseUrl = auth.instanceUrl.replace(/\/+$/, '');

    const queryParams: Record<string, string> = {
      query: String(context.propsValue.query),
      maxResults: String(context.propsValue.maxResults ?? 10),
    };

    const response = await httpClient.sendRequest<
      Array<{ accountId: string; displayName: string; emailAddress?: string; active: boolean }>
    >({
      method: HttpMethod.GET,
      url: `${cleanBaseUrl}/rest/api/3/user/search`,
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
      },
      queryParams,
    });

    const users = Array.isArray(response.body) ? response.body : [];
    return users.map((u) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      emailAddress: u.emailAddress ?? '',
      active: u.active,
    }));
  },
});