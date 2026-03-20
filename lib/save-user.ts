import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebaseConfig'

type UserData = {
  email: string
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string
  clerkUserId: string
  provider: string
}

/**
 * Saves user data to Firestore "UDB" collection.
 * Document ID = user's email address.
 */
export async function saveUserToFirestore(userData: UserData) {
  try {
    const docId = userData.email
    const userRef = doc(db, 'UDB', docId)

    const existingDoc = await getDoc(userRef)

    if (existingDoc.exists()) {
      await setDoc(
        userRef,
        {
          ...userData,
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      )
      console.log('User data updated in Firestore:', docId)
    } else {
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      })
      console.log('New user saved to Firestore:', docId)
    }
  } catch (error) {
    console.error('Error saving user to Firestore:', error)
  }
}
