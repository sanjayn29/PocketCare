import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Vibration } from "react-native";
import { useUser } from "@clerk/expo";
import { saveTapGameScore } from "@/lib/games-service";

const TapGameComponent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useUser();
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [gameActive, setGameActive] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

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
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (userEmail) {
      saveTapGameScore(userEmail, score);
    }
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
    Vibration.vibrate(50);
    setScore((prev) => prev + 1);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tap Game</Text>

        {!gameStarted ? (
          <View style={styles.center}>
            <Text style={styles.introText}>Tap as many times as you can in 5 seconds!</Text>
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        ) : gameEnded ? (
          <View style={styles.center}>
            <Text style={styles.resultTitle}>Game Over!</Text>
            <Text style={styles.resultScore}>Your Score: {score}</Text>
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.startButton, styles.secondaryButton]} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gameContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Score</Text>
                <Text style={styles.statValue}>{score}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={[styles.statValue, timeLeft <= 2 && styles.timeWarning]}>{timeLeft}s</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.tapButton} onPress={handleTap} activeOpacity={0.7}>
              <Text style={styles.tapButtonText}>TAP!</Text>
            </TouchableOpacity>
            <Text style={styles.hintText}>Keep tapping to increase your score</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1e1e2e", paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20 },
  closeButton: { position: "absolute", top: 50, right: 16, zIndex: 10, padding: 8 },
  closeButtonText: { fontSize: 24, color: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 40, textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  introText: { fontSize: 18, color: "#a0a0a0", textAlign: "center", marginBottom: 40 },
  gameContainer: { flex: 1, justifyContent: "space-around", alignItems: "center" },
  statsRow: { flexDirection: "row", justifyContent: "center", gap: 40, marginBottom: 40 },
  statBox: { alignItems: "center" },
  statLabel: { fontSize: 14, color: "#a0a0a0", marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: "bold", color: "#4a9eff" },
  timeWarning: { color: "#ff6b6b" },
  tapButton: { width: 160, height: 160, borderRadius: 80, backgroundColor: "#4a9eff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  tapButtonText: { fontSize: 48, fontWeight: "bold", color: "#fff" },
  hintText: { fontSize: 16, color: "#a0a0a0", textAlign: "center" },
  startButton: { backgroundColor: "#4a9eff", paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, marginBottom: 12, width: "80%", alignItems: "center" },
  startButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: { backgroundColor: "#e0e0e0" },
  secondaryButtonText: { color: "#333", fontSize: 16, fontWeight: "600" },
  resultTitle: { fontSize: 32, fontWeight: "bold", color: "#fff", marginBottom: 16 },
  resultScore: { fontSize: 48, fontWeight: "bold", color: "#4a9eff", marginBottom: 40 },
});

export default TapGameComponent;