import { createAction, Property } from '../ap/framework.js';
import { httpClient, HttpMethod } from '../ap/http.js';

export const youtubeSearchAction = createAction({
  name: 'search',
  classification: 'SEARCH',
  displayName: 'Search',
  description:
    'Search YouTube videos, channels, and playlists using the YouTube Data API search.list endpoint.',
  audience: 'both',
  aiMetadata: {
    description:
      'Runs a YouTube search.list query across videos, channels, and playlists at once or restricted to a single resource type. Video-only filters such as duration, definition, caption, event type, and location require Type to be Video, and Location must be paired with Location Radius. Read-only and idempotent.',
    idempotent: true,
  },

  propertyGroups: [
    {
      key: 'content_ownership',
      display: 'section',
      label: 'Content Ownership & Scope',
      description: 'Restrict results by channel or ownership scope.',
      props: ['channelId', 'channelType', 'forMine', 'forDeveloper', 'forContentOwner', 'onBehalfOfContentOwner'],
    },
    {
      key: 'filters_sorting',
      display: 'section',
      label: 'Filters & Sorting',
      description: 'Time bounds, ranking, locale, and content moderation.',
      props: ['order', 'safeSearch', 'publishedAfter', 'publishedBefore', 'regionCode', 'relevanceLanguage', 'topicId'],
    },
    {
      key: 'video_specific_filters',
      display: 'section',
      label: 'Video Filters',
      description: 'Filters applicable only when Type is set to Video.',
      props: ['eventType', 'videoDuration', 'videoDefinition', 'videoCaption', 'videoCategoryId', 'videoEmbeddable', 'videoLicense', 'location', 'locationRadius'],
    },
    {
      key: 'pagination',
      display: 'section',
      label: 'Pagination',
      description: 'Page sizing and pagination tokens.',
      props: ['maxResults', 'pageToken'],
    },
  ],

  props: {
    // --- Essential Fields ---
    query: Property.ShortText({
      displayName: 'Query',
      description:
        'Search term. Supports operators like OR (`|`) and NOT (`-`) as supported by YouTube search.',
      required: false,
      placeholder: 'e.g. Activepieces tutorials',
    }),
    type: Property.StaticDropdown({
      displayName: 'Type',
      description:
        'Restrict results to a resource type. Use "Any" to search videos, channels, and playlists.',
      required: false,
      defaultValue: 'any',
      options: {
        options: [
          { label: 'Any (video, channel, playlist)', value: 'any' },
          { label: 'Video', value: 'video' },
          { label: 'Channel', value: 'channel' },
          { label: 'Playlist', value: 'playlist' },
        ],
      },
    }),

    // --- Content Ownership Group (Advanced) ---
    channelId: Property.ShortText({
      displayName: 'Channel ID',
      description: 'Only return resources from this channel.',
      required: false,
      advanced: true,
      placeholder: 'e.g. UC_x5XG1OV2P6uZZ5FSM9Ttw',
      width: 'half',
    }),
    channelType: Property.StaticDropdown({
      displayName: 'Channel Type',
      description: 'Restrict channel searches to a specific channel type.',
      required: false,
      advanced: true,
      width: 'half',
      options: {
        options: [
          { label: 'Any', value: 'any' },
          { label: 'Show', value: 'show' },
        ],
      },
    }),
    forMine: Property.Checkbox({
      displayName: 'For Mine',
      description: 'Restrict results to videos owned by the authenticated user.',
      required: false,
      advanced: true,
      width: 'half',
    }),
    forDeveloper: Property.Checkbox({
      displayName: 'For Developer',
      description: 'Restrict results to videos uploaded via your developer project.',
      required: false,
      advanced: true,
      width: 'half',
    }),
    forContentOwner: Property.Checkbox({
      displayName: 'For Content Owner',
      description:
        'Restrict results to videos owned by the content owner set in On Behalf Of Content Owner.',
      required: false,
      advanced: true,
      width: 'half',
    }),
    onBehalfOfContentOwner: Property.ShortText({
      displayName: 'On Behalf Of Content Owner',
      description:
        'Required when For Content Owner is enabled. Intended for YouTube CMS content partners.',
      required: false,
      advanced: true,
      width: 'half',
    }),

    // --- Filters & Sorting Group (Advanced) ---
    order: Property.StaticDropdown({
      displayName: 'Order',
      required: false,
      defaultValue: 'relevance',
      advanced: true,
      width: 'half',
      options: {
        options: [
          { label: 'Relevance', value: 'relevance' },
          { label: 'Date', value: 'date' },
          { label: 'Rating', value: 'rating' },
          { label: 'Title', value: 'title' },
          { label: 'Video Count', value: 'videoCount' },
          { label: 'View Count', value: 'viewCount' },
        ],
      },
    }),
    safeSearch: Property.StaticDropdown({
      displayName: 'Safe Search',
      required: false,
      defaultValue: 'moderate',
      advanced: true,
      width: 'half',
      options: {
        options: [
          { label: 'Moderate', value: 'moderate' },
          { label: 'None', value: 'none' },
          { label: 'Strict', value: 'strict' },
        ],
      },
    }),
    publishedAfter: Property.DateTime({
      displayName: 'Published After',
      description: 'Only include resources created at or after this datetime (RFC 3339).',
      required: false,
      advanced: true,
      width: 'half',
    }),
    publishedBefore: Property.DateTime({
      displayName: 'Published Before',
      description: 'Only include resources created before or at this datetime (RFC 3339).',
      required: false,
      advanced: true,
      width: 'half',
    }),
    regionCode: Property.ShortText({
      displayName: 'Region Code',
      description: 'ISO 3166-1 alpha-2 country code (for example: US, DE, JP).',
      required: false,
      advanced: true,
      placeholder: 'e.g. US',
      width: 'half',
    }),
    relevanceLanguage: Property.ShortText({
      displayName: 'Relevance Language',
      description: 'ISO 639-1 language code (for example: en, es, ja, zh-Hans).',
      required: false,
      advanced: true,
      placeholder: 'e.g. en',
      width: 'half',
    }),
    topicId: Property.ShortText({
      displayName: 'Topic ID',
      description:
        'Curated Freebase topic ID to restrict results by topic (for example: /m/04rlf for Music).',
      required: false,
      advanced: true,
      placeholder: 'e.g. /m/04rlf',
    }),

    // --- Video Specific Filters Group (Advanced) ---
    eventType: Property.StaticDropdown({
      displayName: 'Event Type (video only)',
      required: false,
      advanced: true,
      width: 'half',
      options: {
        options: [
          { label: 'Completed', value: 'completed' },
          { label: 'Live', value: 'live' },
          { label: 'Upcoming', value: 'upcoming' },
        ],
      },
    }),
    videoDuration: Property.StaticDropdown({
      displayName: 'Video Duration (video only)',
      required: false,
      advanced: true,
      width: 'half',
      options: {
        options: [
          { label: 'Any', value: 'any' },
          { label: 'Short (<4 min)', value: 'short' },
          { label: 'Medium (4-20 min)', value: 'medium' },
          { label: 'Long (>20 min)', value: 'long' },
        ],
      },
    }),
    videoDefinition: Property.StaticDropdown({
      displayName: 'Video Definition (video only)',
      required: false,
      advanced: true,
      width: 'half',
      options: {
        options: [
          { label: 'Any', value: 'any' },
          { label: 'High Definition', value: 'high' },
          { label: 'Standard Definition', value: 'standard' },
        ],
      },
    }),
    videoCaption: Property.StaticDropdown({
      displayName: 'Video Caption (video only)',
      required: false,
      advanced: true,
      width: 'half',
      options: {
        options: [
          { label: 'Any', value: 'any' },
          { label: 'Closed Caption', value: 'closedCaption' },
          { label: 'None', value: 'none' },
        ],
      },
    }),
    videoCategoryId: Property.ShortText({
      displayName: 'Video Category ID (video only)',
      required: false,
      advanced: true,
      placeholder: 'e.g. 10',
      width: 'half',
    }),
    videoEmbeddable: Property.StaticDropdown({
      displayName: 'Video Embeddable (video only)',
      required: false,
      advanced: true,
      width: 'half',
      options: {
        options: [
          { label: 'Any', value: 'any' },
          { label: 'True', value: 'true' },
        ],
      },
    }),
    videoLicense: Property.StaticDropdown({
      displayName: 'Video License (video only)',
      required: false,
      advanced: true,
      width: 'half',
      options: {
        options: [
          { label: 'Any', value: 'any' },
          { label: 'Creative Commons', value: 'creativeCommon' },
          { label: 'YouTube', value: 'youtube' },
        ],
      },
    }),
    location: Property.ShortText({
      displayName: 'Location (video only)',
      description:
        'Latitude,longitude center point (for example: 37.42307,-122.08427). Requires Location Radius.',
      required: false,
      advanced: true,
      placeholder: '37.42307,-122.08427',
      width: 'half',
    }),
    locationRadius: Property.ShortText({
      displayName: 'Location Radius (video only)',
      description:
        'Distance from Location with unit (m, km, ft, mi), for example: 5km. Requires Location.',
      required: false,
      advanced: true,
      placeholder: '5km',
      width: 'half',
    }),

    // --- Pagination Group (Advanced) ---
    maxResults: Property.Number({
      displayName: 'Max Results',
      description: 'Acceptable values are 0 to 50. Defaults to 25.',
      required: false,
      defaultValue: 25,
      advanced: true,
      placeholder: '25',
      width: 'half',
    }),
    pageToken: Property.ShortText({
      displayName: 'Page Token',
      required: false,
      advanced: true,
      placeholder: 'CAUQAA',
      width: 'half',
    }),
  },
  async run(context) {
    const p = context.propsValue;
    const chosenType = p.type === 'any' || !p.type ? 'video,channel,playlist' : p.type;

    const videoOnly = [
      p.eventType, p.location, p.locationRadius, p.videoCaption, p.videoCategoryId,
      p.videoDuration, p.videoDefinition, p.videoEmbeddable, p.videoLicense,
    ];
    if (videoOnly.some(Boolean) && chosenType !== 'video') {
      throw new Error('Video-only filters require Type to be set to "Video".');
    }
    if ((p.location && !p.locationRadius) || (!p.location && p.locationRadius)) {
      throw new Error('Location and Location Radius must be provided together.');
    }
    if ([p.forContentOwner, p.forDeveloper, p.forMine].filter(Boolean).length > 1) {
      throw new Error('Only one of For Content Owner, For Developer, or For Mine can be enabled.');
    }

    const queryParams: Record<string, string> = { part: 'snippet', type: chosenType };
    const passthrough: Record<string, unknown> = {
      q: p.query, forContentOwner: p.forContentOwner, forDeveloper: p.forDeveloper,
      forMine: p.forMine, onBehalfOfContentOwner: p.onBehalfOfContentOwner,
      channelId: p.channelId, channelType: p.channelType, order: p.order,
      safeSearch: p.safeSearch, publishedAfter: p.publishedAfter,
      publishedBefore: p.publishedBefore, pageToken: p.pageToken,
      regionCode: p.regionCode, relevanceLanguage: p.relevanceLanguage,
      topicId: p.topicId, eventType: p.eventType, location: p.location,
      locationRadius: p.locationRadius, videoCategoryId: p.videoCategoryId,
      videoDuration: p.videoDuration, videoDefinition: p.videoDefinition,
      videoEmbeddable: p.videoEmbeddable, videoLicense: p.videoLicense,
      videoCaption: p.videoCaption, maxResults: p.maxResults,
    };
    for (const [k, v] of Object.entries(passthrough)) {
      if (v !== undefined && v !== null && v !== '') queryParams[k] = String(v);
    }

    const response = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: 'https://www.googleapis.com/youtube/v3/search',
      headers: { Authorization: `Bearer ${context.auth.access_token}` },
      queryParams,
    });
    return response.body;
  },
});