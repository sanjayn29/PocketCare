import { db } from '@/firebaseConfig';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
} from 'firebase/firestore';

export interface GameScores {
  memoryGame?: {
    bestMoves: number;
    bestTime: number;
  };
  tapGame?: {
    bestScore: number;
  };
  lastUpdated?: string;
}

/**
 * Save memory game best score
 */
export const saveMemoryGameScore = async (
  email: string,
  moves: number,
  time: number
): Promise<void> => {
  try {
    const gameDocRef = doc(db, 'games', email);
    const gameDoc = await getDoc(gameDocRef);

    if (gameDoc.exists()) {
      const data = gameDoc.data() as GameScores;
      // Only update if this is a better score (fewer moves)
      if (!data.memoryGame || moves < data.memoryGame.bestMoves) {
        await updateDoc(gameDocRef, {
          memoryGame: {
            bestMoves: moves,
            bestTime: time,
          },
          lastUpdated: new Date().toISOString(),
        });
      }
    } else {
      await setDoc(gameDocRef, {
        memoryGame: {
          bestMoves: moves,
          bestTime: time,
        },
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error saving memory game score:', error);
    throw error;
  }
};

/**
 * Save tap game best score
 */
export const saveTapGameScore = async (
  email: string,
  score: number
): Promise<void> => {
  try {
    const gameDocRef = doc(db, 'games', email);
    const gameDoc = await getDoc(gameDocRef);

    if (gameDoc.exists()) {
      const data = gameDoc.data() as GameScores;
      // Only update if this is a better score (more taps)
      if (!data.tapGame || score > data.tapGame.bestScore) {
        await updateDoc(gameDocRef, {
          tapGame: {
            bestScore: score,
          },
          lastUpdated: new Date().toISOString(),
        });
      }
    } else {
      await setDoc(gameDocRef, {
        tapGame: {
          bestScore: score,
        },
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error saving tap game score:', error);
    throw error;
  }
};

/**
 * Get all game scores for a user
 */
export const getGameScores = async (email: string): Promise<GameScores | null> => {
  try {
    const gameDocRef = doc(db, 'games', email);
    const gameDoc = await getDoc(gameDocRef);

    if (gameDoc.exists()) {
      return gameDoc.data() as GameScores;
    }
    return null;
  } catch (error) {
    console.error('Error getting game scores:', error);
    throw error;
  }
};

/**
 * Get memory game best score
 */
export const getMemoryGameScore = async (email: string) => {
  try {
    const scores = await getGameScores(email);
    return scores?.memoryGame || null;
  } catch (error) {
    console.error('Error getting memory game score:', error);
    return null;
  }
};

/**
 * Get tap game best score
 */
export const getTapGameScore = async (email: string) => {
  try {
    const scores = await getGameScores(email);
    return scores?.tapGame || null;
  } catch (error) {
    console.error('Error getting tap game score:', error);
    return null;
  }
};
