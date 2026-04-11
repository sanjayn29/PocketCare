/**
 * Device credential authentication helper (Biometrics / PIN / Pattern / Password).
 *
 * NOTE: expo-local-authentication requires native code and will NOT work in Expo Go.
 * It only works in a development build (expo run:android / expo run:ios).
 *
 * We safely handle the missing native module: if it isn't available the helper
 * functions return safe defaults so the app loads normally in Expo Go.
 */

// Lazy-require so a missing native module doesn't crash the entire app in Expo Go
let LocalAuthentication: typeof import('expo-local-authentication') | null = null

try {
  // This throws in Expo Go; succeeds in dev-client / production builds
  LocalAuthentication = require('expo-local-authentication')
} catch {
  console.log(
    '[deviceAuth] expo-local-authentication native module not available. ' +
      'Lock screen will be disabled. Run with `expo run:android` to enable it.'
  )
}

/**
 * Authenticate with biometrics OR device credential (PIN / pattern / password).
 * Returns true on success, false if cancelled / failed / not enrolled / not available.
 */
export const authenticateUser = async (): Promise<boolean> => {
  if (!LocalAuthentication) return true // not available → treat as unlocked

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock PocketCare',
      fallbackLabel: 'Use Phone Password',
      disableDeviceFallback: false, // allows PIN / pattern / password fallback
      cancelLabel: 'Cancel',
    })
    return result.success
  } catch (error) {
    console.warn('[deviceAuth] Authentication error:', error)
    return false
  }
}

/**
 * Returns true if the device has ANY authentication mechanism configured
 * (biometrics enrolled OR device PIN/pattern/password set).
 *
 * Returns false when running in Expo Go (native module unavailable),
 * which causes the lock screen to be skipped gracefully.
 */
export const isAuthAvailable = async (): Promise<boolean> => {
  if (!LocalAuthentication) return false // native module absent → skip lock screen

  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync()
    return level !== LocalAuthentication.SecurityLevel.NONE
  } catch {
    return false
  }
}
