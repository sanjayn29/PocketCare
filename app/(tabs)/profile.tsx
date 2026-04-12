import MemoryGameComponent from "@/components/MemoryGameComponent";
import TapGameComponent from "@/components/TapGameComponent";
import { getCardSystem } from "@/constants/card-system";
import { getColors } from "@/constants/styles";
import { useTheme } from "@/context/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { createDownloadFile, downloadAllUserData } from "@/lib/download-service";
import { getMemoryGameScore, getTapGameScore } from "@/lib/games-service";
import { getStreakData } from "@/lib/streak-service";
import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from "expo-blur";
import * as FileSystem from 'expo-file-system/legacy';
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
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

const DOWNLOADS_DIRECTORY_URI_KEY = 'downloadsDirectoryUri';

const textValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const wrapByChars = (text: string, width: number): string[] => {
  const clean = textValue(text).replace(/\s+/g, " ").trim();
  if (!clean) return ["-"];

  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > width) {
      if (current) {
        lines.push(current);
        current = "";
      }
      let i = 0;
      while (i < word.length) {
        lines.push(word.slice(i, i + width));
        i += width;
      }
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length <= width) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : ["-"];
};

const tableLines = (title: string, columns: Array<{ header: string; width: number }>, rows: string[][]): string[] => {
  const lines: string[] = [];
  const separator = `+${columns.map((c) => "-".repeat(c.width + 2)).join("+")}+`;
  const header = `|${columns
    .map((c) => ` ${c.header.slice(0, c.width).padEnd(c.width)} `)
    .join("|")}|`;

  lines.push("");
  lines.push(title);
  lines.push(separator);
  lines.push(header);
  lines.push(separator);

  for (const row of rows) {
    const wrappedCells = columns.map((col, idx) => wrapByChars(row[idx] ?? "-", col.width));
    const maxRowLines = Math.max(...wrappedCells.map((cell) => cell.length));

    for (let lineIndex = 0; lineIndex < maxRowLines; lineIndex += 1) {
      const line = `|${columns
        .map((col, colIndex) => {
          const chunk = wrappedCells[colIndex][lineIndex] ?? "";
          return ` ${chunk.slice(0, col.width).padEnd(col.width)} `;
        })
        .join("|")}|`;
      lines.push(line);
    }

    lines.push(separator);
  }

  if (rows.length === 0) {
    const emptyRow = `|${columns.map((c) => ` ${"-".padEnd(c.width)} `).join("|")}|`;
    lines.push(emptyRow);
    lines.push(separator);
  }

  return lines;
};

