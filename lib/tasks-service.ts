import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type TaskStatus = 'pending' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  created_at: string
}

const COLLECTION_NAME = 'Tasks'

/**
 * Creates a new task for a user, stored in a subarray.
 * The document ID is the user's email.
 */
export async function addTask(
  email: string,
  title: string,
  description: string,
  status: TaskStatus = 'pending',
  priority: TaskPriority = 'medium',
  due_date: string = ''
): Promise<Task | null> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const now = new Date().toISOString()
    
    // Generate a simple unique ID for the task
    const taskId = Date.now().toString() + Math.random().toString(36).substring(2, 9)
    
    const newTask: Task = {
      id: taskId,
      title,
      description,
      status,
      priority,
      due_date,
      created_at: now,
    }

    const docSnap = await getDoc(userDocRef)
    
    if (docSnap.exists()) {
      // Document exists, update the subarray using arrayUnion
      await updateDoc(userDocRef, {
        tasks: arrayUnion(newTask)
      })
    } else {
      // Create new document with the tasks subarray
      await setDoc(userDocRef, {
        tasks: [newTask]
      })
    }
    
    return newTask
  } catch (error) {
    console.error('Error adding task:', error)
    return null
  }
}

/**
 * Retrieves all tasks for a specific user.
 */
export async function getTasks(email: string): Promise<Task[]> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return data.tasks || []
    }
    
    return []
  } catch (error) {
    console.error('Error getting tasks:', error)
    return []
  }
}

/**
 * Updates an existing task by ID in the user's subarray.
 */
export async function updateTask(
  email: string, 
  taskId: string, 
  updates: Partial<Omit<Task, 'id' | 'created_at'>>
): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    
    if (!docSnap.exists()) return false
    
    const data = docSnap.data()
    const tasks: Task[] = data.tasks || []
    
    const taskIndex = tasks.findIndex((t) => t.id === taskId)
    if (taskIndex === -1) return false
    
    // Update the specific task visually maintaining older properties
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates
    }
    
    // Write the modified array back to the document
    await updateDoc(userDocRef, {
      tasks
    })
    
    return true
  } catch (error) {
    console.error('Error updating task:', error)
    return false
  }
}

/**
 * Deletes a task by ID from the user's subarray.
 */
export async function deleteTask(email: string, taskId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    
    if (!docSnap.exists()) return false
    
    const data = docSnap.data()
    const tasks: Task[] = data.tasks || []
    
    // Find the task to remove
    const taskToDelete = tasks.find((t) => t.id === taskId)
    if (!taskToDelete) return false
    
    // Cleanly remove the specific object from the Firestore array
    await updateDoc(userDocRef, {
      tasks: arrayRemove(taskToDelete)
    })
    
    return true
  } catch (error) {
    console.error('Error deleting task:', error)
    return false
  }
}
