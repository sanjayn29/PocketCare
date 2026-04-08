import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
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

export async function savePushTokenToFirestore(email: string, pushToken: string) {
  try {
    const userRef = doc(db, 'UDB', email)
    await setDoc(
      userRef,
      {
        email,
        pushToken,
        pushTokenUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    )
    console.log('Push token saved to Firestore:', email)
  } catch (error) {
    console.error('Error saving push token to Firestore:', error)
  }
}
