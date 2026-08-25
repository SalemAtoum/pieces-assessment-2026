import { createAction, Property } from '../ap/framework.js';
import { HttpMethod, AuthenticationType, httpClient } from '../ap/http.js';

// Vendored from packages/pieces/community/zoom (the real piece), lightly trimmed.

const defaults = {
  agenda: 'My Meeting',
  default_password: false,
  duration: 30,
  pre_schedule: false,
  settings: {
    allow_multiple_devices: true,
    approval_type: 2,
    audio: 'telephony',
    calendar_type: 1,
    close_registration: false,
    email_notification: true,
    host_video: true,
    join_before_host: false,
    meeting_authentication: true,
    mute_upon_entry: false,
    participant_video: false,
    private_meeting: false,
    registrants_confirmation_email: true,
    registrants_email_notification: true,
    registration_type: 1,
    show_share_button: true,
    host_save_video_order: true,
  } as Record<string, unknown>,
  timezone: 'UTC',
  type: 2,
};

export const zoomCreateMeeting = createAction({
  name: 'zoom_create_meeting',
  classification: 'WRITE',
  displayName: 'Create Zoom Meeting',
  description: 'Create a new Zoom Meeting',
  audience: 'both',
  aiMetadata: {
    description:
      "Schedules a new Zoom meeting on the authenticated user's account, returning the meeting ID and join URL. Use to set up a video call; only the topic is required, with optional start time, duration, password, and audio/recording settings. Each call creates a distinct meeting, so it is not idempotent.",
    idempotent: false,
  },

  // ============================================================
  // PART 1 — YOUR TASK: replace `undefined` with a real OutputSchema.
  // POST /users/me/meetings returns the same meeting object shape as
  // fixtures/meeting.json (a created meeting includes start_url too).
  // ============================================================
  outputSchema: undefined,

  props: {
    topic: Property.ShortText({
      displayName: "Meeting's topic",
      description: "The meeting's topic",
      required: true,
    }),
    start_time: Property.ShortText({
      displayName: 'Start Time',
      description: 'Meeting start date-time',
      required: false,
    }),
    duration: Property.Number({
      displayName: 'Duration (in Minutes)',
      description: 'Duration of the meeting',
      required: false,
    }),
    auto_recording: Property.StaticDropdown({
      displayName: 'Auto Recording',
      required: false,
      options: {
        disabled: false,
        options: [
          { label: 'Local', value: 'local' },
          { label: 'Cloud', value: 'cloud' },
          { label: 'None', value: 'none' },
        ],
      },
    }),
    audio: Property.StaticDropdown({
      displayName: 'Audio',
      required: false,
      options: {
        disabled: false,
        options: [
          { label: 'Both telephony and VoIP', value: 'both' },
          { label: 'Telephony only', value: 'telephony' },
          { label: 'VoIP only', value: 'voip' },
          { label: 'Third party audio conference', value: 'thirdParty' },
        ],
      },
    }),
    agenda: Property.LongText({
      displayName: 'Agenda',
      description: "The meeting's agenda",
      required: false,
    }),
    password: Property.ShortText({
      displayName: 'Password',
      description:
        'The password required to join the meeting. Maximum 10 alphanumeric characters plus @ - _ *.',
      required: false,
    }),
    schedule_for: Property.ShortText({
      displayName: 'Schedule for',
      description: 'The email address or user ID of the user to schedule a meeting for.',
      required: false,
    }),
  },
  async run(context) {
    const body: Record<string, unknown> = { ...defaults, ...context.propsValue };
    if (context.propsValue.auto_recording) {
      (body['settings'] as Record<string, unknown>)['auto_recording'] = context.propsValue.auto_recording;
    }
    if (context.propsValue.audio) {
      (body['settings'] as Record<string, unknown>)['audio'] = context.propsValue.audio;
    }
    const result = await httpClient.sendRequest({
      method: HttpMethod.POST,
      url: 'https://api.zoom.us/v2/users/me/meetings',
      body,
      authentication: {
        type: AuthenticationType.BEARER_TOKEN,
        token: context.auth.access_token,
      },
      queryParams: {},
    });
    return result.status === 201 ? result.body : result;
  },
});
