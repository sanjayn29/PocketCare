import FloatingActionButton from '@/components/FloatingActionButton';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList,
    Keyboard, KeyboardAvoidingView, Modal, Platform,
    ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import {
    Skill, SkillLevel, SkillTask,
    addSkill, deleteSkill, getSkills, updateSkill,
} from '../../lib/skills-service';

// ─── helpers ────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<SkillLevel, { label: string; color: string; bg: string }> = {
  beginner:     { label: 'Beginner',     color: '#059669', bg: '#DCFCE7' },
  intermediate: { label: 'Intermediate', color: '#D97706', bg: '#FEF9C3' },
  advanced:     { label: 'Advanced',     color: '#7E22CE', bg: '#F3E8FF' },
};

// ─── component ──────────────────────────────────────────────────────────────

export default function SkillsScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Filter state ──
  const [levelFilter, setLevelFilter] = useState<SkillLevel | 'all'>('all');

  // ── Create Skill state ──
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState<SkillLevel>('beginner');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTasks, setNewTasks] = useState<SkillTask[]>([]);
  const [isSavingNew, setIsSavingNew] = useState(false);

  // ── Edit Modal state ──
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState<SkillLevel>('beginner');
  const [editTasks, setEditTasks] = useState<SkillTask[]>([]);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (email) loadSkills();
    else setLoading(false);
  }, [email]);

  const loadSkills = async () => {
    if (!email) return;
    try {
      const fetched = await getSkills(email);
      fetched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSkills(fetched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => { setRefreshing(true); loadSkills(); };

  // ── Get filtered skills ──
  const getFilteredSkills = () => {
    if (levelFilter === 'all') return skills;
    return skills.filter(skill => skill.level === levelFilter);
  };

  // ── Create subtask helpers ──
  const addNewTask = () => {
    if (!newTaskTitle.trim()) return;
    setNewTasks(prev => [...prev, { id: Date.now().toString(), title: newTaskTitle.trim(), completed: false }]);
    setNewTaskTitle('');
  };
  const removeNewTask = (id: string) => setNewTasks(prev => prev.filter(t => t.id !== id));

  // ── Save new skill ──
  const handleSaveSkill = async () => {
    if (!email) return Alert.alert('Error', 'You must be logged in.');
    if (!newName.trim()) return Alert.alert('Error', 'Skill name is required.');
    if (newTasks.length === 0) return Alert.alert('Error', 'Add at least one progress task.');

    setIsSavingNew(true);
    try {
      await addSkill(email, newName.trim(), newLevel, newTasks);
      setNewName(''); setNewLevel('beginner');
      setNewTasks([]); setNewTaskTitle('');
      setIsCreating(false);
      Keyboard.dismiss();
      loadSkills();
    } catch {
      Alert.alert('Error', 'Failed to save skill');
    } finally {
      setIsSavingNew(false);
    }
  };

  // ── Open edit modal ──
  const openEditModal = (skill: Skill) => {
    setEditingSkill(skill);
    setEditName(skill.name);
    setEditLevel(skill.level);
    setEditTasks([...skill.progress]);
    setEditTaskTitle('');
    setEditingTaskId(null);
    setModalVisible(true);
  };

  // ── Edit subtask helpers ──
  const addEditTask = () => {
    if (!editTaskTitle.trim()) return;
    setEditTasks(prev => [...prev, { id: Date.now().toString(), title: editTaskTitle.trim(), completed: false }]);
    setEditTaskTitle('');
  };
  const toggleEditTask = (id: string) =>
    setEditTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const removeEditTask = (id: string) => setEditTasks(prev => prev.filter(t => t.id !== id));
  const startRenameTask = (t: SkillTask) => { setEditingTaskId(t.id); setEditingTaskText(t.title); };
  const saveRenameTask = () => {
    if (!editingTaskText.trim()) return removeEditTask(editingTaskId!);
    setEditTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, title: editingTaskText.trim() } : t));
    setEditingTaskId(null);
  };

  // ── Save edit ──
  const handleSaveEdit = async () => {
    if (!email || !editingSkill) return;
    if (!editName.trim()) return Alert.alert('Error', 'Skill name is required.');

    setIsSavingEdit(true);
    try {
      await updateSkill(email, editingSkill.id, {
        name: editName.trim(),
        level: editLevel,
        progress: editTasks,
      });
      setModalVisible(false);
      loadSkills();
    } catch {
      Alert.alert('Error', 'Failed to update skill');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── Delete skill ──
  const handleDelete = (skillId: string) => {
    if (!email) return;
    Alert.alert('Delete Skill', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSkill(email, skillId); loadSkills(); } },
    ]);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const renderListHeader = () => (
    <View>
      {/* Filter Section */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Level</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, levelFilter === 'all' && styles.filterChipActive]}
            onPress={() => setLevelFilter('all')}
          >
            <Text style={[styles.filterChipText, levelFilter === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>

          {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(l => (
            <TouchableOpacity
              key={l}
              style={[styles.filterChip, levelFilter === l && styles.filterChipActive]}
              onPress={() => setLevelFilter(l)}
            >
              <Text style={[styles.filterChipText, levelFilter === l && styles.filterChipTextActive]}>
                {LEVEL_CONFIG[l].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Create Skill Card */}
      <View style={styles.createCard}>
      {isCreating ? (
        <View style={styles.createExpanded}>
          <TextInput
            style={styles.createTitleInput}
            placeholder="Skill Name"
            placeholderTextColor="#94A3B8"
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />

          {/* Level Selector */}
          <Text style={styles.selectorLabel}>Level:</Text>
          <View style={styles.levelRow}>
            {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.levelChip, newLevel === l && { backgroundColor: LEVEL_CONFIG[l].color }]}
                onPress={() => setNewLevel(l)}
              >
                <Text style={[styles.levelChipText, newLevel === l && { color: '#FFF' }]}>
                  {LEVEL_CONFIG[l].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progress Tasks */}
          <Text style={styles.selectorLabel}>Progress Tasks:</Text>
          {newTasks.map(t => (
            <View style={styles.taskRow} key={t.id}>
              <Ionicons name="ellipse-outline" size={20} color="#94A3B8" />
              <Text style={styles.taskRowText}>{t.title}</Text>
              <TouchableOpacity onPress={() => removeNewTask(t.id)}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addTaskRow}>
            <TextInput
              style={styles.addTaskInput}
              placeholder="Add a progress task…"
              placeholderTextColor="#94A3B8"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              onSubmitEditing={addNewTask}
            />
            <TouchableOpacity style={styles.addTaskBtn} onPress={addNewTask}>
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.createActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCreating(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSkill} disabled={isSavingNew}>
              {isSavingNew ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Add Skill</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.createCollapsed} onPress={() => setIsCreating(true)}>
          <Ionicons name="flash-outline" size={22} color="#7E22CE" />
          <Text style={styles.createCollapsedText}>Track a new skill…</Text>
        </TouchableOpacity>
      )}
      </View>
    </View>
  );

  const renderSkill = ({ item }: { item: Skill }) => {
    const total = item.progress.length;
    const done = item.progress.filter(t => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const cfg = LEVEL_CONFIG[item.level] || LEVEL_CONFIG.beginner;

    return (
      <View style={styles.skillCard}>
        <TouchableOpacity style={styles.skillMain} onPress={() => openEditModal(item)} activeOpacity={0.75}>
          {/* Header */}
          <View style={styles.skillHeader}>
            <Text style={styles.skillName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.levelBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.levelBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressArea}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{done} / {total} tasks completed</Text>
              <Text style={styles.progressPct}>{pct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? '#22C55E' : '#7E22CE' }]} />
            </View>
          </View>

          {/* Task list preview */}
          {item.progress.slice(0, 3).map(t => (
            <View style={styles.previewRow} key={t.id}>
              <Ionicons name={t.completed ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={t.completed ? '#22C55E' : '#94A3B8'} />
              <Text style={[styles.previewText, t.completed && styles.previewDone]}>{t.title}</Text>
            </View>
          ))}
          {item.progress.length > 3 && (
            <Text style={styles.moreText}>+{item.progress.length - 3} more tasks…</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteArea} onPress={() => handleDelete(item.id)} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>My Skills</Text>
        <Text style={styles.pageSubtitle}>Track your learning progress</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#7E22CE" /></View>
      ) : (
        <FlatList
          data={getFilteredSkills()}
          keyExtractor={item => item.id}
          renderItem={renderSkill}
          ListHeaderComponent={renderListHeader()}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="school-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>No skills tracked yet.</Text>
            </View>
          }
        />
      )}

      {/* ── Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Skill</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? <ActivityIndicator size="small" color="#7E22CE" /> : <Text style={styles.saveHeaderText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.titleInput}
              placeholder="Skill Name"
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.selectorLabel}>Level:</Text>
            <View style={styles.levelRow}>
              {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.levelChip, editLevel === l && { backgroundColor: LEVEL_CONFIG[l].color }]}
                  onPress={() => setEditLevel(l)}
                >
                  <Text style={[styles.levelChipText, editLevel === l && { color: '#FFF' }]}>
                    {LEVEL_CONFIG[l].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.selectorLabel}>Progress Tasks:</Text>
            {editTasks.map(t => (
              <View style={styles.taskRow} key={t.id}>
                <TouchableOpacity onPress={() => toggleEditTask(t.id)}>
                  <Ionicons name={t.completed ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={t.completed ? '#22C55E' : '#94A3B8'} />
                </TouchableOpacity>

                {editingTaskId === t.id ? (
                  <TextInput
                    style={styles.taskEditInput}
                    value={editingTaskText}
                    onChangeText={setEditingTaskText}
                    autoFocus
                    onSubmitEditing={saveRenameTask}
                    onBlur={saveRenameTask}
                  />
                ) : (
                  <Text style={[styles.taskRowText, t.completed && { color: '#94A3B8', textDecorationLine: 'line-through' }]}>{t.title}</Text>
                )}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {editingTaskId === t.id ? (
                    <TouchableOpacity onPress={saveRenameTask}><Ionicons name="checkmark" size={20} color="#7E22CE" /></TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => startRenameTask(t)}><Ionicons name="pencil-outline" size={18} color="#64748B" /></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeEditTask(t.id)}><Ionicons name="trash-outline" size={18} color="#FF5252" /></TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={[styles.addTaskRow, { marginBottom: 40 }]}>
              <TextInput
                style={styles.addTaskInput}
                placeholder="Add a progress task…"
                placeholderTextColor="#94A3B8"
                value={editTaskTitle}
                onChangeText={setEditTaskTitle}
                onSubmitEditing={addEditTask}
              />
              <TouchableOpacity style={styles.addTaskBtn} onPress={addEditTask}>
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerArea: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  pageSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: '#64748B', fontSize: 16, marginTop: 12, fontWeight: '500' },

  // Create card
  createCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#7E22CE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
  createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  createCollapsedText: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  createExpanded: { padding: 16 },
  createTitleInput: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 14, paddingVertical: 4 },
  selectorLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  levelRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  levelChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  levelChipText: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'capitalize' },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, marginTop: 4 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: '#7E22CE', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Task rows in form
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  taskRowText: { flex: 1, fontSize: 14, color: '#334155', fontWeight: '500' },
  taskEditInput: { flex: 1, fontSize: 14, color: '#0F172A', borderBottomWidth: 1, borderBottomColor: '#7E22CE', padding: 0 },
  addTaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  addTaskInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#334155' },
  addTaskBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#7E22CE', alignItems: 'center', justifyContent: 'center' },

  // Skill Card
  skillCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 14, flexDirection: 'row', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  skillMain: { flex: 1, padding: 16 },
  skillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  skillName: { fontSize: 17, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  levelBadgeText: { fontSize: 11, fontWeight: '800' },
  progressArea: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  progressPct: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  progressTrack: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  previewText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  previewDone: { color: '#94A3B8', textDecorationLine: 'line-through' },
  moreText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  deleteArea: { paddingHorizontal: 14, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 18 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  cancelText: { fontSize: 16, color: '#64748B' },
  saveHeaderText: { fontSize: 16, fontWeight: '700', color: '#7E22CE' },
  modalBody: { padding: 20, flex: 1 },
  titleInput: { fontSize: 22, fontWeight: '700', color: '#0F172A', marginBottom: 18, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8 },

  // Filter Section
  filterSection: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F8FAFC', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  filterLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 10, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#7E22CE', borderColor: '#7E22CE' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#FFFFFF' },
});
