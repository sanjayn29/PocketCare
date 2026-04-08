const admin = require('firebase-admin');

const MODE = process.argv[2];
const VALID_MODES = new Set(['daily', 'goals', 'all']);
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const IST_TIMEZONE = 'Asia/Kolkata';

if (!MODE || !VALID_MODES.has(MODE)) {
  console.error('Usage: node scripts/send-cron-notifications.js <daily|goals|all>');
  process.exit(1);
}

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${error.message}`);
  }

  if (typeof serviceAccount.private_key === 'string') {
    // GitHub secrets are often stored with escaped newlines; normalize for PEM parsing.
    serviceAccount.private_key = serviceAccount.private_key
      .replace(/\r\n/g, '\n')
      .replace(/\\n/g, '\n')
      .trim();
  }

  return serviceAccount;
}

function initializeFirebase() {
  const serviceAccount = getServiceAccountFromEnv();
  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;
  if (!projectId) {
    throw new Error('Missing FIREBASE_PROJECT_ID and project_id in service account');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });

  return admin.firestore();
}

function isExpoPushToken(token) {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExpoPushToken[') || token.startsWith('ExponentPushToken['))
  );
}

function getTodayInIST() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

async function fetchUsersWithPushTokens(db) {
  const snap = await db.collection('UDB').get();
  const users = [];

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (isExpoPushToken(data.pushToken)) {
      users.push({
        email: data.email || doc.id,
        pushToken: data.pushToken,
      });
    }
  }

  return users;
}

function buildDailyMessages(users) {
  return users.map((user) => ({
    to: user.pushToken,
    sound: 'default',
    title: 'PocketCare Daily Check-in',
    body: 'Analyze your progress and update it.',
    data: {
      type: 'daily-checkin',
      email: user.email,
    },
  }));
}

async function buildGoalDeadlineMessages(db) {
  const today = getTodayInIST();
  const goalDocs = await db.collection('Goals').get();
  const messages = [];

  for (const doc of goalDocs.docs) {
    const data = doc.data() || {};
    const goals = Array.isArray(data.goals) ? data.goals : [];

    let pushToken = null;
    if (isExpoPushToken(data.pushToken)) {
      pushToken = data.pushToken;
    } else {
      const userDoc = await db.collection('UDB').doc(doc.id).get();
      const userData = userDoc.exists ? userDoc.data() || {} : {};
      if (isExpoPushToken(userData.pushToken)) {
        pushToken = userData.pushToken;
      }
    }

    if (!pushToken) continue;

    for (const goal of goals) {
      const deadline = typeof goal.deadline === 'string' ? goal.deadline.trim() : '';
      const goalTitle = typeof goal.title === 'string' ? goal.title.trim() : '';
      const isAchieved = goal.status === 'achieved';
      if (!deadline || isAchieved) continue;
      if (deadline !== today) continue;

      messages.push({
        to: pushToken,
        sound: 'default',
        title: `Deadline Today: ${goalTitle || 'Goal'}`,
        body: `Today is your deadline for "${goalTitle || 'this project'}".`,
        data: {
          type: 'goal-deadline-reminder',
          email: doc.id,
          goalId: goal.id || '',
          deadline,
        },
      });
    }
  }

  return messages;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function sendExpoMessages(messages) {
  const expoAccessToken = typeof process.env.EXPO_PUSH_ACCESS_TOKEN === 'string'
    ? process.env.EXPO_PUSH_ACCESS_TOKEN.trim()
    : '';
  const chunks = chunkArray(messages, 100);
  let sent = 0;
  let failed = 0;

  for (const chunk of chunks) {
    const headers = {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };

    if (expoAccessToken) {
      headers.Authorization = `Bearer ${expoAccessToken}`;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });

    const result = await response.json();
    if (!response.ok) {
      if (
        response.status === 400 &&
        Array.isArray(result?.errors) &&
        result.errors.some((error) => error?.code === 'AUTHENTICATION_ERROR')
      ) {
        throw new Error(
          'Expo authentication failed. EXPO_PUSH_ACCESS_TOKEN is invalid/revoked or contains extra whitespace.'
        );
      }
      throw new Error(`Expo API error: ${JSON.stringify(result)}`);
    }

    const payload = Array.isArray(result.data) ? result.data : [result.data];
    for (const ticket of payload) {
      if (ticket?.status === 'ok') {
        sent += 1;
      } else {
        failed += 1;
        console.warn('Push ticket error:', JSON.stringify(ticket));
      }
    }
  }

  return { sent, failed };
}

async function main() {
  const db = initializeFirebase();
  let messages = [];
  let users = [];

  if (MODE === 'daily' || MODE === 'all') {
    users = await fetchUsersWithPushTokens(db);
    if (users.length === 0) {
      console.log('No users with valid push tokens found for daily mode.');
    } else {
      messages = messages.concat(buildDailyMessages(users));
    }
  }

  if (MODE === 'goals' || MODE === 'all') {
    const goalMessages = await buildGoalDeadlineMessages(db);
    messages = messages.concat(goalMessages);
  }

  if (messages.length === 0) {
    console.log(`No messages to send for mode "${MODE}".`);
    return;
  }

  const result = await sendExpoMessages(messages);
  console.log(
    `Mode=${MODE} | usersWithToken=${users.length} | messages=${messages.length} | sent=${result.sent} | failed=${result.failed}`
  );
}

main().catch((error) => {
  console.error('Cron push failed:', error);
  process.exit(1);
});
