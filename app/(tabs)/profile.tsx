import FloatingActionButton from '@/components/FloatingActionButton';
import {
  getMemoryGameScore,
  getTapGameScore,
  saveMemoryGameScore,
  saveTapGameScore
} from '@/lib/games-service';
import { useAuth, useUser } from '@clerk/expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

// Emoji pairs for the game
const EMOJI_PAIRS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function MemoryGame({ email }: { email: string }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const flipAnimations = useRef<{ [key: number]: Animated.Value }>({});

  // Initialize game
  useEffect(() => {
    initializeGame();
  }, [email]);

  // Timer
  useEffect(() => {
    if (!gameActive || gameWon) return;
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [gameActive, gameWon]);

  // Check win condition
  useEffect(() => {
    if (matchedPairs === 8 && gameActive) {
      setGameWon(true);
      setGameActive(false);
      Vibration.vibrate([100, 50, 100]);
      saveBestScore();
    }
  }, [matchedPairs, gameActive, moves, seconds, email]);

  const initializeGame = () => {
    const shuffled = [...EMOJI_PAIRS, ...EMOJI_PAIRS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));

    // Initialize all flip animations to 0 (front view)
    flipAnimations.current = {};
    shuffled.forEach((_, index) => {
      flipAnimations.current[index] = new Animated.Value(0);
    });

    setCards(shuffled);
    setSelectedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setGameWon(false);
    setSeconds(0);
    setGameActive(true);
  };

  const handleCardPress = (index: number) => {
    if (!gameActive || selectedCards.includes(index) || cards[index].isMatched || selectedCards.length === 2) {
      return;
    }

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    // Flip animation
    if (!flipAnimations.current[index]) {
      flipAnimations.current[index] = new Animated.Value(0);
    }
    Animated.spring(flipAnimations.current[index], {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    if (newSelected.length === 2) {
      const [first, second] = newSelected;
      if (cards[first].emoji === cards[second].emoji) {
        // Match!
        Vibration.vibrate(100);
        setTimeout(() => {
          setCards(prev =>
            prev.map((card, idx) =>
              (idx === first || idx === second) ? { ...card, isMatched: true } : card
            )
          );
          setMatchedPairs(prev => prev + 1);
          setSelectedCards([]);
        }, 300);
      } else {
        // No match
        setTimeout(() => {
          setSelectedCards([]);
          // Flip back
          if (flipAnimations.current[first]) {
            Animated.spring(flipAnimations.current[first], {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
          if (flipAnimations.current[second]) {
            Animated.spring(flipAnimations.current[second], {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        }, 1000);
      }
      setMoves(prev => prev + 1);
    }
  };

  const saveBestScore = async () => {
    try {
      if (!email) {
        console.warn('Email is empty, cannot save memory game score');
        return;
      }
      console.log(`Saving memory game score: ${moves} moves in ${seconds}s`);
      await saveMemoryGameScore(email, moves, seconds);
    } catch (error) {
      console.error('Error saving memory game score:', error);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const secsRem = secs % 60;
    return `${mins}:${secsRem.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.gameContainer}>
      {/* Header with Stats */}
      <View style={styles.gameHeader}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Moves</Text>
          <Text style={styles.statValue}>{moves}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Time</Text>
          <Text style={styles.statValue}>{formatTime(seconds)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Pairs</Text>
          <Text style={styles.statValue}>{matchedPairs}/8</Text>
        </View>
      </View>

      {/* Game Grid */}
      <View style={styles.gameGrid}>
        {cards.map((card, index) => {
          const flipValue = flipAnimations.current[index];
          if (!flipValue) return null;

          const frontOpacity = flipValue.interpolate({
            inputRange: [0, 0.5],
            outputRange: [1, 0],
          });
          const backOpacity = flipValue.interpolate({
            inputRange: [0.5, 1],
            outputRange: [0, 1],
          });

          return (
            <TouchableOpacity
              key={card.id}
              onPress={() => handleCardPress(index)}
              style={styles.cardWrapper}
            >
              {/* Front - Question Mark */}
              <Animated.View
                style={[
                  styles.cardFace,
                  styles.cardFront,
                  { opacity: frontOpacity },
                ]}
              >
                <Text style={styles.cardBackText}>?</Text>
              </Animated.View>

              {/* Back - Emoji */}
              <Animated.View
                style={[
                  styles.cardFace,
                  {
                    position: 'absolute' as any,
                    opacity: backOpacity,
                    backgroundColor: card.isMatched ? '#D1FAE5' : '#FFFFFF',
                  },
                ]}
              >
                <Text style={styles.emoji}>{card.emoji}</Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Win Modal */}
      {gameWon && (
        <View style={styles.winModal}>
          <View style={styles.winContent}>
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={styles.winTitle}>You Won!</Text>
            <Text style={styles.winStats}>
              {moves} moves in {formatTime(seconds)}
            </Text>
            <TouchableOpacity style={styles.playAgainButton} onPress={initializeGame}>
              <Text style={styles.playAgainButtonText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Restart Button */}
      <TouchableOpacity style={styles.restartButton} onPress={initializeGame}>
        <Text style={styles.restartButtonText}>🔄 Restart Game</Text>
      </TouchableOpacity>
    </View>
  );
}

function TapReactionGame({ email }: { email: string }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerId = useRef<number | null>(null);

  // Load high score on mount or when email changes
  useEffect(() => {
    loadHighScore();
  }, [email]);

  // Countdown timer
  useEffect(() => {
    if (!isPlaying) return;

    timerId.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsPlaying(false);
          setGameEnded(true);
          Vibration.vibrate([100, 50, 100]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerId.current) clearInterval(timerId.current);
    };
  }, [isPlaying]);

  // Save high score when game ends
  useEffect(() => {
    if (gameEnded && score >= 0) {
      saveHighScore(score);
    }
  }, [gameEnded]);

  // Pulse animation while playing
  useEffect(() => {
    if (!isPlaying) {
      pulseAnim.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [isPlaying]);

  const loadHighScore = async () => {
    try {
      if (!email) {
        console.warn('Email is empty, cannot load high score');
        return;
      }
      const cloudScore = await getTapGameScore(email);
      if (cloudScore) {
        setHighScore(cloudScore.bestScore);
      } else {
        // Fallback to local storage
        const saved = await AsyncStorage.getItem('tapGameHighScore');
        if (saved) setHighScore(parseInt(saved, 10));
      }
    } catch (error) {
      console.error('Error loading high score:', error);
    }
  };

  const saveHighScore = async (finalScore: number) => {
    try {
      if (!email) {
        console.warn('Email is empty, cannot save high score');
        return;
      }
      if (finalScore >= highScore) {
        console.log(`Saving high score: ${finalScore} (previous: ${highScore})`);
        await saveTapGameScore(email, finalScore);
        setHighScore(finalScore);
      }
    } catch (error) {
      console.error('Error saving high score:', error);
    }
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(5);
    setIsPlaying(true);
    setGameEnded(false);
  };

  const handleTap = () => {
    if (!isPlaying) return;

    setScore(prev => prev + 1);
    Vibration.vibrate(50);

    // Scale animation feedback
    scaleAnim.setValue(0.8);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.tapGameContainer}>
      {/* Header */}
      <View style={styles.tapGameHeader}>
        <View style={styles.tapStat}>
          <Text style={styles.tapStatLabel}>Score</Text>
          <Text style={styles.tapStatValue}>{score}</Text>
        </View>
        <View style={styles.tapStat}>
          <Text style={styles.tapStatLabel}>Time</Text>
          <Text style={[styles.tapStatValue, { color: timeLeft <= 2 ? '#EF4444' : '#1D4ED8' }]}>
            {timeLeft}s
          </Text>
        </View>
        <View style={styles.tapStat}>
          <Text style={styles.tapStatLabel}>🏆 Best</Text>
          <Text style={styles.tapStatValue}>{highScore}</Text>
        </View>
      </View>

      {/* Game Area */}
      {!gameEnded ? (
        <>
          {isPlaying ? (
            <Animated.View
              style={[
                styles.tapButton,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.tapButtonInner}
                onPress={handleTap}
                activeOpacity={0.7}
              >
                <Animated.Text
                  style={[
                    styles.tapButtonText,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  👆 TAP!
                </Animated.Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.startGameArea}>
              <TouchableOpacity style={styles.startGameButton} onPress={startGame}>
                <Text style={styles.startGameButtonText}>🎮 Start Game</Text>
              </TouchableOpacity>
              <Text style={styles.gameInstructions}>Tap as fast as you can!</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.gameOverArea}>
          <Text style={styles.gameOverEmoji}>🎯</Text>
          <Text style={styles.gameOverTitle}>Game Over!</Text>
          <Text style={styles.finalScore}>Final Score: {score}</Text>
          {score > highScore && (
            <Text style={styles.newHighScore}>🌟 New High Score! 🌟</Text>
          )}
          <TouchableOpacity style={styles.playAgainBtn} onPress={startGame}>
            <Text style={styles.playAgainBtnText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const email = user?.primaryEmailAddress?.emailAddress || '';
  const [activeGame, setActiveGame] = useState<'memory' | 'tap' | null>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const [memoryBestScore, setMemoryBestScore] = useState<{ moves: number; time: number } | null>(null);
  const [tapBestScore, setTapBestScore] = useState<number | null>(null);
  const [loadingScores, setLoadingScores] = useState(true);

  // Load best scores from database
  useEffect(() => {
    if (email) {
      loadBestScores();
    }
  }, [email]);

  const loadBestScores = async () => {
    try {
      setLoadingScores(true);
      const memoryScore = await getMemoryGameScore(email);
      const tapScore = await getTapGameScore(email);
      
      if (memoryScore) {
        setMemoryBestScore({ moves: memoryScore.bestMoves, time: memoryScore.bestTime });
      }
      if (tapScore) {
        setTapBestScore(tapScore.bestScore);
      }
    } catch (error) {
      console.error('Error loading best scores:', error);
    } finally {
      setLoadingScores(false);
    }
  };

  // Animate bottom sheet
  useEffect(() => {
    if (activeGame) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true,
      }).start();
      // Reload scores when closing a game
      loadBestScores();
    }
  }, [activeGame]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const secsRem = secs % 60;
    return `${mins}:${secsRem.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <FloatingActionButton />
      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || '?'}
              </Text>
            </View>
          )}

          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.email}>
            {user?.emailAddresses[0]?.emailAddress}
          </Text>

          <Pressable 
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed
            ]} 
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </View>

        {/* Best Scores Section */}
        <View style={styles.bestScoresSection}>
          <Text style={styles.bestScoresSectionTitle}>🏆 Your Best Scores</Text>
          <View style={styles.bestScoresGrid}>
            {/* Memory Game Best Score */}
            <View style={styles.bestScoreCard}>
              <Text style={styles.bestScoreCardEmoji}>🧠</Text>
              <Text style={styles.bestScoreCardLabel}>Memory Game</Text>
              <Text style={styles.bestScoreCardValue}>
                {memoryBestScore ? `${memoryBestScore.moves} moves` : '0 moves'}
              </Text>
              <Text style={styles.bestScoreCardTime}>
                {memoryBestScore ? formatTime(memoryBestScore.time) : '0:00'}
              </Text>
            </View>

            {/* Tap Game Best Score */}
            <View style={styles.bestScoreCard}>
              <Text style={styles.bestScoreCardEmoji}>⚡</Text>
              <Text style={styles.bestScoreCardLabel}>Tap Reaction</Text>
              <Text style={styles.bestScoreCardValue}>
                {tapBestScore ? `${tapBestScore}` : '0'}
              </Text>
              <Text style={styles.bestScoreCardTime}>taps</Text>
            </View>
          </View>
        </View>

        {/* Games Buttons */}
        <View style={styles.gameSectionButtons}>
          <Text style={styles.gameSectionTitle}>🎮 Play Games</Text>
          <View style={styles.gamesButtonsGrid}>
            <TouchableOpacity 
              style={styles.gameButton}
              onPress={() => setActiveGame('memory')}
            >
              <Text style={styles.gameButtonEmoji}>🧠</Text>
              <Text style={styles.gameButtonTitle}>Memory Card</Text>
              <Text style={styles.gameButtonSubtitle}>Game</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.gameButton}
              onPress={() => setActiveGame('tap')}
            >
              <Text style={styles.gameButtonEmoji}>⚡</Text>
              <Text style={styles.gameButtonTitle}>Tap Reaction</Text>
              <Text style={styles.gameButtonSubtitle}>Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Sheet Overlay */}
      {activeGame && (
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          onPress={() => setActiveGame(null)}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity 
              style={styles.bottomSheetDragArea}
              onPress={() => setActiveGame(null)}
            >
              <View style={styles.dragHandle} />
            </TouchableOpacity>

            <ScrollView 
              style={styles.bottomSheetContent}
              showsVerticalScrollIndicator={false}
            >
              {activeGame === 'memory' && <MemoryGame email={email} />}
              {activeGame === 'tap' && <TapReactionGame email={email} />}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 100,
  },
  profileCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 25,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  logoutButtonPressed: {
    opacity: 0.8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Best Scores Section
  bestScoresSection: {
    marginBottom: 40,
  },
  bestScoresSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  bestScoresGrid: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  bestScoreCard: {
    flex: 1,
    maxWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bestScoreCardEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  bestScoreCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  bestScoreCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  bestScoreCardTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Game Buttons & Bottom Sheet
  gameSectionButtons: {
    marginBottom: 40,
  },
  gamesButtonsGrid: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  gameButton: {
    flex: 1,
    maxWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  gameButtonEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  gameButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  gameButtonSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },

  // Bottom Sheet
  bottomSheetOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  bottomSheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomSheetDragArea: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  bottomSheetContent: {
    padding: 20,
    maxHeight: '100%',
  },

  // Game Styles
  gameSection: {
    marginBottom: 40,
  },
  gameSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  gameContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cardWrapper: {
    width: '22%',
    aspectRatio: 1,
  },
  cardFace: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  cardFront: {
    backgroundColor: '#DBEAFE',
  },
  cardBackText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  emoji: {
    fontSize: 40,
  },
  bestScoreBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FBBF24',
  },
  bestScoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  bestScoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B45309',
  },
  restartButton: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  winModal: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  winContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  winEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  winTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  winStats: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
    fontWeight: '600',
  },
  playAgainButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  playAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Tap Reaction Game Styles
  tapGameContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tapGameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tapStat: {
    alignItems: 'center',
  },
  tapStatLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  tapStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  tapButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tapButtonInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1D4ED8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  tapButtonText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  startGameArea: {
    alignItems: 'center',
    marginVertical: 40,
  },
  startGameButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  startGameButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  gameInstructions: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  gameOverArea: {
    alignItems: 'center',
    marginVertical: 20,
  },
  gameOverEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  finalScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  newHighScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 20,
  },
  playAgainBtn: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  playAgainBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
