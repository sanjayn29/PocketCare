import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type GoalStatus = 'active' | 'achieved' | 'paused'
export type GoalCategory = 'career' | 'health' | 'finance' | 'personal'
export type GoalPriority = 'low' | 'medium' | 'high'

export type GoalTask = {
  id: string
  title: string
  completed: boolean
}

export type Goal = {
  id: string
  title: string
  description: string
  category: GoalCategory
  status: GoalStatus
  priority: GoalPriority
  target_value: number
  current_value: number
  unit: string
  deadline: string
  created_at: string
  tasks?: GoalTask[]
}

const COLLECTION_NAME = 'Goals'

/**
 * Creates a new goal for a user, stored in a subarray.
 * The document ID is the user's email.
 */
export async function addGoal(
  email: string,
  title: string,
  description: string,
  category: GoalCategory,
  target_value: number,
  unit: string,
  deadline: string = '',
  status: GoalStatus = 'active',
  priority: GoalPriority = 'medium',
  current_value: number = 0,
  tasks?: GoalTask[]
): Promise<Goal | null> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const now = new Date().toISOString()
    
    // Generate a simple unique ID for the goal
    const goalId = Date.now().toString() + Math.random().toString(36).substring(2, 9)
    
    let finalTargetValue = target_value;
    let finalCurrentValue = current_value;
    let finalUnit = unit;
    
    if (tasks && tasks.length > 0) {
      finalTargetValue = tasks.length;
      finalCurrentValue = tasks.filter(t => t.completed).length;
      finalUnit = 'tasks';
    }

    const newGoal: Goal = {
      id: goalId,
      title,
      description,
      category,
      status,
      priority,
      target_value: finalTargetValue,
      current_value: finalCurrentValue,
      unit: finalUnit,
      deadline,
      created_at: now,
      tasks
    }

    // 🔥 Remove undefined properties to make Firebase happy
    const sanitizedGoal: any = { ...newGoal };
    Object.keys(sanitizedGoal).forEach(key => {
      if (sanitizedGoal[key] === undefined) {
        delete sanitizedGoal[key];
      }
    });

    const docSnap = await getDoc(userDocRef)
    
    if (docSnap.exists()) {
      // Document exists, update the subarray using arrayUnion
      await updateDoc(userDocRef, {
        goals: arrayUnion(sanitizedGoal)
      })
    } else {
      // Create new document with the goals subarray
      await setDoc(userDocRef, {
        goals: [sanitizedGoal]
      })
    }
    
    return sanitizedGoal as Goal;
  } catch (error) {
    console.error('Error adding goal:', error)
    return null
  }
}

/**
 * Retrieves all goals for a specific user.
 */
export async function getGoals(email: string): Promise<Goal[]> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return data.goals || []
    }
    
    return []
  } catch (error) {
    console.error('Error getting goals:', error)
    return []
  }
}

/**
 * Updates an existing goal by ID in the user's subarray.
 */
export async function updateGoal(
  email: string, 
  goalId: string, 
  updates: Partial<Omit<Goal, 'id' | 'created_at'>>
): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    
    if (!docSnap.exists()) return false
    
    const data = docSnap.data()
    const goals: Goal[] = data.goals || []
    
    const goalIndex = goals.findIndex((g) => g.id === goalId)
    if (goalIndex === -1) return false
    
    // Auto-update status based on current_value overflow
    let newCurrentVal = updates.current_value !== undefined ? updates.current_value : goals[goalIndex].current_value;
    let targetVal = updates.target_value !== undefined ? updates.target_value : goals[goalIndex].target_value;
    
    // Auto sync from sub-tasks if tasks exist and have been modified!
    const taskList = updates.tasks !== undefined ? updates.tasks : goals[goalIndex].tasks;
    if (taskList && taskList.length > 0) {
      newCurrentVal = taskList.filter((t) => t.completed).length;
      targetVal = taskList.length;
      updates.target_value = targetVal;
      updates.current_value = newCurrentVal;
      updates.unit = 'tasks';
    }

    let newStatus = updates.status !== undefined ? updates.status : goals[goalIndex].status;
    
    // Ensure safe default for targetVal 
    const safeTargetVal = targetVal || 1;
    if (newCurrentVal >= safeTargetVal && newStatus === 'active') {
      newStatus = 'achieved';
    } else if (newCurrentVal < safeTargetVal && newStatus === 'achieved') {
      newStatus = 'active';
    }

    // Update the specific goal
    const updatedGoal: any = {
      ...goals[goalIndex],
      ...updates,
      status: newStatus,
      current_value: newCurrentVal
    };
    
    // 🔥 Remove undefined properties to make Firebase happy
    Object.keys(updatedGoal).forEach(key => {
      if (updatedGoal[key] === undefined) {
        delete updatedGoal[key];
      }
    });

    goals[goalIndex] = updatedGoal as Goal;
    
    // Write back to Firestore
    await updateDoc(userDocRef, {
      goals
    })
    
    return true
  } catch (error) {
    console.error('Error updating goal:', error)
    return false
  }
}

/**
 * Deletes a goal by ID from the user's subarray.
 */
export async function deleteGoal(email: string, goalId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    
    if (!docSnap.exists()) return false
    
    const data = docSnap.data()
    const goals: Goal[] = data.goals || []
    
    // Find the goal to remove
    const goalToDelete = goals.find((g) => g.id === goalId)
    if (!goalToDelete) return false
    
    // Remove exactly from the Firestore array
    await updateDoc(userDocRef, {
      goals: arrayRemove(goalToDelete)
    })
    
    return true
  } catch (error) {
    console.error('Error deleting goal:', error)
    return false
  }
}
