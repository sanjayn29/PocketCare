
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated,
  FlatList,
  Keyboard, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import {
  CompanyStatus,
  Placement, PlacementRound, PlacementStatus,
  addPlacement, deletePlacement, getPlacements, updatePlacement,
} from '../../lib/placement-service';

// ─── Config ───────────────────────────────────────────────────────────────────

type TabView = 'placements' | 'companies';

// Dynamic config based on theme
const getStatusConfig = (colors: any): Record<PlacementStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> => ({
  applied:   { label: 'Applied',   color: '#F59E0B', bg: colors.overlay, icon: 'paper-plane' },
  interview: { label: 'Interview', color: colors.warning, bg: colors.overlay, icon: 'mic' },
  offer:     { label: 'Offer',     color: colors.success, bg: colors.overlay, icon: 'trophy' },
  rejected:  { label: 'Rejected',  color: colors.danger, bg: colors.overlay, icon: 'close-circle' },
});

const getCompanyStatusConfig = (colors: any): Record<CompanyStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> => ({
  present:   { label: 'Present',   color: colors.primary, bg: colors.overlay, icon: 'checkmark-circle' },
  completed: { label: 'Completed', color: colors.success, bg: colors.overlay, icon: 'checkmark-done' },
  upcoming:  { label: 'Upcoming',  color: colors.warning, bg: colors.overlay, icon: 'calendar' },
});

const getRoundResultConfig = (colors: any): Record<PlacementRound['result'], { label: string; color: string; bg: string }> => ({
  success:  { label: 'Cleared ✓', color: colors.success, bg: colors.overlay },
  rejected: { label: 'Rejected ✗', color: colors.danger, bg: colors.overlay },
  pending:  { label: 'Pending…',   color: colors.warning, bg: colors.overlay },
});

// ─── DatePickerInput ─────────────────────────────────────────────────────────

type DatePickerInputProps = { value: string; onChange: (v: string) => void; colors: any; styles: any };

