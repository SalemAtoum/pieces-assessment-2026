import type { ActionClassification } from '../ap/framework.js';

/**
 * PART 2 — step 1 of 2: audit the existing surface.
 */

export type JiraActionCard = {
  name: string;
  displayName: string;
  description: string;
  /** What run() actually calls on the Jira Cloud REST API. */
  api: string;
  keyProps: string[];
  classification: ActionClassification | null;
  reasoning?: string;
};

export const jiraActions: JiraActionCard[] = [
  {
    name: 'get_issue',
    displayName: 'Get Issue',
    description: 'Get issue data.',
    api: 'GET /rest/api/3/issue/{issueId}',
    keyProps: ['projectId', 'issueId'],
    classification: 'READ',
    reasoning: 'Fetches a single issue by its unique identifier without modifying any Jira state.',
  },
  {
    name: 'search_issues',
    displayName: 'Search Issues',
    description: 'Search for issues with JQL.',
    api: 'GET /rest/api/3/search?jql=...  (paginated)',
    keyProps: ['jql', 'maxResults'],
    classification: 'SEARCH',
    reasoning: 'Executes JQL queries across multiple issues to discover and return matching result sets.',
  },
  {
    name: 'create_issue',
    displayName: 'Create Issue',
    description: 'Creates a new issue in a project.',
    api: 'POST /rest/api/3/issue',
    keyProps: ['projectId', 'issueTypeId', 'summary', 'description', 'assignee', 'priority', 'parentKey', 'labels'],
    classification: 'WRITE',
    reasoning: 'Creates a new issue entity in the specified project, mutating Jira state.',
  },
  {
    name: 'update_issue',
    displayName: 'Update Issue',
    description: 'Updates an existing issue (only the fields you pass change).',
    api: 'PUT /rest/api/3/issue/{issueId}',
    keyProps: ['issueId', 'summary', 'description', 'assignee', 'priority', 'labels'],
    classification: 'WRITE',
    reasoning: 'Modifies existing field values on a target issue without destroying or removing the entity.',
  },
  {
    name: 'assign_issue',
    displayName: 'Assign Issue',
    description: 'Assigns an issue to a user.',
    api: 'PUT /rest/api/3/issue/{issueId}/assignee',
    keyProps: ['issueId', 'assigneeId'],
    classification: 'WRITE',
    reasoning: 'Updates the assignee relationship for an issue.',
  },
  {
    name: 'add_comment_to_issue',
    displayName: 'Add Issue Comment',
    description: 'Adds a comment to an issue.',
    api: 'POST /rest/api/3/issue/{issueId}/comment',
    keyProps: ['issueId', 'comment'],
    classification: 'WRITE',
    reasoning: 'Appends a new comment entry to an existing issue conversation.',
  },
  {
    name: 'delete_issue_comment',
    displayName: 'Delete Issue Comment',
    description: 'Deletes a comment on a specific issue.',
    api: 'DELETE /rest/api/3/issue/{issueId}/comment/{commentId}',
    keyProps: ['issueId', 'commentId'],
    classification: 'DESTRUCTIVE',
    reasoning: 'Permanently removes a comment entity from an issue with no undo capability.',
  },
  {
    name: 'transition_issue',
    displayName: 'Transition Issue',
    description: 'Moves an issue to another workflow status (e.g. To Do -> In Progress -> Done).',
    api: 'POST /rest/api/3/issue/{issueId}/transitions',
    keyProps: ['issueId', 'transitionId'],
    classification: 'WRITE',
    reasoning: 'Mutates the workflow status and lifecycle stage of an issue.',
  },
  {
    name: 'markdown_to_jira_format',
    displayName: 'Markdown to Jira format',
    description: 'Converts Markdown text into Jira wiki markup. Makes NO API call — pure local text transform.',
    api: '(none — local transformation only)',
    keyProps: ['markdown'],
    classification: 'READ',
    reasoning: 'Performs a pure, stateless local string transformation without writing or querying external state.',
  },
];