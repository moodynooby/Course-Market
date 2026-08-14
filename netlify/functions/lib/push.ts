/**
 * Server-side push notification helper.
 *
 * Sends a notification to a user's registered device token:
 * - FCM (Android) when the token looks like an FCM registration token
 * - APNs (iOS) via the FCM bridge otherwise (tokens registered from iOS
 *   Capacitor builds also arrive here because the Capacitor
 *   PushNotifications plugin delivers iOS tokens through FCM when the app
 *   is configured with Firebase; otherwise Apple's http2 API is used).
 *
 * All sends are best-effort: a push failure must never fail the API request
 * that triggered it (e.g., accepting a trade must still succeed if the push
 * cannot be delivered).
 */

export interface PushPayload {
  title: string;
  body: string;
  tradeId?: number;
  path?: string;
}

const FCM_SEND_URL = (projectId: string) =>
  `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

export interface PushOptions {
  /** Service-account JSON for FCM (from a GCP service account key). */
  fcmServiceAccount?: string;
  /** FCM project id (used to build the send URL). */
  fcmProjectId?: string;
  /** APNs key file (PKCS8) for direct iOS pushes. */
  apnsKey?: string;
  apnsKeyId?: string;
  apnsTeamId?: string;
  apnsBundleId?: string;
}

function readOptions(): PushOptions {
  return {
    fcmServiceAccount: process.env.FCM_SERVICE_ACCOUNT_JSON,
    fcmProjectId: process.env.FCM_PROJECT_ID,
    apnsKey: process.env.APNS_KEY_P8,
    apnsKeyId: process.env.APNS_KEY_ID,
    apnsTeamId: process.env.APNS_TEAM_ID,
    apnsBundleId: process.env.APNS_BUNDLE_ID || 'app.aurais',
  };
}

/** Best-effort token format heuristic. */
function looksLikeFcmToken(token: string): boolean {
  return token.length > 100;
}

async function sendViaFcm(token: string, payload: PushPayload, opts: PushOptions): Promise<void> {
  if (!opts.fcmServiceAccount || !opts.fcmProjectId) return;

  const account = JSON.parse(opts.fcmServiceAccount);
  const accessToken = await getFcmAccessToken(account);
  const url = FCM_SEND_URL(opts.fcmProjectId);

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: payload.title, body: payload.body },
        data: {
          title: payload.title,
          body: payload.body,
          tradeId: payload.tradeId !== undefined ? String(payload.tradeId) : undefined,
          path: payload.path || (payload.tradeId !== undefined ? '/trading' : undefined),
        },
        android: { priority: 'high' },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: {
            aps: {
              alert: { title: payload.title, body: payload.body },
              sound: 'default',
              badge: 1,
            },
          },
        },
      },
    }),
  });
}

/**
 * Mints a short-lived OAuth2 access token for the FCM v1 API using the
 * service account's JWT assertion.
 */
async function getFcmAccessToken(account: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoaUrl(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = btoaUrl(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  );

  // Import the private key and sign the assertion with the built-in
  // WebCrypto API (Node 20+, which Netlify Functions run on).
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    textEncoder.encode(`${header}.${claim}`),
  );
  const assertion = `${header}.${claim}.${btoaUrl(bufferToBase64(new Uint8Array(signature)))}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  const data = (await tokenResponse.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Failed to obtain FCM access token');
  }
  return data.access_token;
}

async function sendViaApns(token: string, payload: PushPayload, opts: PushOptions): Promise<void> {
  if (!opts.apnsKey || !opts.apnsKeyId || !opts.apnsTeamId) return;

  // APNs requires an ES256 JWT signed with the key id; minted per-request
  // (tokens are valid for ~50 minutes; per-request signing is safe and simple).
  const now = Math.floor(Date.now() / 1000);
  const header = btoaUrl(JSON.stringify({ alg: 'ES256', kid: opts.apnsKeyId }));
  const claim = btoaUrl(JSON.stringify({ iss: opts.apnsTeamId, iat: now }));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(opts.apnsKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    textEncoder.encode(`${header}.${claim}`),
  );
  const jwt = `${header}.${claim}.${btoaUrl(bufferToBase64(new Uint8Array(signature)))}`;

  await fetch(`https://api.push.apple.com/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${jwt}`,
      'apns-topic': opts.apnsBundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: 'default',
        badge: 1,
      },
      tradeId: payload.tradeId !== undefined ? String(payload.tradeId) : undefined,
      path: payload.path || (payload.tradeId !== undefined ? '/trading' : undefined),
    }),
  });
}

export async function sendPushNotification(token: string, payload: PushPayload): Promise<void> {
  if (!token) return;
  const opts = readOptions();
  try {
    if (looksLikeFcmToken(token) && opts.fcmProjectId) {
      await sendViaFcm(token, payload, opts);
    } else {
      await sendViaApns(token, payload, opts);
    }
  } catch (error) {
    // Best-effort: log but never fail the caller.
    console.error('[Push] Failed to send notification:', error);
  }
}

const textEncoder = new TextEncoder();

function btoaUrl(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function bufferToBase64(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64');
}

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  return new Uint8Array(Buffer.from(base64, 'base64')).buffer;
}
