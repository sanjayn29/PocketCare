import { getColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { saveMathGameScore } from "@/lib/games-service";
import { useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

type Operator = "+" | "-" | "*";

type Question = {
  a: number;
  b: number;
  operator: Operator;
  correct: number;
  options: number[];
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.66;
const GAME_TIME_SECONDS = 45;

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

const buildQuestion = (): Question => {
  const operators: Operator[] = ["+", "-", "*"];
  const operator = operators[randomInt(0, operators.length - 1)];
  let a = randomInt(2, 20);
  let b = randomInt(2, 20);

  if (operator === "*" ) {
    a = randomInt(2, 12);
    b = randomInt(2, 12);
  }
  if (operator === "-" && b > a) {
    const temp = a;
    a = b;
    b = temp;
  }

  const correct =
    operator === "+" ? a + b :
    operator === "-" ? a - b :
    a * b;

  const options = new Set<number>([correct]);
  while (options.size < 4) {
    const offset = randomInt(1, 15) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = Math.max(0, correct + offset);
    options.add(candidate);
  }

  return { a, b, operator, correct, options: shuffle(Array.from(options)) };
};

const MathGameComponent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getColors(isDark);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME_SECONDS);
  const [gameActive, setGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [question, setQuestion] = useState<Question>(() => buildQuestion());

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
    if (email) saveMathGameScore(email, score);
  }, [gameEnded, score, user]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_TIME_SECONDS);
    setQuestion(buildQuestion());
    setGameStarted(true);
    setGameActive(true);
    setGameEnded(false);
  };

  const handleAnswer = (value: number) => {
    if (!gameActive) return;
    if (value === question.correct) {
      setScore((prev) => prev + 1);
      Vibration.vibrate(20);
    } else {
      Vibration.vibrate(50);
    }
    setQuestion(buildQuestion());
  };

  const rating = useMemo(() => {
    if (score >= 25) return "Master Solver";
    if (score >= 16) return "Great Focus";
    if (score >= 10) return "Good Start";
    return "Keep Practicing";
  }, [score]);

  const s = getStyles(colors, isDark);

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.dragHandle} />

        <View style={s.header}>
          <View style={s.headerLeft}>
            <Ionicons name="bulb-outline" size={18} color="#D4AF37" />
            <Text style={s.headerTitle}>Math Challenge</Text>
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={16} color={isDark ? "#000" : "#fff"} />
          </TouchableOpacity>
        </View>

        {!gameStarted && (
          <View style={s.stateWrapper}>
            <Text style={s.stateTitle}>Train your brain in 45 seconds</Text>
            <Text style={s.stateSub}>Solve as many quick math questions as possible.</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={startGame}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={s.primaryBtnText}>Start Challenge</Text>
            </TouchableOpacity>
          </View>
        )}

        {gameEnded && (
          <View style={s.stateWrapper}>
            <View style={s.resultCard}>
              <Text style={s.resultScore}>{score}</Text>
              <Text style={s.resultLabel}>correct answers</Text>
              <Text style={s.resultRating}>{rating}</Text>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={startGame}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={s.primaryBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {gameStarted && !gameEnded && (
          <View style={s.activeWrapper}>
            <View style={s.statsRow}>
              <View style={s.statChip}>
                <Text style={s.statLabel}>Score</Text>
                <Text style={s.statValue}>{score}</Text>
              </View>
              <View style={s.timerChip}>
                <Text style={s.timerValue}>{timeLeft}s</Text>
              </View>
            </View>

            <View style={s.questionCard}>
              <Text style={s.questionText}>
                {question.a} {question.operator} {question.b} = ?
              </Text>
            </View>

            <View style={s.optionsGrid}>
              {question.options.map((option) => (
                <TouchableOpacity key={option} style={s.optionBtn} onPress={() => handleAnswer(option)}>
                  <Text style={s.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
      paddingBottom: 24,
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
      marginBottom: 14,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: "#D4AF37",
      alignItems: "center",
      justifyContent: "center",
    },
    stateWrapper: {
      flex: 1,
      justifyContent: "center",
      gap: 12,
    },
    stateTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      textAlign: "center",
    },
    stateSub: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 8,
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#D4AF37",
      borderRadius: 16,
      paddingVertical: 14,
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
      padding: 18,
      borderWidth: 1,
      borderColor: isDark ? "rgba(212,175,55,0.18)" : "rgba(212,175,55,0.22)",
    },
    resultScore: { fontSize: 54, fontWeight: "800", color: "#D4AF37", lineHeight: 60 },
    resultLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
    resultRating: { fontSize: 14, fontWeight: "700", color: colors.text },
    activeWrapper: {
      flex: 1,
      justifyContent: "space-between",
      paddingBottom: 6,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    statChip: {
      alignItems: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    },
    statLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: "600", textTransform: "uppercase" },
    statValue: { fontSize: 20, fontWeight: "800", color: colors.text },
    timerChip: {
      backgroundColor: isDark ? "rgba(212,175,55,0.15)" : "rgba(212,175,55,0.12)",
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.35)",
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    timerValue: { fontSize: 18, fontWeight: "800", color: "#D4AF37" },
    questionCard: {
      marginTop: 12,
      marginBottom: 12,
      paddingVertical: 24,
      borderRadius: 16,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    questionText: { fontSize: 34, fontWeight: "800", color: colors.text },
    optionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between",
    },
    optionBtn: {
      width: "48%",
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    optionText: { fontSize: 24, fontWeight: "800", color: colors.text },
  });

export default MathGameComponent;
