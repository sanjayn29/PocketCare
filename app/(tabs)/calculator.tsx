import FloatingActionButton from '@/components/FloatingActionButton';
import { StyleSheet, Text, View } from 'react-native';
import Navbar from './navbar';

export default function CalculatorScreen() {
  return (
    <View style={styles.container}>
      <Navbar />
      <FloatingActionButton />
      <View style={styles.content}>
        <Text style={styles.text}>calculator.tsx</Text>
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
