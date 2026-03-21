import FloatingActionButton from '@/components/FloatingActionButton';
import { StyleSheet, Text, View } from 'react-native';
import Navbar from './navbar';

export default function GoalsScreen() {
  return (
    <View style={styles.container}>
      <Navbar />
      <FloatingActionButton />
      <View style={styles.content}>
        <Text style={styles.text}>goals.tsx</Text>
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
    marginTop: 80,
  },
  text: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
  },
});
