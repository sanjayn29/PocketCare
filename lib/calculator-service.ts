import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type CalculationType = 'simple_interest' | 'compound_interest' | 'basic_calculation'

export type CalculationEntry = {
  id: string
  type: CalculationType
  expression?: string
  principal: number
  rate: number
  time: number
  compounds_per_year?: number
  interest: number
  total_amount: number
  calculated_at: string
}

export type CalculationHistoryGroup = {
  id: string
  title: string
  entries: CalculationEntry[]
  created_at: string
  updated_at: string
}

const COLLECTION_NAME = 'calculator'

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9)
}

function removeUndefinedFields<T extends Record<string, unknown>>(obj: T): T {
  const cleaned: Record<string, unknown> = { ...obj }
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    }
  })
  return cleaned as T
}

export async function getCalculationHistory(email: string): Promise<CalculationHistoryGroup[]> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)

    if (!docSnap.exists()) return []

    const data = docSnap.data()
    return data.histories || []
  } catch (error) {
    console.error('Error getting calculation history:', error)
    return []
  }
}

export async function createOrAppendCalculation(
  email: string,
  title: string,
  payload: Omit<CalculationEntry, 'id' | 'calculated_at'>
): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    const now = new Date().toISOString()

    const newEntry = removeUndefinedFields({
      ...payload,
      id: generateId(),
      calculated_at: now,
    }) as CalculationEntry

    if (!docSnap.exists()) {
      const firstGroup: CalculationHistoryGroup = {
        id: generateId(),
        title,
        entries: [newEntry],
        created_at: now,
        updated_at: now,
      }

      await setDoc(userDocRef, {
        histories: [firstGroup],
      })
      return true
    }

    const data = docSnap.data()
    const histories: CalculationHistoryGroup[] = data.histories || []

    const normalizedTitle = title.trim().toLowerCase()
    const groupIndex = histories.findIndex(
      (group) => group.title.trim().toLowerCase() === normalizedTitle
    )

    if (groupIndex >= 0) {
      histories[groupIndex] = {
        ...histories[groupIndex],
        entries: [...(histories[groupIndex].entries || []), newEntry],
        updated_at: now,
      }
    } else {
      histories.unshift({
        id: generateId(),
        title,
        entries: [newEntry],
        created_at: now,
        updated_at: now,
      })
    }

    await updateDoc(userDocRef, {
      histories,
    })

    return true
  } catch (error) {
    console.error('Error creating/appending calculation:', error)
    return false
  }
}

export async function updateCalculationHistoryTitle(
  email: string,
  historyId: string,
  title: string
): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)

    if (!docSnap.exists()) return false

    const histories: CalculationHistoryGroup[] = docSnap.data().histories || []
    const targetIndex = histories.findIndex((group) => group.id === historyId)

    if (targetIndex === -1) return false

    histories[targetIndex] = {
      ...histories[targetIndex],
      title,
      updated_at: new Date().toISOString(),
    }

    await updateDoc(userDocRef, { histories })
    return true
  } catch (error) {
    console.error('Error updating history title:', error)
    return false
  }
}

export async function deleteCalculationHistory(email: string, historyId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)

    if (!docSnap.exists()) return false

    const histories: CalculationHistoryGroup[] = docSnap.data().histories || []
    const filtered = histories.filter((group) => group.id !== historyId)

    await updateDoc(userDocRef, { histories: filtered })
    return true
  } catch (error) {
    console.error('Error deleting history:', error)
    return false
  }
}

export async function deleteCalculationEntry(
  email: string,
  historyId: string,
  entryId: string
): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)

    if (!docSnap.exists()) return false

    const histories: CalculationHistoryGroup[] = docSnap.data().histories || []
    const targetIndex = histories.findIndex((group) => group.id === historyId)

    if (targetIndex === -1) return false

    const nextEntries = (histories[targetIndex].entries || []).filter((entry) => entry.id !== entryId)

    if (nextEntries.length === 0) {
      const filtered = histories.filter((group) => group.id !== historyId)
      await updateDoc(userDocRef, { histories: filtered })
      return true
    }

    histories[targetIndex] = {
      ...histories[targetIndex],
      entries: nextEntries,
      updated_at: new Date().toISOString(),
    }

    await updateDoc(userDocRef, { histories })
    return true
  } catch (error) {
    console.error('Error deleting calculation entry:', error)
    return false
  }
}
