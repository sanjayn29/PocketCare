import FloatingActionButton from '@/components/FloatingActionButton';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList,
  Keyboard, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet,
  Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import {
  Skill, SkillLevel, SkillTask,
  addSkill, deleteSkill, getSkills, updateSkill,
} from '../../lib/skills-service';

// ─── helpers ────────────────────────────────────────────────────────────────

// ─── component ──────────────────────────────────────────────────────────────

export default function SkillsScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)

  // Move LEVEL_CONFIG inside component to use dynamic colors
  const LEVEL_CONFIG: Record<SkillLevel, { label: string; color: string; bg: string }> = {
    beginner:     { label: 'Beginner',     color: colors.success,   bg: colors.success + '20' },
    intermediate: { label: 'Intermediate', color: colors.warning,   bg: colors.warning + '20' },
    advanced:     { label: 'Advanced',     color: colors.primary,   bg: colors.primary + '20' },
  };

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

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerArea: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
    pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    pageSubtitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 16, paddingBottom: 120 },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 12, fontWeight: '500' },
    createCard: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
    createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    createCollapsedText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
    createExpanded: { padding: 16 },
    createTitleInput: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 14, paddingVertical: 4 },
    selectorLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    levelRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    levelChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    levelChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
    createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: colors.background, paddingTop: 12, marginTop: 4 },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    saveBtn: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
    saveBtnText: { color: colors.text, fontWeight: '700', fontSize: 14 },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    taskRowText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
    taskEditInput: { flex: 1, fontSize: 14, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.primary, padding: 0 },
    addTaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    addTaskInput: { flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text },
    addTaskBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    skillCard: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 14, flexDirection: 'row', borderWidth: 1, borderColor: colors.border, shadowColor: colors.text, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    skillMain: { flex: 1, padding: 16 },
    skillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    skillName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
    levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    levelBadgeText: { fontSize: 11, fontWeight: '800' },
    progressArea: { backgroundColor: colors.background, padding: 10, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
    progressPct: { fontSize: 12, fontWeight: '800', color: colors.text },
    progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    previewText: { fontSize: 13, color: colors.text, fontWeight: '500' },
    previewDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
    moreText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    deleteArea: { paddingHorizontal: 14, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 18 },
    modalContainer: { flex: 1, backgroundColor: colors.card },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    cancelText: { fontSize: 16, color: colors.textSecondary },
    saveHeaderText: { fontSize: 16, fontWeight: '700', color: colors.primary },
    modalBody: { padding: 20, flex: 1 },
    titleInput: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
    filterSection: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.background, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    filterLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase' },
    filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
    filterChipTextActive: { color: colors.text },
  });

  // ─── Render ──────────────────────────────────────────────────────────────

  const renderListHeader = () => (
    <View>
      {/* Filter Section */}
      <View style={dynamicStyles.filterSection}>
        <Text style={dynamicStyles.filterLabel}>Filter by Level</Text>
        <View style={dynamicStyles.filterRow}>
          <TouchableOpacity
            style={[dynamicStyles.filterChip, levelFilter === 'all' && dynamicStyles.filterChipActive]}
            onPress={() => setLevelFilter('all')}
          >
            <Text style={[dynamicStyles.filterChipText, levelFilter === 'all' && dynamicStyles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>

          {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(l => (
            <TouchableOpacity
              key={l}
              style={[dynamicStyles.filterChip, levelFilter === l && dynamicStyles.filterChipActive]}
              onPress={() => setLevelFilter(l)}
            >
              <Text style={[dynamicStyles.filterChipText, levelFilter === l && dynamicStyles.filterChipTextActive]}>
                {LEVEL_CONFIG[l].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Create Skill Card */}
      <View style={dynamicStyles.createCard}>
      {isCreating ? (
        <View style={dynamicStyles.createExpanded}>
          <TextInput
            style={dynamicStyles.createTitleInput}
            placeholder="Skill Name"
            placeholderTextColor={colors.textSecondary}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />

          {/* Level Selector */}
          <Text style={dynamicStyles.selectorLabel}>Level:</Text>
          <View style={dynamicStyles.levelRow}>
            {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(l => (
              <TouchableOpacity
                key={l}
                style={[dynamicStyles.levelChip, newLevel === l && { backgroundColor: LEVEL_CONFIG[l].color }]}
                onPress={() => setNewLevel(l)}
              >
                <Text style={[dynamicStyles.levelChipText, newLevel === l && { color: colors.text }]}>
                  {LEVEL_CONFIG[l].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progress Tasks */}
          <Text style={dynamicStyles.selectorLabel}>Progress Tasks:</Text>
          {newTasks.map(t => (
            <View style={dynamicStyles.taskRow} key={t.id}>
              <Ionicons name="ellipse-outline" size={20} color={colors.textSecondary} />
              <Text style={dynamicStyles.taskRowText}>{t.title}</Text>
              <TouchableOpacity onPress={() => removeNewTask(t.id)}>
                <Ionicons name="close-circle" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={dynamicStyles.addTaskRow}>
            <TextInput
              style={dynamicStyles.addTaskInput}
              placeholder="Add a progress task…"
              placeholderTextColor={colors.textSecondary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              onSubmitEditing={addNewTask}
            />
            <TouchableOpacity style={dynamicStyles.addTaskBtn} onPress={addNewTask}>
              <Ionicons name="add" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.createActions}>
            <TouchableOpacity style={dynamicStyles.cancelBtn} onPress={() => setIsCreating(false)}>
              <Text style={dynamicStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dynamicStyles.saveBtn} onPress={handleSaveSkill} disabled={isSavingNew}>
              {isSavingNew ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={dynamicStyles.saveBtnText}>Add Skill</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={dynamicStyles.createCollapsed} onPress={() => setIsCreating(true)}>
          <Ionicons name="flash-outline" size={22} color={colors.primary} />
          <Text style={dynamicStyles.createCollapsedText}>Track a new skill…</Text>
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
      <View style={dynamicStyles.skillCard}>
        <TouchableOpacity style={dynamicStyles.skillMain} onPress={() => openEditModal(item)} activeOpacity={0.75}>
          {/* Header */}
          <View style={dynamicStyles.skillHeader}>
            <Text style={dynamicStyles.skillName} numberOfLines={1}>{item.name}</Text>
            <View style={[dynamicStyles.levelBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[dynamicStyles.levelBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={dynamicStyles.progressArea}>
            <View style={dynamicStyles.progressHeader}>
              <Text style={dynamicStyles.progressLabel}>{done} / {total} tasks completed</Text>
              <Text style={dynamicStyles.progressPct}>{pct}%</Text>
            </View>
            <View style={dynamicStyles.progressTrack}>
              <View style={[dynamicStyles.progressFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? colors.success : colors.primary }]} />
            </View>
          </View>

          {/* Task list preview */}
          {item.progress.slice(0, 3).map(t => (
            <View style={dynamicStyles.previewRow} key={t.id}>
              <Ionicons name={t.completed ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={t.completed ? colors.success : colors.textSecondary} />
              <Text style={[dynamicStyles.previewText, t.completed && dynamicStyles.previewDone]}>{t.title}</Text>
            </View>
          ))}
          {item.progress.length > 3 && (
            <Text style={dynamicStyles.moreText}>+{item.progress.length - 3} more tasks…</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={dynamicStyles.deleteArea} onPress={() => handleDelete(item.id)} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={dynamicStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={dynamicStyles.headerArea}>
        <Text style={dynamicStyles.pageTitle}>My Skills</Text>
        <Text style={dynamicStyles.pageSubtitle}>Track your learning progress</Text>
      </View>

      {loading ? (
        <View style={dynamicStyles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={getFilteredSkills()}
          keyExtractor={item => item.id}
          renderItem={renderSkill}
          ListHeaderComponent={renderListHeader()}
          contentContainerStyle={dynamicStyles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={dynamicStyles.emptyWrap}>
              <Ionicons name="school-outline" size={60} color={colors.textSecondary} />
              <Text style={dynamicStyles.emptyText}>No skills tracked yet.</Text>
            </View>
          }
        />
      )}

      {/* ── Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={dynamicStyles.modalContainer}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={dynamicStyles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={dynamicStyles.modalTitle}>Edit Skill</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={dynamicStyles.saveHeaderText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={dynamicStyles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput
              style={dynamicStyles.titleInput}
              placeholder="Skill Name"
              placeholderTextColor={colors.textSecondary}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={dynamicStyles.selectorLabel}>Level:</Text>
            <View style={dynamicStyles.levelRow}>
              {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(l => (
                <TouchableOpacity
                  key={l}
                  style={[dynamicStyles.levelChip, editLevel === l && { backgroundColor: LEVEL_CONFIG[l].color }]}
                  onPress={() => setEditLevel(l)}
                >
                  <Text style={[dynamicStyles.levelChipText, editLevel === l && { color: colors.text }]}>
                    {LEVEL_CONFIG[l].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={dynamicStyles.selectorLabel}>Progress Tasks:</Text>
            {editTasks.map(t => (
              <View style={dynamicStyles.taskRow} key={t.id}>
                <TouchableOpacity onPress={() => toggleEditTask(t.id)}>
                  <Ionicons name={t.completed ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={t.completed ? colors.success : colors.textSecondary} />
                </TouchableOpacity>

                {editingTaskId === t.id ? (
                  <TextInput
                    style={dynamicStyles.taskEditInput}
                    value={editingTaskText}
                    onChangeText={setEditingTaskText}
                    autoFocus
                    onSubmitEditing={saveRenameTask}
                    onBlur={saveRenameTask}
                  />
                ) : (
                  <Text style={[dynamicStyles.taskRowText, t.completed && { color: colors.textSecondary, textDecorationLine: 'line-through' }]}>{t.title}</Text>
                )}

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {editingTaskId === t.id ? (
                    <TouchableOpacity onPress={saveRenameTask}><Ionicons name="checkmark" size={20} color={colors.primary} /></TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => startRenameTask(t)}><Ionicons name="pencil-outline" size={18} color={colors.textSecondary} /></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeEditTask(t.id)}><Ionicons name="trash-outline" size={18} color={colors.danger} /></TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={[dynamicStyles.addTaskRow, { marginBottom: 40 }]}>
              <TextInput
                style={dynamicStyles.addTaskInput}
                placeholder="Add a progress task…"
                placeholderTextColor={colors.textSecondary}
                value={editTaskTitle}
                onChangeText={setEditTaskTitle}
                onSubmitEditing={addEditTask}
              />
              <TouchableOpacity style={dynamicStyles.addTaskBtn} onPress={addEditTask}>
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}

