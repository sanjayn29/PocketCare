import { doc, getDoc, setDoc, updateDoc, arrayRemove } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export type SkillTask = {
  id: string
  title: string
  completed: boolean
}

export type Skill = {
  id: string
  name: string
  level: SkillLevel
  progress: SkillTask[]   // sub-tasks that drive the progress bar
  created_at: string
}

const COLLECTION_NAME = 'Skills'

/**
 * Adds a new skill for a user.
 * All skills are stored as a sub-array inside a single document
 * whose ID is the user's email – same pattern as Goals.
 */
export async function addSkill(
  email: string,
  name: string,
  level: SkillLevel = 'beginner',
  progress: SkillTask[] = []
): Promise<Skill | null> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const now = new Date().toISOString()

    const skillId = Date.now().toString() + Math.random().toString(36).substring(2, 9)

    const newSkill: Skill = {
      id: skillId,
      name,
      level,
      progress,
      created_at: now,
    }

    const docSnap = await getDoc(userDocRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      const skills: Skill[] = data.skills || []
      await updateDoc(userDocRef, { skills: [...skills, newSkill] })
    } else {
      await setDoc(userDocRef, { skills: [newSkill] })
    }

    return newSkill
  } catch (error) {
    console.error('Error adding skill:', error)
    return null
  }
}

/**
 * Retrieves all skills for a user.
 */
export async function getSkills(email: string): Promise<Skill[]> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)

    if (docSnap.exists()) {
      return docSnap.data().skills || []
    }

    return []
  } catch (error) {
    console.error('Error getting skills:', error)
    return []
  }
}

/**
 * Updates an existing skill by ID in the user's sub-array.
 */
export async function updateSkill(
  email: string,
  skillId: string,
  updates: Partial<Omit<Skill, 'id' | 'created_at'>>
): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)

    if (!docSnap.exists()) return false

    const data = docSnap.data()
    const skills: Skill[] = data.skills || []
    const idx = skills.findIndex(s => s.id === skillId)
    if (idx === -1) return false

    const updatedSkill: any = { ...skills[idx], ...updates }

    // Remove undefined keys to keep Firestore happy
    Object.keys(updatedSkill).forEach(k => {
      if (updatedSkill[k] === undefined) delete updatedSkill[k]
    })

    skills[idx] = updatedSkill as Skill

    await updateDoc(userDocRef, { skills })
    return true
  } catch (error) {
    console.error('Error updating skill:', error)
    return false
  }
}

/**
 * Deletes a skill by ID from the user's sub-array.
 */
export async function deleteSkill(email: string, skillId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)

    if (!docSnap.exists()) return false

    const data = docSnap.data()
    const skills: Skill[] = data.skills || []
    const skillToDelete = skills.find(s => s.id === skillId)
    if (!skillToDelete) return false

    await updateDoc(userDocRef, {
      skills: arrayRemove(skillToDelete),
    })

    return true
  } catch (error) {
    console.error('Error deleting skill:', error)
    return false
  }
}
