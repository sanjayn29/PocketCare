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
import Navbar from './navbar';

type Result = {
  interest: number;
  totalAmount: number;
};

export default function CalculatorScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

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

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    loadHistory();
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

  const parsedInputs = useMemo(() => {
    const p = Number(principal);
    const r = Number(rate);
    const t = Number(time);
    const n = Number(compoundsPerYear);
    return { p, r, t, n };
  }, [principal, rate, time, compoundsPerYear]);

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
        },
      },
    ]);
  };

  const renderHistoryGroup = ({ item }: { item: CalculationHistoryGroup }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.historyTitle}>{item.title}</Text>
          <Text style={styles.historyMeta}>{item.entries.length} calculation(s)</Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => handleRenameGroup(item)}>
          <Ionicons name="create-outline" size={18} color="#1D4ED8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteGroup(item)}>
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {(item.entries || []).map((entry) => (
        <View key={entry.id} style={styles.entryRow}>
          <View style={{ flex: 1 }}>
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
          </View>

          <TouchableOpacity onPress={() => handleDeleteEntry(item.id, entry)}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Navbar />

      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>Finance Calculator</Text>
        <Text style={styles.pageSubTitle}>Simple Interest + Compound Interest with history</Text>
      </View>

      <FlatList
        data={histories}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryGroup}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.formCard}>
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
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator size="large" color="#1D4ED8" />
            </View>
          ) : (
            <View style={styles.centerWrap}>
              <Ionicons name="calculator-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyText}>No calculation history yet.</Text>
            </View>
          )
        }
      />

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
    marginTop: 20,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
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
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    padding: 12,
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
});
