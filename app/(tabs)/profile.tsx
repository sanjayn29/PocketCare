import MemoryGameComponent from "@/components/MemoryGameComponent";
import TapGameComponent from "@/components/TapGameComponent";
import { getCardSystem } from "@/constants/card-system";
import { getColors } from "@/constants/styles";
import { useTheme } from "@/context/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getMemoryGameScore, getTapGameScore } from "@/lib/games-service";
import { getStreakData } from "@/lib/streak-service";
import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, Switch } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from "react-native-safe-area-context";

let LocalAuthentication: any = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch {
  console.log('[profile] expo-local-authentication native module not available.');
}

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
  const cardSystem = getCardSystem(colors, isDark);
  const { toggleTheme } = useTheme();
  const switchRef = useRef<LottieView>(null);
  const [fontsLoaded] = useFonts({
    "Roboto Slab": require("../../assets/Font/RobotoSlab-VariableFont_wght.ttf"),
    "Momo Signature": require("../../assets/Font/MomoSignature-Regular.ttf"),
  });

  const [showMemoryGame, setShowMemoryGame] = useState(false);
  const [showTapGame, setShowTapGame] = useState(false);
  const [memoryScore, setMemoryScore] = useState<MemoryScore | null>(null);
  const [tapScore, setTapScore] = useState<TapScore | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('appLockEnabled').then(val => {
      setAppLockEnabled(val === 'true');
    });
  }, []);

  const toggleAppLock = async () => {
    if (!LocalAuthentication) {
      Alert.alert("App Lock Unavailable", "App Lock requires a native build. Use 'expo run:android'.");
      return;
    }

    if (!appLockEnabled) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert("App Lock Unavailable", "Your device does not have a screen lock or biometrics configured.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to enable App Lock",
        fallbackLabel: "Use Passcode",
      });
      
      if (result.success) {
        setAppLockEnabled(true);
        await AsyncStorage.setItem('appLockEnabled', 'true');
      }
    } else {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to disable App Lock",
        fallbackLabel: "Use Passcode",
      });
      
      if (result.success) {
        setAppLockEnabled(false);
        await AsyncStorage.setItem('appLockEnabled', 'false');
      }
    }
  };

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
      backgroundColor: "#D4AF37",
      borderWidth: 1.5,
      borderColor: "#D4AF37",
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
    themeToggle: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
      borderWidth: 1.5,
      borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
    },
    themeAnimation: {
      width: 36,
      height: 36,
    },
    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    themeRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    themeRowIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(129,140,248,0.15)" : "rgba(245,158,11,0.12)",
    },
    themeRowLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    themeRowSub: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 120,
    },
    userCard: {
      ...cardSystem.surface,
      marginBottom: 20,
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
      ...cardSystem.surface,
      flex: 1,
      padding: 16,
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
      ...cardSystem.surface,
      padding: 16,
      marginBottom: 12,
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
      ...cardSystem.surface,
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      marginBottom: 12,
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
    gamingAnimation: {
      width: 28,
      height: 28,
    },
    logoutSection: {
      marginTop: 6,
      marginBottom: 6,
    },
    logoutFullButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#EF4444",
      borderRadius: 16,
      paddingVertical: 11,
      paddingHorizontal: 18,
      borderWidth: 1.5,
      borderColor: "#DC2626",
      shadowColor: "#EF4444",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 5,
      gap: 8,
    },
    logoutFullAnimation: {
      width: 22,
      height: 22,
    },
    logoutFullLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.4,
      fontFamily: "Roboto Slab",
    },
    attributionCard: {
      ...cardSystem.surface,
      alignItems: "center",
      marginBottom: 14,
      marginTop: 4,
      paddingVertical: 18,
      paddingHorizontal: 20,
    },
    rocketWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#D4AF37",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      shadowColor: "#D4AF37",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 6,
    },
    rocketAnimation: {
      width: 52,
      height: 52,
    },
    attributionTagline: {
      fontSize: 12,
      color: colors.textSecondary,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontWeight: "600",
      marginBottom: 4,
    },
    attributionName: {
      fontSize: 32,
      color: colors.text,
      fontFamily: "Momo Signature",
      letterSpacing: 1,
      marginBottom: 8,
    },
    attributionDivider: {
      width: 36,
      height: 2,
      borderRadius: 2,
      backgroundColor: "#D4AF37",
      marginBottom: 8,
    },
    attributionLink: {
      fontSize: 13,
      color: "#D4AF37",
      fontWeight: "700",
      letterSpacing: 0.3,
      textDecorationLine: "underline",
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={["top", "left", "right"]}>
      <View style={dynamicStyles.headerArea}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={dynamicStyles.headerRow}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.replace("/(tabs)")}>
            <Ionicons name="chevron-back" size={22} color={isDark ? "#000000" : "#FFFFFF"} />
          </TouchableOpacity>
          <View style={dynamicStyles.headerTitleWrap}>
            <Text style={dynamicStyles.pageTitle}>Profile</Text>
            <Text style={dynamicStyles.pageSubtitle}>Your activity, streaks, and game stats</Text>
          </View>
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

        {/* Theme Toggle Row */}
        <TouchableOpacity
          style={dynamicStyles.themeRow}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <View style={dynamicStyles.themeRowLeft}>
            <View style={dynamicStyles.themeRowIcon}>
              <Ionicons name={isDark ? "moon" : "sunny"} size={16} color={isDark ? "#818CF8" : "#F59E0B"} />
            </View>
            <View>
              <Text style={dynamicStyles.themeRowLabel}>{isDark ? "Dark Mode" : "Light Mode"}</Text>
              <Text style={dynamicStyles.themeRowSub}>Tap to switch appearance</Text>
            </View>
          </View>
          <LottieView
            ref={switchRef}
            source={require("../../assets/animations/switch.json")}
            autoPlay={false}
            loop={false}
            progress={isDark ? 1 : 0}
            style={dynamicStyles.themeAnimation}
          />
        </TouchableOpacity>

        {/* App Lock Toggle Row */}
        <TouchableOpacity
          style={dynamicStyles.themeRow}
          onPress={toggleAppLock}
          activeOpacity={0.8}
        >
          <View style={dynamicStyles.themeRowLeft}>
            <View style={dynamicStyles.themeRowIcon}>
              <Ionicons name={appLockEnabled ? "lock-closed" : "lock-open"} size={16} color={appLockEnabled ? "#10B981" : "#EF4444"} />
            </View>
            <View>
              <Text style={dynamicStyles.themeRowLabel}>App Lock</Text>
              <Text style={dynamicStyles.themeRowSub}>Require auth to open app</Text>
            </View>
          </View>
          <Switch 
            value={appLockEnabled} 
            onValueChange={toggleAppLock} 
            trackColor={{false: '#E2E8F0', true: '#10B981'}}
            thumbColor={'#FFFFFF'}
          />
        </TouchableOpacity>

        <View style={dynamicStyles.sectionBlock}>
          <View style={dynamicStyles.sectionHeader}>
            <View
              style={[
                dynamicStyles.sectionIconWrap,
                { backgroundColor: isDark ? "rgba(212, 175, 55, 0.2)" : "rgba(212, 175, 55, 0.14)" },
              ]}
            >
              <Ionicons name="flame-outline" size={16} color="#D4AF37" />
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
                { backgroundColor: isDark ? "rgba(212, 175, 55, 0.2)" : "rgba(212, 175, 55, 0.15)" },
              ]}
            >
              <Ionicons name="trophy-outline" size={16} color="#D4AF37" />
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
              <LottieView
                source={require("../../assets/animations/gaming.json")}
                autoPlay
                loop
                style={dynamicStyles.gamingAnimation}
              />
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

        {/* ── Made by ── */}
        <TouchableOpacity
          style={dynamicStyles.attributionCard}
          activeOpacity={0.75}
          onPress={() => Linking.openURL("https://www.sanjayn.me")}
        >
          <View style={dynamicStyles.rocketWrapper}>
            <LottieView
              source={require("../../assets/animations/Rocketship.json")}
              autoPlay
              loop
              style={dynamicStyles.rocketAnimation}
            />
          </View>
          <Text style={dynamicStyles.attributionTagline}>Crafted with passion by</Text>
          <Text style={dynamicStyles.attributionName}>Sanjay N</Text>
          <View style={dynamicStyles.attributionDivider} />
          <Text style={dynamicStyles.attributionLink}>www.sanjayn.me</Text>
        </TouchableOpacity>

        {/* ── Logout ── */}
        <View style={dynamicStyles.logoutSection}>
          <TouchableOpacity
            style={dynamicStyles.logoutFullButton}
            onPress={handleLogout}
            activeOpacity={0.82}
          >
            <LottieView
              source={require("../../assets/animations/Logout.json")}
              autoPlay
              loop
              colorFilters={[
                { keypath: "logout 2.logout.Fill 1", color: "#FFFFFF" },
                { keypath: "logout.logout.Fill 1", color: "#FFFFFF" },
              ]}
              style={dynamicStyles.logoutFullAnimation}
            />
            <Text style={dynamicStyles.logoutFullLabel}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showMemoryGame && <MemoryGameComponent onClose={handleGameClose} />}
      {showTapGame && <TapGameComponent onClose={handleGameClose} />}
    </SafeAreaView>
  );
};

export default ProfileScreen;
