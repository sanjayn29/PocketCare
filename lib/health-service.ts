import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type MedicalRecord = {
  id: string
  topic: string // e.g., 'Periods', 'Fever'
  description: string
  start_date: string // ISO yyyy-mm-dd
  end_date: string   // ISO yyyy-mm-dd
  created_at: string
}

export type DietPlan = {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  completed_dates: string[] // Array of dates 'yyyy-mm-dd' when the user ticked the box
  created_at: string
}

export type FitnessPlan = {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  completed_dates: string[] // Array of dates 'yyyy-mm-dd' when the user ticked the box
  created_at: string
}

export type HealthData = {
  medical: MedicalRecord[]
  food_diet: DietPlan[]
  fitness: FitnessPlan[]
}

const COLLECTION_NAME = 'health'

export async function getHealthData(email: string): Promise<HealthData> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        medical: data.medical || [],
        food_diet: data.food_diet || [],
        fitness: data.fitness || []
      }
    }
    return { medical: [], food_diet: [], fitness: [] }
  } catch (error) {
    console.error('Error getting health data:', error)
    return { medical: [], food_diet: [], fitness: [] }
  }
}

export async function ensureHealthDoc(email: string) {
  const userDocRef = doc(db, COLLECTION_NAME, email)
  const docSnap = await getDoc(userDocRef)
  if (!docSnap.exists()) {
    await setDoc(userDocRef, { medical: [], food_diet: [], fitness: [] })
  }
  return userDocRef
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL
// ─────────────────────────────────────────────────────────────────────────────
export async function addMedical(email: string, topic: string, description: string, start_date: string, end_date: string): Promise<boolean> {
  try {
    const userDocRef = await ensureHealthDoc(email)
    const data = await getHealthData(email)
    const newRecord: MedicalRecord = {
      id: Date.now().toString(),
      topic, description, start_date, end_date,
      created_at: new Date().toISOString()
    }
    await updateDoc(userDocRef, { medical: [...data.medical, newRecord] })
    return true
  } catch (e) { return false }
}

export async function updateMedical(email: string, id: string, updates: Partial<MedicalRecord>): Promise<boolean> {
  try {
    const userDocRef = await ensureHealthDoc(email)
    const data = await getHealthData(email)
    const newM = data.medical.map(m => m.id === id ? { ...m, ...updates } : m)
    await updateDoc(userDocRef, { medical: newM })
    return true
  } catch (e) { return false }
}

export async function deleteMedical(email: string, id: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const data = await getHealthData(email)
    await updateDoc(userDocRef, { medical: data.medical.filter(m => m.id !== id) })
    return true
  } catch (e) { return false }
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOD / DIET
// ─────────────────────────────────────────────────────────────────────────────
export async function addDiet(email: string, name: string, description: string, start_date: string, end_date: string): Promise<boolean> {
  try {
    const userDocRef = await ensureHealthDoc(email)
    const data = await getHealthData(email)
    const newDiet: DietPlan = {
      id: Date.now().toString(),
      name, description, start_date, end_date, completed_dates: [],
      created_at: new Date().toISOString()
    }
    await updateDoc(userDocRef, { food_diet: [...data.food_diet, newDiet] })
    return true
  } catch (e) { return false }
}

export async function updateDiet(email: string, id: string, updates: Partial<DietPlan>): Promise<boolean> {
  try {
    const userDocRef = await ensureHealthDoc(email)
    const data = await getHealthData(email)
    const newD = data.food_diet.map(d => d.id === id ? { ...d, ...updates } : d)
    await updateDoc(userDocRef, { food_diet: newD })
    return true
  } catch (e) { return false }
}

export async function deleteDiet(email: string, id: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const data = await getHealthData(email)
    await updateDoc(userDocRef, { food_diet: data.food_diet.filter(d => d.id !== id) })
    return true
  } catch (e) { return false }
}

export async function toggleDietDate(email: string, id: string, dateStr: string): Promise<boolean> {
  try {
    const userDocRef = await ensureHealthDoc(email)
    const data = await getHealthData(email)
    const plan = data.food_diet.find(d => d.id === id)
    if (!plan) return false
    
    // Toggle logically: if it exists, remove it. If it doesn't, add it.
    let newDates = [...(plan.completed_dates || [])]
    if (newDates.includes(dateStr)) {
      newDates = newDates.filter(d => d !== dateStr)
    } else {
      newDates.push(dateStr)
    }
    
    const newD = data.food_diet.map(d => d.id === id ? { ...d, completed_dates: newDates } : d)
    await updateDoc(userDocRef, { food_diet: newD })
    return true
  } catch (e) { return false }
}

// ─────────────────────────────────────────────────────────────────────────────
// FITNESS
// ─────────────────────────────────────────────────────────────────────────────
export async function addFitness(email: string, name: string, description: string, start_date: string, end_date: string): Promise<boolean> {
  try {
    const userDocRef = await ensureHealthDoc(email)
    const data = await getHealthData(email)
    const newFit: FitnessPlan = {
      id: Date.now().toString(),
      name, description, start_date, end_date, completed_dates: [],
      created_at: new Date().toISOString()
    }
    await updateDoc(userDocRef, { fitness: [...data.fitness, newFit] })
    return true
  } catch (e) { return false }
}

export async function updateFitness(email: string, id: string, updates: Partial<FitnessPlan>): Promise<boolean> {
  try {
    const userDocRef = await ensureHealthDoc(email)
    const data = await getHealthData(email)
    const newF = data.fitness.map(f => f.id === id ? { ...f, ...updates } : f)
    await updateDoc(userDocRef, { fitness: newF })
    return true
  } catch (e) { return false }
}

export async function deleteFitness(email: string, id: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const data = await getHealthData(email)
    await updateDoc(userDocRef, { fitness: data.fitness.filter(f => f.id !== id) })
    return true
  } catch (e) { return false }
}

export async function toggleFitnessDate(email: string, id: string, dateStr: string): Promise<boolean> {
  try {
    const userDocRef = await ensureHealthDoc(email)
    const data = await getHealthData(email)
    const plan = data.fitness.find(f => f.id === id)
    if (!plan) return false
    
    let newDates = [...(plan.completed_dates || [])]
    if (newDates.includes(dateStr)) {
      newDates = newDates.filter(d => d !== dateStr)
    } else {
      newDates.push(dateStr)
    }
    
    const newF = data.fitness.map(f => f.id === id ? { ...f, completed_dates: newDates } : f)
    await updateDoc(userDocRef, { fitness: newF })
    return true
  } catch (e) { return false }
}
