import { useAuth } from '@clerk/expo'
import { Redirect, Stack } from 'expo-router'

export default function AuthRoutesLayout() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return null
  }

  // If already signed in, go to the main tabs
  if (isSignedIn) {
    return <Redirect href={'/(tabs)'} />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