const DatePickerInput = React.memo(({ value, onChange, colors, styles }: DatePickerInputProps) => {
  const [show, setShow] = useState(false);

  // Parse stored string → Date (fallback to today)
  const parsed = value ? new Date(value) : new Date();
  const dateObj = isNaN(parsed.getTime()) ? new Date() : parsed;

  const displayLabel = value
    ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Select Date';

  const handleChange = (_: any, selected?: Date) => {
    // On Android the picker closes itself; on iOS we hide manually
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      const yyyy = selected.getFullYear();
      const mm   = String(selected.getMonth() + 1).padStart(2, '0');
      const dd   = String(selected.getDate()).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
    }
  };

  return (
    <View>
      <TouchableOpacity style={[{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => setShow(true)} activeOpacity={0.75}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[{ fontSize: 14, fontWeight: '500', color: value ? colors.text : colors.textSecondary }]}>{displayLabel}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          maximumDate={new Date(2035, 11, 31)}
          minimumDate={new Date(2020, 0, 1)}
        />
      )}
      {show && Platform.OS === 'ios' && (
        <TouchableOpacity style={[{ padding: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }]} onPress={() => setShow(false)}>
          <Text style={[{ fontSize: 16, fontWeight: '600', color: colors.primary }]}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ─── Sub-components (defined OUTSIDE main component to prevent remounts) ──────

const RoundResultSelector = React.memo(({
  value, onChange, colors, styles
}: { value: PlacementRound['result']; onChange: (v: PlacementRound['result']) => void; colors: any; styles: any }) => {
  const ROUND_RESULT_CONFIG = getRoundResultConfig(colors);
  return (
    <View style={styles.resultRow}>
      {(['success', 'pending', 'rejected'] as PlacementRound['result'][]).map(r => {
        const active = value === r;
        const cfg = ROUND_RESULT_CONFIG[r];
        return (
          <TouchableOpacity
            key={r}
            style={[styles.resultChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
            onPress={() => onChange(r)}
          >
            <Text style={[styles.resultChipText, active && { color: '#FFF' }]}>{cfg.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const RoundCard = React.memo(({
  round, onDelete, onResultChange, colors, styles,
}: { round: PlacementRound; onDelete?: () => void; onResultChange?: (v: PlacementRound['result']) => void; colors: any; styles: any }) => {
  const cfg = getRoundResultConfig(colors)[round.result];
  return (
    <View style={styles.roundCard}>
      <View style={styles.roundHeader}>
        <View style={[styles.roundDotLarge, { backgroundColor: cfg.color }]} />
        <Text style={styles.roundTopic}>{round.topic}</Text>
        <View style={[styles.roundResultBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.roundResultText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={{ marginLeft: 6 }}>
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
      {round.description ? <Text style={styles.roundDesc}>{round.description}</Text> : null}
      {onResultChange && <RoundResultSelector value={round.result} onChange={onResultChange} colors={colors} styles={styles} />}
    </View>
  );
});

// ── AddRoundForm — also outside to prevent keyboard dismiss ──────────────────
type AddRoundFormProps = {
  topic: string; setTopic: (v: string) => void;
  desc: string; setDesc: (v: string) => void;
  result: PlacementRound['result']; setResult: (v: PlacementRound['result']) => void;
  onAdd: () => void; onCancel: () => void; colors: any; styles: any;
};
const AddRoundForm = React.memo(({ topic, setTopic, desc, setDesc, result, setResult, onAdd, onCancel, colors, styles }: AddRoundFormProps) => (
  <View style={styles.addRoundForm}>
    <TextInput
      style={styles.input}
      placeholder="Round Topic (e.g. Technical Round 1)"
      placeholderTextColor={colors.textSecondary}
      value={topic}
      onChangeText={setTopic}
    />
    <TextInput
      style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
      placeholder="Notes / What was asked…"
      placeholderTextColor={colors.textSecondary}
      multiline
      value={desc}
      onChangeText={setDesc}
    />
    <Text style={styles.selectorLabel}>Result:</Text>
    <RoundResultSelector value={result} onChange={setResult} colors={colors} styles={styles} />
    <View style={styles.rowBtns}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.saveBtn} onPress={onAdd}>
        <Text style={styles.saveBtnText}>Add Round</Text>
      </TouchableOpacity>
    </View>
  </View>
));

// ── CreateCard — extracted so FlatList doesn't remount it ────────────────────
type CreateCardProps = {
  isCreating: boolean; setIsCreating: (v: boolean) => void;
  newCompany: string; setNewCompany: (v: string) => void;
  newStatus: PlacementStatus; setNewStatus: (v: PlacementStatus) => void;
  newCompanyStatus?: CompanyStatus; setNewCompanyStatus: (v?: CompanyStatus) => void;
  newDate: string; setNewDate: (v: string) => void;
  newStudied: boolean; setNewStudied: (v: boolean) => void;
  newRounds: PlacementRound[];
  removeRoundFromNew: (id: string) => void;
  showAddRound: boolean; setShowAddRound: (v: boolean) => void;
  roundTopic: string; setRoundTopic: (v: string) => void;
  roundDesc: string; setRoundDesc: (v: string) => void;
  roundResult: PlacementRound['result']; setRoundResult: (v: PlacementRound['result']) => void;
  addRoundToNew: () => void;
  handleSave: () => void;
  isSavingNew: boolean;
  resetCreate: () => void;
  colors: any;
  styles: any;
  activeTab: 'placements' | 'companies';
};

const CreateCard = React.memo(({
  isCreating, setIsCreating,
  newCompany, setNewCompany,
  newStatus, setNewStatus,
  newCompanyStatus, setNewCompanyStatus,
  newDate, setNewDate,
  newStudied, setNewStudied,
  newRounds, removeRoundFromNew,
  showAddRound, setShowAddRound,
  roundTopic, setRoundTopic,
  roundDesc, setRoundDesc,
  roundResult, setRoundResult,
  addRoundToNew,
  handleSave, isSavingNew, resetCreate,
  colors,
  styles,
  activeTab,
}: CreateCardProps) => {
  const STATUS_CONFIG = getStatusConfig(colors);
  const ROUND_RESULT_CONFIG = getRoundResultConfig(colors);

  return (
  <View style={styles.createCard}>
    {isCreating ? (
      <View style={styles.createExpanded}>
        <TextInput
          style={styles.createTitleInput}
          placeholder="Company Name"
          placeholderTextColor={colors.textSecondary}
          value={newCompany}
          onChangeText={setNewCompany}
          autoFocus
        />
        <DatePickerInput value={newDate} onChange={setNewDate} colors={colors} styles={styles} />

        <Text style={styles.selectorLabel}>Application Status:</Text>
        <View style={styles.statusRow}>
          {(['interview', 'offer', 'rejected'] as PlacementStatus[]).map(s => {
            const cfg = getStatusConfig(colors)[s];
            const active = newStatus === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.statusChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                onPress={() => setNewStatus(s)}
              >
                <Ionicons name={cfg.icon} size={13} color={active ? '#FFF' : cfg.color} style={{ marginRight: 4 }} />
                <Text style={[styles.statusChipText, active && { color: '#FFF' }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.selectorLabel}>Company Status:</Text>
        <View style={styles.statusRow}>
          {(['present', 'completed', 'upcoming'] as CompanyStatus[]).map(s => {
            const cfg = getCompanyStatusConfig(colors)[s];
            const active = newCompanyStatus === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.statusChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                onPress={() => setNewCompanyStatus(s)}
              >
                <Ionicons name={cfg.icon} size={13} color={active ? '#FFF' : cfg.color} style={{ marginRight: 4 }} />
                <Text style={[styles.statusChipText, active && { color: '#FFF' }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>📚 Studied for this?</Text>
          <Switch
            value={newStudied}
            onValueChange={setNewStudied}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#FFF'}
          />
        </View>

        <Text style={styles.selectorLabel}>Interview Rounds:</Text>
        {newRounds.map(r => (
          <RoundCard key={r.id} round={r} onDelete={() => removeRoundFromNew(r.id)} colors={colors} styles={styles} />
        ))}

        {showAddRound ? (
          <AddRoundForm
            topic={roundTopic} setTopic={setRoundTopic}
            desc={roundDesc} setDesc={setRoundDesc}
            result={roundResult} setResult={setRoundResult}
            onAdd={addRoundToNew} onCancel={() => setShowAddRound(false)} colors={colors} styles={styles}
          />
        ) : (
          <TouchableOpacity style={styles.addRoundBtn} onPress={() => setShowAddRound(true)}>
            <Ionicons name="add-circle-outline" size={17} color={colors.primary} />
            <Text style={styles.addRoundBtnText}>Add Interview Round</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.rowBtns, { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={resetCreate}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSavingNew}>
            {isSavingNew
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.saveBtnText}>Save Application</Text>}
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <TouchableOpacity style={styles.createCollapsed} onPress={() => setIsCreating(true)}>
        <View style={styles.createIconWrap}>
          <Ionicons name="briefcase-outline" size={20} color={activeTab === 'placements' ? '#3B82F6' : '#10B981'} />
        </View>
        <Text style={styles.createCollapsedText}>Track a new company application…</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    )}
  </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PlacementScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);

  // Multi-color palette for premium feel
  const uiColors = {
    placements: '#3B82F6',    // Blue
    companies: '#10B981',     // Green
  };

  const backButtonScale = useRef(new Animated.Value(1)).current;
  const [fontsLoaded] = useFonts({
    'Roboto Slab': require('../../assets/Font/RobotoSlab-VariableFont_wght.ttf'),
  });

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
    ).start();
  }, [backButtonScale]);

  // ── State ──
  const [activeTab, setActiveTab] = useState<TabView>('placements');
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PlacementStatus | 'all'>('all');
  const [companyStatusFilter, setCompanyStatusFilter] = useState<CompanyStatus | 'all'>('all');

  // Dynamic styles based on theme
  const styles = useMemo(() => getStyles(colors, isDark, activeTab), [colors, isDark, activeTab]);

  // ── Helper: Convert hex color to rgba ──
  const getRgbaColor = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // ── Create state ──
  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newStatus, setNewStatus]   = useState<PlacementStatus>('interview');
  const [newCompanyStatus, setNewCompanyStatus] = useState<CompanyStatus | undefined>(undefined);
  const [newDate, setNewDate]       = useState('');
  const [newStudied, setNewStudied] = useState(false);
  const [newRounds, setNewRounds]   = useState<PlacementRound[]>([]);
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [showAddRound, setShowAddRound] = useState(false);
  const [roundTopic, setRoundTopic]     = useState('');
  const [roundDesc, setRoundDesc]       = useState('');
  const [roundResult, setRoundResult]   = useState<PlacementRound['result']>('pending');

  // ── Edit Modal state ──
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing]           = useState<Placement | null>(null);
  const [editCompany, setEditCompany]   = useState('');
  const [editStatus, setEditStatus]     = useState<PlacementStatus>('interview');
  const [editCompanyStatus, setEditCompanyStatus] = useState<CompanyStatus | undefined>(undefined);
  const [editDate, setEditDate]         = useState('');
  const [editStudied, setEditStudied]   = useState(false);
  const [editRounds, setEditRounds]     = useState<PlacementRound[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showEditAddRound, setShowEditAddRound] = useState(false);
  const [eRoundTopic, setERoundTopic]           = useState('');
  const [eRoundDesc, setERoundDesc]             = useState('');
  const [eRoundResult, setERoundResult]         = useState<PlacementRound['result']>('pending');

  // ─────────────────────────────────────────────────────────────────────────

  // Dynamic styles based on theme
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      borderWidth: 1.5,
      borderColor: activeTab === 'placements' ? uiColors.placements : uiColors.companies,
    },
    backButtonText: {
      fontSize: 22,
      color: isDark ? '#FFFFFF' : '#000000',
      marginTop: -2,
    },
    pageTitle: {
      fontSize: 24,
      fontFamily: 'Roboto Slab',
      fontWeight: '400',
      color: isDark ? '#FFFFFF' : '#000000',
      letterSpacing: -0.5,
    },
    pageSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 6,
    },
    tabRow: {
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
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    tabTextActivePlacements: { color: uiColors.placements, fontWeight: '900' },
    tabTextActiveCompanies: { color: uiColors.companies, fontWeight: '900' },
    activeIndicatorPlacements: {
      position: 'absolute', bottom: -8, width: '60%', height: 3, backgroundColor: uiColors.placements, borderRadius: 2,
      shadowColor: uiColors.placements, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    },
    activeIndicatorCompanies: {
      position: 'absolute', bottom: -8, width: '60%', height: 3, backgroundColor: uiColors.companies, borderRadius: 2,
      shadowColor: uiColors.companies, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    },
  }), [colors, isDark, activeTab]);

  useEffect(() => {
    if (email) loadPlacements();
    else setLoading(false);
  }, [email]);

  const loadPlacements = async () => {
    if (!email) return;
    try {
      const fetched = await getPlacements(email);
      fetched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPlacements(fetched);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleRefresh = () => { setRefreshing(true); loadPlacements(); };

  // ── Auto-status helper ──
  // Derives the best application status from a list of rounds.
  const deriveStatus = (rounds: PlacementRound[]): PlacementStatus => {
    if (rounds.length === 0) return 'applied';
    if (rounds.some(r => r.result === 'rejected')) return 'rejected';
    if (rounds.every(r => r.result === 'success'))  return 'offer';
    return 'interview';
  };

  // ── Stable callbacks ── (useCallback prevents CreateCard remounting)

  const addRoundToNew = useCallback(() => {
    if (!roundTopic.trim()) return Alert.alert('Error', 'Round topic is required.');
    const newRound: PlacementRound = {
      id: Date.now().toString(), topic: roundTopic.trim(),
      description: roundDesc.trim(), result: roundResult,
    };
    setNewRounds(prev => {
      const updated = [...prev, newRound];
      setNewStatus(deriveStatus(updated));
      return updated;
    });
    setRoundTopic(''); setRoundDesc(''); setRoundResult('pending');
    setShowAddRound(false); Keyboard.dismiss();
  }, [roundTopic, roundDesc, roundResult]);

  const removeRoundFromNew = useCallback((id: string) =>
    setNewRounds(prev => prev.filter(r => r.id !== id)), []);

  const handleSave = useCallback(async () => {
    if (!email) return;
    if (!newCompany.trim()) return Alert.alert('Error', 'Company name is required.');
    if (!newDate.trim()) return Alert.alert('Error', 'Date is required (YYYY-MM-DD).');
    setIsSavingNew(true);
    try {
      await addPlacement(email, newCompany.trim(), newStatus, newDate.trim(), newStudied, newRounds, newCompanyStatus);
      setNewCompany(''); setNewStatus('interview'); setNewCompanyStatus(undefined); setNewDate('');
      setNewStudied(false); setNewRounds([]);
      setRoundTopic(''); setRoundDesc(''); setRoundResult('pending');
      setShowAddRound(false); setIsCreating(false); Keyboard.dismiss();
      loadPlacements();
    } catch { Alert.alert('Error', 'Failed to save placement.'); }
    finally { setIsSavingNew(false); }
  }, [email, newCompany, newStatus, newCompanyStatus, newDate, newStudied, newRounds]);

  const resetCreate = useCallback(() => {
    setNewCompany(''); setNewStatus('interview'); setNewCompanyStatus(undefined); setNewDate('');
    setNewStudied(false); setNewRounds([]);
    setRoundTopic(''); setRoundDesc(''); setRoundResult('pending');
    setShowAddRound(false); setIsCreating(false); Keyboard.dismiss();
  }, []);

  // ── Edit handlers ──

  const openEdit = (p: Placement) => {
    setEditing(p); setEditCompany(p.company_name);
    setEditStatus(p.status); setEditCompanyStatus(p.company_status); setEditDate(p.date);
    setEditStudied(p.studied); setEditRounds([...p.rounds]);
    setShowEditAddRound(false); setERoundTopic(''); setERoundDesc(''); setERoundResult('pending');
    setModalVisible(true);
  };

  const addRoundToEdit = () => {
    if (!eRoundTopic.trim()) return Alert.alert('Error', 'Round topic is required.');
    const newRound: PlacementRound = {
      id: Date.now().toString(), topic: eRoundTopic.trim(),
      description: eRoundDesc.trim(), result: eRoundResult,
    };
    setEditRounds(prev => {
      const updated = [...prev, newRound];
      setEditStatus(deriveStatus(updated));
      return updated;
    });
    setERoundTopic(''); setERoundDesc(''); setERoundResult('pending');
    setShowEditAddRound(false);
  };

  const updateEditRoundResult = (id: string, result: PlacementRound['result']) => {
    setEditRounds(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, result } : r);
      setEditStatus(deriveStatus(updated));
      return updated;
    });
  };

  const removeEditRound = (id: string) => setEditRounds(prev => prev.filter(r => r.id !== id));

  const handleSaveEdit = async () => {
    if (!email || !editing) return;
    if (!editCompany.trim()) return Alert.alert('Error', 'Company name is required.');
    setIsSavingEdit(true);
    try {
      await updatePlacement(email, editing.id, {
        company_name: editCompany.trim(), status: editStatus, company_status: editCompanyStatus,
        date: editDate.trim(), studied: editStudied, rounds: editRounds,
      });
      setModalVisible(false); loadPlacements();
    } catch { Alert.alert('Error', 'Failed to update placement.'); }
    finally { setIsSavingEdit(false); }
  };

  const handleDelete = (id: string) => {
    if (!email) return;
    Alert.alert('Delete Application', 'Remove this company application?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deletePlacement(email, id); loadPlacements(); } },
    ]);
  };

  // ── Counts for filter badges ──
  const counts = useMemo(() => ({
    all: placements.length,
    applied:   placements.filter(p => p.status === 'applied').length,
    interview: placements.filter(p => p.status === 'interview').length,
    offer:     placements.filter(p => p.status === 'offer').length,
    rejected:  placements.filter(p => p.status === 'rejected').length,
  }), [placements]);

  // Filtered placements by application status
  const filteredPlacements = useMemo(() =>
    filterStatus === 'all' 
      ? placements 
      : placements.filter(p => p.status === filterStatus),
    [placements, filterStatus]
  );

  // Filtered companies by company status
  const filteredCompanies = useMemo(() => {
    const withCompanyStatus = placements.filter(p => p.company_status);
    return companyStatusFilter === 'all'
      ? withCompanyStatus
      : withCompanyStatus.filter(p => p.company_status === companyStatusFilter);
  }, [placements, companyStatusFilter]);

  // ── Memoize header so FlatList doesn't remount it ──
  const listHeader = useMemo(() => (
    <CreateCard
      isCreating={isCreating} setIsCreating={setIsCreating}
      newCompany={newCompany} setNewCompany={setNewCompany}
      newStatus={newStatus} setNewStatus={setNewStatus}
      newCompanyStatus={newCompanyStatus} setNewCompanyStatus={setNewCompanyStatus}
      newDate={newDate} setNewDate={setNewDate}
      newStudied={newStudied} setNewStudied={setNewStudied}
      newRounds={newRounds} removeRoundFromNew={removeRoundFromNew}
      showAddRound={showAddRound} setShowAddRound={setShowAddRound}
      roundTopic={roundTopic} setRoundTopic={setRoundTopic}
      roundDesc={roundDesc} setRoundDesc={setRoundDesc}
      roundResult={roundResult} setRoundResult={setRoundResult}
      addRoundToNew={addRoundToNew}
      handleSave={handleSave} isSavingNew={isSavingNew} resetCreate={resetCreate}
      colors={colors}
      styles={styles}
      activeTab={activeTab}
    />
  ), [
    isCreating, newCompany, newStatus, newCompanyStatus, newDate, newStudied, newRounds,
    showAddRound, roundTopic, roundDesc, roundResult,
    addRoundToNew, removeRoundFromNew, handleSave, isSavingNew, resetCreate, colors, styles, isDark, activeTab
  ]);

  // ── Placement card render ──
  const renderPlacement = useCallback(({ item }: { item: Placement }) => {
    const cfg = getStatusConfig(colors)[item.status];
    const companyCfg = item.company_status ? getCompanyStatusConfig(colors)[item.company_status] : null;
    const roundsDone = item.rounds.filter(r => r.result === 'success').length;
    const ROUND_RESULT_CONFIG = getRoundResultConfig(colors);
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.cardMain} onPress={() => openEdit(item)} activeOpacity={0.75}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.companyName, { color: colors.text }]} numberOfLines={1}>{item.company_name}</Text>
              <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{item.date || '—'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={12} color={cfg.color} style={{ marginRight: 4 }} />
              <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {companyCfg && (
              <View style={[styles.metaChip, { backgroundColor: companyCfg.bg }]}>
                <Ionicons name={companyCfg.icon} size={13} color={companyCfg.color} />
                <Text style={[styles.metaChipText, { color: companyCfg.color }]}>
                  {companyCfg.label}
                </Text>
              </View>
            )}
            <View style={[styles.metaChip, { backgroundColor: item.studied ? (isDark ? '#1e563f' : '#ECFDF5') : colors.card, borderColor: isDark ? colors.border : undefined, borderWidth: isDark ? 1 : 0 }]}>
              <Ionicons name={item.studied ? 'checkmark-circle' : 'close-circle-outline'} size={13} color={item.studied ? colors.success : colors.textSecondary} />
              <Text style={[styles.metaChipText, { color: item.studied ? colors.success : colors.textSecondary }]}>
                {item.studied ? 'Studied' : 'Not Studied'}
              </Text>
            </View>
            {item.rounds.length > 0 && (
              <View style={[styles.metaChip, { borderColor: colors.border, borderWidth: 1 }]}>
                <Ionicons name="layers-outline" size={13} color={colors.primary} />
                <Text style={[styles.metaChipText, { color: colors.primary }]}>
                  {item.rounds.length} Round{item.rounds.length > 1 ? 's' : ''} · {roundsDone} Cleared
                </Text>
              </View>
            )}
          </View>

          {item.rounds.map(r => {
            const rcfg = ROUND_RESULT_CONFIG[r.result];
            return (
              <View style={[styles.roundPreview, { borderTopColor: colors.border }]} key={r.id}>
                <View style={[styles.roundPreviewDot, { backgroundColor: rcfg.color }]} />
                <Text style={[styles.roundPreviewTopic, { color: colors.text }]} numberOfLines={1}>{r.topic}</Text>
                <Text style={[styles.roundPreviewResult, { color: rcfg.color }]}>{rcfg.label}</Text>
              </View>
            );
          })}
        </TouchableOpacity>

        <View style={styles.actionButtonsArea}>
          <TouchableOpacity style={styles.actionButton} onPress={() => openEdit(item)} hitSlop={10}>
            <Ionicons name="pencil-outline" size={20} color={activeTab === 'placements' ? uiColors.placements : uiColors.companies} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.id)} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [placements, colors, styles, isDark]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={[dynamicStyles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Page Header ── */}
      <View style={dynamicStyles.headerArea}>
        <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={dynamicStyles.headerRow}>
          <Animated.View style={{ transform: [{ scale: backButtonScale }] }}>
            <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.replace('/(tabs)')}>
              <Text style={dynamicStyles.backButtonText}>←</Text>
            </TouchableOpacity>
          </Animated.View>
          <View>
            <Text style={dynamicStyles.pageTitle}>Placement Tracker</Text>
          </View>
        </View>
      </View>

      {/* ── Tab Navigation ── */}
      <View style={dynamicStyles.tabRow}>
        <TouchableOpacity style={dynamicStyles.tab} onPress={() => setActiveTab('placements')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="list-outline" size={18} color={activeTab === 'placements' ? uiColors.placements : '#64748B'} style={{ marginRight: 8 }} />
            <Text style={[dynamicStyles.tabText, activeTab === 'placements' && dynamicStyles.tabTextActivePlacements, { marginBottom: 0 }]}>Placements</Text>
          </View>
          {activeTab === 'placements' && <View style={dynamicStyles.activeIndicatorPlacements} />}
        </TouchableOpacity>

        <TouchableOpacity style={dynamicStyles.tab} onPress={() => setActiveTab('companies')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="layers-outline" size={18} color={activeTab === 'companies' ? uiColors.companies : '#64748B'} style={{ marginRight: 8 }} />
            <Text style={[dynamicStyles.tabText, activeTab === 'companies' && dynamicStyles.tabTextActiveCompanies, { marginBottom: 0 }]}>Companies</Text>
          </View>
          {activeTab === 'companies' && <View style={dynamicStyles.activeIndicatorCompanies} />}
        </TouchableOpacity>
      </View>

      {/* ── Placements Tab ── */}
      {activeTab === 'placements' && (
        <>
          {/* Filter Bar */}
          <View style={styles.segmentBlock}>
            {(['all', 'interview', 'offer', 'rejected'] as const).map(s => {
              const active = filterStatus === s;
              const label = s === 'all' ? 'All' : getStatusConfig(colors)[s].label;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.segmentBtn, active && { backgroundColor: getRgbaColor('#3B82F6', isDark ? 0.15 : 0.1), borderColor: '#3B82F6', borderWidth: 1 }]}
                  onPress={() => setFilterStatus(s)}
                >
                  <Text style={[styles.segmentText, active && { color: '#3B82F6', fontWeight: '700' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <FlatList
              data={filteredPlacements}
              keyExtractor={item => item.id}
              renderItem={renderPlacement}
              ListHeaderComponent={listHeader}
              contentContainerStyle={styles.listContent}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              extraData={isDark}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="briefcase-outline" size={60} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No applications tracked yet.</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* ── Companies Tab ── */}
      {activeTab === 'companies' && (
        <>
          {/* Company Status Filter */}
          <View style={styles.segmentBlock}>
            {(['all', 'present', 'completed', 'upcoming'] as const).map(s => {
              const active = companyStatusFilter === s;
              const label = s === 'all' ? 'All' : getCompanyStatusConfig(colors)[s].label;
              const cfg = s === 'all' ? null : getCompanyStatusConfig(colors)[s];
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.segmentBtn, active && { backgroundColor: getRgbaColor('#10B981', isDark ? 0.15 : 0.1), borderColor: '#10B981', borderWidth: 1 }]}
                  onPress={() => setCompanyStatusFilter(s as any)}
                >
                  <Text style={[styles.segmentText, active && { color: '#10B981', fontWeight: '700' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (
            <FlatList
              data={filteredCompanies}
              keyExtractor={item => item.id}
              renderItem={renderPlacement}
              contentContainerStyle={styles.listContent}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              extraData={isDark}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="layers-outline" size={60} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No companies in this category.</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Application</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={styles.saveHeaderText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput style={styles.titleInput} placeholder="Company Name" value={editCompany} onChangeText={setEditCompany} />
            <DatePickerInput value={editDate} onChange={setEditDate} colors={colors} styles={styles} />

            <Text style={styles.selectorLabel}>Application Status:</Text>
            <View style={styles.statusRow}>
              {(['interview', 'offer', 'rejected'] as PlacementStatus[]).map(s => {
                const cfg = getStatusConfig(colors)[s]; const active = editStatus === s;
                return (
                  <TouchableOpacity key={s} style={[styles.statusChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]} onPress={() => setEditStatus(s)}>
                    <Ionicons name={cfg.icon} size={13} color={active ? '#FFF' : cfg.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusChipText, active && { color: '#FFF' }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.selectorLabel}>Company Status:</Text>
            <View style={styles.statusRow}>
              {(['present', 'completed', 'upcoming'] as CompanyStatus[]).map(s => {
                const cfg = getCompanyStatusConfig(colors)[s]; const active = editCompanyStatus === s;
                return (
                  <TouchableOpacity key={s} style={[styles.statusChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]} onPress={() => setEditCompanyStatus(s)}>
                    <Ionicons name={cfg.icon} size={13} color={active ? '#FFF' : cfg.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusChipText, active && { color: '#FFF' }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>📚 Studied for this?</Text>
              <Switch value={editStudied} onValueChange={setEditStudied} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={'#FFF'} />
            </View>

            <Text style={styles.selectorLabel}>Interview Rounds:</Text>
            {editRounds.map(r => (
              <RoundCard key={r.id} round={r} onDelete={() => removeEditRound(r.id)} onResultChange={(v) => updateEditRoundResult(r.id, v)} colors={colors} styles={styles} />
            ))}

            {showEditAddRound ? (
              <AddRoundForm
                topic={eRoundTopic} setTopic={setERoundTopic}
                desc={eRoundDesc} setDesc={setERoundDesc}
                result={eRoundResult} setResult={setERoundResult}
                onAdd={addRoundToEdit} onCancel={() => setShowEditAddRound(false)} colors={colors} styles={styles}
              />
            ) : (
              <TouchableOpacity style={[styles.addRoundBtn, { marginBottom: 40 }]} onPress={() => setShowEditAddRound(true)}>
                <Ionicons name="add-circle-outline" size={17} color={colors.primary} />
                <Text style={styles.addRoundBtnText}>Add Interview Round</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>


    </KeyboardAvoidingView>
  );
}

// ─── Styles (Dynamic based on theme) ──────────────────────────────────────────

const getStyles = (colors: any, isDark: boolean, activeTab: 'placements' | 'companies' = 'placements') => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerArea: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  pageTitle: { fontSize: 24, fontFamily: 'Roboto Slab', fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },

  // ── Tab Navigation ─────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabBtnText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primary,
  },
  contentArea: {
    flex: 1,
  },
  floatingArea: {
    padding: 16,
  },

  // ── Filter Bar ──────────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Segment Block (Health-style filter) ────────────────────────────────────
  segmentBlock: { 
    flexDirection: 'row', 
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
    borderRadius: 14, 
    padding: 4, 
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1, 
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' 
  },
  segmentBtn: { 
    flex: 1, 
    paddingVertical: 10, 
    alignItems: 'center', 
    borderRadius: 10 
  },
  segmentText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: colors.textSecondary 
  },
  segmentTextActive: { 
    color: '#F59E0B', 
    fontWeight: '700' 
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 12, fontWeight: '500' },

  // ── Create Card ─────────────────────────────────────────────────────────────
  createCard: {
    backgroundColor: colors.card, borderRadius: 20, marginBottom: 20,
    borderWidth: 1.5, borderColor: colors.border,
    shadowColor: activeTab === 'placements' ? '#3B82F6' : '#10B981', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15, shadowRadius: 14, elevation: 5, overflow: 'hidden',
  },
  createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  createIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: activeTab === 'placements' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center' },
  createCollapsedText: { flex: 1, fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
  createExpanded: { padding: 16 },
  createTitleInput: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12, paddingVertical: 4, fontFamily: 'Roboto Slab' },
  input: {
    backgroundColor: colors.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.text,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  titleInput: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.card,
    borderWidth: 1.5, borderColor: colors.border,
  },
  statusChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, backgroundColor: colors.card,
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: activeTab === 'placements' ? '#3B82F6' : '#10B981', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  addRoundBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 10, borderStyle: 'dashed', justifyContent: 'center', marginTop: 4,
  },
  addRoundBtnText: { fontSize: 14, color: '#F59E0B', fontWeight: '600' },

  // ── Date Picker ─────────────────────────────────────────────────────────────
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  dateBtnText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  dateDoneBtn: {
    alignSelf: 'flex-end', marginBottom: 8,
    backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingVertical: 7,
    borderRadius: 20,
  },
  dateDoneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // ── Add Round Form ──────────────────────────────────────────────────────────
  addRoundForm: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  resultRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  resultChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  resultChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

  // ── Placement Card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.card, borderRadius: 20, marginBottom: 18,
    flexDirection: 'row', borderWidth: 1.5, borderColor: colors.border,
    shadowColor: colors.text, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 5, overflow: 'hidden',
  },
  cardMain: { flex: 1, padding: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  companyName: { flex: 1, marginRight: 8, fontSize: 19, fontWeight: '700', color: colors.text, fontFamily: 'Roboto Slab', letterSpacing: -0.3 },
  cardDate: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border },
  statusBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  metaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background,
    shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1
  },
  metaChipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  roundPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, paddingVertical: 2 },
  roundPreviewDot: { width: 7, height: 7, borderRadius: 99 },
  roundPreviewTopic: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' },
  roundPreviewResult: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  actionButtonsArea: {
    padding: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 10,
    borderLeftWidth: 1.5, borderLeftColor: colors.border,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'
  },
  actionButton: {
    width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1
  },

  // ── Round Card ──────────────────────────────────────────────────────────────
  roundCard: { backgroundColor: colors.background, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  roundHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  roundDotLarge: { width: 8, height: 8, borderRadius: 99 },
  roundTopic: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  roundResultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roundResultText: { fontSize: 11, fontWeight: '800' },
  roundDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, marginLeft: 14 },

  // ── Modal ───────────────────────────────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cancelText: { fontSize: 16, color: colors.textSecondary },
  saveHeaderText: { fontSize: 16, fontWeight: '700', color: '#F59E0B' },
  modalBody: { padding: 20, flex: 1 },
});
