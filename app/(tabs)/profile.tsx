import MemoryGameComponent from "@/components/MemoryGameComponent";
import TapGameComponent from "@/components/TapGameComponent";
import { getColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getMemoryGameScore, getTapGameScore } from "@/lib/games-service";
import { getStreakData } from "@/lib/streak-service";
import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getColors(isDark);
  const logoutIconColor = isDark ? "#0F172A" : "#FFFFFF";
  const [fontsLoaded] = useFonts({
    "Roboto Slab": require("../../assets/Font/RobotoSlab-VariableFont_wght.ttf"),
  });

  const [showMemoryGame, setShowMemoryGame] = useState(false);
  const [showTapGame, setShowTapGame] = useState(false);
  const [memoryScore, setMemoryScore] = useState<MemoryScore | null>(null);
  const [tapScore, setTapScore] = useState<TapScore | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const email = user?.emailAddresses?.[0]?.emailAddress;
  const userId = user?.id;

  const loadData = useCallback(async () => {
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
  }, [email, userId]);

  useEffect(() => {
    if (email && userId) {
      loadData();
    }
  }, [email, userId, loadData]);

  const handleGameClose = () => {
    setShowMemoryGame(false);
    setShowTapGame(false);
    loadData();
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      Alert.alert("Logout Error", "Failed to logout");
    }
  };

  if (!fontsLoaded) return null;

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerArea: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
      overflow: "hidden",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitleWrap: {
      flex: 1,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F59E0B",
      borderWidth: 1.5,
      borderColor: "#D97706",
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    pageTitle: {
      fontSize: 24,
      fontFamily: "Roboto Slab",
      color: isDark ? "#FFFFFF" : "#000000",
      letterSpacing: -0.5,
    },
    pageSubtitle: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    logoutButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#EF4444",
      borderWidth: 1.5,
      borderColor: "#DC2626",
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    logoutAnimation: {
      width: 28,
      height: 28,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 120,
    },
    userCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      marginBottom: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
      overflow: "hidden",
      padding: 18,
    },
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    userTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    avatar: {
      width: 62,
      height: 62,
      borderRadius: 31,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    avatarPlaceholder: {
      width: 62,
      height: 62,
      borderRadius: 31,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.12)",
      borderWidth: 2,
      borderColor: colors.primary,
    },
    userName: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      fontFamily: "Roboto Slab",
      letterSpacing: -0.2,
    },
    userEmail: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
      flexShrink: 1,
      lineHeight: 20,
    },
    sectionBlock: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    sectionIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: 0.2,
    },
    streakContainer: {
      flexDirection: "row",
      gap: 12,
    },
    streakCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    streakLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
      fontWeight: "600",
    },
    streakValueContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
    },
    streakValue: {
      fontSize: 30,
      fontWeight: "800",
      color: colors.primary,
    },
    streakUnit: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "600",
    },
    scoreCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    gameTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
      fontFamily: "Roboto Slab",
    },
    scoreDetails: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 16,
    },
    scoreItem: {
      alignItems: "center",
      flex: 1,
    },
    scoreLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
      fontWeight: "600",
    },
    scoreValue: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.primary,
    },
    divider: {
      width: 1,
      backgroundColor: colors.border,
    },
    gameButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    gameButtonIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
      borderWidth: 1,
      borderColor: colors.border,
    },
    gameButtonContent: {
      flex: 1,
    },
    gameButtonTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    gameButtonSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    gameButtonArrow: {
      marginLeft: 10,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={["top", "left", "right"]}>
      <View style={dynamicStyles.headerArea}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={dynamicStyles.headerRow}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.replace("/(tabs)")}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={dynamicStyles.headerTitleWrap}>
            <Text style={dynamicStyles.pageTitle}>Profile</Text>
            <Text style={dynamicStyles.pageSubtitle}>Your activity, streaks, and game stats</Text>
          </View>
          <TouchableOpacity style={dynamicStyles.logoutButton} onPress={handleLogout}>
            <LottieView
              source={require("../../assets/animations/Logout.json")}
              autoPlay
              loop
              colorFilters={[
                { keypath: "logout 2.logout.Fill 1", color: logoutIconColor },
                { keypath: "logout.logout.Fill 1", color: logoutIconColor },
              ]}
              style={dynamicStyles.logoutAnimation}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={dynamicStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={dynamicStyles.userCard}>
          <View style={dynamicStyles.profileSection}>
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={dynamicStyles.avatar} />
            ) : (
              <View style={dynamicStyles.avatarPlaceholder}>
                <Ionicons name="person" size={26} color={colors.primary} />
              </View>
            )}
            <View style={dynamicStyles.userTextWrap}>
              <Text style={dynamicStyles.userName}>{user?.firstName || "User"}</Text>
              <Text style={dynamicStyles.userEmail}>{email}</Text>
            </View>
          </View>
        </View>

        <View style={dynamicStyles.sectionBlock}>
          <View style={dynamicStyles.sectionHeader}>
            <View
              style={[
                dynamicStyles.sectionIconWrap,
                { backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.14)" },
              ]}
            >
              <Ionicons name="flame-outline" size={16} color="#F59E0B" />
            </View>
            <Text style={dynamicStyles.sectionTitle}>Streaks</Text>
          </View>
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

        <View style={dynamicStyles.sectionBlock}>
          <View style={dynamicStyles.sectionHeader}>
            <View
              style={[
                dynamicStyles.sectionIconWrap,
                { backgroundColor: isDark ? "rgba(250, 204, 21, 0.2)" : "rgba(250, 204, 21, 0.15)" },
              ]}
            >
              <Ionicons name="trophy-outline" size={16} color="#EAB308" />
            </View>
            <Text style={dynamicStyles.sectionTitle}>Best Scores</Text>
          </View>

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

        <View style={dynamicStyles.sectionBlock}>
          <View style={dynamicStyles.sectionHeader}>
            <View
              style={[
                dynamicStyles.sectionIconWrap,
                { backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.14)" },
              ]}
            >
              <Ionicons name="game-controller-outline" size={16} color="#3B82F6" />
            </View>
            <Text style={dynamicStyles.sectionTitle}>Play Games</Text>
          </View>

          <TouchableOpacity style={dynamicStyles.gameButton} onPress={() => setShowMemoryGame(true)}>
            <View style={dynamicStyles.gameButtonIconWrap}>
              <Ionicons name="extension-puzzle-outline" size={22} color={colors.primary} />
            </View>
            <View style={dynamicStyles.gameButtonContent}>
              <Text style={dynamicStyles.gameButtonTitle}>Memory Game</Text>
              <Text style={dynamicStyles.gameButtonSubtitle}>Match pairs of cards</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={dynamicStyles.gameButtonArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.gameButton} onPress={() => setShowTapGame(true)}>
            <View style={dynamicStyles.gameButtonIconWrap}>
              <Ionicons name="finger-print-outline" size={22} color={colors.primary} />
            </View>
            <View style={dynamicStyles.gameButtonContent}>
              <Text style={dynamicStyles.gameButtonTitle}>Tap Game</Text>
              <Text style={dynamicStyles.gameButtonSubtitle}>Tap as fast as you can</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={dynamicStyles.gameButtonArrow} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showMemoryGame && <MemoryGameComponent onClose={handleGameClose} />}
      {showTapGame && <TapGameComponent onClose={handleGameClose} />}
    </SafeAreaView>
  );
};

export default ProfileScreen;
