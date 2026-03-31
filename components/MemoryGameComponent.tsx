import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Vibration } from "react-native";
import { useUser } from "@clerk/expo";
import { saveMemoryGameScore } from "@/lib/games-service";
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Card {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
}

const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼"];

const MemoryGameComponent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);
  const styles = React.useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

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
      setCards((prev) => prev.map((card, idx) => (idx === first || idx === second ? { ...card, matched: true } : card)));
      setFlippedCards([]);
    } else {
      setTimeout(() => {
        setCards((prev) => prev.map((card, idx) => (idx === first || idx === second ? { ...card, flipped: false } : card)));
        setFlippedCards([]);
      }, 1000);
    }
    setMoves((prev) => prev + 1);
  }, [flippedCards, cards]);

  useEffect(() => {
    if (matchedPairs === 8 && matchedPairs > 0) {
      setGameWon(true);
      setTimerActive(false);
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      if (userEmail) {
        saveMemoryGameScore(userEmail, moves, seconds);
      }
    }
  }, [matchedPairs, moves, seconds, user]);

  const initializeGame = () => {
    const shuffled = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5).map((value, id) => ({ id, value, flipped: false, matched: false }));
    setCards(shuffled);
    setFlippedCards([]);
    setMatchedPairs(0);
    setMoves(0);
    setSeconds(0);
    setGameWon(false);
    setTimerActive(true);
  };

  const handleCardPress = (index: number) => {
    if (cards[index].matched || cards[index].flipped) return;
    if (flippedCards.length === 2) return;
    Vibration.vibrate(50);
    setCards((prev) => prev.map((card, idx) => (idx === index ? { ...card, flipped: true } : card)));
    setFlippedCards((prev) => [...prev, index]);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Memory Game</Text>
        <View style={styles.stats}>
          <Text style={styles.statText}>Moves: {moves}</Text>
          <Text style={styles.statText}>Time: {seconds}s</Text>
        </View>
        <View style={styles.grid}>
          {cards.map((card, index) => (
            <TouchableOpacity key={index} style={[styles.card, card.flipped || card.matched ? styles.cardFlipped : styles.cardUnflipped]} onPress={() => handleCardPress(index)}>
              <Text style={[styles.cardText, card.flipped || card.matched ? styles.cardTextFlipped : styles.cardTextUnflipped]}>
                {card.flipped || card.matched ? card.value : "?"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Modal visible={gameWon} transparent animationType="fade" presentationStyle="overFullScreen">
          <View style={styles.modalOverlay}>
            <View style={styles.winModal}>
              <Text style={styles.winText}>🎉 You Won!</Text>
              <Text style={styles.resultText}>Moves: {moves} • Time: {seconds}s</Text>
              <TouchableOpacity style={styles.button} onPress={initializeGame}>
                <Text style={styles.buttonText}>Play Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 60 },
  closeButton: { position: "absolute", top: 50, right: 16, zIndex: 10, padding: 8 },
  closeButtonText: { fontSize: 24, color: colors.textSecondary },
  title: { fontSize: 28, fontWeight: "bold", color: colors.text, marginBottom: 18 },
  stats: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statText: { fontSize: 16, color: colors.textSecondary },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginBottom: 20 },
  card: { width: "22%", aspectRatio: 1, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 2 },
  cardUnflipped: { backgroundColor: colors.primary, borderColor: colors.primary },
  cardFlipped: { backgroundColor: colors.card, borderColor: colors.border },
  cardText: { fontSize: 32 },
  cardTextFlipped: { color: colors.text },
  cardTextUnflipped: { color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)", justifyContent: "center", alignItems: "center" },
  winModal: { backgroundColor: colors.card, borderRadius: 20, padding: 24, alignItems: "center", width: "80%", borderWidth: 1, borderColor: colors.border },
  winText: { fontSize: 36, fontWeight: "bold", marginBottom: 12, color: colors.text },
  resultText: { fontSize: 18, color: colors.textSecondary, marginBottom: 24 },
  button: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginBottom: 12, width: "100%", alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  secondaryButton: { backgroundColor: colors.border },
  secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: "600" },
});

export default MemoryGameComponent;