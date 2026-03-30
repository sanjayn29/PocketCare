import FloatingActionButton from '@/components/FloatingActionButton';
import Navbar from '@/components/Navbar';
import { saveUserToFirestore } from '@/lib/save-user';
import { useUser } from '@clerk/expo';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
export default function HomeScreen() {
  const { user } = useUser();

  // Save user data to Firebase when they're logged in
  React.useEffect(() => {
    if (user) {
      const email = user.emailAddresses[0]?.emailAddress;
      if (email) {
        const provider =
          user.externalAccounts?.length > 0
            ? user.externalAccounts[0].provider || 'google'
            : 'email';

        saveUserToFirestore({
          email,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
          clerkUserId: user.id,
          provider,
        });
      }
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <Navbar />
      <FloatingActionButton />
      <View style={styles.content}>
        <Text style={styles.text}>Home</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80, // Space for navbar at top
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CCCCCC',
  }
});