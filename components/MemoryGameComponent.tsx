import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Vibration,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import { useUser } from "@clerk/expo";
import { saveMemoryGameScore } from "@/lib/games-service";
import { getColors } from "@/constants/styles";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";

interface Card {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
}

const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"];
const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;

const MemoryGameComponent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getColors(isDark);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    initializeGame();
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SHEET_HEIGHT, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  useEffect(() => {
    if (flippedCards.length !== 2) return;
    const [first, second] = flippedCards;
    if (cards[first].value === cards[second].value) {
      setMatchedPairs((prev) => prev + 1);
      setCards((prev) =>
        prev.map((card, idx) =>
          idx === first || idx === second ? { ...card, matched: true } : card
        )
      );
      setFlippedCards([]);
    } else {
      setTimeout(() => {
        setCards((prev) =>
          prev.map((card, idx) =>
            idx === first || idx === second ? { ...card, flipped: false } : card
          )
        );
        setFlippedCards([]);
      }, 900);
    }
    setMoves((prev) => prev + 1);
  }, [flippedCards, cards]);

  useEffect(() => {
    if (matchedPairs === 8 && matchedPairs > 0) {
      setGameWon(true);
      setTimerActive(false);
      const email = user?.emailAddresses?.[0]?.emailAddress;
      if (email) saveMemoryGameScore(email, moves, seconds);
    }
  }, [matchedPairs, moves, seconds, user]);

  const initializeGame = () => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((value, id) => ({ id, value, flipped: false, matched: false }));
    setCards(shuffled);
    setFlippedCards([]);
    setMatchedPairs(0);
    setMoves(0);
    setSeconds(0);
    setGameWon(false);
    setTimerActive(true);
  };

  const handleCardPress = (index: number) => {
    if (cards[index].matched || cards[index].flipped || flippedCards.length === 2) return;
    Vibration.vibrate(40);
    setCards((prev) =>
      prev.map((card, idx) => (idx === index ? { ...card, flipped: true } : card))
    );
    setFlippedCards((prev) => [...prev, index]);
  };

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
            <Text style={s.headerEmoji}>🧠</Text>
            <Text style={s.headerTitle}>Memory Game</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={initializeGame}>
              <Ionicons name="refresh" size={16} color="#D4AF37" />
            </TouchableOpacity>
            <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={16} color={isDark ? "#000" : "#fff"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats + Progress */}
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={s.statLabel}>Moves</Text>
            <Text style={s.statValue}>{moves}</Text>
          </View>
          <View style={s.centerStat}>
            <Text style={s.pairsText}>{matchedPairs}/8</Text>
            <Text style={s.pairsLabel}>pairs</Text>
          </View>
          <View style={s.statChip}>
            <Text style={s.statLabel}>Time</Text>
            <Text style={s.statValue}>{seconds}s</Text>
          </View>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${(matchedPairs / 8) * 100}%` as any }]} />
        </View>

        {/* Game Won Banner */}
        {gameWon ? (
          <View style={s.wonBanner}>
            <Text style={s.wonEmoji}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.wonTitle}>You Won!</Text>
              <Text style={s.wonSub}>{moves} moves • {seconds}s</Text>
            </View>
            <TouchableOpacity style={s.playAgainBtn} onPress={initializeGame}>
              <Text style={s.playAgainText}>Again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Card Grid */}
        <View style={s.grid}>
          {cards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={[
                s.card,
                card.matched ? s.cardMatched : card.flipped ? s.cardFlipped : s.cardHidden,
              ]}
              onPress={() => handleCardPress(index)}
              activeOpacity={0.85}
            >
              <Text style={s.cardEmoji}>
                {card.flipped || card.matched ? card.value : "?"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
      paddingHorizontal: 16,
      paddingBottom: 24,
      borderTopWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 20,
    },
    dragHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
      marginTop: 10,
      marginBottom: 14,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    headerRight: { flexDirection: "row", gap: 8 },
    headerEmoji: { fontSize: 18 },
    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: isDark ? "rgba(212,175,55,0.12)" : "rgba(212,175,55,0.12)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.3)",
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: "#D4AF37",
      alignItems: "center",
      justifyContent: "center",
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    statChip: {
      alignItems: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 14,
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
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
    },
    centerStat: { alignItems: "center" },
    pairsText: { fontSize: 20, fontWeight: "800", color: "#D4AF37" },
    pairsLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: "600" },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      marginBottom: 10,
    },
    progressFill: {
      height: 4,
      borderRadius: 2,
      backgroundColor: "#D4AF37",
    },
    wonBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(212,175,55,0.12)" : "rgba(212,175,55,0.1)",
      borderRadius: 14,
      padding: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: "rgba(212,175,55,0.3)",
      gap: 10,
    },
    wonEmoji: { fontSize: 28 },
    wonTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    wonSub: { fontSize: 12, color: colors.textSecondary },
    playAgainBtn: {
      backgroundColor: "#D4AF37",
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    playAgainText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
    },
    card: {
      width: "22%",
      aspectRatio: 1,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
    },
    cardHidden: {
      backgroundColor: isDark ? "rgba(212,175,55,0.12)" : "rgba(212,175,55,0.1)",
      borderColor: "rgba(212,175,55,0.35)",
    },
    cardFlipped: {
      backgroundColor: colors.card,
      borderColor: colors.primary,
    },
    cardMatched: {
      backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)",
      borderColor: "#22C55E",
    },
    cardEmoji: { fontSize: 24 },
  });

export default MemoryGameComponent;