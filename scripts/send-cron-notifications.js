const admin = require('firebase-admin');

const MODE = process.argv[2];
const VALID_MODES = new Set(['daily', 'goals', 'tasks', 'placements', 'debts', 'deadlines', 'all']);
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const IST_TIMEZONE = 'Asia/Kolkata';

if (!MODE || !VALID_MODES.has(MODE)) {
  console.error('Usage: node scripts/send-cron-notifications.js <daily|goals|tasks|placements|debts|deadlines|all>');
  process.exit(1);
}

// ─── Firebase Init ────────────────────────────────────────────────────────────

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${error.message}`);
  }

  if (typeof serviceAccount.private_key === 'string') {
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
  if (!projectId) throw new Error('Missing FIREBASE_PROJECT_ID');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });
  return admin.firestore();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpoPushToken(token) {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExpoPushToken[') || token.startsWith('ExponentPushToken['))
  );
}

function getTodayInIST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function getUserPushToken(db, email) {
  const snap = await db.collection('UDB').doc(email).get();
  const data = snap.exists ? snap.data() || {} : {};
  return isExpoPushToken(data.pushToken) ? data.pushToken : null;
}

async function fetchUsersWithPushTokens(db) {
  const snap = await db.collection('UDB').get();
  const users = [];
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (isExpoPushToken(data.pushToken)) {
      users.push({ email: data.email || doc.id, pushToken: data.pushToken });
    }
  }
  return users;
}

// ─── Message Builders ─────────────────────────────────────────────────────────

/**
 * 📊 7 PM daily check-in — sent to ALL users with a push token
 */
function buildDailyMessages(users) {
  const hour = new Date().toLocaleString('en-US', { timeZone: IST_TIMEZONE, hour: 'numeric', hour12: false });
  return users.map((user) => ({
    to: user.pushToken,
    sound: 'default',
    title: '📊 PocketCare Daily Check-in',
    body: "How did today go? Log your tasks, health & finances to stay on track! 💪",
    data: { type: 'daily-checkin', email: user.email },
  }));
}

/**
 * 🎯 Goal deadline reminders — sent for goals due today
 */
async function buildGoalDeadlineMessages(db) {
  const today = getTodayInIST();
  const snap = await db.collection('Goals').get();
  const messages = [];

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const goals = Array.isArray(data.goals) ? data.goals : [];

    const pushToken = await getUserPushToken(db, doc.id);
    if (!pushToken) continue;

    for (const goal of goals) {
      const deadline = typeof goal.deadline === 'string' ? goal.deadline.trim() : '';
      const title = typeof goal.title === 'string' ? goal.title.trim() : '';
      if (!deadline || goal.status === 'achieved' || deadline !== today) continue;

      const progress = goal.target_value > 0
        ? Math.round((goal.current_value / goal.target_value) * 100)
        : 0;

      messages.push({
        to: pushToken,
        sound: 'default',
        title: `🎯 Goal Deadline Today: ${title || 'Goal'}`,
        body: `Your goal "${title}" is due today! You're at ${progress}% — finish strong! 🚀`,
        data: { type: 'goal-deadline-reminder', email: doc.id, goalId: goal.id || '', deadline },
      });
    }
  }
  return messages;
}

/**
 * ✅ Task deadline reminders — sent for pending tasks due today
 */
async function buildTaskDeadlineMessages(db) {
  const today = getTodayInIST();
  const snap = await db.collection('Tasks').get();
  const messages = [];

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    if (!tasks.length) continue;

    const pushToken = await getUserPushToken(db, doc.id);
    if (!pushToken) continue;

    const dueTodayTasks = tasks.filter(
      (t) => t.status !== 'completed' && typeof t.due_date === 'string' && t.due_date.trim() === today
    );
    if (!dueTodayTasks.length) continue;

    if (dueTodayTasks.length === 1) {
      const t = dueTodayTasks[0];
      messages.push({
        to: pushToken,
        sound: 'default',
        title: `✅ Task Due Today: ${t.title || 'Task'}`,
        body: `Don't forget: "${t.title}" is due today! Priority: ${t.priority || 'medium'} 📌`,
        data: { type: 'task-deadline-reminder', email: doc.id, taskId: t.id || '', dueDate: today },
      });
    } else {
      // Group multiple into one notification
      const taskNames = dueTodayTasks.slice(0, 3).map((t) => t.title).join(', ');
      const extra = dueTodayTasks.length > 3 ? ` +${dueTodayTasks.length - 3} more` : '';
      messages.push({
        to: pushToken,
        sound: 'default',
        title: `✅ ${dueTodayTasks.length} Tasks Due Today`,
        body: `${taskNames}${extra} — knock them out! 💪`,
        data: { type: 'task-deadline-reminder', email: doc.id, dueDate: today },
      });
    }
  }
  return messages;
}

/**
 * 🏢 Placement drive reminders — sent when company drive date is today
 */
