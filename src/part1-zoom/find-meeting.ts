import { createAction, Property } from '../ap/framework.js';
import { HttpMethod, AuthenticationType, httpClient } from '../ap/http.js';
import { meetingOutputSchema } from './output-schemas.js';

export const zoomFindMeeting = createAction({
  name: 'zoom_find_meeting',
  classification: 'READ',
  displayName: 'Find Zoom Meeting',
  description: 'Retrieve the details of an existing meeting.',
  audience: 'both',
  aiMetadata: {
    description:
      'Fetches the full details of an existing Zoom meeting by its meeting ID. Use to look up a meeting before acting on it; optionally target a specific occurrence of a recurring meeting or include all previous occurrences. Read-only and idempotent.',
    idempotent: true,
  },

  outputSchema: meetingOutputSchema,

  props: {
    meeting_id: Property.ShortText({
      displayName: 'Meeting ID',
      description: 'The ID of the meeting to look up.',
      required: true,
    }),
    occurrence_id: Property.ShortText({
      displayName: 'Occurrence ID',
      description:
        'Meeting Occurrence ID. Provide this field to view meeting details of a particular occurrence of the recurring meeting.',
      required: false,
    }),
    show_previous_occurrences: Property.Checkbox({
      displayName: 'Show Previous Occurrences',
      description:
        'Set to true if you would like to view meeting details of all previous occurrences of a recurring meeting.',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    const queryParams: Record<string, string> = {};
    if (context.propsValue.occurrence_id) {
      queryParams['occurrence_id'] = context.propsValue.occurrence_id;
    }
    if (context.propsValue.show_previous_occurrences) {
      queryParams['show_previous_occurrences'] = 'true';
    }
    const result = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://api.zoom.us/v2/meetings/${context.propsValue.meeting_id}`,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: context.auth.access_token,
      },
      queryParams,
    });
    return result.body;
  },
});