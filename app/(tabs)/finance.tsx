import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal, Platform, ScrollView,
  StyleSheet,
  Switch, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  addDebt,
  addFinanceGoal,
  addTransaction,
  Debt,
  DebtInterestType,
  deleteDebt,
  deleteFinanceGoal,
  deleteTransaction,
  FinanceGoal, getFinanceData,
  Transaction,
  TransactionType,
  updateDebt,
  updateFinanceGoal,
  updateTransaction
} from '../../lib/finance-service';

const screenWidth = Dimensions.get('window').width;

// ─── UTILS ──────────────────────────────────────────────────────────────────
const isValidDateOnlyString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const todayStr = new Date().toISOString().split('T')[0];

type TabType = 'Overview' | 'Transactions' | 'Debts' | 'Goals';
type TimeFilter = 'All' | 'Today' | 'Month' | 'Year' | 'Custom';
type ChartType = 'Pie' | 'Line' | 'Bar';

export default function FinanceScreen() {
  const { user } = useUser();
  const router = useRouter();
  const email = user?.primaryEmailAddress?.emailAddress;

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)

  // Multi-color palette for premium feel
  const uiColors = {
    overview: '#3B82F6',     // Blue
    transactions: '#EF4444', // Red
    debts: '#10B981',        // Green
    goals: '#F59E0B',        // Amber
  }

  const backButtonScale = useRef(new Animated.Value(1)).current
  const [fontsLoaded] = useFonts({
    'Roboto Slab': require('../../assets/Font/RobotoSlab-VariableFont_wght.ttf'),
  })

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

  const [activeTab, setActiveTab] = useState<TabType>('Overview');

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1.5,
      borderColor: activeTab === 'Overview' ? uiColors.overview : 
                   activeTab === 'Transactions' ? uiColors.transactions :
                   activeTab === 'Debts' ? uiColors.debts : uiColors.goals,
    },
    backButtonText: {
      fontSize: 22,
      color: isDark ? '#FFFFFF' : '#000000',
      marginTop: -2,
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
      fontSize: 24,
      fontFamily: 'Roboto Slab',
      color: isDark ? '#FFFFFF' : '#000000',
      letterSpacing: -0.5,
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
    tabText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    tabTextActiveOverview: { color: uiColors.overview, fontWeight: '900' },
    tabTextActiveTransactions: { color: uiColors.transactions, fontWeight: '900' },
    tabTextActiveDebts: { color: uiColors.debts, fontWeight: '900' },
    tabTextActiveGoals: { color: uiColors.goals, fontWeight: '900' },

    activeIndicatorOverview: {
      position: 'absolute', bottom: -8, width: '60%', height: 3, backgroundColor: uiColors.overview, borderRadius: 2,
      shadowColor: uiColors.overview, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    },
    activeIndicatorTransactions: {
      position: 'absolute', bottom: -8, width: '60%', height: 3, backgroundColor: uiColors.transactions, borderRadius: 2,
      shadowColor: uiColors.transactions, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    },
    activeIndicatorDebts: {
      position: 'absolute', bottom: -8, width: '60%', height: 3, backgroundColor: uiColors.debts, borderRadius: 2,
      shadowColor: uiColors.debts, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    },
    activeIndicatorGoals: {
      position: 'absolute', bottom: -8, width: '60%', height: 3, backgroundColor: uiColors.goals, borderRadius: 2,
      shadowColor: uiColors.goals, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    },

    segmentBlock: { flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    segmentBtnActive: { borderWidth: 1 },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    segmentTextActive: { color: isDark ? uiColors.overview : '#2563EB', fontWeight: '700' },

    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
    summaryBox: { 
      width: '48%', padding: 16, borderRadius: 20, borderWidth: 1, 
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
    },
    summaryLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
    summaryVal: { fontSize: 20, fontWeight: '800', fontFamily: 'Roboto Slab', color: colors.text },

    emptyBox: { backgroundColor: colors.card, padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: 20 },
    emptyText: { marginTop: 10, fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
    chartArea: { backgroundColor: colors.card, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: 10 },

    card: { 
      backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : '#FFFFFF', 
      borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, 
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
      flexDirection: 'row', justifyContent: 'space-between' 
    },

    input: { 
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFFFFF', 
      borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, 
      fontSize: 16, color: colors.text, borderWidth: 1.5, 
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', 
      marginBottom: 12 
    },
    titleInput: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '700', color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    selectorLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },

    createCard: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
    createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    createIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    createCollapsedText: { flex: 1, fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    createExpanded: { padding: 16 },

    rowBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    saveBtn: { 
      backgroundColor: activeTab === 'Transactions' ? uiColors.transactions : 
                       activeTab === 'Debts' ? uiColors.debts : uiColors.goals,
      paddingVertical: 14, paddingHorizontal: 24, borderRadius: 18, alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
    },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: colors.border },
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<FinanceGoal[]>([]);

  // Overview Filters
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('Month');
  const [chartType, setChartType] = useState<ChartType>('Pie');

  // Inline Create States
  const [isCreatingTx, setIsCreatingTx] = useState(false);
  const [isCreatingDebt, setIsCreatingDebt] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  // Modals for Actions
  const [showGoalUpdateModal, setShowGoalUpdateModal] = useState(false);

  // Create Tx State
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txDate, setTxDate] = useState(todayStr);

  // Edit Tx State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txEType, setTxEType] = useState<TransactionType>('expense');
  const [txEAmount, setTxEAmount] = useState('');
  const [txECategory, setTxECategory] = useState('');
  const [txENote, setTxENote] = useState('');
  const [txEDate, setTxEDate] = useState(todayStr);

  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

  // Create Debt State
  const [debtTo, setDebtTo] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDesc, setDebtDesc] = useState('');
  const [debtGivenDate, setDebtGivenDate] = useState(todayStr);
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtInterest, setDebtInterest] = useState<DebtInterestType>('none');
  const [debtInterestRate, setDebtInterestRate] = useState('');

  // Edit Debt State
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtETo, setDebtETo] = useState('');
  const [debtEAmount, setDebtEAmount] = useState('');
  const [debtEDesc, setDebtEDesc] = useState('');
  const [debtEGivenDate, setDebtEGivenDate] = useState(todayStr);
  const [debtEDueDate, setDebtEDueDate] = useState('');
  const [debtEInterest, setDebtEInterest] = useState<DebtInterestType>('none');
  const [debtEInterestRate, setDebtEInterestRate] = useState('');

  // Create Goal State
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  // Edit Goal State
  const [editingGoal, setEditingGoal] = useState<FinanceGoal | null>(null);
  const [goalETitle, setGoalETitle] = useState('');
  const [goalEDesc, setGoalEDesc] = useState('');
  const [goalETarget, setGoalETarget] = useState('');

  // Goal Update Monies
  const [selectedGoal, setSelectedGoal] = useState<FinanceGoal | null>(null);
  const [goalUpdateAmount, setGoalUpdateAmount] = useState('');
  const [goalUpdateType, setGoalUpdateType] = useState<'add' | 'take'>('add');

  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  useEffect(() => {
    if (email) loadData();
    else setLoading(false);
  }, [email]);

  const loadData = async () => {
    if (!email) return;
    try {
      const data = await getFinanceData(email);
      setTransactions((data.transactions || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setDebts((data.debts || []).sort((a,b) => new Date(b.amount_given_date).getTime() - new Date(a.amount_given_date).getTime()));
      setGoals((data.goals || []).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch(e) {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const calcDebtAmount = (item: Debt) => {
    if (item.interest_type === 'none' || !item.interest_rate) return Number(item.amount);
    const start = new Date(item.amount_given_date).getTime();
    // Calculate full term using due date; fallback to today if no due date was defined
    let end = item.due_date ? new Date(item.due_date).getTime() : new Date().getTime();
    
    // If early payoff and no due date was enforced, freeze at the returned text 
    if (item.given_back && item.date_given_back && !item.due_date) {
      end = new Date(item.date_given_back).getTime();
    }
    
    const daysRange = (end - start) / (1000 * 3600 * 24);
    if (daysRange <= 0) return Number(item.amount);
    const r = Number(item.interest_rate) / 100;
    const years = daysRange / 365.25;
    let total = Number(item.amount);
    if (item.interest_type === 'simple') {
       total = total * (1 + (r * years));
    } else {
       total = total * Math.pow(1 + r, years);
    }
    return Math.max(total, Number(item.amount));
  }

  // ── Date Picker Helper
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(null);
    if (selectedDate && showDatePicker) {
      const d = selectedDate.toISOString().split('T')[0];
      if (showDatePicker === 'txDate') setTxDate(d);
      else if (showDatePicker === 'debtGiven') setDebtGivenDate(d);
      else if (showDatePicker === 'debtDue') setDebtDueDate(d);
      else if (showDatePicker === 'txEDate') setTxEDate(d);
      else if (showDatePicker === 'debtEGiven') setDebtEGivenDate(d);
      else if (showDatePicker === 'debtEDue') setDebtEDueDate(d);
      else if (showDatePicker === 'customStart') setCustomStart(d);
      else if (showDatePicker === 'customEnd') setCustomEnd(d);
    }
  };

  const combinedTransactions = useMemo(() => {
    let combined: Transaction[] = [...transactions];
    debts.forEach(d => {
      // Debt given -> acts as an expense
      combined.push({
        id: `debt_exp_${d.id}`,
        type: 'expense',
        amount: d.amount,
        category: 'Debt Given',
        note: `To: ${d.to_whom}`,
        date: d.amount_given_date,
        created_at: d.created_at
      });
      // Debt paid -> acts as an income
      if (d.given_back && d.date_given_back) {
        combined.push({
          id: `debt_inc_${d.id}`,
          type: 'income',
          amount: calcDebtAmount(d),
          category: 'Debt Repaid',
          note: `From: ${d.to_whom}`,
          date: d.date_given_back,
          created_at: d.date_given_back
        });
      }
    });
    return combined.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, debts]);

  const filteredTxs = useMemo(() => {
    const now = new Date();
    return combinedTransactions.filter(t => {
      if (timeFilter === 'All') return true;
      if (timeFilter === 'Custom') {
        const txTime = new Date(t.date).getTime();
        const sTime = new Date(customStart).getTime();
        const eTime = new Date(customEnd).getTime();
        return txTime >= sTime && txTime <= eTime;
      }
      const txD = new Date(t.date);
      const diffTime = Math.abs(now.getTime() - txD.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (timeFilter === 'Today') return diffDays <= 1;
      if (timeFilter === 'Month') return diffDays <= 30;
      if (timeFilter === 'Year') return diffDays <= 365;
      return true;
    });
  }, [combinedTransactions, timeFilter, customStart, customEnd]);

  const filteredDebts = useMemo(() => {
    const now = new Date();
    return debts.filter(d => {
      if (timeFilter === 'All') return true;
      if (timeFilter === 'Custom') {
        const dTime = new Date(d.amount_given_date).getTime();
        const sTime = new Date(customStart).getTime();
        const eTime = new Date(customEnd).getTime();
        return dTime >= sTime && dTime <= eTime;
      }
      const txD = new Date(d.amount_given_date);
      const diffTime = Math.abs(now.getTime() - txD.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (timeFilter === 'Today') return diffDays <= 1;
      if (timeFilter === 'Month') return diffDays <= 30;
      if (timeFilter === 'Year') return diffDays <= 365;
      return true;
    });
  }, [debts, timeFilter, customStart, customEnd]);

  const filteredGoals = useMemo(() => {
    const now = new Date();
    return goals.filter(g => {
      if (timeFilter === 'All') return true;
      if (timeFilter === 'Custom') {
        const gTime = new Date(g.created_at).getTime();
        const sTime = new Date(customStart).getTime();
        const eTime = new Date(customEnd).getTime() + 86399999;
        return gTime >= sTime && gTime <= eTime;
      }
      const txD = new Date(g.created_at);
      const diffTime = Math.abs(now.getTime() - txD.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (timeFilter === 'Today') return diffDays <= 1;
      if (timeFilter === 'Month') return diffDays <= 30;
      if (timeFilter === 'Year') return diffDays <= 365;
      return true;
    });
  }, [goals, timeFilter, customStart, customEnd]);

  const totalIncome = filteredTxs.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount), 0);
  const totalExpense = filteredTxs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount), 0);
  const netBalance = totalIncome - totalExpense;

  const pieData = [
    { name: 'Income', amount: totalIncome, color: colors.success, legendFontColor: colors.text, legendFontSize: 13 },
    { name: 'Expense', amount: totalExpense, color: colors.danger, legendFontColor: colors.text, legendFontSize: 13 }
  ];

  const lineData = useMemo(() => {
    const grouped: Record<string, { inc: number, exp: number }> = {};
    filteredTxs.forEach(t => {
      const d = t.date;
      if (!grouped[d]) grouped[d] = { inc: 0, exp: 0 };
      if (t.type === 'income') grouped[d].inc += Number(t.amount);
      else grouped[d].exp += Number(t.amount);
    });
    const sortedKeys = Object.keys(grouped).sort();
    if(sortedKeys.length === 0) return null;
    return {
      labels: sortedKeys.map(k => k.substring(5, 10)),
      datasets: [
        { data: sortedKeys.map(k => grouped[k].inc), color: (opacity=1)=>`rgba(16, 185, 129, ${opacity})`, strokeWidth: 2 },
        { data: sortedKeys.map(k => grouped[k].exp), color: (opacity=1)=>`rgba(239, 68, 68, ${opacity})`, strokeWidth: 2 }
      ],
      legend: ["Income", "Expense"]
    };
  }, [filteredTxs]);

  const barData = useMemo(() => {
    return {
      labels: ["Income", "Expense"],
      datasets: [ { data: [totalIncome, totalExpense] } ]
    };
  }, [totalIncome, totalExpense]);

  // Category breakdown data
  const categoryData = useMemo(() => {
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};

    filteredTxs.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'income') {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + amount;
      } else {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + amount;
      }
    });

    // Sort and take top 5
    const topIncome = Object.entries(incomeByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => ({ name: cat, amount: amt }));

    const topExpense = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => ({ name: cat, amount: amt }));

    return { topIncome, topExpense };
  }, [filteredTxs]);

  // ── Actions: CREATE
  const handleSaveTx = async () => {
    if(!email) return;
    if(!txAmount || isNaN(Number(txAmount))) return Alert.alert('Error', 'Valid amount required.');
    if(!txCategory) return Alert.alert('Error', 'Category required.');
    
    await addTransaction(email, txType, Number(txAmount), txCategory, txNote, txDate);
    setTxAmount(''); setTxCategory(''); setTxNote(''); setTxDate(todayStr);
    setIsCreatingTx(false); Keyboard.dismiss(); loadData();
  };

  const handleSaveDebt = async () => {
    if(!email) return;
    if(!debtAmount || isNaN(Number(debtAmount))) return Alert.alert('Error', 'Valid amount required.');
    if(!debtTo) return Alert.alert('Error', 'To whom is required.');

    const rate = debtInterest !== 'none' ? Number(debtInterestRate) : 0;
    await addDebt(email, debtTo, Number(debtAmount), debtDesc, debtDueDate, debtGivenDate, debtInterest, rate);
    
    setDebtTo(''); setDebtAmount(''); setDebtDesc(''); setDebtDueDate(''); 
    setDebtInterest('none'); setDebtInterestRate('');
    setIsCreatingDebt(false); Keyboard.dismiss(); loadData();
  };

  const handleSaveGoal = async () => {
    if(!email) return;
    if(!goalTitle || !goalTarget || isNaN(Number(goalTarget))) return Alert.alert('Error', 'Valid title and target required.');
    await addFinanceGoal(email, goalTitle, goalDesc, Number(goalTarget));
    setGoalTitle(''); setGoalDesc(''); setGoalTarget('');
    setIsCreatingGoal(false); Keyboard.dismiss(); loadData();
  };

  // ── Actions: UPDATE (CRUD)
  const handleUpdateTx = async () => {
    if(!email || !editingTx) return;
    if(!txEAmount || isNaN(Number(txEAmount))) return Alert.alert('Error', 'Valid amount required.');
    if(!txECategory) return Alert.alert('Error', 'Category required.');
    await updateTransaction(email, editingTx.id, {
      type: txEType, amount: Number(txEAmount), category: txECategory, note: txENote, date: txEDate
    });
    setEditingTx(null); loadData();
  };

  const handleUpdateDebtProps = async () => {
    if(!email || !editingDebt) return;
    if(!debtEAmount || isNaN(Number(debtEAmount))) return Alert.alert('Error', 'Valid amount required.');
    if(!debtETo) return Alert.alert('Error', 'To whom is required.');
    
    const rate = debtEInterest !== 'none' ? Number(debtEInterestRate) : 0;
    await updateDebt(email, editingDebt.id, {
      to_whom: debtETo, amount: Number(debtEAmount), description: debtEDesc, 
      amount_given_date: debtEGivenDate, due_date: debtEDueDate, interest_type: debtEInterest, interest_rate: rate
    });
    setEditingDebt(null); loadData();
  }

  const handleUpdateGoalProps = async () => {
    if(!email || !editingGoal) return;
    if(!goalETitle || !goalETarget || isNaN(Number(goalETarget))) return Alert.alert('Error', 'Valid title and target required.');
    await updateFinanceGoal(email, editingGoal.id, {
      title: goalETitle, description: goalEDesc, target_amount: Number(goalETarget)
    });
    setEditingGoal(null); loadData();
  }

  const toggleDebtGivenBack = async (debt: Debt) => {
    if(!email) return;
    const given_back = !debt.given_back;
    const date_given_back = given_back ? new Date().toISOString().split('T')[0] : '';
    await updateDebt(email, debt.id, { given_back, date_given_back });
    loadData();
  };

  const handleUpdateGoalAmount = async () => {
    if(!email || !selectedGoal) return;
    if(!goalUpdateAmount || isNaN(Number(goalUpdateAmount))) return Alert.alert('Error', 'Valid amount required.');
    let amt = Number(goalUpdateAmount);
    if(goalUpdateType === 'take') amt = -amt;
    await updateFinanceGoal(email, selectedGoal.id, { current_amount: selectedGoal.current_amount + amt });
    setGoalUpdateAmount(''); setShowGoalUpdateModal(false); loadData();
  };

  // ── Open Edit States
  const openEditTx = (t: Transaction) => {
     setTxEType(t.type); setTxEAmount(t.amount.toString()); setTxECategory(t.category);
     setTxENote(t.note || ''); setTxEDate(t.date); setEditingTx(t);
  }
  const openEditDebt = (d: Debt) => {
     setDebtETo(d.to_whom); setDebtEAmount(d.amount.toString()); setDebtEDesc(d.description || '');
     setDebtEGivenDate(d.amount_given_date); setDebtEDueDate(d.due_date || ''); 
     setDebtEInterest(d.interest_type); setDebtEInterestRate(d.interest_rate ? d.interest_rate.toString() : '');
     setEditingDebt(d);
  }
  const openEditGoal = (g: FinanceGoal) => {
     setGoalETitle(g.title); setGoalEDesc(g.description || ''); setGoalETarget(g.target_amount.toString());
     setEditingGoal(g);
  }

  // ── Helper: Get color based on active tab
  const getActiveTabColor = () => {
    switch(activeTab) {
      case 'Transactions': return uiColors.transactions;
      case 'Debts': return uiColors.debts;
      case 'Goals': return uiColors.goals;
      default: return uiColors.overview;
    }
  };

  const getActiveTabColorBg = () => {
    const color = getActiveTabColor();
    const hex = color.replace('#', '');
    return `rgba(${parseInt(hex.slice(0,2),16)}, ${parseInt(hex.slice(2,4),16)}, ${parseInt(hex.slice(4,6),16)}, 0.15)`;
  };

  // ── Inline Creation Cards
  const renderTxCard = () => (
    <View style={dynamicStyles.createCard}>
      {isCreatingTx ? (
        <View style={dynamicStyles.createExpanded}>
          <View style={dynamicStyles.segmentBlock}>
            <TouchableOpacity style={[dynamicStyles.segmentBtn, txType==='income' && {backgroundColor:'#10B981'}]} onPress={()=>setTxType('income')}>
              <Text style={[dynamicStyles.segmentText, txType==='income' && {color:'#FFF'}]}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[dynamicStyles.segmentBtn, txType==='expense' && {backgroundColor:'#EF4444'}]} onPress={()=>setTxType('expense')}>
              <Text style={[dynamicStyles.segmentText, txType==='expense' && {color:'#FFF'}]}>Expense</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={dynamicStyles.input} placeholder="Amount (e.g. 50)" keyboardType="numeric" value={txAmount} onChangeText={setTxAmount} />
          <TextInput style={dynamicStyles.input} placeholder="Category (e.g. Food, Salary)" value={txCategory} onChangeText={setTxCategory} />
          <TextInput style={dynamicStyles.input} placeholder="Note (Optional)" value={txNote} onChangeText={setTxNote} />
          <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('txDate')}>
            <Text style={{color: colors.text}}>{txDate ? txDate : 'Select Date'}</Text>
          </TouchableOpacity>
          <View style={dynamicStyles.rowBtns}>
            <TouchableOpacity style={dynamicStyles.cancelBtn} onPress={()=>setIsCreatingTx(false)}><Text style={dynamicStyles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[dynamicStyles.saveBtn, {backgroundColor: txType === 'income' ? '#10B981' : '#EF4444'}]} onPress={handleSaveTx}><Text style={dynamicStyles.saveBtnText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={dynamicStyles.createCollapsed} onPress={()=>setIsCreatingTx(true)}>
          <View style={[dynamicStyles.createIconWrap, {backgroundColor: '#EFF6FF'}]}>
             <Ionicons name="swap-horizontal" size={20} color="#3B82F6" />
          </View>
          <Text style={dynamicStyles.createCollapsedText}>Add new transaction...</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDebtCard = () => (
    <View style={dynamicStyles.createCard}>
      {isCreatingDebt ? (
        <View style={dynamicStyles.createExpanded}>
          <TextInput style={dynamicStyles.titleInput} placeholder="To Whom" value={debtTo} onChangeText={setDebtTo} autoFocus />
          <TextInput style={dynamicStyles.input} placeholder="Amount" keyboardType="numeric" value={debtAmount} onChangeText={setDebtAmount} />
          <TextInput style={dynamicStyles.input} placeholder="Description" value={debtDesc} onChangeText={setDebtDesc} />
          
          <Text style={dynamicStyles.selectorLabel}>Interest Type:</Text>
          <View style={[dynamicStyles.segmentBlock, {marginBottom: 12}]}>
            {(['none','simple','compound'] as DebtInterestType[]).map(i => (
              <TouchableOpacity key={i} style={[dynamicStyles.segmentBtn, debtInterest===i && dynamicStyles.segmentBtnActive]} onPress={()=>setDebtInterest(i)}>
                <Text style={[dynamicStyles.segmentText, debtInterest===i && dynamicStyles.segmentTextActive]}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {debtInterest !== 'none' && (
            <TextInput style={dynamicStyles.input} placeholder="Interest Rate % (per yr)" keyboardType="numeric" value={debtInterestRate} onChangeText={setDebtInterestRate} />
          )}

          <Text style={dynamicStyles.selectorLabel}>Given Date:</Text>
          <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('debtGiven')}>
            <Text style={{color: colors.text}}>{debtGivenDate}</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.selectorLabel}>Due Date (Optional):</Text>
          <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('debtDue')}>
            <Text style={{color: debtDueDate ? '#334155' : '#94A3B8'}}>{debtDueDate || 'Select Due Date'}</Text>
          </TouchableOpacity>
          <View style={dynamicStyles.rowBtns}>
            <TouchableOpacity style={dynamicStyles.cancelBtn} onPress={()=>setIsCreatingDebt(false)}><Text style={dynamicStyles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[dynamicStyles.saveBtn, {backgroundColor: '#F59E0B'}]} onPress={handleSaveDebt}><Text style={dynamicStyles.saveBtnText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={dynamicStyles.createCollapsed} onPress={()=>setIsCreatingDebt(true)}>
          <View style={[dynamicStyles.createIconWrap, {backgroundColor: '#FFFBEB'}]}>
             <Ionicons name="cash-outline" size={20} color="#F59E0B" />
          </View>
          <Text style={dynamicStyles.createCollapsedText}>Track a new debt...</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderGoalCard = () => (
    <View style={dynamicStyles.createCard}>
      {isCreatingGoal ? (
        <View style={dynamicStyles.createExpanded}>
          <TextInput style={dynamicStyles.titleInput} placeholder="Goal Title" value={goalTitle} onChangeText={setGoalTitle} autoFocus />
          <TextInput style={dynamicStyles.input} placeholder="Target Amount" keyboardType="numeric" value={goalTarget} onChangeText={setGoalTarget} />
          <TextInput style={dynamicStyles.input} placeholder="Description" value={goalDesc} onChangeText={setGoalDesc} />
          <View style={dynamicStyles.rowBtns}>
            <TouchableOpacity style={dynamicStyles.cancelBtn} onPress={()=>setIsCreatingGoal(false)}><Text style={dynamicStyles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[dynamicStyles.saveBtn, {backgroundColor: colors.primary}]} onPress={handleSaveGoal}><Text style={dynamicStyles.saveBtnText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={dynamicStyles.createCollapsed} onPress={()=>setIsCreatingGoal(true)}>
          <View style={[dynamicStyles.createIconWrap, {backgroundColor: '#EFF6FF'}]}>
             <Ionicons name="flag-outline" size={20} color="#3B82F6" />
          </View>
          <Text style={dynamicStyles.createCollapsedText}>Create a financial goal...</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── UI Snippets

  const renderCustomDateFilters = () => {
    if (timeFilter !== 'Custom') return null;
    return (
      <View style={{flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: -6}}>
        <TouchableOpacity style={{flex: 1, backgroundColor: colors.card, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center'}} onPress={() => setShowDatePicker('customStart')}>
          <Text style={{fontSize: 12, color: colors.textSecondary, fontWeight: '700'}}>Start Date</Text>
          <Text style={{fontSize: 14, color: colors.text, fontWeight: '700', marginTop: 4}}>{customStart}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{flex: 1, backgroundColor: colors.card, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center'}} onPress={() => setShowDatePicker('customEnd')}>
          <Text style={{fontSize: 12, color: colors.textSecondary, fontWeight: '700'}}>End Date</Text>
          <Text style={{fontSize: 14, color: colors.text, fontWeight: '700', marginTop: 4}}>{customEnd}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderOverview = () => (
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      <View style={dynamicStyles.segmentBlock}>
        {(['All','Today','Month','Year','Custom'] as TimeFilter[]).map(t => (
          <TouchableOpacity key={t} style={[dynamicStyles.segmentBtn, timeFilter===t && {backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)', borderColor: uiColors.overview, borderWidth: 1}]} onPress={()=>setTimeFilter(t)}>
            <Text style={[dynamicStyles.segmentText, timeFilter===t && {color: isDark ? uiColors.overview : '#2563EB', fontWeight: '700'}]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderCustomDateFilters()}

      <View style={dynamicStyles.summaryGrid}>
        <View style={dynamicStyles.summaryBox}>
          <Text style={dynamicStyles.summaryLabel}>Total Income</Text>
          <Text style={[dynamicStyles.summaryVal, { color: '#10B981' }]}>${totalIncome.toFixed(2)}</Text>
        </View>
        <View style={dynamicStyles.summaryBox}>
          <Text style={dynamicStyles.summaryLabel}>Total Expense</Text>
          <Text style={[dynamicStyles.summaryVal, { color: '#EF4444' }]}>${totalExpense.toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={[dynamicStyles.summaryBox, { width: '100%', marginBottom: 20 }]}>
        <Text style={dynamicStyles.summaryLabel}>Net Balance</Text>
        <Text style={[dynamicStyles.summaryVal, { color: netBalance >= 0 ? '#10B981' : '#EF4444', fontSize: 28 }]}>
          ${netBalance.toFixed(2)}
        </Text>
      </View>

      <View style={dynamicStyles.segmentBlock}>
        {(['Pie','Line','Bar'] as ChartType[]).map(c => (
          <TouchableOpacity key={c} style={[dynamicStyles.segmentBtn, chartType===c && {backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)', borderColor: uiColors.overview, borderWidth: 1}]} onPress={()=>setChartType(c)}>
            <Text style={[dynamicStyles.segmentText, chartType===c && {color: isDark ? uiColors.overview : '#2563EB', fontWeight: '700'}]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredTxs.length === 0 ? (
        <View style={dynamicStyles.emptyBox}>
          <Ionicons name="stats-chart-outline" size={40} color="#94A3B8" />
          <Text style={dynamicStyles.emptyText}>No data for this period.</Text>
        </View>
      ) : (
        <View style={dynamicStyles.chartArea}>
          {chartType === 'Pie' && (
            <PieChart
              data={pieData}
              width={screenWidth - 72}
              height={220}
              chartConfig={{ color: (o=1) => `rgba(0,0,0,${o})` }}
              accessor={"amount"}
              backgroundColor={"transparent"}
              paddingLeft={"15"} 
            />
          )}
          {chartType === 'Line' && lineData && (
            <LineChart
              data={lineData}
              width={screenWidth - 80}
              height={220}
              chartConfig={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                backgroundGradientFrom: isDark ? '#1F2937' : '#FFFFFF',
                backgroundGradientTo: isDark ? '#1F2937' : '#FFFFFF',
                decimalPlaces: 0,
                color: (o=1)=>isDark ? `rgba(59, 130, 246, ${o})` : `rgba(37, 99, 235, ${o})`,
                labelColor: (o=1)=>isDark ? `rgba(255,255,255,${o})` : `rgba(0,0,0,${o})`
              }}
              style={{ borderRadius: 16 }}
            />
          )}
          {chartType === 'Bar' && (
            <BarChart
              data={barData}
              width={screenWidth - 80}
              height={220}
              yAxisLabel="$"
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                backgroundGradientFrom: isDark ? '#1F2937' : '#FFFFFF',
                backgroundGradientTo: isDark ? '#1F2937' : '#FFFFFF',
                decimalPlaces: 0,
                color: (o=1)=>`rgba(59, 130, 246, ${o})`,
                labelColor: (o=1)=>isDark ? `rgba(255,255,255,${o})` : `rgba(0,0,0,${o})`
              }}
              style={{ borderRadius: 16 }}
            />
          )}
        </View>
      )}

      {/* ── Category Breakdown Charts ── */}
      {filteredTxs.length > 0 && (
        <View style={{marginTop: 24}}>
          <Text style={{fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16, paddingHorizontal: 16}}>
            Category Breakdown
          </Text>

          {/* Income by Category */}
          {categoryData.topIncome.length > 0 && (
            <View style={{paddingHorizontal: 16, marginBottom: 20}}>
              <Text style={{fontSize: 14, fontWeight: '600', color: colors.success, marginBottom: 12}}>
                Top Income Categories
              </Text>
              {categoryData.topIncome.map((cat, idx) => {
                const percentage = totalIncome > 0 ? (cat.amount / totalIncome) * 100 : 0;
                return (
                  <View key={idx} style={{marginBottom: 12}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                      <Text style={{fontSize: 13, color: colors.text}}>{cat.name}</Text>
                      <Text style={{fontSize: 13, fontWeight: '600', color: colors.success}}>${cat.amount.toFixed(2)}</Text>
                    </View>
                    <View style={{height: 6, backgroundColor: '#E0E7FF', borderRadius: 3, overflow: 'hidden'}}>
                      <View
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: colors.success,
                          borderRadius: 3
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Expense by Category */}
          {categoryData.topExpense.length > 0 && (
            <View style={{paddingHorizontal: 16, marginBottom: 20}}>
              <Text style={{fontSize: 14, fontWeight: '600', color: colors.danger, marginBottom: 12}}>
                Top Expense Categories
              </Text>
              {categoryData.topExpense.map((cat, idx) => {
                const percentage = totalExpense > 0 ? (cat.amount / totalExpense) * 100 : 0;
                return (
                  <View key={idx} style={{marginBottom: 12}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                      <Text style={{fontSize: 13, color: colors.text}}>{cat.name}</Text>
                      <Text style={{fontSize: 13, fontWeight: '600', color: colors.danger}}>${cat.amount.toFixed(2)}</Text>
                    </View>
                    <View style={{height: 6, backgroundColor: '#FEE2E2', borderRadius: 3, overflow: 'hidden'}}>
                      <View
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: colors.danger,
                          borderRadius: 3
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  const renderTransactions = () => (
    <FlatList
      data={filteredTxs}
      keyExtractor={t=>t.id}
      ListHeaderComponent={
        <>
          <View style={dynamicStyles.segmentBlock}>
            {(['All','Today','Month','Year','Custom'] as TimeFilter[]).map(t => (
              <TouchableOpacity key={t} style={[dynamicStyles.segmentBtn, timeFilter===t && {backgroundColor: getActiveTabColorBg(), borderColor: uiColors.transactions, borderWidth: 1}]} onPress={()=>setTimeFilter(t)}>
                <Text style={[dynamicStyles.segmentText, timeFilter===t && {color: uiColors.transactions, fontWeight: '700'}]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderCustomDateFilters()}
          {renderTxCard()}
        </>
      }
      contentContainerStyle={{padding: 16, paddingBottom: 100}}
      ListEmptyComponent={<Text style={{textAlign:'center', color:'#94A3B8', marginTop: 40}}>No transactions found.</Text>}
      renderItem={({item}) => {
        const isSynthetic = item.id.startsWith('debt_');
        return (
          <View style={[dynamicStyles.card, isSynthetic && {borderLeftWidth: 4, borderLeftColor: item.type==='income'?'#10B981':'#EF4444'}]}>
            <View style={{flex:1}}>
              <Text style={{fontSize:16, fontWeight:'700', color: colors.text}}>
                {item.category} {isSynthetic && ' (Auto)'}
              </Text>
              {item.note ? <Text style={{fontSize:13, color: colors.text, marginTop:2}}>{item.note}</Text> : null}
              <Text style={{fontSize:12, color: colors.text, marginTop:4, opacity: 0.6}}>{item.date}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={{fontSize:16, fontWeight:'800', color: item.type==='income'?'#10B981':'#EF4444'}}>
                {item.type === 'income' ? '+' : '-'}${Number(item.amount).toFixed(2)}
              </Text>
              {!isSynthetic && (
                <View style={{flexDirection: 'row', gap: 12, marginTop: 8}}>
                  <TouchableOpacity onPress={()=> openEditTx(item)}>
                    <Ionicons name="pencil-outline" size={18} color={colors.textSecondary}/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={()=> {
                    Alert.alert('Delete', 'Delete transaction?', [
                      {text:'Cancel'}, {text:'Delete', style:'destructive', onPress:() => { deleteTransaction(email!, item.id); loadData(); }}
                    ]);
                  }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444"/>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );
      }}
    />
  );

  const renderDebts = () => (
    <FlatList
      data={filteredDebts}
      keyExtractor={d=>d.id}
      ListHeaderComponent={
        <>
          <View style={dynamicStyles.segmentBlock}>
            {(['All','Today','Month','Year','Custom'] as TimeFilter[]).map(t => (
              <TouchableOpacity key={t} style={[dynamicStyles.segmentBtn, timeFilter===t && {backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)', borderColor: uiColors.debts, borderWidth: 1}]} onPress={()=>setTimeFilter(t)}>
                <Text style={[dynamicStyles.segmentText, timeFilter===t && {color: uiColors.debts, fontWeight: '700'}]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderCustomDateFilters()}
          {renderDebtCard()}
        </>
      }
      contentContainerStyle={{padding: 16, paddingBottom: 100}}
      ListEmptyComponent={<Text style={{textAlign:'center', color:'#94A3B8', marginTop: 40}}>No debts tracked.</Text>}
      renderItem={({item}) => {
        const calculatedAmount = calcDebtAmount(item);
        return (
          <View style={[dynamicStyles.card, item.given_back && {opacity: 0.7}]}>
            <View style={{flex:1}}>
              <Text style={{fontSize:17, fontWeight:'800', color: colors.text}}>{item.to_whom}</Text>
              {item.description ? <Text style={{fontSize:13, color: colors.textSecondary, marginTop:2}}>{item.description}</Text> : null}
              <Text style={{fontSize:12, color: colors.textSecondary, marginTop:4, opacity: 0.7}}>Given: {item.amount_given_date} {item.due_date ? `| Due: ${item.due_date}` : ''}</Text>
              <Text style={{fontSize:12, color:'#3B82F6', marginTop:2, fontWeight:'600'}}>
                Interest: {item.interest_type} {item.interest_rate ? `(${item.interest_rate}% / yr)` : ''}
              </Text>
              {item.given_back && <Text style={{fontSize:12, color:'#10B981', marginTop:4, fontWeight:'700'}}>✓ Returned on {item.date_given_back}</Text>}
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={{fontSize:18, fontWeight:'800', color: '#F59E0B'}}>${calculatedAmount.toFixed(2)}</Text>
              {item.interest_type !== 'none' && (
                <Text style={{fontSize:10, color: colors.textSecondary, marginTop:2, opacity: 0.7}}>Base: ${item.amount}</Text>
              )}
              <View style={{flexDirection:'row', alignItems:'center', marginTop: 8}}>
                <Text style={{fontSize:11, color: colors.textSecondary, marginRight:4}}>Paid?</Text>
                <Switch 
                  value={item.given_back} 
                  onValueChange={()=>toggleDebtGivenBack(item)}
                  trackColor={{false:'#E2E8F0', true:'#10B981'}}
                />
              </View>
              <View style={{flexDirection: 'row', gap: 12, marginTop: 8}}>
                <TouchableOpacity onPress={()=> openEditDebt(item)}>
                  <Ionicons name="pencil-outline" size={18} color={colors.textSecondary}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> {
                  Alert.alert('Delete', 'Delete debt record?', [
                    {text:'Cancel'}, {text:'Delete', style:'destructive', onPress:() => { deleteDebt(email!, item.id); loadData(); }}
                  ]);
                }}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444"/>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      }}
    />
  );

  const renderGoals = () => (
    <FlatList
      data={filteredGoals}
      keyExtractor={g=>g.id}
      ListHeaderComponent={
        <>
          <View style={dynamicStyles.segmentBlock}>
            {(['All','Today','Month','Year','Custom'] as TimeFilter[]).map(t => (
              <TouchableOpacity key={t} style={[dynamicStyles.segmentBtn, timeFilter===t && {backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)', borderColor: uiColors.goals, borderWidth: 1}]} onPress={()=>setTimeFilter(t)}>
                <Text style={[dynamicStyles.segmentText, timeFilter===t && {color: uiColors.goals, fontWeight: '700'}]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderCustomDateFilters()}
          {renderGoalCard()}
        </>
      }
      contentContainerStyle={{padding: 16, paddingBottom: 100}}
      ListEmptyComponent={<Text style={{textAlign:'center', color: colors.textSecondary, marginTop: 40}}>No financial goals yet.</Text>}
      renderItem={({item}) => {
        const pctRaw = item.target_amount ? (item.current_amount / item.target_amount) * 100 : 0;
        const pct = Math.min(Math.max(pctRaw, 0), 100).toFixed(1);
        console.log("Goal item being rendered:", JSON.stringify(item));
        return (
          <View style={dynamicStyles.card}>
            {/* Top Row: Title + Icons */}
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
              <Text style={{fontSize:20, fontWeight:'900', color: colors.text, flex: 1}}>{item.title || 'Untitled Goal'}</Text>
              <View style={{flexDirection: 'row', gap: 16}}>
                <TouchableOpacity onPress={()=> openEditGoal(item)}>
                  <Ionicons name="pencil-outline" size={20} color={colors.textSecondary}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> {
                  Alert.alert('Delete', 'Delete goal?', [
                    {text:'Cancel'}, {text:'Delete', style:'destructive', onPress:() => { deleteFinanceGoal(email!, item.id); loadData(); }}
                  ]);
                }}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444"/>
                </TouchableOpacity>
              </View>
            </View>

            {/* Percentage Above Bar aligned Right */}
            <View style={{flexDirection:'row', justifyContent:'flex-end', marginBottom: 6}}>
              <Text style={{fontSize:16, fontWeight:'900', color: colors.text}}>{pct}%</Text>
            </View>

            {/* Progress Bar */}
            <View style={{height:12, backgroundColor: isDark ? '#334155' : '#E2E8F0', borderRadius:6, overflow:'hidden', marginBottom: 10}}>
              <View style={{height:'100%', backgroundColor:'#3B82F6', width:`${pct}%` as any}} />
            </View>

            {/* Description & Saved Amount strictly below the % bar */}
            <View style={{flexDirection:'column', marginBottom: 16}}>
              <Text style={{fontSize:15, fontWeight:'800', color: colors.text}}>
                Saved: <Text style={{color: colors.success}}>${item.current_amount}</Text> <Text style={{fontWeight:'500', color: colors.textSecondary}}>of ${item.target_amount}</Text>
              </Text>
              {item.description ? <Text style={{fontSize:14, color: colors.textSecondary, marginTop:6}}>{item.description}</Text> : null}
              <Text style={{fontSize:12, color: colors.textSecondary, marginTop: 4, opacity: 0.7}}>Started: {item.created_at ? item.created_at.split('T')[0] : 'Today'}</Text>

              <TouchableOpacity style={{backgroundColor:'#EFF6FF', paddingVertical:12, borderRadius:10, alignItems:'center', marginTop: 10}}
                onPress={() => { setSelectedGoal(item); setShowGoalUpdateModal(true); }}
              >
                <Text style={{color:'#3B82F6', fontWeight:'800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5}}>Update Balance</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <View style={dynamicStyles.headerArea}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={dynamicStyles.headerRow}>
            <Animated.View style={{ transform: [{ scale: backButtonScale }] }}>
              <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.replace('/(tabs)')}>
                <Text style={dynamicStyles.backButtonText}>←</Text>
              </TouchableOpacity>
            </Animated.View>
            <View>
              <Text style={dynamicStyles.pageTitle}>Finance</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={dynamicStyles.tabContainer}>
          <TouchableOpacity style={dynamicStyles.tab} onPress={() => setActiveTab('Overview')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="pie-chart-outline" size={16} color={activeTab === 'Overview' ? uiColors.overview : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[dynamicStyles.tabText, activeTab === 'Overview' && dynamicStyles.tabTextActiveOverview, { marginBottom: 0 }]}>Overview</Text>
            </View>
            {activeTab === 'Overview' && <View style={dynamicStyles.activeIndicatorOverview} />}
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.tab} onPress={() => setActiveTab('Transactions')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="swap-horizontal-outline" size={16} color={activeTab === 'Transactions' ? uiColors.transactions : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[dynamicStyles.tabText, activeTab === 'Transactions' && dynamicStyles.tabTextActiveTransactions, { marginBottom: 0 }]}>Transactions</Text>
            </View>
            {activeTab === 'Transactions' && <View style={dynamicStyles.activeIndicatorTransactions} />}
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.tab} onPress={() => setActiveTab('Debts')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="cash-outline" size={16} color={activeTab === 'Debts' ? uiColors.debts : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[dynamicStyles.tabText, activeTab === 'Debts' && dynamicStyles.tabTextActiveDebts, { marginBottom: 0 }]}>Debts</Text>
            </View>
            {activeTab === 'Debts' && <View style={dynamicStyles.activeIndicatorDebts} />}
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.tab} onPress={() => setActiveTab('Goals')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="trophy-outline" size={16} color={activeTab === 'Goals' ? uiColors.goals : '#64748B'} style={{ marginRight: 6 }} />
              <Text style={[dynamicStyles.tabText, activeTab === 'Goals' && dynamicStyles.tabTextActiveGoals, { marginBottom: 0 }]}>Goals</Text>
            </View>
            {activeTab === 'Goals' && <View style={dynamicStyles.activeIndicatorGoals} />}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={uiColors.overview} />
            </View>
          ) : (
            <>
              {activeTab === 'Overview' && renderOverview()}
              {activeTab === 'Transactions' && renderTransactions()}
              {activeTab === 'Debts' && renderDebts()}
              {activeTab === 'Goals' && renderGoals()}
            </>
          )}
        </KeyboardAvoidingView>
      </View>

      {showDatePicker && (
        <DateTimePicker value={new Date()} mode="date" display="default" onChange={onDateChange} />
      )}

      {/* ── Goal Add/Take Money Modal ── */}
      <Modal visible={showGoalUpdateModal} animationType="fade" transparent={true}>
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:20}}>
          <View style={{backgroundColor:'#FFF', borderRadius:16, padding:20}}>
            <Text style={{fontSize:18, fontWeight:'700', marginBottom:16, textAlign:'center'}}>Update {selectedGoal?.title}</Text>
            
            <View style={dynamicStyles.segmentBlock}>
              <TouchableOpacity style={[dynamicStyles.segmentBtn, goalUpdateType==='add' && {backgroundColor:'#10B981'}]} onPress={()=>setGoalUpdateType('add')}>
                <Text style={[dynamicStyles.segmentText, goalUpdateType==='add' && {color:'#FFF'}]}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[dynamicStyles.segmentBtn, goalUpdateType==='take' && {backgroundColor:'#EF4444'}]} onPress={()=>setGoalUpdateType('take')}>
                <Text style={[dynamicStyles.segmentText, goalUpdateType==='take' && {color:'#FFF'}]}>Take</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={dynamicStyles.input} placeholder="Amount" keyboardType="numeric" value={goalUpdateAmount} onChangeText={setGoalUpdateAmount} autoFocus />
            
            <View style={{flexDirection:'row', gap:10, marginTop:10}}>
              <TouchableOpacity style={{flex:1, padding:12, backgroundColor:'#F1F5F9', borderRadius:10, alignItems:'center'}} onPress={()=>setShowGoalUpdateModal(false)}>
                <Text style={{fontWeight:'700', color:'#64748B'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1, padding:12, backgroundColor:'#3B82F6', borderRadius:10, alignItems:'center'}} onPress={handleUpdateGoalAmount}>
                <Text style={{fontWeight:'700', color:'#FFF'}}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Tx Modal ── */}
      <Modal visible={editingTx !== null} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={()=>setEditingTx(null)}><Text style={{fontSize:16, color:'#64748B'}}>Cancel</Text></TouchableOpacity>
            <Text style={{fontSize:18, fontWeight:'700'}}>Edit Transaction</Text>
            <TouchableOpacity onPress={handleUpdateTx}><Text style={{fontSize:16, fontWeight:'700', color:'#3B82F6'}}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={{padding:20}}>
            <View style={dynamicStyles.segmentBlock}>
              <TouchableOpacity style={[dynamicStyles.segmentBtn, txEType==='income' && {backgroundColor:'#10B981'}]} onPress={()=>setTxEType('income')}>
                <Text style={[dynamicStyles.segmentText, txEType==='income' && {color:'#FFF'}]}>Income</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[dynamicStyles.segmentBtn, txEType==='expense' && {backgroundColor:'#EF4444'}]} onPress={()=>setTxEType('expense')}>
                <Text style={[dynamicStyles.segmentText, txEType==='expense' && {color:'#FFF'}]}>Expense</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={dynamicStyles.input} placeholder="Amount" keyboardType="numeric" value={txEAmount} onChangeText={setTxEAmount} />
            <TextInput style={dynamicStyles.input} placeholder="Category" value={txECategory} onChangeText={setTxECategory} />
            <TextInput style={dynamicStyles.input} placeholder="Note (Optional)" value={txENote} onChangeText={setTxENote} />
            <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('txEDate')}>
              <Text style={{color: colors.text}}>{txEDate}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Debt Modal ── */}
      <Modal visible={editingDebt !== null} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={()=>setEditingDebt(null)}><Text style={{fontSize:16, color:'#64748B'}}>Cancel</Text></TouchableOpacity>
            <Text style={{fontSize:18, fontWeight:'700'}}>Edit Debt</Text>
            <TouchableOpacity onPress={handleUpdateDebtProps}><Text style={{fontSize:16, fontWeight:'700', color:'#3B82F6'}}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={{padding:20}}>
            <TextInput style={dynamicStyles.titleInput} placeholder="To Whom" value={debtETo} onChangeText={setDebtETo} />
            <TextInput style={dynamicStyles.input} placeholder="Amount" keyboardType="numeric" value={debtEAmount} onChangeText={setDebtEAmount} />
            <TextInput style={dynamicStyles.input} placeholder="Description" value={debtEDesc} onChangeText={setDebtEDesc} />
            
            <Text style={dynamicStyles.selectorLabel}>Interest Type:</Text>
            <View style={[dynamicStyles.segmentBlock, {marginBottom: 12}]}>
              {(['none','simple','compound'] as DebtInterestType[]).map(i => (
                <TouchableOpacity key={i} style={[dynamicStyles.segmentBtn, debtEInterest===i && dynamicStyles.segmentBtnActive]} onPress={()=>setDebtEInterest(i)}>
                  <Text style={[dynamicStyles.segmentText, debtEInterest===i && dynamicStyles.segmentTextActive]}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {debtEInterest !== 'none' && (
              <TextInput style={dynamicStyles.input} placeholder="Interest Rate % (per yr)" keyboardType="numeric" value={debtEInterestRate} onChangeText={setDebtEInterestRate} />
            )}

            <Text style={dynamicStyles.selectorLabel}>Given Date:</Text>
            <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('debtEGiven')}>
              <Text style={{color: colors.text}}>{debtEGivenDate}</Text>
            </TouchableOpacity>
            <Text style={dynamicStyles.selectorLabel}>Due Date (Optional):</Text>
            <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('debtEDue')}>
              <Text style={{color: debtEDueDate ? '#334155' : '#94A3B8'}}>{debtEDueDate || 'Select Due Date'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Goal Modal ── */}
      <Modal visible={editingGoal !== null} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={()=>setEditingGoal(null)}><Text style={{fontSize:16, color:'#64748B'}}>Cancel</Text></TouchableOpacity>
            <Text style={{fontSize:18, fontWeight:'700'}}>Edit Goal</Text>
            <TouchableOpacity onPress={handleUpdateGoalProps}><Text style={{fontSize:16, fontWeight:'700', color:'#3B82F6'}}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={{padding:20}}>
            <TextInput style={dynamicStyles.titleInput} placeholder="Goal Title" value={goalETitle} onChangeText={setGoalETitle} />
            <TextInput style={dynamicStyles.input} placeholder="Target Amount" keyboardType="numeric" value={goalETarget} onChangeText={setGoalETarget} />
            <TextInput style={dynamicStyles.input} placeholder="Description" value={goalEDesc} onChangeText={setGoalEDesc} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}



