
import { getCardSystem } from '@/constants/card-system';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalculationEntry,
  CalculationHistoryGroup,
  CalculationType,
  createOrAppendCalculation,
  deleteCalculationEntry,
  deleteCalculationHistory,
  getCalculationHistory,
  updateCalculationHistoryTitle,
} from '../../lib/calculator-service';


type Result = {
  interest: number;
  totalAmount: number;
};

export default function CalculatorScreen() {
  const { user } = useUser();
  const router = useRouter();
  const email = user?.primaryEmailAddress?.emailAddress;

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const cardSystem = getCardSystem(colors, isDark)
  
  // Multi-color palette for premium feel
  const uiColors = {
    primary: '#3B82F6',   // Blue for Basic
    secondary: '#EF4444', // Red for Interest
    tertiary: '#10B981',  // Green for History
    accent: '#D4AF37',    // Amber for highlights
  }
  
  const backButtonScale = useRef(new Animated.Value(1)).current
  const [fontsLoaded] = useFonts({
    'Roboto Slab': require('../../assets/Font/RobotoSlab-VariableFont_wght.ttf'),
  })

  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'interest' | 'history'>('basic');

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(backButtonScale, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(backButtonScale, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [backButtonScale])

  // Interest Calculator States
  const [calcType, setCalcType] = useState<CalculationType>('simple_interest');
  const [title, setTitle] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [time, setTime] = useState('');
  const [compoundsPerYear, setCompoundsPerYear] = useState('1');

  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [histories, setHistories] = useState<CalculationHistoryGroup[]>([]);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState('');
  const [renameTitle, setRenameTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Basic Calculator States
  const [basicExpression, setBasicExpression] = useState('');
  const [basicResult, setBasicResult] = useState<number | null>(null);
  const [basicTitle, setBasicTitle] = useState('');
  const [basicHistories, setBasicHistories] = useState<CalculationHistoryGroup[]>([]);
  const [basicSaving, setBasicSaving] = useState(false);

  // Filter states
  const [historyFilterType, setHistoryFilterType] = useState<'all' | 'simple_interest' | 'compound_interest' | 'basic_calculation'>('all');
  const [historyFilterDate, setHistoryFilterDate] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [filterDate, setFilterDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    loadHistory();
    loadBasicHistory();
  }, [email]);

  const loadHistory = async () => {
    if (!email) return;
    try {
      const fetched = await getCalculationHistory(email);
      fetched.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setHistories(fetched);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadBasicHistory = async () => {
    if (!email) return;
    try {
      const fetched = await getCalculationHistory(email);
      const basicOnly = fetched.filter((group) => group.entries.some((entry) => (entry.type as any) === 'basic_calculation'));
      basicOnly.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setBasicHistories(basicOnly);
    } catch (error) {
      console.error(error);
    }
  };

  const parsedInputs = useMemo(() => {
    const p = Number(principal);
    const r = Number(rate);
    const t = Number(time);
    const n = Number(compoundsPerYear);
    return { p, r, t, n };
  }, [principal, rate, time, compoundsPerYear]);

  const interestHistories = useMemo(() => {
    return histories.filter((group) => !group.entries.some((entry) => (entry.type as any) === 'basic_calculation'));
  }, [histories]);

  const allCombinedHistories = useMemo(() => {
    const combined = histories.filter((group) => {
      // Filter by calculation type
      if (historyFilterType !== 'all') {
        const groupType = group.entries[0]?.type;
        if (groupType !== historyFilterType) return false;
      }

      // Filter by date
      if (historyFilterDate !== 'all') {
        const groupDate = new Date(group.updated_at);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const groupDay = new Date(groupDate.getFullYear(), groupDate.getMonth(), groupDate.getDate());

        if (historyFilterDate === 'today') {
          if (groupDay.getTime() !== today.getTime()) return false;
        } else if (historyFilterDate === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (groupDay < weekAgo) return false;
        } else if (historyFilterDate === 'custom') {
          if (filterDate) {
            const selectedDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
            if (groupDay.getTime() !== selectedDay.getTime()) return false;
          }
        }
      }

      return true;
    });
    combined.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return combined;
  }, [histories, historyFilterType, historyFilterDate, filterDate]);

  const filteredHistories = useMemo(() => {
    return interestHistories.filter((group) => {
      // Filter by calculation type
      if (historyFilterType !== 'all') {
        const groupType = group.entries[0]?.type;
        if (groupType !== historyFilterType) return false;
      }

      // Filter by date
      if (historyFilterDate !== 'all') {
        const groupDate = new Date(group.updated_at);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const groupDay = new Date(groupDate.getFullYear(), groupDate.getMonth(), groupDate.getDate());

        if (historyFilterDate === 'today') {
          if (groupDay.getTime() !== today.getTime()) return false;
        } else if (historyFilterDate === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (groupDay < weekAgo) return false;
        }
      }

      return true;
    });
  }, [interestHistories, historyFilterType, historyFilterDate]);

  const handleCalculateAndSave = async () => {
    if (!email) {
      Alert.alert('Authentication Error', 'Please log in first.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title Required', 'Please enter a title. Calculations are grouped by title.');
      return;
    }

    const { p, r, t, n } = parsedInputs;
    if (![p, r, t].every((value) => Number.isFinite(value))) {
      Alert.alert('Invalid Input', 'Principal, Rate and Time must be numbers.');
      return;
    }
    if (p < 0 || r < 0 || t < 0) {
      Alert.alert('Invalid Input', 'Values cannot be negative.');
      return;
    }

    let interest = 0;
    let totalAmount = 0;

    if (calcType === 'simple_interest') {
      interest = (p * r * t) / 100;
      totalAmount = p + interest;
    } else {
      if (!Number.isFinite(n) || n <= 0) {
        Alert.alert('Invalid Input', 'Compounds per year must be greater than 0.');
        return;
      }
      totalAmount = p * Math.pow(1 + r / (100 * n), n * t);
      interest = totalAmount - p;
    }

    const roundedInterest = Number(interest.toFixed(2));
    const roundedTotal = Number(totalAmount.toFixed(2));
    setResult({ interest: roundedInterest, totalAmount: roundedTotal });

    setSaving(true);
    try {
      const ok = await createOrAppendCalculation(email, trimmedTitle, {
        type: calcType,
        principal: p,
        rate: r,
        time: t,
        compounds_per_year: calcType === 'compound_interest' ? n : undefined,
        interest: roundedInterest,
        total_amount: roundedTotal,
      });

      if (!ok) {
        Alert.alert('Error', 'Failed to save calculation history.');
        return;
      }

      await loadHistory();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save calculation history.');
    } finally {
      setSaving(false);
    }
  };

  const handleRenameGroup = (group: CalculationHistoryGroup) => {
    setRenameTargetId(group.id);
    setRenameTitle(group.title);
    setRenameVisible(true);
  };

  const handleSaveRename = async () => {
    if (!email || !renameTargetId) return;

    const nextTitle = renameTitle.trim();
    if (!nextTitle) {
      Alert.alert('Title Required', 'Please enter a title.');
      return;
    }

    setRenaming(true);
    try {
      const ok = await updateCalculationHistoryTitle(email, renameTargetId, nextTitle);
      if (!ok) {
        Alert.alert('Error', 'Could not update title.');
        return;
      }
      setRenameVisible(false);
      setRenameTargetId('');
      setRenameTitle('');
      loadHistory();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not update title.');
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteGroup = (group: CalculationHistoryGroup) => {
    if (!email) return;
    Alert.alert('Delete History', `Delete "${group.title}" and all its calculations?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteCalculationHistory(email, group.id);
          if (!ok) {
            Alert.alert('Error', 'Could not delete history.');
            return;
          }
          loadHistory();
          loadBasicHistory();
        },
      },
    ]);
  };

  const handleDeleteEntry = (groupId: string, entry: CalculationEntry) => {
    if (!email) return;
    Alert.alert('Delete Calculation', 'Delete this calculation entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteCalculationEntry(email, groupId, entry.id);
          if (!ok) {
            Alert.alert('Error', 'Could not delete entry.');
            return;
          }
          loadHistory();
          loadBasicHistory();
        },
      },
    ]);
  };

  const handleDeleteBasicGroup = (group: CalculationHistoryGroup) => {
    if (!email) return;
    Alert.alert('Delete History', `Delete "${group.title}" and all its calculations?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteCalculationHistory(email, group.id);
          if (!ok) {
            Alert.alert('Error', 'Could not delete history.');
            return;
          }
          loadBasicHistory();
        },
      },
    ]);
  };

  const handleBasicCalculation = async () => {
    const expression = basicExpression.trim();

    if (!expression) {
      Alert.alert('Invalid Input', 'Enter an expression to calculate.');
      return;
    }

    // Allow only numbers, decimal point, parentheses, spaces, and arithmetic operators.
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      Alert.alert('Invalid Input', 'Expression can only contain numbers and + - * / operators.');
      return;
    }

    try {
      // Replace ^ with ** for power operations
      let processedExpression = expression.replace(/\^/g, '**');
      
      // Handle sqrt function
      processedExpression = processedExpression.replace(/sqrt\(/g, 'Math.sqrt(');
      
      // Create a scope with Math functions for safer evaluation
      const mathScope = {
        Math: Math,
        sqrt: Math.sqrt,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        log10: Math.log10,
        log: Math.log,
        ln: Math.log,
        abs: Math.abs,
        pow: Math.pow,
      };
      
      const output = Function(...Object.keys(mathScope), `"use strict"; return (${processedExpression})`)(
        ...Object.values(mathScope)
      );

      if (!Number.isFinite(output)) {
        Alert.alert('Invalid Operation', 'Please check your expression.');
        return;
      }

      const result = Number(output.toFixed(4));
      setBasicResult(result);

      // SAVE TO FIREBASE
      if (email) {
        setBasicSaving(true);
        try {
          const trimmedTitle = basicTitle.trim() || 'General Calculation';
          await createOrAppendCalculation(email, trimmedTitle, {
            type: 'basic_calculation' as any,
            expression: expression,
            total_amount: result,
            principal: 0,
            rate: 0,
            time: 0,
            interest: 0,
          });
          await loadHistory();
          await loadBasicHistory();
        } catch (error) {
          console.error('Failed to save basic calculation:', error);
        } finally {
          setBasicSaving(false);
        }
      }
    } catch {
      Alert.alert('Invalid Expression', 'Please enter a valid arithmetic expression.');
    }
  };

  const appendToExpression = (value: string) => {
    setBasicExpression((prev) => prev + value);
  };

  const clearExpression = () => {
    setBasicExpression('');
    setBasicTitle('');
    setBasicResult(null);
  };

  const backspaceExpression = () => {
    setBasicExpression((prev) => prev.slice(0, -1));
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#D4AF37',
      borderWidth: 1.5,
      borderColor: '#D4AF37',
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    headerArea: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 12 : 20,
      paddingBottom: 20,
      overflow: 'hidden',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      marginBottom: 0,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    pageTitle: {
      fontSize: 24, // Main Heading (H1)
      fontFamily: 'Roboto Slab',
      color: isDark ? '#FFFFFF' : '#000000',
      letterSpacing: -0.5,
    },
    pageSubTitle: {
      marginTop: 2,
      fontSize: 12, // Small Text
      color: colors.textSecondary,
      fontWeight: '500',
    },
    
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
    tab: {
      flex: 1,
      flexDirection: 'column',
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    tabActive: {
      // Background removed for a cleaner look with the underline
    },
    tabText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    tabTextActiveBasic: {
      color: '#3B82F6',
      fontWeight: '900',
    },
    tabTextActiveInterest: {
      color: '#EF4444',
      fontWeight: '900',
    },
    tabTextActiveHistory: {
      color: '#10B981',
      fontWeight: '900',
    },
    activeIndicatorBasic: {
      position: 'absolute',
      bottom: -8,
      width: '60%',
      height: 3,
      backgroundColor: '#3B82F6',
      borderRadius: 2,
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
    },
    activeIndicatorInterest: {
      position: 'absolute',
      bottom: -8,
      width: '60%',
      height: 3,
      backgroundColor: '#EF4444',
      borderRadius: 2,
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
    },
    activeIndicatorHistory: {
      position: 'absolute',
      bottom: -8,
      width: '60%',
      height: 3,
      backgroundColor: '#10B981',
      borderRadius: 2,
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
    },

    // Section Titles
    sectionTitle: {
      fontSize: 20, // H2
      fontFamily: 'Roboto Slab',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14, // Secondary Text
      color: colors.textSecondary,
      fontWeight: '400',
      marginBottom: 20,
    },
    interestFormTitle: {
      fontSize: 18, // H3
      fontFamily: 'Roboto Slab',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },

    // Basic Calculator Wrapper
    basicCalculatorWrapper: {
      paddingHorizontal: 0,
    },

    listContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: 120,
    },
    formCard: {
      ...cardSystem.surface,
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
      alignItems: 'center',
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBtnActive: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      borderColor: '#EF4444',
    },
    segmentBtnText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    segmentBtnTextActive: {
      color: isDark ? '#EF4444' : '#DC2626',
      fontWeight: '700',
    },
    input: {
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : '#FFFFFF',
    },
    calculateBtn: {
      marginTop: 8,
      backgroundColor: '#EF4444',
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    calculateBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 16,
    },
    resultCard: {
      ...cardSystem.subtleSurface,
      marginTop: 20,
      padding: 16,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    resultLabel: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '700',
    },
    resultValue: {
      marginTop: 2,
      fontSize: 20,
      color: colors.primary,
      fontWeight: '800',
    },
    operatorRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    operatorBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    operatorBtnText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    equalsBtn: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
    },
    equalsBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    clearBtn: {
      backgroundColor: '#3B82F6',
      borderColor: '#3B82F6',
      flexDirection: 'row',
    },
    deleteBtn: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#000000',
      borderColor: isDark ? '#3B82F6' : '#000000',
      flexDirection: 'row',
    },
    utilityBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
    basicResultWrap: {
      marginTop: 20,
      borderRadius: 20,
      padding: 16,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    basicResultLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#3B82F6',
    },
    basicResultValue: {
      marginTop: 4,
      fontSize: 28,
      fontFamily: 'Roboto Slab',
      fontWeight: '700',
      color: '#3B82F6',
    },
    historyCard: {
      ...cardSystem.surface,
      marginBottom: 16,
      padding: 16,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: isDark ? '#10B981' : '#059669',
    },
    historyMeta: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    iconBtn: {
      padding: 6,
      marginLeft: 6,
    },
    entryRow: {
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      paddingTop: 12,
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    entryType: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#10B981' : '#059669',
    },
    entryText: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '400',
    },
    entryResult: {
      marginTop: 4,
      fontSize: 14,
      color: colors.text,
      fontWeight: '700',
    },
    centerWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      marginTop: 10,
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      ...cardSystem.subtleSurface,
      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Roboto Slab',
      color: isDark ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 8,
    },
    modalCancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
    modalCancelText: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    modalSaveBtn: {
      backgroundColor: '#3B82F6',
      borderRadius: 14,
      paddingHorizontal: 20,
      paddingVertical: 12,
      minWidth: 90,
      alignItems: 'center',
    },
    modalSaveText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    filterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 16,
      marginBottom: 12,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    filterBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    filterBtnActive: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      borderColor: '#10B981',
    },
    filterBtnText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    filterBtnTextActive: {
      color: isDark ? '#10B981' : '#059669',
      fontWeight: '700',
    },
    customDateContainer: {
      marginTop: 12,
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    dateInputBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    dateInputBtnText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
      flex: 1,
    },
    datePickerIOSContainer: {
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderRadius: 16,
      overflow: 'hidden',
      marginHorizontal: 16,
      marginBottom: 16,
    },
    datePickerModal: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 0,
      paddingVertical: 0,
      overflow: 'hidden',
      marginHorizontal: 16,
      marginBottom: 16,
    },
    datePickerHeader: {
      backgroundColor: colors.card,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    datePickerHeaderText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    datePickerCloseBtn: {
      paddingHorizontal: 12,
    },
    datePickerCloseBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    datePickerFooter: {
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    datePickerCancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    datePickerCancelText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '700',
    },
    datePickerConfirmBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 20,
      paddingVertical: 10,
      alignItems: 'center',
    },
    datePickerConfirmText: {
      color: colors.card,
      fontWeight: '700',
    },
  });

  const renderHistoryGroup = ({ item }: { item: CalculationHistoryGroup }) => {
    const isBasicCalc = item.entries[0]?.type === ('basic_calculation' as any);

    return (
      <View style={dynamicStyles.historyCard}>
        <View style={dynamicStyles.historyHeader}>
          <View style={{ flex: 1 }}>
            <Text style={dynamicStyles.historyTitle}>{item.title}</Text>
            <Text style={dynamicStyles.historyMeta}>{item.entries.length} calculation(s)</Text>
          </View>

          <TouchableOpacity style={dynamicStyles.iconBtn} onPress={() => handleRenameGroup(item)}>
            <Ionicons name="create-outline" size={18} color="#D4AF37" />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.iconBtn}
            onPress={() => isBasicCalc ? handleDeleteBasicGroup(item) : handleDeleteGroup(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {(item.entries || []).map((entry) => (
          <View key={entry.id} style={dynamicStyles.entryRow}>
            <View style={{ flex: 1 }}>
              {isBasicCalc ? (
                <>
                  <Text style={dynamicStyles.entryType}>Basic Calculation</Text>
                  <Text style={dynamicStyles.entryText}>{(entry as any).expression || 'N/A'}</Text>
                  <Text style={dynamicStyles.entryResult}>Result: {entry.total_amount}</Text>
                </>
              ) : (
                <>
                  <Text style={dynamicStyles.entryType}>
                    {entry.type === 'simple_interest' ? 'Simple Interest' : 'Compound Interest'}
                  </Text>
                  <Text style={dynamicStyles.entryText}>
                    P: {entry.principal} | R: {entry.rate}% | T: {entry.time}y
                    {entry.type === 'compound_interest' && entry.compounds_per_year
                      ? ` | N: ${entry.compounds_per_year}`
                      : ''}
                  </Text>
                  <Text style={dynamicStyles.entryResult}>Interest: {entry.interest} | Total: {entry.total_amount}</Text>
                </>
              )}
            </View>

            <TouchableOpacity onPress={() => handleDeleteEntry(item.id, entry)}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <View style={dynamicStyles.headerArea}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={dynamicStyles.headerRow}>
            <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.replace('/(tabs)')}>
              <Ionicons name="chevron-back" size={22} color={isDark ? "#000000" : "#FFFFFF"} />
            </TouchableOpacity>
            <View>
              <Text style={dynamicStyles.pageTitle}>Calculator</Text>
              <Text style={dynamicStyles.pageSubTitle}>Basic and financial calculations</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={dynamicStyles.tabContainer}>
          <TouchableOpacity
            style={[dynamicStyles.tab, activeTab === 'basic' && dynamicStyles.tabActive]}
            onPress={() => setActiveTab('basic')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="calculator-outline"
                size={18}
                color={activeTab === 'basic' ? '#3B82F6' : '#64748B'}
                style={{ marginRight: 8 }}
              />
              <Text style={[dynamicStyles.tabText, activeTab === 'basic' && dynamicStyles.tabTextActiveBasic, { marginBottom: 0 }]}>
                Basic
              </Text>
            </View>
            {activeTab === 'basic' && <View style={dynamicStyles.activeIndicatorBasic} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.tab, activeTab === 'interest' && dynamicStyles.tabActive]}
            onPress={() => setActiveTab('interest')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="trending-up-outline"
                size={18}
                color={activeTab === 'interest' ? '#EF4444' : '#64748B'}
                style={{ marginRight: 8 }}
              />
              <Text style={[dynamicStyles.tabText, activeTab === 'interest' && dynamicStyles.tabTextActiveInterest, { marginBottom: 0 }]}>
                Interest (SI/CI)
              </Text>
            </View>
            {activeTab === 'interest' && <View style={dynamicStyles.activeIndicatorInterest} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[dynamicStyles.tab, activeTab === 'history' && dynamicStyles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="list-outline"
                size={18}
                color={activeTab === 'history' ? '#10B981' : '#64748B'}
                style={{ marginRight: 8 }}
              />
              <Text style={[dynamicStyles.tabText, activeTab === 'history' && dynamicStyles.tabTextActiveHistory, { marginBottom: 0 }]}>
                History
              </Text>
            </View>
            {activeTab === 'history' && <View style={dynamicStyles.activeIndicatorHistory} />}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >

      {/* Basic Calculator Tab */}
      {activeTab === 'basic' && (
        <FlatList
          data={[]}
          keyExtractor={() => 'basic'}
          renderItem={() => null}
          contentContainerStyle={dynamicStyles.listContent}
          ListHeaderComponent={
            <View style={dynamicStyles.basicCalculatorWrapper}>
              <Text style={dynamicStyles.sectionTitle}>Basic Calculator</Text>
              <Text style={dynamicStyles.sectionSubtitle}>Perform quick arithmetic calculations</Text>

              <View style={dynamicStyles.formCard}>
                <TextInput
                  style={dynamicStyles.input}
                  value={basicTitle}
                  onChangeText={setBasicTitle}
                  placeholder="Topic (e.g., Grocery)"
                  placeholderTextColor="#94A3B8"
                />

                <TextInput
                  style={dynamicStyles.input}
                  value={basicExpression}
                  onChangeText={setBasicExpression}
                  placeholder="Enter calculation (e.g., 500+200)"
                  placeholderTextColor="#94A3B8"
                />

                <View style={dynamicStyles.operatorRow}>
                  {['7', '8', '9', '/'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={dynamicStyles.operatorBtn}
                      onPress={() => appendToExpression(token)}
                    >
                      <Text style={dynamicStyles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={dynamicStyles.operatorRow}>
                  {['4', '5', '6', '*'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={dynamicStyles.operatorBtn}
                      onPress={() => appendToExpression(token)}
                    >
                      <Text style={dynamicStyles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={dynamicStyles.operatorRow}>
                  {['1', '2', '3', '-'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={dynamicStyles.operatorBtn}
                      onPress={() => appendToExpression(token)}
                    >
                      <Text style={dynamicStyles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={dynamicStyles.operatorRow}>
                  {['0', '.', '+'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={dynamicStyles.operatorBtn}
                      onPress={() => appendToExpression(token)}
                    >
                      <Text style={dynamicStyles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity style={[dynamicStyles.operatorBtn, dynamicStyles.equalsBtn]} onPress={handleBasicCalculation} disabled={basicSaving}>
                    <Text style={[dynamicStyles.operatorBtnText, dynamicStyles.equalsBtnText]}>=</Text>
                  </TouchableOpacity>
                </View>

                <View style={dynamicStyles.operatorRow}>
                  {['(', ')'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={dynamicStyles.operatorBtn}
                      onPress={() => appendToExpression(token)}
                    >
                      <Text style={dynamicStyles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity style={[dynamicStyles.operatorBtn, dynamicStyles.clearBtn]} onPress={clearExpression}>
                    <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={[dynamicStyles.utilityBtnText, { color: '#FFFFFF' }]}>Clear</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[dynamicStyles.operatorBtn, dynamicStyles.deleteBtn]} onPress={backspaceExpression}>
                    <Ionicons name="backspace-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={[dynamicStyles.utilityBtnText, { color: '#FFFFFF' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <View style={dynamicStyles.operatorRow}>
                  {['π', 'x²', '√', '^', '%'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={dynamicStyles.operatorBtn}
                      onPress={() => {
                        if (token === 'π') {
                          appendToExpression(Math.PI.toString());
                        } else if (token === 'x²') {
                          appendToExpression('**2');
                        } else if (token === '√') {
                          appendToExpression('sqrt(');
                        } else if (token === '^') {
                          appendToExpression('^');
                        } else if (token === '%') {
                          appendToExpression('%');
                        }
                      }}
                    >
                      <Text style={dynamicStyles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {basicResult !== null && (
                  <View style={dynamicStyles.basicResultWrap}>
                    <Text style={dynamicStyles.basicResultLabel}>Result</Text>
                    <Text style={dynamicStyles.basicResultValue}>{basicResult}</Text>
                  </View>
                )}
              </View>
            </View>
          }
        />
      )}

      {/* Interest Calculator Tab */}
      {activeTab === 'interest' && (
        <FlatList
          data={[]}
          keyExtractor={() => 'interest'}
          renderItem={() => null}
          contentContainerStyle={dynamicStyles.listContent}
          ListHeaderComponent={
            <View>
              <View style={dynamicStyles.formCard}>
                <Text style={dynamicStyles.interestFormTitle}>Calculate Interest</Text>
                
                <View style={dynamicStyles.segmentRow}>
                  <TouchableOpacity
                    style={[dynamicStyles.segmentBtn, calcType === 'simple_interest' && dynamicStyles.segmentBtnActive]}
                    onPress={() => setCalcType('simple_interest')}
                  >
                    <Text
                      style={[
                        dynamicStyles.segmentBtnText,
                        calcType === 'simple_interest' && dynamicStyles.segmentBtnTextActive,
                      ]}
                    >
                      Simple Interest
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[dynamicStyles.segmentBtn, calcType === 'compound_interest' && dynamicStyles.segmentBtnActive]}
                    onPress={() => setCalcType('compound_interest')}
                  >
                    <Text
                      style={[
                        dynamicStyles.segmentBtnText,
                        calcType === 'compound_interest' && dynamicStyles.segmentBtnTextActive,
                      ]}
                    >
                      Compound Interest
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={dynamicStyles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="History Title (Example: Home Loan)"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={dynamicStyles.input}
                  value={principal}
                  onChangeText={setPrincipal}
                  keyboardType="numeric"
                  placeholder="Principal Amount"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={dynamicStyles.input}
                  value={rate}
                  onChangeText={setRate}
                  keyboardType="numeric"
                  placeholder="Rate (% per year)"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={dynamicStyles.input}
                  value={time}
                  onChangeText={setTime}
                  keyboardType="numeric"
                  placeholder="Time (years)"
                  placeholderTextColor="#94A3B8"
                />

                {calcType === 'compound_interest' && (
                  <TextInput
                    style={dynamicStyles.input}
                    value={compoundsPerYear}
                    onChangeText={setCompoundsPerYear}
                    keyboardType="numeric"
                    placeholder="Compounds Per Year (N)"
                    placeholderTextColor="#94A3B8"
                  />
                )}

                <TouchableOpacity style={dynamicStyles.calculateBtn} onPress={handleCalculateAndSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={dynamicStyles.calculateBtnText}>Calculate & Save</Text>
                  )}
                </TouchableOpacity>

                {result && (
                  <View style={dynamicStyles.resultCard}>
                    <Text style={dynamicStyles.resultLabel}>Interest</Text>
                    <Text style={dynamicStyles.resultValue}>{result.interest.toFixed(2)}</Text>

                    <Text style={[dynamicStyles.resultLabel, { marginTop: 8 }]}>Total Amount</Text>
                    <Text style={dynamicStyles.resultValue}>{result.totalAmount.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            </View>
          }
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <FlatList
          data={allCombinedHistories}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryGroup}
          contentContainerStyle={dynamicStyles.listContent}
          ListHeaderComponent={
            <View>
              <Text style={dynamicStyles.sectionTitle}>All Calculation History</Text>
              <Text style={dynamicStyles.sectionSubtitle}>View all your calculations in one place</Text>

              {/* Filter by Type */}
              <View style={dynamicStyles.filterContainer}>
                <Text style={dynamicStyles.filterLabel}>Filter by Type</Text>
                <View style={dynamicStyles.filterRow}>
                  <TouchableOpacity
                    style={[
                      dynamicStyles.filterBtn,
                      historyFilterType === 'all' && dynamicStyles.filterBtnActive,
                    ]}
                    onPress={() => setHistoryFilterType('all')}
                  >
                    <Text
                      style={[
                        dynamicStyles.filterBtnText,
                        historyFilterType === 'all' && dynamicStyles.filterBtnTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      dynamicStyles.filterBtn,
                      historyFilterType === 'basic_calculation' && dynamicStyles.filterBtnActive,
                    ]}
                    onPress={() => setHistoryFilterType('basic_calculation')}
                  >
                    <Text
                      style={[
                        dynamicStyles.filterBtnText,
                        historyFilterType === 'basic_calculation' && dynamicStyles.filterBtnTextActive,
                      ]}
                    >
                      Basic
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      dynamicStyles.filterBtn,
                      historyFilterType === 'simple_interest' && dynamicStyles.filterBtnActive,
                    ]}
                    onPress={() => setHistoryFilterType('simple_interest')}
                  >
                    <Text
                      style={[
                        dynamicStyles.filterBtnText,
                        historyFilterType === 'simple_interest' && dynamicStyles.filterBtnTextActive,
                      ]}
                    >
                      Simple
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      dynamicStyles.filterBtn,
                      historyFilterType === 'compound_interest' && dynamicStyles.filterBtnActive,
                    ]}
                    onPress={() => setHistoryFilterType('compound_interest')}
                  >
                    <Text
                      style={[
                        dynamicStyles.filterBtnText,
                        historyFilterType === 'compound_interest' && dynamicStyles.filterBtnTextActive,
                      ]}
                    >
                      Compound
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Filter by Date */}
                <Text style={[dynamicStyles.filterLabel, { marginTop: 12 }]}>Filter by Date</Text>
                <View style={dynamicStyles.filterRow}>
                  <TouchableOpacity
                    style={[
                      dynamicStyles.filterBtn,
                      historyFilterDate === 'all' && dynamicStyles.filterBtnActive,
                    ]}
                    onPress={() => {
                      setHistoryFilterDate('all');
                    }}
                  >
                    <Text
                      style={[
                        dynamicStyles.filterBtnText,
                        historyFilterDate === 'all' && dynamicStyles.filterBtnTextActive,
                      ]}
                    >
                      All Time
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      dynamicStyles.filterBtn,
                      historyFilterDate === 'today' && dynamicStyles.filterBtnActive,
                    ]}
                    onPress={() => {
                      setHistoryFilterDate('today');
                    }}
                  >
                    <Text
                      style={[
                        dynamicStyles.filterBtnText,
                        historyFilterDate === 'today' && dynamicStyles.filterBtnTextActive,
                      ]}
                    >
                      Today
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      dynamicStyles.filterBtn,
                      historyFilterDate === 'week' && dynamicStyles.filterBtnActive,
                    ]}
                    onPress={() => {
                      setHistoryFilterDate('week');
                    }}
                  >
                    <Text
                      style={[
                        dynamicStyles.filterBtnText,
                        historyFilterDate === 'week' && dynamicStyles.filterBtnTextActive,
                      ]}
                    >
                      Week
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      dynamicStyles.filterBtn,
                      historyFilterDate === 'custom' && dynamicStyles.filterBtnActive,
                    ]}
                    onPress={() => {
                      setHistoryFilterDate('custom');
                      setShowDatePicker(true);
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={historyFilterDate === 'custom' ? (isDark ? '#D4AF37' : '#D4AF37') : '#64748B'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        dynamicStyles.filterBtnText,
                        historyFilterDate === 'custom' && dynamicStyles.filterBtnTextActive,
                      ]}
                    >
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Date picker will open when Custom is tapped */}
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={dynamicStyles.centerWrap}>
                <ActivityIndicator size="large" color="#1D4ED8" />
              </View>
            ) : (
              <View style={dynamicStyles.centerWrap}>
                <Ionicons name="document-text-outline" size={56} color="#CBD5E1" />
                <Text style={dynamicStyles.emptyText}>No calculation history yet.</Text>
              </View>
            )
          }
        />
      )}

      <Modal
        visible={renameVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRenameVisible(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalCard}>
            <Text style={dynamicStyles.modalTitle}>Rename History Title</Text>
            <TextInput
              style={dynamicStyles.input}
              value={renameTitle}
              onChangeText={setRenameTitle}
              placeholder="Enter title"
              placeholderTextColor="#94A3B8"
              autoFocus
            />

            <View style={dynamicStyles.modalActions}>
              <TouchableOpacity style={dynamicStyles.modalCancelBtn} onPress={() => setRenameVisible(false)}>
                <Text style={dynamicStyles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={dynamicStyles.modalSaveBtn} onPress={handleSaveRename} disabled={renaming}>
                {renaming ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={dynamicStyles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && Platform.OS === 'ios' && (
        <View style={dynamicStyles.datePickerIOSContainer}>
          <DateTimePicker
            value={filterDate}
            mode="date"
            display="spinner"
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              if (date) {
                setFilterDate(date);
                setHistoryFilterDate('custom');
              }
            }}
            textColor="#0F172A"
          />
        </View>
      )}

      {showDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={filterDate}
          mode="date"
          display="default"
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShowDatePicker(false);
            if (date) {
              setFilterDate(date);
              setHistoryFilterDate('custom');
            }
          }}
        />
      )}


        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}


