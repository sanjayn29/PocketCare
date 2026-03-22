import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebaseConfig'

export type Note = {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

const COLLECTION_NAME = 'Notes'

/**
 * Creates a new note for a user, stored in a subarray.
 * The document ID is the user's email.
 */
export async function addNote(email: string, title: string, content: string): Promise<Note | null> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const now = new Date().toISOString()
    
    // Generate a simple unique ID for the note
    const noteId = Date.now().toString() + Math.random().toString(36).substring(2, 9)
    
    const newNote: Note = {
      id: noteId,
      title,
      content,
      created_at: now,
      updated_at: now,
    }

    const docSnap = await getDoc(userDocRef)
    
    if (docSnap.exists()) {
      // Document exists, update the subarray using arrayUnion
      await updateDoc(userDocRef, {
        notes: arrayUnion(newNote)
      })
    } else {
      // Create new document with the notes subarray
      await setDoc(userDocRef, {
        notes: [newNote]
      })
    }
    
    return newNote
  } catch (error) {
    console.error('Error adding note:', error)
    return null
  }
}

/**
 * Retrieves all notes for a specific user.
 * The document ID is the user's email.
 */
export async function getNotes(email: string): Promise<Note[]> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return data.notes || []
    }
    
    return []
  } catch (error) {
    console.error('Error getting notes:', error)
    return []
  }
}

/**
 * Updates an existing note by ID in the user's subarray.
 */
export async function updateNote(
  email: string, 
  noteId: string, 
  updates: { title?: string; content?: string }
): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    
    if (!docSnap.exists()) return false
    
    const data = docSnap.data()
    const notes: Note[] = data.notes || []
    
    const noteIndex = notes.findIndex((note) => note.id === noteId)
    if (noteIndex === -1) return false
    
    // Update the specific note
    notes[noteIndex] = {
      ...notes[noteIndex],
      ...updates,
      updated_at: new Date().toISOString()
    }
    
    // Write the modified array back to the document
    await updateDoc(userDocRef, {
      notes
    })
    
    return true
  } catch (error) {
    console.error('Error updating note:', error)
    return false
  }
}

/**
 * Deletes a note by ID from the user's subarray.
 */
export async function deleteNote(email: string, noteId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, COLLECTION_NAME, email)
    const docSnap = await getDoc(userDocRef)
    
    if (!docSnap.exists()) return false
    
    const data = docSnap.data()
    const notes: Note[] = data.notes || []
    
    // Find the note to remove
    const noteToDelete = notes.find((note) => note.id === noteId)
    if (!noteToDelete) return false
    
    // Use arrayRemove to cleanly remove the specific object from the Firestore array
    await updateDoc(userDocRef, {
      notes: arrayRemove(noteToDelete)
    })
    
    return true
  } catch (error) {
    console.error('Error deleting note:', error)
    return false
  }
}
