
import { db } from '@/firebaseConfig'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'

/**
 * Returns today's date as a YYYY-MM-DD string in the device's LOCAL timezone.
 * This ensures the streak day resets at 12:00 AM local time (not UTC midnight).
 */
const getLocalDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Records a visit for the user on the current day
 * Creates today's document if it doesn't exist
 */
export const recordVisit = async (email: string | undefined) => {
  if (!email) return false

  try {
    const today = getLocalDateString()

    await setDoc(
      doc(db, 'users', email, 'visits', today),
      { visited: true },
      { merge: true }
    )

    return true
  } catch (error) {
    console.error('Error recording visit:', error)
    return false
  }
}

/**
 * Fetches all visit dates for a user
 * Returns an array of date strings (YYYY-MM-DD format)
 */
export const getAllVisitDates = async (email: string | undefined): Promise<string[]> => {
  if (!email) return []

  try {
    const snapshot = await getDocs(collection(db, 'users', email, 'visits'))
    const dates = snapshot.docs.map((doc) => doc.id)
    return dates
  } catch (error) {
    console.error('Error fetching visit dates:', error)
    return []
  }
}

/**
 * Calculates the current streak (consecutive days ending today)
 */
export const getCurrentStreak = (dates: string[]): number => {
  if (dates.length === 0) return 0

  const sorted = dates.sort().reverse()
  let streak = 0
  // Use local midnight of today to avoid UTC offset issues
  const now = new Date()
  let today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  for (let i = 0; i < sorted.length; i++) {
    // Parse as local date by splitting manually (avoids UTC shift from new Date(str))
    const [year, month, day] = sorted[i].split('-').map(Number)
    const date = new Date(year, month - 1, day)

    const diff = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diff === streak) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Calculates the maximum streak ever achieved
 */
export const getMaxStreak = (dates: string[]): number => {
  if (dates.length === 0) return 0

  const sorted = dates.sort()

  let max = 0
  let current = 1

  for (let i = 1; i < sorted.length; i++) {
    // Parse as local dates to avoid UTC shift
    const [py, pm, pd] = sorted[i - 1].split('-').map(Number)
    const [cy, cm, cd] = sorted[i].split('-').map(Number)
    const prev = new Date(py, pm - 1, pd)
    const curr = new Date(cy, cm - 1, cd)

    const diff =
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)

    if (diff === 1) {
      current++
    } else {
      max = Math.max(max, current)
      current = 1
    }
  }

  return Math.max(max, current)
}

/**
 * Get streak data for a user
 * Returns both current and maximum streaks
 */
export const getStreakData = async (
  email: string | undefined
): Promise<{ currentStreak: number; maxStreak: number }> => {
  if (!email) return { currentStreak: 0, maxStreak: 0 }

  try {
    const dates = await getAllVisitDates(email)
    const currentStreak = getCurrentStreak(dates)
    const maxStreak = getMaxStreak(dates)

    return { currentStreak, maxStreak }
  } catch (error) {
    console.error('Error getting streak data:', error)
    return { currentStreak: 0, maxStreak: 0 }
  }
}
