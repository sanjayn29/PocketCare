import MemoryGameComponent from "@/components/MemoryGameComponent";
import TapGameComponent from "@/components/TapGameComponent";
import { getColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getMemoryGameScore, getTapGameScore } from "@/lib/games-service";
import { getStreakData } from "@/lib/streak-service";
import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getColors(isDark);
  
  const [showMemoryGame, setShowMemoryGame] = useState(false);
  const [showTapGame, setShowTapGame] = useState(false);
  const [memoryScore, setMemoryScore] = useState<MemoryScore | null>(null);
  const [tapScore, setTapScore] = useState<TapScore | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

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
      const [memoryData, tapData, streakData] = await Promise.all([
        getMemoryGameScore(email),
        getTapGameScore(email),
        getStreakData(email),
      ]);
      setMemoryScore(memoryData);
      setTapScore(tapData);
      setCurrentStreak(streakData.currentStreak);
      setMaxStreak(streakData.maxStreak);
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

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: colors.background, 
      paddingTop: 16 
    },
    scrollContent: { 
      paddingHorizontal: 16, 
      paddingBottom: 40 
    },
    header: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      alignItems: "center", 
      marginBottom: 32, 
      paddingBottom: 16, 
      borderBottomWidth: 1, 
      borderBottomColor: colors.border 
    },
    profileSection: { 
      flexDirection: "row", 
      alignItems: "center", 
      gap: 12, 
      flex: 1 
    },
    avatar: { 
      width: 56, 
      height: 56, 
      borderRadius: 28,
      borderWidth: 2,
      borderColor: colors.primary
    },
    userName: { 
      fontSize: 18, 
      fontWeight: "bold", 
      color: colors.text 
    },
    userEmail: { 
      fontSize: 14, 
      color: colors.textSecondary 
    },
    logoutButton: { 
      paddingHorizontal: 16, 
      paddingVertical: 8, 
      backgroundColor: colors.danger, 
      borderRadius: 6 
    },
    logoutText: { 
      color: colors.background, 
      fontWeight: "600" 
    },
    streakSection: { 
      marginBottom: 32 
    },
    streakContainer: { 
      flexDirection: "row", 
      gap: 12 
    },
    streakCard: { 
      flex: 1, 
      backgroundColor: colors.card, 
      borderRadius: 12, 
      padding: 16, 
      borderWidth: 1, 
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary
    },
    streakLabel: { 
      fontSize: 13, 
      color: colors.textSecondary, 
      marginBottom: 8 
    },
    streakValueContainer: { 
      flexDirection: "row", 
      alignItems: "baseline", 
      gap: 4 
    },
    streakValue: { 
      fontSize: 28, 
      fontWeight: "bold", 
      color: colors.primary 
    },
    streakUnit: { 
      fontSize: 12, 
      color: colors.textSecondary 
    },
    scoresSection: { 
      marginBottom: 32 
    },
    sectionTitle: { 
      fontSize: 20, 
      fontWeight: "bold", 
      color: colors.text, 
      marginBottom: 16 
    },
    scoreCard: { 
      backgroundColor: colors.card, 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 12, 
      borderWidth: 1, 
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary
    },
    gameTitle: { 
      fontSize: 16, 
      fontWeight: "bold", 
      color: colors.text, 
      marginBottom: 12 
    },
    scoreDetails: { 
      flexDirection: "row", 
      justifyContent: "center", 
      gap: 16 
    },
    scoreItem: { 
      alignItems: "center", 
      flex: 1 
    },
    scoreLabel: { 
      fontSize: 12, 
      color: colors.textSecondary, 
      marginBottom: 4 
    },
    scoreValue: { 
      fontSize: 20, 
      fontWeight: "bold", 
      color: colors.primary 
    },
    divider: { 
      width: 1, 
      backgroundColor: colors.border 
    },
    gamesSection: { 
      marginBottom: 20 
    },
    gameButton: { 
      flexDirection: "row", 
      alignItems: "center", 
      backgroundColor: colors.card, 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 12, 
      borderWidth: 1, 
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary
    },
    gameButtonIcon: { 
      fontSize: 32, 
      marginRight: 16 
    },
    gameButtonContent: { 
      flex: 1 
    },
    gameButtonTitle: { 
      fontSize: 16, 
      fontWeight: "bold", 
      color: colors.text, 
      marginBottom: 4 
    },
    gameButtonSubtitle: { 
      fontSize: 13, 
      color: colors.textSecondary 
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={dynamicStyles.header}>
          <View style={dynamicStyles.profileSection}>
            {user?.imageUrl && <Image source={{ uri: user.imageUrl }} style={dynamicStyles.avatar} />}
            <View>
              <Text style={dynamicStyles.userName}>{user?.firstName || "User"}</Text>
              <Text style={dynamicStyles.userEmail}>{email}</Text>
            </View>
          </View>
          <TouchableOpacity style={dynamicStyles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={colors.background} />
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.streakSection}>
          <Text style={dynamicStyles.sectionTitle}>🔥 Streaks</Text>
          <View style={dynamicStyles.streakContainer}>
            <View style={dynamicStyles.streakCard}>
              <Text style={dynamicStyles.streakLabel}>Current</Text>
              <View style={dynamicStyles.streakValueContainer}>
                <Text style={dynamicStyles.streakValue}>{currentStreak}</Text>
                <Text style={dynamicStyles.streakUnit}>days</Text>
              </View>
            </View>
            <View style={dynamicStyles.streakCard}>
              <Text style={dynamicStyles.streakLabel}>Best</Text>
              <View style={dynamicStyles.streakValueContainer}>
                <Text style={dynamicStyles.streakValue}>{maxStreak}</Text>
                <Text style={dynamicStyles.streakUnit}>days</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={dynamicStyles.scoresSection}>
          <Text style={dynamicStyles.sectionTitle}>🏆 Best Scores</Text>
          <View style={dynamicStyles.scoreCard}>
            <Text style={dynamicStyles.gameTitle}>Memory Game</Text>
            <View style={dynamicStyles.scoreDetails}>
              <View style={dynamicStyles.scoreItem}>
                <Text style={dynamicStyles.scoreLabel}>Best Moves</Text>
                <Text style={dynamicStyles.scoreValue}>{memoryScore?.bestMoves || "N/A"}</Text>
              </View>
              <View style={dynamicStyles.divider} />
              <View style={dynamicStyles.scoreItem}>
                <Text style={dynamicStyles.scoreLabel}>Time</Text>
                <Text style={dynamicStyles.scoreValue}>{memoryScore?.bestTime ? `${memoryScore.bestTime}s` : "N/A"}</Text>
              </View>
            </View>
          </View>

          <View style={dynamicStyles.scoreCard}>
            <Text style={dynamicStyles.gameTitle}>Tap Game</Text>
            <View style={dynamicStyles.scoreDetails}>
              <View style={dynamicStyles.scoreItem}>
                <Text style={dynamicStyles.scoreLabel}>Best Score</Text>
                <Text style={dynamicStyles.scoreValue}>{tapScore?.bestScore || "N/A"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={dynamicStyles.gamesSection}>
          <Text style={dynamicStyles.sectionTitle}>🎮 Play Games</Text>
          <TouchableOpacity style={dynamicStyles.gameButton} onPress={() => setShowMemoryGame(true)}>
            <Text style={dynamicStyles.gameButtonIcon}>🧠</Text>
            <View style={dynamicStyles.gameButtonContent}>
              <Text style={dynamicStyles.gameButtonTitle}>Memory Game</Text>
              <Text style={dynamicStyles.gameButtonSubtitle}>Match pairs of cards</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.gameButton} onPress={() => setShowTapGame(true)}>
            <Text style={dynamicStyles.gameButtonIcon}>👆</Text>
            <View style={dynamicStyles.gameButtonContent}>
              <Text style={dynamicStyles.gameButtonTitle}>Tap Game</Text>
              <Text style={dynamicStyles.gameButtonSubtitle}>Tap as fast as you can</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showMemoryGame && <MemoryGameComponent onClose={handleGameClose} />}
      {showTapGame && <TapGameComponent onClose={handleGameClose} />}
    </View>
  );
};

export default ProfileScreen;