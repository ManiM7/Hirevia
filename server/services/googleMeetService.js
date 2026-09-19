const crypto = require('crypto');
const { google } = require('googleapis');
const { google: googleConfig } = require('../config/env');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function isConfigured() {
  return Boolean(googleConfig.clientId && googleConfig.clientSecret && googleConfig.refreshToken);
}

function getOAuthClient(redirectUriOverride) {
  const client = new google.auth.OAuth2(googleConfig.clientId, googleConfig.clientSecret, redirectUriOverride || googleConfig.redirectUri);
  if (googleConfig.refreshToken) {
    client.setCredentials({ refresh_token: googleConfig.refreshToken });
  }
  return client;
}

/**
 * Used only by the one-time CLI setup script (server/utils/googleAuthSetup.js).
 * `redirectUri` lets the setup script use its own local loopback callback
 * server — Google deprecated the old copy-paste "oob" flow for OAuth
 * clients created after Feb 2022, so a real redirect is required now.
 */
function getAuthUrl(redirectUri) {
  const client = getOAuthClient(redirectUri);
  return client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
}

/** Used only by the one-time CLI setup script. */
async function exchangeCodeForTokens(code, redirectUri) {
  const client = getOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

function assertConfigured() {
  if (!isConfigured()) {
    const err = new Error(
      'Google Calendar/Meet integration is not configured on this server. An admin must set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN in the server .env file (see README) before interviews can be scheduled.'
    );
    err.code = 'GOOGLE_NOT_CONFIGURED';
    err.statusCode = 503;
    throw err;
  }
}

/**
 * Creates a real Google Calendar event with an auto-generated Google Meet
 * link and invites both participants. Never returns a fabricated link —
 * if the API call doesn't yield a real Meet URL, it throws instead of
 * papering over the gap.
 */
async function createMeetingEvent({ summary, description, startAt, endAt, timezone, attendeeEmails }) {
  assertConfigured();

  const auth = getOAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary,
      description,
      start: { dateTime: startAt.toISOString(), timeZone: timezone },
      end: { dateTime: endAt.toISOString(), timeZone: timezone },
      attendees: attendeeEmails.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  });

  const event = res.data;
  const meetLink =
    event.hangoutLink || event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri || null;

  if (!meetLink) {
    const err = new Error('Google Calendar created the event but did not return a Meet link. Please try again.');
    err.statusCode = 502;
    throw err;
  }

  return { meetingId: event.id, meetingLink: meetLink, htmlLink: event.htmlLink || null };
}

async function deleteMeetingEvent(eventId) {
  if (!isConfigured() || !eventId) return;
  try {
    const auth = getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' });
  } catch (err) {
    console.error('[googleMeet] failed to delete calendar event:', err.message);
  }
}

module.exports = { isConfigured, getAuthUrl, exchangeCodeForTokens, createMeetingEvent, deleteMeetingEvent };
