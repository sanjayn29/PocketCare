
import { getCardSystem } from '@/constants/card-system';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Animated, FlatList,
    Keyboard, KeyboardAvoidingView, Modal, Platform,
    ScrollView, StyleSheet,
    Text, TextInput,
    TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Skill, SkillLevel, SkillTask,
    addSkill, deleteSkill, getSkills, updateSkill,
} from '../../lib/skills-service';

// ─── helpers ────────────────────────────────────────────────────────────────

// ─── component ──────────────────────────────────────────────────────────────

export default function SkillsScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const router = useRouter();

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const cardSystem = getCardSystem(colors, isDark)

  const backButtonScale = useRef(new Animated.Value(1)).current
  const [fontsLoaded] = useFonts({
    'Roboto Slab': require('../../assets/Font/RobotoSlab-VariableFont_wght.ttf'),
  })

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
    pageTitle: {
      fontSize: 24,
      fontFamily: 'Roboto Slab',
      fontWeight: '400',
      color: isDark ? '#FFFFFF' : '#000000',
      letterSpacing: -0.5,
    },
    pageSubtitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 16, paddingBottom: 120 },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 12, fontWeight: '500' },
    segmentBlock: { flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    createCard: { ...cardSystem.createSurface, marginBottom: 20 },
    createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    createCollapsedText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
    createExpanded: { padding: 16 },
    createTitleInput: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 14, paddingVertical: 4 },
    selectorLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    levelRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    levelChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border },
    levelChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
    createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: colors.background, paddingTop: 12, marginTop: 4 },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    saveBtn: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1.5, borderColor: colors.border },
    taskRowText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
    taskEditInput: { flex: 1, fontSize: 14, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.primary, padding: 0 },
    addTaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    addTaskInput: { flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border },
    addTaskBtn: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    skillCard: { ...cardSystem.surface, marginBottom: 14 },
    skillMain: { flex: 1, padding: 16 },
    skillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    skillHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    skillName: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
    levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    levelBadgeText: { fontSize: 11, fontWeight: '800' },
    skillTopActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    skillTopActionButton: { ...cardSystem.actionButton, width: 32, height: 32, borderRadius: 10 },
    progressArea: { backgroundColor: colors.background, padding: 10, borderRadius: 10, marginBottom: 10, borderWidth: 1.5, borderColor: colors.border },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    progressLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
    progressPct: { fontSize: 12, fontWeight: '800', color: colors.text },
    progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 },
    skillPreviewPanel: { marginTop: 2, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${isDark ? 0.05 : 0.02})`, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    previewText: { fontSize: 13, color: colors.text, fontWeight: '500' },
    previewDone: { color: colors.textSecondary, textDecorationLine: 'line-through' },
    moreText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'flex-end',
    },
    modalSheetWrap: {
      width: '100%',
      maxHeight: '92%',
    },
    modalContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      maxHeight: '100%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    cancelText: { fontSize: 16, color: colors.textSecondary },
    saveHeaderText: { fontSize: 16, fontWeight: '700', color: colors.primary },
    modalBody: { paddingHorizontal: 20, paddingTop: 16 },
    titleInput: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  });

  // ─── Render ──────────────────────────────────────────────────────────────

  const renderListHeader = () => (
    <View>
      <View style={dynamicStyles.segmentBlock}>
        {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((l) => {
          const themeColor = colors.primary;
          const getRgbaColor = (hex: string, opacity: number) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          };
          const isActive = levelFilter === l || (l === 'all' && levelFilter === 'all');
          const label = l === 'all' ? 'All' : LEVEL_CONFIG[l].label;
          return (
            <TouchableOpacity
              key={l}
              style={[
                dynamicStyles.segmentBtn,
                isActive && {
                  backgroundColor: isDark ? getRgbaColor(themeColor, 0.15) : getRgbaColor(themeColor, 0.1),
                  borderColor: themeColor,
                  borderWidth: 1,
                },
              ]}
              onPress={() => setLevelFilter(l as SkillLevel | 'all')}
            >
              <Text
                style={[
                  dynamicStyles.segmentText,
                  isActive && { color: themeColor, fontWeight: '700' },
                ]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
              {isSavingNew ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={dynamicStyles.saveBtnText}>Add Skill</Text>}
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
            <View style={dynamicStyles.skillHeaderRight}>
              <View style={[dynamicStyles.levelBadge, { backgroundColor: cfg.bg }]}> 
                <Text style={[dynamicStyles.levelBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <View style={dynamicStyles.skillTopActions}>
                <TouchableOpacity onPress={() => openEditModal(item)} hitSlop={10} style={dynamicStyles.skillTopActionButton}>
                  <Ionicons name="create-outline" size={16} color="#D4AF37" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={10} style={dynamicStyles.skillTopActionButton}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
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
          <View style={dynamicStyles.skillPreviewPanel}>
            {item.progress.slice(0, 3).map(t => (
              <View style={dynamicStyles.previewRow} key={t.id}>
                <Ionicons name={t.completed ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={t.completed ? colors.success : colors.textSecondary} />
                <Text style={[dynamicStyles.previewText, t.completed && dynamicStyles.previewDone]}>{t.title}</Text>
              </View>
            ))}
            {item.progress.length > 3 && (
              <Text style={dynamicStyles.moreText}>+{item.progress.length - 3} more tasks…</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

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
              <Text style={dynamicStyles.pageTitle}>Skills</Text>
              <Text style={dynamicStyles.pageSubtitle}>Track your learning progress</Text>
            </View>
          </View>
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
      <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setModalVisible(false)}>
        <View style={dynamicStyles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={dynamicStyles.modalSheetWrap}>
            <View style={dynamicStyles.modalContainer}>
              <View style={dynamicStyles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={dynamicStyles.cancelText}>Cancel</Text></TouchableOpacity>
                <Text style={dynamicStyles.modalTitle}>Edit Skill</Text>
                <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
                  {isSavingEdit ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={dynamicStyles.saveHeaderText}>Save</Text>}
                </TouchableOpacity>
              </View>

              <ScrollView style={dynamicStyles.modalBody} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
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
                    <TouchableOpacity onPress={() => startRenameTask(t)}><Ionicons name="create-outline" size={18} color="#D4AF37" /></TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeEditTask(t.id)}><Ionicons name="trash-outline" size={18} color="#EF4444" /></TouchableOpacity>
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
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>


      </View>
    </SafeAreaView>
  );
}
