import type { ActionClassification } from '../ap/framework.js';

/**
 * PART 2 — step 1 of 2: audit the existing surface.
 *
 * Every action below is real (vendored facts from packages/pieces/community/jira-cloud).
 * For this exercise, treat these 9 as the piece's ENTIRE surface.
 *
 * YOUR TASK (step 1):
 *  - Set `classification` on ALL 9 actions: 'READ' | 'SEARCH' | 'WRITE' | 'DESTRUCTIVE'.
 *  - One short sentence in `reasoning` per action.
 *  This is the first move of a real atomics audit: you can't see what agents are
 *  missing until you've mapped what exists. Step 2 is in `my-atomic.ts`.
 */

export type JiraActionCard = {
  name: string;
  displayName: string;
  description: string;
  /** What run() actually calls on the Jira Cloud REST API. */
  api: string;
  keyProps: string[];
  classification: ActionClassification | null; // <- fill for all 9
  reasoning?: string;                           // <- fill for all 9
};

export const jiraActions: JiraActionCard[] = [
  {
    name: 'get_issue',
    displayName: 'Get Issue',
    description: 'Get issue data.',
    api: 'GET /rest/api/3/issue/{issueId}',
    keyProps: ['projectId', 'issueId'],
    classification: null,
  },
  {
    name: 'search_issues',
    displayName: 'Search Issues',
    description: 'Search for issues with JQL.',
    api: 'GET /rest/api/3/search?jql=...  (paginated)',
    keyProps: ['jql', 'maxResults'],
    classification: null,
  },
  {
    name: 'create_issue',
    displayName: 'Create Issue',
    description: 'Creates a new issue in a project.',
    api: 'POST /rest/api/3/issue',
    keyProps: ['projectId', 'issueTypeId', 'summary', 'description', 'assignee', 'priority', 'parentKey', 'labels'],
    classification: null,
  },
  {
    name: 'update_issue',
    displayName: 'Update Issue',
    description: 'Updates an existing issue (only the fields you pass change).',
    api: 'PUT /rest/api/3/issue/{issueId}',
    keyProps: ['issueId', 'summary', 'description', 'assignee', 'priority', 'labels'],
    classification: null,
  },
  {
    name: 'assign_issue',
    displayName: 'Assign Issue',
    description: 'Assigns an issue to a user.',
    api: 'PUT /rest/api/3/issue/{issueId}/assignee',
    keyProps: ['issueId', 'assigneeId'],
    classification: null,
  },
  {
    name: 'add_comment_to_issue',
    displayName: 'Add Issue Comment',
    description: 'Adds a comment to an issue.',
    api: 'POST /rest/api/3/issue/{issueId}/comment',
    keyProps: ['issueId', 'comment'],
    classification: null,
  },
  {
    name: 'delete_issue_comment',
    displayName: 'Delete Issue Comment',
    description: 'Deletes a comment on a specific issue.',
    api: 'DELETE /rest/api/3/issue/{issueId}/comment/{commentId}',
    keyProps: ['issueId', 'commentId'],
    classification: null,
  },
  {
    name: 'transition_issue',
    displayName: 'Transition Issue',
    description: 'Moves an issue to another workflow status (e.g. To Do -> In Progress -> Done).',
    api: 'POST /rest/api/3/issue/{issueId}/transitions',
    keyProps: ['issueId', 'transitionId'],
    classification: null,
  },
  {
    name: 'markdown_to_jira_format',
    displayName: 'Markdown to Jira format',
    description: 'Converts Markdown text into Jira wiki markup. Makes NO API call — pure local text transform.',
    api: '(none — local transformation only)',
    keyProps: ['markdown'],
    classification: null,
  },
];