async function buildPlacementDriveMessages(db) {
  const today = getTodayInIST();
  const snap = await db.collection('Placements').get();
  const messages = [];

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const placements = Array.isArray(data.placements) ? data.placements : [];
    if (!placements.length) continue;

    const pushToken = await getUserPushToken(db, doc.id);
    if (!pushToken) continue;

    for (const placement of placements) {
      const placementDate = typeof placement.date === 'string' ? placement.date.trim() : '';
      const company = typeof placement.company_name === 'string' ? placement.company_name.trim() : 'Company';
      if (!placementDate || placement.status === 'rejected' || placement.company_status === 'completed') continue;
      if (placementDate !== today) continue;

      const roundCount = Array.isArray(placement.rounds) ? placement.rounds.length : 0;
      messages.push({
        to: pushToken,
        sound: 'default',
        title: `🏢 Placement Drive Today: ${company}`,
        body: `Your drive at ${company} is today! ${roundCount > 0 ? `${roundCount} round(s) scheduled.` : ''} All the best! 🌟`,
        data: { type: 'placement-drive-reminder', email: doc.id, placementId: placement.id || '', placementDate },
      });
    }
  }
  return messages;
}

/**
 * 💳 Debt due date reminders — sent when a debt's due date is today
 */
async function buildDebtDueMessages(db) {
  const today = getTodayInIST();
  const snap = await db.collection('finance').get();
  const messages = [];

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const debts = Array.isArray(data.debts) ? data.debts : [];
    if (!debts.length) continue;

    const pushToken = await getUserPushToken(db, doc.id);
    if (!pushToken) continue;

    for (const debt of debts) {
      const dueDate = typeof debt.due_date === 'string' ? debt.due_date.trim() : '';
      const toWhom = typeof debt.to_whom === 'string' ? debt.to_whom.trim() : 'Someone';
      if (!dueDate || debt.given_back === true || dueDate !== today) continue;

      messages.push({
        to: pushToken,
        sound: 'default',
        title: `💳 Debt Due Today: ${toWhom}`,
        body: `₹${debt.amount} lent to ${toWhom} is due today. Time to collect! 💰`,
        data: { type: 'debt-due-reminder', email: doc.id, debtId: debt.id || '', dueDate },
      });
    }
  }
  return messages;
}

// ─── Expo Sender ──────────────────────────────────────────────────────────────

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function sendExpoMessages(messages) {
  const expoAccessToken = (process.env.EXPO_PUSH_ACCESS_TOKEN || '').trim();
  const chunks = chunkArray(messages, 100);
  let sent = 0;
  let failed = 0;

  for (const chunk of chunks) {
    const headers = {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };
    if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`;

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
        result.errors.some((e) => e?.code === 'AUTHENTICATION_ERROR')
      ) {
        throw new Error('Expo auth failed. Check EXPO_PUSH_ACCESS_TOKEN.');
      }
      throw new Error(`Expo API error: ${JSON.stringify(result)}`);
    }

    const payload = Array.isArray(result.data) ? result.data : [result.data];
    for (const ticket of payload) {
      if (ticket?.status === 'ok') sent++;
      else { failed++; console.warn('Push ticket error:', JSON.stringify(ticket)); }
    }
  }
  return { sent, failed };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = initializeFirebase();
  let messages = [];

  console.log(`▶ Running in MODE="${MODE}" | IST date: ${getTodayInIST()}`);

  if (MODE === 'daily' || MODE === 'all') {
    const users = await fetchUsersWithPushTokens(db);
    if (users.length === 0) {
      console.log('No users with valid push tokens found.');
    } else {
      messages = messages.concat(buildDailyMessages(users));
      console.log(`  ✓ daily: ${users.length} users queued`);
    }
  }

  if (MODE === 'goals' || MODE === 'deadlines' || MODE === 'all') {
    const m = await buildGoalDeadlineMessages(db);
    messages = messages.concat(m);
    console.log(`  ✓ goals: ${m.length} deadline notifications`);
  }

  if (MODE === 'tasks' || MODE === 'deadlines' || MODE === 'all') {
    const m = await buildTaskDeadlineMessages(db);
    messages = messages.concat(m);
    console.log(`  ✓ tasks: ${m.length} deadline notifications`);
  }

  if (MODE === 'placements' || MODE === 'deadlines' || MODE === 'all') {
    const m = await buildPlacementDriveMessages(db);
    messages = messages.concat(m);
    console.log(`  ✓ placements: ${m.length} drive reminders`);
  }

  if (MODE === 'debts' || MODE === 'deadlines' || MODE === 'all') {
    const m = await buildDebtDueMessages(db);
    messages = messages.concat(m);
    console.log(`  ✓ debts: ${m.length} due date reminders`);
  }

  if (messages.length === 0) {
    console.log(`No messages to send for mode "${MODE}".`);
    return;
  }

  const result = await sendExpoMessages(messages);
  console.log(`\n✅ Done | mode=${MODE} | total=${messages.length} | sent=${result.sent} | failed=${result.failed}`);
}

main().catch((error) => {
  console.error('❌ Cron push failed:', error);
  process.exit(1);
});
