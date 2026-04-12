import { getColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { saveTapGameScore } from "@/lib/games-service";
import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Vibration,
    View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.58;

const TapGameComponent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getColors(isDark);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [gameActive, setGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  useEffect(() => {
    if (!gameActive || !gameStarted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameActive(false);
          setGameEnded(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameActive, gameStarted]);

  useEffect(() => {
    if (!gameEnded) return;
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (email) saveTapGameScore(email, score);
  }, [gameEnded, score, user]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(5);
    setGameActive(true);
    setGameStarted(true);
    setGameEnded(false);
  };

  const handleTap = () => {
    if (!gameActive) return;
    Vibration.vibrate(25);
    setScore((prev) => prev + 1);
    // subtle pulse on tap
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 60, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  };

  const timerColor = timeLeft <= 2 ? "#EF4444" : timeLeft <= 3 ? "#F97316" : "#22C55E";
  const rating =
    score >= 30 ? "🔥 Legendary" : score >= 20 ? "⚡ Elite" : score >= 10 ? "👍 Good" : "💪 Keep Going";

  const s = getStyles(colors, isDark);

  return (
    <Modal visible transparent animationType="none">
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Drag handle */}
        <View style={s.dragHandle} />

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerEmoji}>👆</Text>
            <Text style={s.headerTitle}>Tap Game</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={16} color={isDark ? "#000" : "#fff"} />
          </TouchableOpacity>
        </View>

        {/* NOT STARTED */}
        {!gameStarted && (
          <View style={s.stateWrapper}>
            <View style={s.infoRow}>
              <Text style={s.bigEmoji}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.stateTitle}>Ready to Tap?</Text>
                <Text style={s.stateSub}>Tap as fast as you can in 5 seconds!</Text>
              </View>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={startGame} activeOpacity={0.85}>
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={s.primaryBtnText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* GAME OVER */}
        {gameEnded && (
          <View style={s.stateWrapper}>
            <View style={s.resultCard}>
              <Text style={s.resultEmoji}>🎯</Text>
              <Text style={s.resultScoreVal}>{score}</Text>
              <Text style={s.resultScoreLabel}>taps in 5 seconds</Text>
              <View style={s.ratingBadge}>
                <Text style={s.ratingText}>{rating}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={startGame} activeOpacity={0.85}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={s.primaryBtnText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghostBtn} onPress={handleClose}>
              <Text style={s.ghostBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACTIVE GAME */}
        {gameStarted && !gameEnded && (
          <View style={s.activeWrapper}>
            {/* Stats */}
            <View style={s.statsRow}>
              <View style={s.statChip}>
                <Text style={s.statLabel}>Taps</Text>
                <Text style={s.statValue}>{score}</Text>
              </View>
              <View style={[s.timerRing, { borderColor: timerColor }]}>
                <Text style={[s.timerVal, { color: timerColor }]}>{timeLeft}</Text>
                <Text style={s.timerUnit}>sec</Text>
              </View>
              <View style={s.statChip}>
                <Text style={s.statLabel}>Goal</Text>
                <Text style={s.statValue}>20+</Text>
              </View>
            </View>

            {/* Tap Button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity style={s.tapBtn} onPress={handleTap} activeOpacity={1}>
                <Text style={s.tapBtnEmoji}>👆</Text>
                <Text style={s.tapBtnLabel}>TAP!</Text>
              </TouchableOpacity>
            </Animated.View>

            <Text style={s.hintText}>Keep tapping to increase your score!</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const getStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    sheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: SHEET_HEIGHT,
      backgroundColor: colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingBottom: 28,
      borderTopWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
      elevation: 22,
    },
    dragHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)",
      marginTop: 10,
      marginBottom: 14,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    headerEmoji: { fontSize: 18 },
    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: "#D4AF37",
      alignItems: "center",
      justifyContent: "center",
    },
    // State screens (not started / ended)
    stateWrapper: {
      flex: 1,
      gap: 12,
      justifyContent: "center",
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: isDark ? "rgba(212,175,55,0.1)" : "rgba(212,175,55,0.08)",
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.25)",
    },
    bigEmoji: { fontSize: 38 },
    stateTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 3,
    },
    stateSub: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#D4AF37",
      borderRadius: 16,
      paddingVertical: 14,
      justifyContent: "center",
      shadowColor: "#D4AF37",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 6,
    },
    primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    resultCard: {
      alignItems: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: isDark ? "rgba(212,175,55,0.18)" : "rgba(212,175,55,0.22)",
    },
    resultEmoji: { fontSize: 36, marginBottom: 4 },
    resultScoreVal: {
      fontSize: 56,
      fontWeight: "800",
      color: "#D4AF37",
      lineHeight: 62,
    },
    resultScoreLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    ratingBadge: {
      backgroundColor: isDark ? "rgba(212,175,55,0.14)" : "rgba(212,175,55,0.1)",
      borderRadius: 10,
      paddingVertical: 5,
      paddingHorizontal: 14,
    },
    ratingText: { fontSize: 13, fontWeight: "700", color: "#D4AF37" },
    ghostBtn: {
      paddingVertical: 13,
      alignItems: "center",
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    ghostBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
    // Active game
    activeWrapper: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-evenly",
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    statChip: {
      alignItems: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    },
    statLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    timerRing: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 3,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    },
    timerVal: { fontSize: 22, fontWeight: "800" },
    timerUnit: { fontSize: 9, color: colors.textSecondary, fontWeight: "600" },
    tapBtn: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: "#D4AF37",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#D4AF37",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 18,
      elevation: 12,
    },
    tapBtnEmoji: { fontSize: 38, marginBottom: 2 },
    tapBtnLabel: {
      fontSize: 22,
      fontWeight: "800",
      color: "#fff",
      letterSpacing: 2,
    },
    hintText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });

export default TapGameComponent;