const createPdfBase64 = async (jsonString: string, email: string): Promise<string> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);

  const fontSize = 8;
  const lineHeight = 10;
  const margin = 36;
  const parsedData = (() => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  })();

  const reportLines: string[] = [
    "Developed by Sanjay N",
    "Contact: www.sanjayn.me",
    "",
    "PocketCare Data Export",
    `User: ${email}`,
    `Generated: ${new Date().toISOString()}`,
  ];

  if (!parsedData) {
    reportLines.push("", "Raw Data:");
    reportLines.push(...jsonString.split("\n"));
  } else {
    const finance = parsedData.finance ?? {};
    const goals = Array.isArray(parsedData.goals) ? parsedData.goals : [];
    const health = parsedData.health ?? {};
    const notes = Array.isArray(parsedData.notes) ? parsedData.notes : [];
    const placement = Array.isArray(parsedData.placement) ? parsedData.placement : [];
    const schedule = Array.isArray(parsedData.schedule) ? parsedData.schedule : [];
    const skills = Array.isArray(parsedData.skills) ? parsedData.skills : [];
    const tasks = Array.isArray(parsedData.tasks) ? parsedData.tasks : [];

    const transactions = Array.isArray(finance.transactions) ? finance.transactions : [];
    const debts = Array.isArray(finance.debts) ? finance.debts : [];
    const financeGoals = Array.isArray(finance.goals) ? finance.goals : [];
    const medical = Array.isArray(health.medical) ? health.medical : [];
    const foodDiet = Array.isArray(health.food_diet) ? health.food_diet : [];
    const fitness = Array.isArray(health.fitness) ? health.fitness : [];

    reportLines.push(
      "",
      "Summary",
      `- Finance Transactions: ${transactions.length}`,
      `- Finance Debts: ${debts.length}`,
      `- Finance Goals: ${financeGoals.length}`,
      `- Goals: ${goals.length}`,
      `- Medical Records: ${medical.length}`,
      `- Diet Plans: ${foodDiet.length}`,
      `- Fitness Plans: ${fitness.length}`,
      `- Notes: ${notes.length}`,
      `- Placements: ${placement.length}`,
      `- Schedule Events: ${schedule.length}`,
      `- Skills: ${skills.length}`,
      `- Tasks: ${tasks.length}`
    );

    reportLines.push(
      ...tableLines(
        "Finance - Transactions",
        [
          { header: "Date", width: 10 },
          { header: "Type", width: 8 },
          { header: "Amount", width: 10 },
          { header: "Category", width: 14 },
          { header: "Note", width: 24 },
        ],
        transactions.map((item: any) => [
          textValue(item.date),
          textValue(item.type),
          textValue(item.amount),
          textValue(item.category),
          textValue(item.note),
        ])
      ),
      ...tableLines(
        "Finance - Debts",
        [
          { header: "To", width: 12 },
          { header: "Amount", width: 10 },
          { header: "Due Date", width: 10 },
          { header: "Returned", width: 8 },
          { header: "Description", width: 20 },
        ],
        debts.map((item: any) => [
          textValue(item.to_whom),
          textValue(item.amount),
          textValue(item.due_date),
          textValue(item.given_back),
          textValue(item.description),
        ])
      ),
      ...tableLines(
        "Finance - Goals",
        [
          { header: "Title", width: 18 },
          { header: "Target", width: 10 },
          { header: "Current", width: 10 },
          { header: "Description", width: 24 },
        ],
        financeGoals.map((item: any) => [
          textValue(item.title),
          textValue(item.target_amount),
          textValue(item.current_amount),
          textValue(item.description),
        ])
      ),
      ...tableLines(
        "Goals",
        [
          { header: "Title", width: 16 },
          { header: "Category", width: 10 },
          { header: "Status", width: 10 },
          { header: "Priority", width: 10 },
          { header: "Description", width: 20 },
        ],
        goals.map((item: any) => [
          textValue(item.title),
          textValue(item.category),
          textValue(item.status),
          textValue(item.priority),
          textValue(item.description),
        ])
      ),
      ...tableLines(
        "Health - Medical",
        [
          { header: "Topic", width: 14 },
          { header: "Start", width: 10 },
          { header: "End", width: 10 },
          { header: "Description", width: 32 },
        ],
        medical.map((item: any) => [
          textValue(item.topic),
          textValue(item.start_date),
          textValue(item.end_date),
          textValue(item.description),
        ])
      ),
      ...tableLines(
        "Health - Food & Diet",
        [
          { header: "Name", width: 16 },
          { header: "Start", width: 10 },
          { header: "End", width: 10 },
          { header: "Description", width: 30 },
        ],
        foodDiet.map((item: any) => [
          textValue(item.name),
          textValue(item.start_date),
          textValue(item.end_date),
          textValue(item.description),
        ])
      ),
      ...tableLines(
        "Health - Fitness",
        [
          { header: "Name", width: 16 },
          { header: "Start", width: 10 },
          { header: "End", width: 10 },
          { header: "Completed Days", width: 16 },
          { header: "Description", width: 14 },
        ],
        fitness.map((item: any) => [
          textValue(item.name),
          textValue(item.start_date),
          textValue(item.end_date),
          textValue(Array.isArray(item.completed_dates) ? item.completed_dates.length : 0),
          textValue(item.description),
        ])
      ),
      ...tableLines(
        "Notes",
        [
          { header: "Title", width: 20 },
          { header: "Created", width: 19 },
          { header: "Content", width: 34 },
        ],
        notes.map((item: any) => [
          textValue(item.title),
          textValue(item.created_at),
          textValue(item.content),
        ])
      ),
      ...tableLines(
        "Placement",
        [
          { header: "Company", width: 14 },
          { header: "Date", width: 10 },
          { header: "Status", width: 10 },
          { header: "Stage", width: 12 },
          { header: "Studied", width: 8 },
          { header: "Round Topics", width: 12 },
        ],
        placement.map((item: any) => [
          textValue(item.company_name),
          textValue(item.date),
          textValue(item.status),
          textValue(item.company_status),
          textValue(item.studied),
          textValue(
            Array.isArray(item.rounds)
              ? item.rounds.map((round: any) => textValue(round.topic)).join(", ")
              : "-"
          ),
        ])
      ),
      ...tableLines(
        "Schedule",
        [
          { header: "Title", width: 14 },
          { header: "Date", width: 10 },
          { header: "Start", width: 5 },
          { header: "End", width: 5 },
          { header: "Status", width: 10 },
          { header: "Priority", width: 10 },
          { header: "Purpose", width: 16 },
        ],
        schedule.map((item: any) => [
          textValue(item.title),
          textValue(item.date),
          textValue(item.startTime),
          textValue(item.endTime),
          textValue(item.status),
          textValue(item.priority),
          textValue(item.purpose),
        ])
      ),
      ...tableLines(
        "Skills",
        [
          { header: "Name", width: 16 },
          { header: "Level", width: 12 },
          { header: "Progress", width: 10 },
          { header: "Items", width: 25 },
        ],
        skills.map((item: any) => [
          textValue(item.name),
          textValue(item.level),
          textValue(Array.isArray(item.progress) ? item.progress.length : 0),
          textValue(
            Array.isArray(item.progress)
              ? item.progress.map((progress: any) => textValue(progress.title)).join(", ")
              : "-"
          ),
        ])
      ),
      ...tableLines(
        "Tasks",
        [
          { header: "Title", width: 18 },
          { header: "Due Date", width: 10 },
          { header: "Priority", width: 10 },
          { header: "Status", width: 10 },
          { header: "Description", width: 26 },
        ],
        tasks.map((item: any) => [
          textValue(item.title),
          textValue(item.due_date),
          textValue(item.priority),
          textValue(item.status),
          textValue(item.description),
        ])
      )
    );
  }

  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();
  const maxWidth = width - margin * 2;
  let y = height - margin;

  const writeLine = (line: string) => {
    if (y < margin) {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      y = height - margin;
    }

    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    y -= lineHeight;
  };

  const wrapByWidth = (input: string): string[] => {
    if (!input) {
      return [""];
    }

    const lines: string[] = [];
    let current = "";

    for (const char of input) {
      const next = current + char;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
        current = next;
      } else {
        if (current.length > 0) {
          lines.push(current);
          current = char;
        } else {
          lines.push(char);
          current = "";
        }
      }
    }

    if (current.length > 0) {
      lines.push(current);
    }

    return lines;
  };

  for (const rawLine of reportLines) {
    const wrapped = wrapByWidth(rawLine);
    for (const line of wrapped) {
      writeLine(line);
    }
  }

  return pdfDoc.saveAsBase64();
};

