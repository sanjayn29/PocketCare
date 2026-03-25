import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type TransactionType = 'income' | 'expense'

export type Transaction = {
  id: string
  type: TransactionType
  amount: number
  category: string
  note: string
  date: string // ISO date
  created_at: string
}

export type DebtInterestType = 'none' | 'simple' | 'compound'
export type Debt = {
  id: string
  to_whom: string
  amount: number
  description: string
  due_date: string
  amount_given_date: string
  given_back: boolean
  date_given_back?: string
  interest_type: DebtInterestType
  interest_rate?: number
  created_at: string
}

export type FinanceGoal = {
  id: string
  title: string
  description: string
  target_amount: number
  current_amount: number
  created_at: string
}

const COLLECTION_NAME = 'finance'

export async function getFinanceData(email: string) {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    if (docSnap.exists()) {
      return docSnap.data() as {
        transactions: Transaction[]
        debts: Debt[]
        goals: FinanceGoal[]
      }
    }
    return { transactions: [], debts: [], goals: [] }
  } catch (error) {
    console.error('Error getting finance data:', error)
    return { transactions: [], debts: [], goals: [] }
  }
}

export async function ensureFinanceDoc(email: string) {
  const userDocRef = doc(db, COLLECTION_NAME, email)
  const docSnap = await getDoc(userDocRef)
  if (!docSnap.exists()) {
    await setDoc(userDocRef, { transactions: [], debts: [], goals: [] })
  }
  return userDocRef
}

export async function addTransaction(
  email: string,
  type: TransactionType,
  amount: number,
  category: string,
  note: string,
  date: string
): Promise<boolean> {
  try {
    const userDocRef = await ensureFinanceDoc(email)
    const data = await getFinanceData(email)
    const newTask: Transaction = {
      id: Date.now().toString(),
      type, amount, category, note, date,
      created_at: new Date().toISOString()
    }
    await updateDoc(userDocRef, { transactions: [...(data.transactions || []), newTask] })
    return true
  } catch (error) {
    console.error('Error adding tx', error)
    return false
  }
}

export async function updateTransaction(email: string, id: string, updates: Partial<Transaction>): Promise<boolean> {
  try {
    const userDocRef = await ensureFinanceDoc(email)
    const data = await getFinanceData(email)
    const newTxs = (data.transactions || []).map(t => t.id === id ? { ...t, ...updates } : t)
    await updateDoc(userDocRef, { transactions: newTxs })
    return true
  } catch (error) { return false }
}

export async function deleteTransaction(email: string, id: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const data = await getFinanceData(email)
    await updateDoc(userDocRef, { transactions: (data.transactions || []).filter(t => t.id !== id) })
    return true
  } catch (error) { return false }
}

export async function addDebt(
  email: string, 
  to_whom: string, 
  amount: number, 
  description: string, 
  due_date: string, 
  amount_given_date: string, 
  interest_type: DebtInterestType,
  interest_rate?: number
): Promise<boolean> {
  try {
    const userDocRef = await ensureFinanceDoc(email)
    const data = await getFinanceData(email)
    const newDebt: Debt = {
      id: Date.now().toString(),
      to_whom, amount, description, due_date, amount_given_date, 
      given_back: false, interest_type, interest_rate,
      created_at: new Date().toISOString()
    }
    await updateDoc(userDocRef, { debts: [...(data.debts || []), newDebt] })
    return true
  } catch (error) { return false }
}

export async function updateDebt(email: string, id: string, updates: Partial<Debt>): Promise<boolean> {
  try {
    const userDocRef = await ensureFinanceDoc(email)
    const data = await getFinanceData(email)
    const newD = (data.debts || []).map(d => d.id === id ? { ...d, ...updates } : d)
    await updateDoc(userDocRef, { debts: newD })
    return true
  } catch (error) { return false }
}

export async function deleteDebt(email: string, id: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const data = await getFinanceData(email)
    await updateDoc(userDocRef, { debts: (data.debts || []).filter(d => d.id !== id) })
    return true
  } catch (error) { return false }
}

export async function addFinanceGoal(email: string, title: string, description: string, target: number): Promise<boolean> {
  try {
    const userDocRef = await ensureFinanceDoc(email)
    const data = await getFinanceData(email)
    const newGoal: FinanceGoal = {
      id: Date.now().toString(),
      title, description, target_amount: target, current_amount: 0,
      created_at: new Date().toISOString()
    }
    await updateDoc(userDocRef, { goals: [...(data.goals || []), newGoal] })
    return true
  } catch (e) { return false }
}

export async function updateFinanceGoal(email: string, id: string, updates: Partial<FinanceGoal>): Promise<boolean> {
    try {
        const userDocRef = await ensureFinanceDoc(email)
        const data = await getFinanceData(email)
        const newGoals = (data.goals || []).map(g => g.id === id ? { ...g, ...updates } : g)
        await updateDoc(userDocRef, { goals: newGoals })
        return true
    } catch { return false }
}

export async function deleteFinanceGoal(email: string, id: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const data = await getFinanceData(email)
    await updateDoc(userDocRef, { goals: (data.goals || []).filter(d => d.id !== id) })
    return true
  } catch (error) { return false }
}
