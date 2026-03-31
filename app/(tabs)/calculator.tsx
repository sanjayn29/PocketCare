
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
  const email = user?.primaryEmailAddress?.emailAddress;

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)

  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'interest' | 'history'>('basic');

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

      // Save to history
      if (email) {
        const title = basicTitle.trim();
        if (!title) {
          Alert.alert('Title Required', 'Please enter a topic/title for this calculation.');
          return;
        }

        setBasicSaving(true);
        try {
          const ok = await createOrAppendCalculation(email, title, {
            type: 'basic_calculation' as any,
            principal: 0,
            rate: 0,
            time: 0,
            interest: 0,
            total_amount: result,
            expression: expression,
          } as any);

          if (ok) {
            await loadBasicHistory();
            setBasicTitle('');
            setBasicExpression('');
            setBasicResult(null);
            Alert.alert('Success', 'Calculation saved!');
          }
        } catch (error) {
          console.error(error);
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
    headerArea: {
      paddingHorizontal: 20,
      marginTop: 16,
      marginBottom: 12,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
    },
    pageSubTitle: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    
    // Tab Navigation Styles
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    tabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.card,
    },

    // Section Titles
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
      marginBottom: 12,
    },
    interestFormTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 12,
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
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 14,
      alignItems: 'center',
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    segmentBtnText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '700',
    },
    segmentBtnTextActive: {
      color: colors.card,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      marginBottom: 10,
      backgroundColor: colors.card,
    },
    calculateBtn: {
      marginTop: 4,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    calculateBtnText: {
      color: colors.card,
      fontWeight: '800',
      fontSize: 15,
    },
    resultCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
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
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    operatorBtnText: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    equalsBtn: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    equalsBtnText: {
      color: colors.card,
    },
    clearBtn: {
      backgroundColor: colors.danger,
      borderColor: colors.danger,
      flexDirection: 'row',
    },
    deleteBtn: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
      flexDirection: 'row',
    },
    utilityBtnText: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 13,
    },
    basicResultWrap: {
      marginTop: 12,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    basicResultLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.success,
    },
    basicResultValue: {
      marginTop: 4,
      fontSize: 24,
      fontWeight: '800',
      color: colors.success,
    },
    historyCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
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
      borderTopColor: colors.background,
      paddingTop: 10,
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    entryType: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    entryText: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    entryResult: {
      marginTop: 2,
      fontSize: 12,
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
      backgroundColor: 'rgba(2, 6, 23, 0.35)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 10,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    modalCancelBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    modalCancelText: {
      color: colors.textSecondary,
      fontWeight: '700',
    },
    modalSaveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      minWidth: 84,
      alignItems: 'center',
    },
    modalSaveText: {
      color: colors.card,
      fontWeight: '700',
    },
    filterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 4,
    },
    filterLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    filterBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    filterBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterBtnText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    filterBtnTextActive: {
      color: colors.card,
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
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.iconBtn}
            onPress={() => isBasicCalc ? handleDeleteBasicGroup(item) : handleDeleteGroup(item)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
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
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={dynamicStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={dynamicStyles.headerArea}>
        <Text style={dynamicStyles.pageTitle}>Calculator</Text>
        <Text style={dynamicStyles.pageSubTitle}>Simple & Compound Interest or Basic Calculations</Text>
      </View>

      {/* Tab Navigation */}
      <View style={dynamicStyles.tabContainer}>
        <TouchableOpacity
          style={[dynamicStyles.tab, activeTab === 'basic' && dynamicStyles.tabActive]}
          onPress={() => setActiveTab('basic')}
        >
          <Ionicons
            name="calculator-outline"
            size={18}
            color={activeTab === 'basic' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 8 }}
          />
          <Text style={[dynamicStyles.tabText, activeTab === 'basic' && dynamicStyles.tabTextActive]}>
            Basic
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.tab, activeTab === 'interest' && dynamicStyles.tabActive]}
          onPress={() => setActiveTab('interest')}
        >
          <Ionicons
            name="trending-up-outline"
            size={18}
            color={activeTab === 'interest' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 8 }}
          />
          <Text style={[dynamicStyles.tabText, activeTab === 'interest' && dynamicStyles.tabTextActive]}>
            Interest (SI/CI)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.tab, activeTab === 'history' && dynamicStyles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color={activeTab === 'history' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 8 }}
          />
          <Text style={[dynamicStyles.tabText, activeTab === 'history' && dynamicStyles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

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
                  placeholder="Topic/Title (Example: Monthly Expenses)"
                  placeholderTextColor="#94A3B8"
                />

                <TextInput
                  style={dynamicStyles.input}
                  value={basicExpression}
                  onChangeText={setBasicExpression}
                  placeholder="Enter expression (Example: 25+5*2-10/2)"
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

                <View style={dynamicStyles.operatorRow}>
                  {['log', 'sin', 'cos', 'tan', '1/x'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={dynamicStyles.operatorBtn}
                      onPress={() => {
                        if (token === 'log') {
                          appendToExpression('Math.log10(');
                        } else if (token === 'sin') {
                          appendToExpression('Math.sin(');
                        } else if (token === 'cos') {
                          appendToExpression('Math.cos(');
                        } else if (token === 'tan') {
                          appendToExpression('Math.tan(');
                        } else if (token === '1/x') {
                          appendToExpression('1/');
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
              </View>

              {/* Filter by Date */}
              <View style={dynamicStyles.filterContainer}>
                <Text style={dynamicStyles.filterLabel}>Filter by Date</Text>
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
                      color={historyFilterDate === 'custom' ? '#FFFFFF' : '#64748B'}
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
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
  );
}