const isDownloadsDirectoryUri = (uri: string) => /download/i.test(decodeURIComponent(uri));

type ProfileTabType = 'Status' | 'Settings' | 'About';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabType>('Status');

  const profileTabColors = {
    status: '#D4AF37',
    settings: '#D4AF37',
    about: '#D4AF37',
  };

  const aboutFeatures = [
    { title: 'Goals', description: 'Create short-term and long-term goals, organize priorities, and track progress clearly.' },
    { title: 'Tasks', description: 'Add daily tasks, set deadlines, and stay consistent with completion tracking.' },
    { title: 'Schedule', description: 'Plan your study day with time-based events and manage routines efficiently.' },
    { title: 'Health', description: 'Track diet, fitness, and medical records to maintain a balanced student lifestyle.' },
    { title: 'Notes', description: 'Capture quick notes, ideas, and important reminders in one organized place.' },
    { title: 'Finance', description: 'Record expenses and money goals to build better financial discipline as a student.' },
    { title: 'AI', description: 'Get instant guidance and smart suggestions to support learning, planning, and problem solving.' },
    { title: 'Calculator', description: 'Use built-in calculations quickly for study-related math, planning, and everyday needs.' },
    { title: 'Skills', description: 'Track skills you are learning and monitor step-by-step growth over time.' },
    { title: 'Placement', description: 'Manage placement preparation data, rounds, and readiness for opportunities.' },
    { title: 'Games & Streaks', description: 'Boost focus and motivation with mini games, streaks, and score tracking.' },
  ];

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

  const handleDownloadData = async () => {
    if (!email) {
      Alert.alert("Error", "Email not available");
      return;
    }

    setIsDownloading(true);
    try {
      console.log('🔍 Downloading data for user:', email);
      
      // Fetch all user data
      const userData = await downloadAllUserData(email);
      
      console.log('📊 Downloaded user data:', userData);
      
      if (!userData) {
        Alert.alert("Export Failed", "Unable to export your data. Please try again.");
        return;
      }

      // Create JSON string
      const jsonString = await createDownloadFile(userData);
      
      console.log('📝 JSON string length:', jsonString.length);
      console.log('📝 JSON preview:', jsonString.substring(0, 200));
      
      // Generate PDF from the exported JSON
      const pdfFileName = `PocketCare-${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBase64 = await createPdfBase64(jsonString, email);

      if (Platform.OS === 'android') {
        let directoryUri = await AsyncStorage.getItem(DOWNLOADS_DIRECTORY_URI_KEY);

        if (directoryUri && !isDownloadsDirectoryUri(directoryUri)) {
          directoryUri = null;
          await AsyncStorage.removeItem(DOWNLOADS_DIRECTORY_URI_KEY);
        }

        if (!directoryUri) {
          Alert.alert("Select Downloads Folder", "Select your phone's Downloads folder once. Next downloads will save there automatically.");
          const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert("Permission Required", "Please allow folder access and select your Downloads folder.");
            return;
          }

          if (!isDownloadsDirectoryUri(permission.directoryUri)) {
            Alert.alert("Wrong Folder", "Please select the Downloads folder to continue.");
            return;
          }

          directoryUri = permission.directoryUri;
          await AsyncStorage.setItem(DOWNLOADS_DIRECTORY_URI_KEY, directoryUri);
        }

        const outputUri = await FileSystem.StorageAccessFramework.createFileAsync(
          directoryUri,
          pdfFileName,
          'application/pdf'
        );

        await FileSystem.writeAsStringAsync(outputUri, pdfBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log('📋 PDF downloaded to:', outputUri);
        Alert.alert("✅ Download Complete", `PDF saved as:\n\n${pdfFileName}\n\nCheck your Downloads folder.`);
      } else {
        const localPath = `${FileSystem.documentDirectory}${pdfFileName}`;

        await FileSystem.writeAsStringAsync(localPath, pdfBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log('📋 PDF downloaded to:', localPath);
        Alert.alert("✅ Download Complete", `PDF saved as:\n\n${pdfFileName}`);
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Export Error", "Failed to export your data. Please try again.");
    } finally {
      setIsDownloading(false);
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
    tabContainer: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 18,
      padding: 6,
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(212, 175, 55, 0.1)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : 'rgba(212, 175, 55, 0.25)',
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 8,
      position: 'relative',
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.3,
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
    downloadButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#3B82F6",
      borderRadius: 16,
      paddingVertical: 11,
      paddingHorizontal: 18,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: "#1E40AF",
      shadowColor: "#3B82F6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 5,
      gap: 8,
    },
    downloadLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.4,
      fontFamily: "Roboto Slab",
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
    aboutInfoCard: {
      ...cardSystem.surface,
      marginBottom: 14,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    aboutInfoTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      fontFamily: "Roboto Slab",
    },
    aboutInfoText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
      fontWeight: "500",
    },
    aboutHighlight: {
      color: "#D4AF37",
      fontWeight: "700",
    },
    aboutFeatureRow: {
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    aboutFeatureTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    aboutFeatureText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      fontWeight: "500",
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

        <View style={dynamicStyles.tabContainer}>
          {(['Status', 'Settings', 'About'] as ProfileTabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const activeColor =
              tab === 'Status' ? profileTabColors.status :
              tab === 'Settings' ? profileTabColors.settings :
              profileTabColors.about;

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  dynamicStyles.tabButton,
                  isActive && {
                    backgroundColor: isDark ? `${activeColor}26` : `${activeColor}1A`,
                    borderWidth: 1,
                    borderColor: activeColor,
                  },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={
                    tab === 'Status' ? 'stats-chart-outline' :
                    tab === 'Settings' ? 'settings-outline' :
                    'information-circle-outline'
                  }
                  size={16}
                  color={isActive ? activeColor : colors.textSecondary}
                />
                <Text
                  style={[
                    dynamicStyles.tabButtonText,
                    isActive && { color: activeColor, fontWeight: '800' },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'Status' && (
          <>
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
          </>
        )}

        {activeTab === 'Settings' && (
          <>
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

            {/* ── Download Data ── */}
            <View style={dynamicStyles.logoutSection}>
              <TouchableOpacity
                style={[dynamicStyles.downloadButton, isDownloading && { opacity: 0.7 }]}
                onPress={handleDownloadData}
                activeOpacity={0.82}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="download" size={20} color="#FFFFFF" />
                )}
                <Text style={dynamicStyles.downloadLabel}>
                  {isDownloading ? "Downloading PDF..." : "Download Data (PDF)"}
                </Text>
              </TouchableOpacity>
            </View>

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
          </>
        )}

        {activeTab === 'About' && (
          <>
            <View style={dynamicStyles.aboutInfoCard}>
              <Text style={dynamicStyles.aboutInfoTitle}>About PocketCare</Text>
              <Text style={dynamicStyles.aboutInfoText}>
                This is the current version of PocketCare: Version Zero.
                {'\n\n'}
                From your feedback, PocketCare will be updated and improved regularly in future releases.
                {'\n\n'}
                PocketCare is developed by <Text style={dynamicStyles.aboutHighlight}>Sanjay N</Text>, a student of AI & ML,
                who analyzed student needs and designed this app to support student productivity and personal growth.
                {'\n\n'}
                Website: <Text style={dynamicStyles.aboutHighlight}>www.sanjayn.me</Text>
              </Text>
            </View>

            <View style={dynamicStyles.aboutInfoCard}>
              <Text style={dynamicStyles.aboutInfoTitle}>Features</Text>
              {aboutFeatures.map((feature, index) => (
                <View
                  key={feature.title}
                  style={[
                    dynamicStyles.aboutFeatureRow,
                    index === aboutFeatures.length - 1 && { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 },
                  ]}
                >
                  <Text style={dynamicStyles.aboutFeatureTitle}>{feature.title}:</Text>
                  <Text style={dynamicStyles.aboutFeatureText}>{feature.description}</Text>
                </View>
              ))}
            </View>

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
          </>
        )}
      </ScrollView>

      {showMemoryGame && <MemoryGameComponent onClose={handleGameClose} />}
      {showTapGame && <TapGameComponent onClose={handleGameClose} />}
    </SafeAreaView>
  );
};

export default ProfileScreen;
