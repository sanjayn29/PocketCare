import FloatingActionButton from '@/components/FloatingActionButton';
import { StyleSheet, Text, View } from 'react-native';


export default function PlacementScreen() {
  return (
    <View style={styles.container}>

      <FloatingActionButton />
      <View style={styles.content}>
        <Text style={styles.text}>Placement</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
});
