import { db } from '@/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface ActivityData {
  [date: string]: boolean; // YYYY-MM-DD format
}

/**
 * Fetches user activity data from Firestore
 * Expected structure: users/{userId}/activity/{YYYY-MM-DD: true}
 */
export const getUserActivityData = async (userId: string): Promise<Set<string>> => {
  try {
    const activityRef = doc(db, 'users', userId, 'activity', 'data');
    const snapshot = await getDoc(activityRef);

    if (snapshot.exists()) {
      const activityData = snapshot.data() as ActivityData;
      return new Set(Object.keys(activityData).filter(date => activityData[date] === true));
    }

    return new Set();
  } catch (error) {
    console.error('Error fetching activity data:', error);
    return new Set();
  }
};

/**
 * Records activity for today
 */
export const recordActivity = async (userId: string): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const activityRef = doc(db, 'users', userId, 'activity', 'data');

    const snapshot = await getDoc(activityRef);
    const currentActivity = snapshot.exists() ? (snapshot.data() as ActivityData) : {};

    currentActivity[today] = true;

    await setDoc(activityRef, currentActivity, { merge: true });
    console.log('Activity recorded for:', today);
  } catch (error) {
    console.error('Error recording activity:', error);
  }
};

/**
 * Generates an array of dates for the last 365 days
 */
export const generateLast365Days = (): string[] => {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
  }

  return dates;
};
