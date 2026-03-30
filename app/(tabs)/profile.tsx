import MemoryGameComponent from "@/components/MemoryGameComponent";
import TapGameComponent from "@/components/TapGameComponent";
import { getMemoryGameScore, getTapGameScore } from "@/lib/games-service";
import { useAuth, useUser } from "@clerk/expo";
import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface MemoryScore {
  bestMoves: number;
  bestTime: number;
}

interface TapScore {
  bestScore: number;
}

const ProfileScreen: React.FC = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [showMemoryGame, setShowMemoryGame] = useState(false);
  const [showTapGame, setShowTapGame] = useState(false);
  const [memoryScore, setMemoryScore] = useState<MemoryScore | null>(null);
  const [tapScore, setTapScore] = useState<TapScore | null>(null);

  const email = user?.emailAddresses?.[0]?.emailAddress;
  const userId = user?.id;

  useEffect(() => {
    if (email && userId) {
      loadData();
    }
  }, [email, userId]);

  const loadData = async () => {
    if (!email || !userId) return;
    try {
      const [memoryData, tapData] = await Promise.all([
        getMemoryGameScore(email),
        getTapGameScore(email),
      ]);
      setMemoryScore(memoryData);
      setTapScore(tapData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleGameClose = () => {
    setShowMemoryGame(false);
    setShowTapGame(false);
    loadData();
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert("Logout Error", "Failed to logout");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            {user?.imageUrl && <Image source={{ uri: user.imageUrl }} style={styles.avatar} />}
            <View>
              <Text style={styles.userName}>{user?.firstName || "User"}</Text>
              <Text style={styles.userEmail}>{email}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scoresSection}>
          <Text style={styles.sectionTitle}>🏆 Best Scores</Text>
          <View style={styles.scoreCard}>
            <Text style={styles.gameTitle}>Memory Game</Text>
            <View style={styles.scoreDetails}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Best Moves</Text>
                <Text style={styles.scoreValue}>{memoryScore?.bestMoves || "N/A"}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Time</Text>
                <Text style={styles.scoreValue}>{memoryScore?.bestTime ? `${memoryScore.bestTime}s` : "N/A"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.gameTitle}>Tap Game</Text>
            <View style={styles.scoreDetails}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Best Score</Text>
                <Text style={styles.scoreValue}>{tapScore?.bestScore || "N/A"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.gamesSection}>
          <Text style={styles.sectionTitle}>🎮 Play Games</Text>
          <TouchableOpacity style={[styles.gameButton, styles.memoryButton]} onPress={() => setShowMemoryGame(true)}>
            <Text style={styles.gameButtonIcon}>🧠</Text>
            <View style={styles.gameButtonContent}>
              <Text style={styles.gameButtonTitle}>Memory Game</Text>
              <Text style={styles.gameButtonSubtitle}>Match pairs of cards</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gameButton, styles.tapButton]} onPress={() => setShowTapGame(true)}>
            <Text style={styles.gameButtonIcon}>👆</Text>
            <View style={styles.gameButtonContent}>
              <Text style={styles.gameButtonTitle}>Tap Game</Text>
              <Text style={styles.gameButtonSubtitle}>Tap as fast as you can</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showMemoryGame && <MemoryGameComponent onClose={handleGameClose} />}
      {showTapGame && <TapGameComponent onClose={handleGameClose} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0e27", paddingTop: 16 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#1a1f3a" },
  profileSection: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  userName: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  userEmail: { fontSize: 14, color: "#a0a0a0" },
  logoutButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#ff6b6b", borderRadius: 6 },
  logoutText: { color: "#fff", fontWeight: "600" },
  scoresSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 16 },
  scoreCard: { backgroundColor: "#161b33", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1a1f3a" },
  gameTitle: { fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 12 },
  scoreDetails: { flexDirection: "row", justifyContent: "center", gap: 16 },
  scoreItem: { alignItems: "center", flex: 1 },
  scoreLabel: { fontSize: 12, color: "#7a8099", marginBottom: 4 },
  scoreValue: { fontSize: 20, fontWeight: "bold", color: "#4a9eff" },
  divider: { width: 1, backgroundColor: "#1a1f3a" },
  gamesSection: { marginBottom: 20 },
  gameButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#161b33", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#1a1f3a" },
  memoryButton: { borderLeftWidth: 4, borderLeftColor: "#4a9eff" },
  tapButton: { borderLeftWidth: 4, borderLeftColor: "#ffa500" },
  gameButtonIcon: { fontSize: 32, marginRight: 16 },
  gameButtonContent: { flex: 1 },
  gameButtonTitle: { fontSize: 16, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  gameButtonSubtitle: { fontSize: 13, color: "#7a8099" },
});

export default ProfileScreen;