import FloatingActionButton from '@/components/FloatingActionButton';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList,
  Keyboard, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import {
  Placement, PlacementRound, PlacementStatus,
  addPlacement, deletePlacement, getPlacements, updatePlacement,
} from '../../lib/placement-service';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PlacementStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  applied:   { label: 'Applied',   color: '#3B82F6', bg: '#EFF6FF', icon: 'paper-plane' },
  interview: { label: 'Interview', color: '#F59E0B', bg: '#FFFBEB', icon: 'mic' },
  offer:     { label: 'Offer',     color: '#10B981', bg: '#ECFDF5', icon: 'trophy' },
  rejected:  { label: 'Rejected',  color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle' },
};

const ROUND_RESULT_CONFIG: Record<PlacementRound['result'], { label: string; color: string; bg: string }> = {
  success:  { label: 'Cleared ✓', color: '#10B981', bg: '#ECFDF5' },
  rejected: { label: 'Rejected ✗', color: '#EF4444', bg: '#FEF2F2' },
  pending:  { label: 'Pending…',   color: '#F59E0B', bg: '#FFFBEB' },
};

// ─── DatePickerInput ─────────────────────────────────────────────────────────

type DatePickerInputProps = { value: string; onChange: (v: string) => void };

const DatePickerInput = React.memo(({ value, onChange }: DatePickerInputProps) => {
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
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShow(true)} activeOpacity={0.75}>
        <Ionicons name="calendar-outline" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
        <Text style={[styles.dateBtnText, !value && { color: '#94A3B8' }]}>{displayLabel}</Text>
        <Ionicons name="chevron-down" size={14} color="#94A3B8" style={{ marginLeft: 'auto' }} />
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
        <TouchableOpacity style={styles.dateDoneBtn} onPress={() => setShow(false)}>
          <Text style={styles.dateDoneBtnText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ─── Sub-components (defined OUTSIDE main component to prevent remounts) ──────

const RoundResultSelector = React.memo(({
  value, onChange,
}: { value: PlacementRound['result']; onChange: (v: PlacementRound['result']) => void }) => (
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
));

const RoundCard = React.memo(({
  round, onDelete, onResultChange,
}: { round: PlacementRound; onDelete?: () => void; onResultChange?: (v: PlacementRound['result']) => void }) => {
  const cfg = ROUND_RESULT_CONFIG[round.result];
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
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
      {round.description ? <Text style={styles.roundDesc}>{round.description}</Text> : null}
      {onResultChange && <RoundResultSelector value={round.result} onChange={onResultChange} />}
    </View>
  );
});

// ── AddRoundForm — also outside to prevent keyboard dismiss ──────────────────
type AddRoundFormProps = {
  topic: string; setTopic: (v: string) => void;
  desc: string; setDesc: (v: string) => void;
  result: PlacementRound['result']; setResult: (v: PlacementRound['result']) => void;
  onAdd: () => void; onCancel: () => void;
};
const AddRoundForm = React.memo(({ topic, setTopic, desc, setDesc, result, setResult, onAdd, onCancel }: AddRoundFormProps) => (
  <View style={styles.addRoundForm}>
    <TextInput
      style={styles.input}
      placeholder="Round Topic (e.g. Technical Round 1)"
      placeholderTextColor="#94A3B8"
      value={topic}
      onChangeText={setTopic}
    />
    <TextInput
      style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
      placeholder="Notes / What was asked…"
      placeholderTextColor="#94A3B8"
      multiline
      value={desc}
      onChangeText={setDesc}
    />
    <Text style={styles.selectorLabel}>Result:</Text>
    <RoundResultSelector value={result} onChange={setResult} />
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
};

const CreateCard = React.memo(({
  isCreating, setIsCreating,
  newCompany, setNewCompany,
  newStatus, setNewStatus,
  newDate, setNewDate,
  newStudied, setNewStudied,
  newRounds, removeRoundFromNew,
  showAddRound, setShowAddRound,
  roundTopic, setRoundTopic,
  roundDesc, setRoundDesc,
  roundResult, setRoundResult,
  addRoundToNew,
  handleSave, isSavingNew, resetCreate,
}: CreateCardProps) => (
  <View style={styles.createCard}>
    {isCreating ? (
      <View style={styles.createExpanded}>
        <TextInput
          style={styles.createTitleInput}
          placeholder="Company Name"
          placeholderTextColor="#94A3B8"
          value={newCompany}
          onChangeText={setNewCompany}
          autoFocus
        />
        <DatePickerInput value={newDate} onChange={setNewDate} />

        <Text style={styles.selectorLabel}>Application Status:</Text>
        <View style={styles.statusRow}>
          {(Object.keys(STATUS_CONFIG) as PlacementStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
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

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>📚 Studied for this?</Text>
          <Switch
            value={newStudied}
            onValueChange={setNewStudied}
            trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
            thumbColor={newStudied ? '#FFF' : '#CBD5E1'}
          />
        </View>

        <Text style={styles.selectorLabel}>Interview Rounds:</Text>
        {newRounds.map(r => (
          <RoundCard key={r.id} round={r} onDelete={() => removeRoundFromNew(r.id)} />
        ))}

        {showAddRound ? (
          <AddRoundForm
            topic={roundTopic} setTopic={setRoundTopic}
            desc={roundDesc} setDesc={setRoundDesc}
            result={roundResult} setResult={setRoundResult}
            onAdd={addRoundToNew} onCancel={() => setShowAddRound(false)}
          />
        ) : (
          <TouchableOpacity style={styles.addRoundBtn} onPress={() => setShowAddRound(true)}>
            <Ionicons name="add-circle-outline" size={17} color="#3B82F6" />
            <Text style={styles.addRoundBtnText}>Add Interview Round</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.rowBtns, { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 }]}>
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
          <Ionicons name="briefcase-outline" size={20} color="#3B82F6" />
        </View>
        <Text style={styles.createCollapsedText}>Track a new company application…</Text>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </TouchableOpacity>
    )}
  </View>
));

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PlacementScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PlacementStatus | 'all'>('all');

  // ── Create state ──
  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newStatus, setNewStatus]   = useState<PlacementStatus>('applied');
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
  const [editStatus, setEditStatus]     = useState<PlacementStatus>('applied');
  const [editDate, setEditDate]         = useState('');
  const [editStudied, setEditStudied]   = useState(false);
  const [editRounds, setEditRounds]     = useState<PlacementRound[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showEditAddRound, setShowEditAddRound] = useState(false);
  const [eRoundTopic, setERoundTopic]           = useState('');
  const [eRoundDesc, setERoundDesc]             = useState('');
  const [eRoundResult, setERoundResult]         = useState<PlacementRound['result']>('pending');

  // ─────────────────────────────────────────────────────────────────────────

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
      await addPlacement(email, newCompany.trim(), newStatus, newDate.trim(), newStudied, newRounds);
      setNewCompany(''); setNewStatus('applied'); setNewDate('');
      setNewStudied(false); setNewRounds([]);
      setRoundTopic(''); setRoundDesc(''); setRoundResult('pending');
      setShowAddRound(false); setIsCreating(false); Keyboard.dismiss();
      loadPlacements();
    } catch { Alert.alert('Error', 'Failed to save placement.'); }
    finally { setIsSavingNew(false); }
  }, [email, newCompany, newStatus, newDate, newStudied, newRounds]);

  const resetCreate = useCallback(() => {
    setNewCompany(''); setNewStatus('applied'); setNewDate('');
    setNewStudied(false); setNewRounds([]);
    setRoundTopic(''); setRoundDesc(''); setRoundResult('pending');
    setShowAddRound(false); setIsCreating(false); Keyboard.dismiss();
  }, []);

  // ── Edit handlers ──

  const openEdit = (p: Placement) => {
    setEditing(p); setEditCompany(p.company_name);
    setEditStatus(p.status); setEditDate(p.date);
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
        company_name: editCompany.trim(), status: editStatus,
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

  const filtered = filterStatus === 'all' ? placements : placements.filter(p => p.status === filterStatus);

  // ── Memoize header so FlatList doesn't remount it ──
  const listHeader = useMemo(() => (
    <CreateCard
      isCreating={isCreating} setIsCreating={setIsCreating}
      newCompany={newCompany} setNewCompany={setNewCompany}
      newStatus={newStatus} setNewStatus={setNewStatus}
      newDate={newDate} setNewDate={setNewDate}
      newStudied={newStudied} setNewStudied={setNewStudied}
      newRounds={newRounds} removeRoundFromNew={removeRoundFromNew}
      showAddRound={showAddRound} setShowAddRound={setShowAddRound}
      roundTopic={roundTopic} setRoundTopic={setRoundTopic}
      roundDesc={roundDesc} setRoundDesc={setRoundDesc}
      roundResult={roundResult} setRoundResult={setRoundResult}
      addRoundToNew={addRoundToNew}
      handleSave={handleSave} isSavingNew={isSavingNew} resetCreate={resetCreate}
    />
  ), [
    isCreating, newCompany, newStatus, newDate, newStudied, newRounds,
    showAddRound, roundTopic, roundDesc, roundResult,
    addRoundToNew, removeRoundFromNew, handleSave, isSavingNew, resetCreate,
  ]);

  // ── Placement card render ──
  const renderPlacement = useCallback(({ item }: { item: Placement }) => {
    const cfg = STATUS_CONFIG[item.status];
    const roundsDone = item.rounds.filter(r => r.result === 'success').length;
    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardMain} onPress={() => openEdit(item)} activeOpacity={0.75}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.companyName} numberOfLines={1}>{item.company_name}</Text>
              <Text style={styles.cardDate}>{item.date || '—'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={12} color={cfg.color} style={{ marginRight: 4 }} />
              <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: item.studied ? '#ECFDF5' : '#F1F5F9' }]}>
              <Ionicons name={item.studied ? 'checkmark-circle' : 'close-circle-outline'} size={13} color={item.studied ? '#10B981' : '#94A3B8'} />
              <Text style={[styles.metaChipText, { color: item.studied ? '#10B981' : '#64748B' }]}>
                {item.studied ? 'Studied' : 'Not Studied'}
              </Text>
            </View>
            {item.rounds.length > 0 && (
              <View style={styles.metaChip}>
                <Ionicons name="layers-outline" size={13} color="#3B82F6" />
                <Text style={[styles.metaChipText, { color: '#3B82F6' }]}>
                  {item.rounds.length} Round{item.rounds.length > 1 ? 's' : ''} · {roundsDone} Cleared
                </Text>
              </View>
            )}
          </View>

          {item.rounds.map(r => {
            const rcfg = ROUND_RESULT_CONFIG[r.result];
            return (
              <View style={styles.roundPreview} key={r.id}>
                <View style={[styles.roundPreviewDot, { backgroundColor: rcfg.color }]} />
                <Text style={styles.roundPreviewTopic} numberOfLines={1}>{r.topic}</Text>
                <Text style={[styles.roundPreviewResult, { color: rcfg.color }]}>{rcfg.label}</Text>
              </View>
            );
          })}
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteArea} onPress={() => handleDelete(item.id)} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    );
  }, [placements]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Page Header ── */}
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>Placement Tracker</Text>
        <Text style={styles.pageSubtitle}>Track companies, rounds & status</Text>
      </View>

      {/* ── Filter Bar ── */}
      <View style={styles.filterRow}>
        {(['all', 'applied', 'interview', 'offer', 'rejected'] as const).map(s => {
          const active = filterStatus === s;
          const label = s === 'all' ? 'All' : STATUS_CONFIG[s].label;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilterStatus(s)}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3B82F6" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderPlacement}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="briefcase-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>No applications tracked yet.</Text>
            </View>
          }
        />
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
                ? <ActivityIndicator size="small" color="#3B82F6" />
                : <Text style={styles.saveHeaderText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput style={styles.titleInput} placeholder="Company Name" value={editCompany} onChangeText={setEditCompany} />
            <DatePickerInput value={editDate} onChange={setEditDate} />

            <Text style={styles.selectorLabel}>Application Status:</Text>
            <View style={styles.statusRow}>
              {(Object.keys(STATUS_CONFIG) as PlacementStatus[]).map(s => {
                const cfg = STATUS_CONFIG[s]; const active = editStatus === s;
                return (
                  <TouchableOpacity key={s} style={[styles.statusChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]} onPress={() => setEditStatus(s)}>
                    <Ionicons name={cfg.icon} size={13} color={active ? '#FFF' : cfg.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusChipText, active && { color: '#FFF' }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>📚 Studied for this?</Text>
              <Switch value={editStudied} onValueChange={setEditStudied} trackColor={{ false: '#E2E8F0', true: '#3B82F6' }} thumbColor={editStudied ? '#FFF' : '#CBD5E1'} />
            </View>

            <Text style={styles.selectorLabel}>Interview Rounds:</Text>
            {editRounds.map(r => (
              <RoundCard key={r.id} round={r} onDelete={() => removeEditRound(r.id)} onResultChange={(v) => updateEditRoundResult(r.id, v)} />
            ))}

            {showEditAddRound ? (
              <AddRoundForm
                topic={eRoundTopic} setTopic={setERoundTopic}
                desc={eRoundDesc} setDesc={setERoundDesc}
                result={eRoundResult} setResult={setERoundResult}
                onAdd={addRoundToEdit} onCancel={() => setShowEditAddRound(false)}
              />
            ) : (
              <TouchableOpacity style={[styles.addRoundBtn, { marginBottom: 40 }]} onPress={() => setShowEditAddRound(true)}>
                <Ionicons name="add-circle-outline" size={17} color="#3B82F6" />
                <Text style={styles.addRoundBtnText}>Add Interview Round</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerArea: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 6 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  pageSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 2 },

  // ── Filter Bar ──────────────────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: '#64748B', fontSize: 16, marginTop: 12, fontWeight: '500' },

  // ── Create Card ─────────────────────────────────────────────────────────────
  createCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, overflow: 'hidden',
  },
  createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  createIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  createCollapsedText: { flex: 1, fontSize: 15, color: '#64748B', fontWeight: '500' },
  createExpanded: { padding: 16 },
  createTitleInput: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12, paddingVertical: 4 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#334155',
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12,
  },
  selectorLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  statusChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, backgroundColor: '#F8FAFC',
    padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  rowBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  addRoundBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderWidth: 1.5, borderColor: '#BFDBFE',
    borderRadius: 10, borderStyle: 'dashed', justifyContent: 'center', marginTop: 4,
  },
  addRoundBtnText: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },

  // ── Date Picker ─────────────────────────────────────────────────────────────
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12,
  },
  dateBtnText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  dateDoneBtn: {
    alignSelf: 'flex-end', marginBottom: 8,
    backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 7,
    borderRadius: 20,
  },
  dateDoneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // ── Add Round Form ──────────────────────────────────────────────────────────
  addRoundForm: { backgroundColor: '#F0F9FF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#BAE6FD' },
  resultRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  resultChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  resultChipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  // ── Placement Card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 14,
    flexDirection: 'row', borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardMain: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  companyName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  cardDate: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  metaChipText: { fontSize: 12, fontWeight: '600' },
  roundPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  roundPreviewDot: { width: 7, height: 7, borderRadius: 99 },
  roundPreviewTopic: { flex: 1, fontSize: 13, color: '#475569', fontWeight: '500' },
  roundPreviewResult: { fontSize: 11, fontWeight: '700' },
  deleteArea: { paddingHorizontal: 14, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 18 },

  // ── Round Card ──────────────────────────────────────────────────────────────
  roundCard: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  roundHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  roundDotLarge: { width: 8, height: 8, borderRadius: 99 },
  roundTopic: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1E293B' },
  roundResultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roundResultText: { fontSize: 11, fontWeight: '800' },
  roundDesc: { fontSize: 13, color: '#475569', marginBottom: 8, marginLeft: 14 },

  // ── Modal ───────────────────────────────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  cancelText: { fontSize: 16, color: '#64748B' },
  saveHeaderText: { fontSize: 16, fontWeight: '700', color: '#3B82F6' },
  modalBody: { padding: 20, flex: 1 },
  titleInput: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8 },
});
