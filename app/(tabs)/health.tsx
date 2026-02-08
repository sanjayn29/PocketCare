import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet } from 'react-native';

export default function HealthScreen() {
    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title">Health</ThemedText>
            <ThemedText>Track your health metrics.</ThemedText>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
});
