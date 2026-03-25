import { doc, getDoc, setDoc, updateDoc, arrayRemove } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type PlacementStatus = 'applied' | 'interview' | 'offer' | 'rejected'

export type PlacementRound = {
  id: string
  topic: string          // e.g. "Technical Round 1"
  description: string    // notes / what was asked
  result: 'success' | 'rejected' | 'pending'
}

export type Placement = {
  id: string
  company_name: string
  status: PlacementStatus
  date: string           // ISO date string YYYY-MM-DD
  studied: boolean       // YES / NO
  rounds: PlacementRound[]
  created_at: string
}

const COLLECTION_NAME = 'Placements'

/**
 * Adds a new placement entry for a user.
 * All entries stored as a sub-array in a single doc keyed by email.
 */
export async function addPlacement(
  email: string,
  company_name: string,
  status: PlacementStatus = 'applied',
  date: string = '',
  studied: boolean = false,
  rounds: PlacementRound[] = []
): Promise<Placement | null> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const now = new Date().toISOString()
    const placementId = Date.now().toString() + Math.random().toString(36).substring(2, 9)

    const newPlacement: Placement = {
      id: placementId,
      company_name,
      status,
      date,
      studied,
      rounds,
      created_at: now,
    }

    const docSnap = await getDoc(userDocRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      const placements: Placement[] = data.placements || []
      await updateDoc(userDocRef, { placements: [...placements, newPlacement] })
    } else {
      await setDoc(userDocRef, { placements: [newPlacement] })
    }

    return newPlacement
  } catch (error) {
    console.error('Error adding placement:', error)
    return null
  }
}

/**
 * Retrieves all placement entries for a user.
 */
export async function getPlacements(email: string): Promise<Placement[]> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    if (docSnap.exists()) {
      return docSnap.data().placements || []
    }
    return []
  } catch (error) {
    console.error('Error getting placements:', error)
    return []
  }
}

/**
 * Updates an existing placement entry by ID.
 */
export async function updatePlacement(
  email: string,
  placementId: string,
  updates: Partial<Omit<Placement, 'id' | 'created_at'>>
): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    if (!docSnap.exists()) return false

    const data = docSnap.data()
    const placements: Placement[] = data.placements || []
    const idx = placements.findIndex(p => p.id === placementId)
    if (idx === -1) return false

    const updatedEntry: any = { ...placements[idx], ...updates }
    Object.keys(updatedEntry).forEach(k => {
      if (updatedEntry[k] === undefined) delete updatedEntry[k]
    })

    placements[idx] = updatedEntry as Placement
    await updateDoc(userDocRef, { placements })
    return true
  } catch (error) {
    console.error('Error updating placement:', error)
    return false
  }
}

/**
 * Deletes a placement entry by ID.
 */
export async function deletePlacement(email: string, placementId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    if (!docSnap.exists()) return false

    const data = docSnap.data()
    const placements: Placement[] = data.placements || []
    const toDelete = placements.find(p => p.id === placementId)
    if (!toDelete) return false

    await updateDoc(userDocRef, { placements: arrayRemove(toDelete) })
    return true
  } catch (error) {
    console.error('Error deleting placement:', error)
    return false
  }
}
