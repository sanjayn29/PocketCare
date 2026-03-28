import FloatingActionButton from '@/components/FloatingActionButton';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
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
  const [filterDateStart, setFilterDateStart] = useState<Date | null>(null);
  const [filterDateEnd, setFilterDateEnd] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

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
          if (filterDateStart && filterDateEnd) {
            const startDay = new Date(filterDateStart.getFullYear(), filterDateStart.getMonth(), filterDateStart.getDate());
            const endDay = new Date(filterDateEnd.getFullYear(), filterDateEnd.getMonth(), filterDateEnd.getDate());
            if (groupDay < startDay || groupDay > endDay) return false;
          }
        }
      }

      return true;
    });
    combined.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return combined;
  }, [histories, historyFilterType, historyFilterDate, filterDateStart, filterDateEnd]);

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
      const output = Function(`"use strict"; return (${expression})`)();

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

  const renderHistoryGroup = ({ item }: { item: CalculationHistoryGroup }) => {
    const isBasicCalc = item.entries[0]?.type === ('basic_calculation' as any);

    return (
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyTitle}>{item.title}</Text>
            <Text style={styles.historyMeta}>{item.entries.length} calculation(s)</Text>
          </View>

          <TouchableOpacity style={styles.iconBtn} onPress={() => handleRenameGroup(item)}>
            <Ionicons name="create-outline" size={18} color="#1D4ED8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => isBasicCalc ? handleDeleteBasicGroup(item) : handleDeleteGroup(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>

        {(item.entries || []).map((entry) => (
          <View key={entry.id} style={styles.entryRow}>
            <View style={{ flex: 1 }}>
              {isBasicCalc ? (
                <>
                  <Text style={styles.entryType}>Basic Calculation</Text>
                  <Text style={styles.entryText}>{(entry as any).expression || 'N/A'}</Text>
                  <Text style={styles.entryResult}>Result: {entry.total_amount}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.entryType}>
                    {entry.type === 'simple_interest' ? 'Simple Interest' : 'Compound Interest'}
                  </Text>
                  <Text style={styles.entryText}>
                    P: {entry.principal} | R: {entry.rate}% | T: {entry.time}y
                    {entry.type === 'compound_interest' && entry.compounds_per_year
                      ? ` | N: ${entry.compounds_per_year}`
                      : ''}
                  </Text>
                  <Text style={styles.entryResult}>Interest: {entry.interest} | Total: {entry.total_amount}</Text>
                </>
              )}
            </View>

            <TouchableOpacity onPress={() => handleDeleteEntry(item.id, entry)}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>Calculator</Text>
        <Text style={styles.pageSubTitle}>Simple & Compound Interest or Basic Calculations</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'basic' && styles.tabActive]}
          onPress={() => setActiveTab('basic')}
        >
          <Ionicons
            name="calculator-outline"
            size={18}
            color={activeTab === 'basic' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.tabText, activeTab === 'basic' && styles.tabTextActive]}>
            Basic
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'interest' && styles.tabActive]}
          onPress={() => setActiveTab('interest')}
        >
          <Ionicons
            name="trending-up-outline"
            size={18}
            color={activeTab === 'interest' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.tabText, activeTab === 'interest' && styles.tabTextActive]}>
            Interest (SI/CI)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="list-outline"
            size={18}
            color={activeTab === 'history' ? '#FFFFFF' : '#64748B'}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
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
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.basicCalculatorWrapper}>
              <Text style={styles.sectionTitle}>Basic Calculator</Text>
              <Text style={styles.sectionSubtitle}>Perform quick arithmetic calculations</Text>

              <View style={styles.formCard}>
                <TextInput
                  style={styles.input}
                  value={basicTitle}
                  onChangeText={setBasicTitle}
                  placeholder="Topic/Title (Example: Monthly Expenses)"
                  placeholderTextColor="#94A3B8"
                />

                <TextInput
                  style={styles.input}
                  value={basicExpression}
                  onChangeText={setBasicExpression}
                  placeholder="Enter expression (Example: 25+5*2-10/2)"
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.operatorRow}>
                  {['7', '8', '9', '/'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={styles.operatorBtn}
                      onPress={() => appendToExpression(token)}
                    >
                      <Text style={styles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.operatorRow}>
                  {['4', '5', '6', '*'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={styles.operatorBtn}
                      onPress={() => appendToExpression(token)}
                    >
                      <Text style={styles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.operatorRow}>
                  {['1', '2', '3', '-'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={styles.operatorBtn}
                      onPress={() => appendToExpression(token)}
                    >
                      <Text style={styles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.operatorRow}>
                  {['0', '.', '+'].map((token) => (
                    <TouchableOpacity
                      key={token}
                      style={styles.operatorBtn}
                      onPress={() => appendToExpression(token)}
                    >
                      <Text style={styles.operatorBtnText}>{token}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity style={[styles.operatorBtn, styles.equalsBtn]} onPress={handleBasicCalculation} disabled={basicSaving}>
                    <Text style={[styles.operatorBtnText, styles.equalsBtnText]}>=</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.operatorRow}>
                  <TouchableOpacity style={[styles.operatorBtn, styles.clearBtn]} onPress={clearExpression}>
                    <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={[styles.utilityBtnText, { color: '#FFFFFF' }]}>Clear</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.operatorBtn, styles.deleteBtn]} onPress={backspaceExpression}>
                    <Ionicons name="backspace-outline" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={[styles.utilityBtnText, { color: '#FFFFFF' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>

                {basicResult !== null && (
                  <View style={styles.basicResultWrap}>
                    <Text style={styles.basicResultLabel}>Result</Text>
                    <Text style={styles.basicResultValue}>{basicResult}</Text>
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
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View style={styles.formCard}>
                <Text style={styles.interestFormTitle}>Calculate Interest</Text>
                
                <View style={styles.segmentRow}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, calcType === 'simple_interest' && styles.segmentBtnActive]}
                    onPress={() => setCalcType('simple_interest')}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        calcType === 'simple_interest' && styles.segmentBtnTextActive,
                      ]}
                    >
                      Simple Interest
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.segmentBtn, calcType === 'compound_interest' && styles.segmentBtnActive]}
                    onPress={() => setCalcType('compound_interest')}
                  >
                    <Text
                      style={[
                        styles.segmentBtnText,
                        calcType === 'compound_interest' && styles.segmentBtnTextActive,
                      ]}
                    >
                      Compound Interest
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="History Title (Example: Home Loan)"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={styles.input}
                  value={principal}
                  onChangeText={setPrincipal}
                  keyboardType="numeric"
                  placeholder="Principal Amount"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={styles.input}
                  value={rate}
                  onChangeText={setRate}
                  keyboardType="numeric"
                  placeholder="Rate (% per year)"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  keyboardType="numeric"
                  placeholder="Time (years)"
                  placeholderTextColor="#94A3B8"
                />

                {calcType === 'compound_interest' && (
                  <TextInput
                    style={styles.input}
                    value={compoundsPerYear}
                    onChangeText={setCompoundsPerYear}
                    keyboardType="numeric"
                    placeholder="Compounds Per Year (N)"
                    placeholderTextColor="#94A3B8"
                  />
                )}

                <TouchableOpacity style={styles.calculateBtn} onPress={handleCalculateAndSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.calculateBtnText}>Calculate & Save</Text>
                  )}
                </TouchableOpacity>

                {result && (
                  <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>Interest</Text>
                    <Text style={styles.resultValue}>{result.interest.toFixed(2)}</Text>

                    <Text style={[styles.resultLabel, { marginTop: 8 }]}>Total Amount</Text>
                    <Text style={styles.resultValue}>{result.totalAmount.toFixed(2)}</Text>
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
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <Text style={styles.sectionTitle}>All Calculation History</Text>
              <Text style={styles.sectionSubtitle}>View all your calculations in one place</Text>

              {/* Filter by Type */}
              <View style={styles.filterContainer}>
                <Text style={styles.filterLabel}>Filter by Type</Text>
                <View style={styles.filterRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterBtn,
                      historyFilterType === 'all' && styles.filterBtnActive,
                    ]}
                    onPress={() => setHistoryFilterType('all')}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        historyFilterType === 'all' && styles.filterBtnTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterBtn,
                      historyFilterType === 'basic_calculation' && styles.filterBtnActive,
                    ]}
                    onPress={() => setHistoryFilterType('basic_calculation')}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        historyFilterType === 'basic_calculation' && styles.filterBtnTextActive,
                      ]}
                    >
                      Basic
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterBtn,
                      historyFilterType === 'simple_interest' && styles.filterBtnActive,
                    ]}
                    onPress={() => setHistoryFilterType('simple_interest')}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        historyFilterType === 'simple_interest' && styles.filterBtnTextActive,
                      ]}
                    >
                      Simple
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterBtn,
                      historyFilterType === 'compound_interest' && styles.filterBtnActive,
                    ]}
                    onPress={() => setHistoryFilterType('compound_interest')}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        historyFilterType === 'compound_interest' && styles.filterBtnTextActive,
                      ]}
                    >
                      Compound
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Filter by Date */}
              <View style={styles.filterContainer}>
                <Text style={styles.filterLabel}>Filter by Date</Text>
                <View style={styles.filterRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterBtn,
                      historyFilterDate === 'all' && styles.filterBtnActive,
                    ]}
                    onPress={() => {
                      setHistoryFilterDate('all');
                      setFilterDateStart(null);
                      setFilterDateEnd(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        historyFilterDate === 'all' && styles.filterBtnTextActive,
                      ]}
                    >
                      All Time
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterBtn,
                      historyFilterDate === 'today' && styles.filterBtnActive,
                    ]}
                    onPress={() => {
                      setHistoryFilterDate('today');
                      setFilterDateStart(null);
                      setFilterDateEnd(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        historyFilterDate === 'today' && styles.filterBtnTextActive,
                      ]}
                    >
                      Today
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterBtn,
                      historyFilterDate === 'week' && styles.filterBtnActive,
                    ]}
                    onPress={() => {
                      setHistoryFilterDate('week');
                      setFilterDateStart(null);
                      setFilterDateEnd(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        historyFilterDate === 'week' && styles.filterBtnTextActive,
                      ]}
                    >
                      Week
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterBtn,
                      historyFilterDate === 'custom' && styles.filterBtnActive,
                    ]}
                    onPress={() => setHistoryFilterDate('custom')}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={historyFilterDate === 'custom' ? '#FFFFFF' : '#64748B'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.filterBtnText,
                        historyFilterDate === 'custom' && styles.filterBtnTextActive,
                      ]}
                    >
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Date Picker */}
                {historyFilterDate === 'custom' && (
                  <View style={styles.customDateContainer}>
                    <TouchableOpacity
                      style={styles.dateInputBtn}
                      onPress={() => {
                        setDatePickerMode('start');
                        setShowDatePicker(true);
                      }}
                    >
                      <Ionicons name="calendar" size={18} color="#1D4ED8" />
                      <Text style={styles.dateInputBtnText}>
                        Start: {filterDateStart ? filterDateStart.toLocaleDateString() : 'Select date'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dateInputBtn}
                      onPress={() => {
                        setDatePickerMode('end');
                        setShowDatePicker(true);
                      }}
                    >
                      <Ionicons name="calendar" size={18} color="#1D4ED8" />
                      <Text style={styles.dateInputBtnText}>
                        End: {filterDateEnd ? filterDateEnd.toLocaleDateString() : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator size="large" color="#1D4ED8" />
              </View>
            ) : (
              <View style={styles.centerWrap}>
                <Ionicons name="document-text-outline" size={56} color="#CBD5E1" />
                <Text style={styles.emptyText}>No calculation history yet.</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename History Title</Text>
            <TextInput
              style={styles.input}
              value={renameTitle}
              onChangeText={setRenameTitle}
              placeholder="Enter title"
              placeholderTextColor="#94A3B8"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRenameVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveRename} disabled={renaming}>
                {renaming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {datePickerMode === 'start' ? 'Select Start Date' : 'Select End Date'}
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContent}>
              <View style={styles.monthYearSelector}>
                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={() => {
                    const currentDate = datePickerMode === 'start' ? (filterDateStart || new Date()) : (filterDateEnd || new Date());
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    if (datePickerMode === 'start') {
                      setFilterDateStart(newDate);
                    } else {
                      setFilterDateEnd(newDate);
                    }
                  }}
                >
                  <Text style={styles.monthNavBtnText}>←</Text>
                </TouchableOpacity>

                <Text style={styles.monthYearText}>
                  {(datePickerMode === 'start' ? (filterDateStart || new Date()) : (filterDateEnd || new Date())).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </Text>

                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={() => {
                    const currentDate = datePickerMode === 'start' ? (filterDateStart || new Date()) : (filterDateEnd || new Date());
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    if (datePickerMode === 'start') {
                      setFilterDateStart(newDate);
                    } else {
                      setFilterDateEnd(newDate);
                    }
                  }}
                >
                  <Text style={styles.monthNavBtnText}>→</Text>
                </TouchableOpacity>
              </View>

              {/* Simple Date Input */}
              <View style={styles.dateInputWrapper}>
                <Text style={styles.dateInputLabel}>Quick Select</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  value={
                    datePickerMode === 'start'
                      ? filterDateStart?.toISOString().split('T')[0] || ''
                      : filterDateEnd?.toISOString().split('T')[0] || ''
                  }
                  onChangeText={(text) => {
                    try {
                      const date = new Date(text + 'T00:00:00');
                      if (!isNaN(date.getTime())) {
                        if (datePickerMode === 'start') {
                          setFilterDateStart(date);
                        } else {
                          setFilterDateEnd(date);
                        }
                      }
                    } catch (e) {
                      // Invalid date format
                    }
                  }}
                />
              </View>
            </View>

            <View style={styles.datePickerActions}>
              <TouchableOpacity
                style={styles.datePickerCancelBtn}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmBtn}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerArea: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  pageSubTitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // Section Titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 12,
  },
  interestFormTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  segmentBtnText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  calculateBtn: {
    marginTop: 4,
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  calculateBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  resultCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  resultLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '700',
  },
  resultValue: {
    marginTop: 2,
    fontSize: 20,
    color: '#1D4ED8',
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
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  equalsBtn: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  equalsBtnText: {
    color: '#FFFFFF',
  },
  clearBtn: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
    flexDirection: 'row',
  },
  deleteBtn: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
    flexDirection: 'row',
  },
  utilityBtnText: {
    color: '#334155',
    fontWeight: '800',
    fontSize: 13,
  },
  basicResultWrap: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  basicResultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  basicResultValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    color: '#10B981',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
  },
  historyMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  iconBtn: {
    padding: 6,
    marginLeft: 6,
  },
  entryRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  entryType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  entryText: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  entryResult: {
    marginTop: 2,
    fontSize: 12,
    color: '#0F172A',
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
    color: '#64748B',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#64748B',
    fontWeight: '700',
  },
  modalSaveBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 84,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  filterBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  customDateContainer: {
    marginTop: 12,
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  dateInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  dateInputBtnText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
  },
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 'auto',
    paddingTop: 16,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  datePickerContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  monthYearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 8,
  },
  monthNavBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthNavBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  monthYearText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateInputWrapper: {
    gap: 6,
  },
  dateInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  datePickerCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  datePickerCancelText: {
    color: '#64748B',
    fontWeight: '700',
  },
  datePickerConfirmBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
