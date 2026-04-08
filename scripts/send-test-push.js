const token = process.argv[2];
const title = process.argv[3] || 'PocketCare Test Notification';
const body = process.argv[4] || 'If you can read this, push notifications are working.';

if (!token) {
  console.error('Usage: npm run push:test -- <ExpoPushToken> [title] [body]');
  process.exit(1);
}

if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
  console.error('Invalid Expo push token format.');
  process.exit(1);
}

const message = {
  to: token,
  sound: 'default',
  title,
  body,
  data: {
    source: 'manual-test',
    ts: Date.now(),
  },
};

async function sendPush() {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('Push request failed:', result);
    process.exit(1);
  }

  console.log('Push API response:');
  console.log(JSON.stringify(result, null, 2));
}

sendPush().catch((error) => {
  console.error('Unexpected error while sending push:', error);
  process.exit(1);
});
