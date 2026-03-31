import FloatingActionButton from '@/components/FloatingActionButton';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addGoal, deleteGoal, getGoals, Goal, GoalCategory, GoalPriority, GoalTask, updateGoal } from '../../lib/goals-service';

export default function GoalsScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'achieved'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<GoalCategory | null>(null);
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<GoalPriority | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  
  // Create Goal States
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory>('personal');
  const [newPriority, setNewPriority] = useState<GoalPriority>('medium');
  const [newDeadline, setNewDeadline] = useState('');
  const [newTargetValue, setNewTargetValue] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Pre-creation Subtasks State
  const [newTasks, setNewTasks] = useState<GoalTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingNewTaskId, setEditingNewTaskId] = useState<string | null>(null);
  const [editingNewTaskTitle, setEditingNewTaskTitle] = useState('');

  // Edit Goal / Add Tasks States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<GoalCategory>('personal');
  const [editPriority, setEditPriority] = useState<GoalPriority>('medium');
  const [editDeadline, setEditDeadline] = useState('');
  const [editTargetValue, setEditTargetValue] = useState('');
  const [editCurrentValue, setEditCurrentValue] = useState('');
  const [editUnit, setEditUnit] = useState('');
  
  // Subtasks State for Existing Goal
  const [editTasks, setEditTasks] = useState<GoalTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Date Handlers
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setNewDeadline(selectedDate.toISOString().split('T')[0]);
  };
  const handleEditDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEditDatePicker(false);
    if (selectedDate) setEditDeadline(selectedDate.toISOString().split('T')[0]);
  };

  useEffect(() => {
    if (email) loadGoals();
    else setLoading(false);
  }, [email]);

  const loadGoals = async () => {
    if (!email) return;
    try {
      const fetchedGoals = await getGoals(email);
      fetchedGoals.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        const targetA = a.deadline || (a as any).target_date;
        const targetB = b.deadline || (b as any).target_date;
        if (targetA && targetB) return new Date(targetA).getTime() - new Date(targetB).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setGoals(fetchedGoals);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGoals();
  };

  const filteredGoals = goals.filter(goal => {
    if (filterMode === 'active') {
      if (goal.status !== 'active') return false;
    } else if (filterMode === 'achieved') {
      if (goal.status !== 'achieved') return false;
    }
    
    // Filter by category
    if (selectedCategoryFilter && goal.category !== selectedCategoryFilter) {
      return false;
    }
    
    // Filter by priority
    if (selectedPriorityFilter && goal.priority !== selectedPriorityFilter) {
      return false;
    }
    
    return true;
  });

  // Pre-creation Subtask Functions
  const handleAddNewSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newTask: GoalTask = { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false };
    setNewTasks([...newTasks, newTask]);
    setNewSubtaskTitle('');
  };
  const toggleNewTask = (taskId: string) => setNewTasks(newTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  const removeNewTask = (taskId: string) => setNewTasks(newTasks.filter(t => t.id !== taskId));
  const startEditingNewTask = (task: GoalTask) => { setEditingNewTaskId(task.id); setEditingNewTaskTitle(task.title); };
  const saveEditingNewTask = () => {
    if (!editingNewTaskTitle.trim()) return removeNewTask(editingNewTaskId!);
    setNewTasks(newTasks.map(t => t.id === editingNewTaskId ? { ...t, title: editingNewTaskTitle.trim() } : t));
    setEditingNewTaskId(null);
  };

  const handleSaveNewGoal = async () => {
    if (!email) return Alert.alert('Error', 'You must be logged in.');
    if (!newTitle.trim() || (!newTargetValue && newTasks.length === 0)) {
      return Alert.alert('Error', 'A Title and a Target Value (or Tasks) are required.');
    }
    
    setIsSavingNew(true);
    try {
      await addGoal(
        email, newTitle, newDesc, newCategory, parseFloat(newTargetValue) || 0,
        newUnit || 'tasks', newDeadline, 'active', newPriority, 0, newTasks
      );
      setNewTitle(''); setNewDesc(''); setNewCategory('personal');
      setNewTargetValue(''); setNewUnit(''); setNewDeadline('');
      setNewTasks([]); setNewSubtaskTitle(''); // Clear tasks
      setIsCreating(false);
      Keyboard.dismiss();
      loadGoals();
    } catch (error) {
      Alert.alert('Error', 'Failed to save goal');
    } finally {
      setIsSavingNew(false);
    }
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditDesc(goal.description);
    setEditCategory(goal.category || 'personal');
    setEditPriority(goal.priority);
    setEditDeadline(goal.deadline || (goal as any).target_date || '');
    setEditTargetValue(String(goal.target_value || 0));
    setEditCurrentValue(String(goal.current_value || (goal as any).progress || 0));
    setEditUnit(goal.unit || 'tasks');
    setEditTasks(goal.tasks || []);
    setModalVisible(true);
  };

  // Subtask Functions (Edit Modal)
  const handleAddSubtask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: GoalTask = { id: Date.now().toString(), title: newTaskTitle.trim(), completed: false };
    setEditTasks([...editTasks, newTask]);
    setNewTaskTitle('');
  };
  const toggleTask = (taskId: string) => setEditTasks(editTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  const removeTask = (taskId: string) => setEditTasks(editTasks.filter(t => t.id !== taskId));
  const startEditingTask = (task: GoalTask) => { setEditingTaskId(task.id); setEditingTaskTitle(task.title); };
  const saveEditingTask = () => {
    if (!editingTaskTitle.trim()) return removeTask(editingTaskId!);
    setEditTasks(editTasks.map(t => t.id === editingTaskId ? { ...t, title: editingTaskTitle.trim() } : t));
    setEditingTaskId(null);
  };

  const handleSaveEdit = async () => {
    if (!email || !editingGoal) return;
    if (!editTitle.trim()) return Alert.alert('Error', 'Title is required');
    
    setIsSavingEdit(true);
    try {
      await updateGoal(email, editingGoal.id, { 
        title: editTitle, 
        description: editDesc,
        category: editCategory,
        priority: editPriority,
        deadline: editDeadline,
        target_value: parseFloat(editTargetValue) || 0,
        current_value: parseFloat(editCurrentValue) || 0,
        unit: editUnit,
        tasks: editTasks
      });
      setModalVisible(false);
      loadGoals();
    } catch (error) {
      Alert.alert('Error', 'Failed to update goal');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!email) return;
    Alert.alert('Delete Goal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGoal(email, goalId); loadGoals(); } }
    ]);
  };

  const CategoryBadge = ({ category }: { category: GoalCategory }) => {
    const safeCat = category || 'personal';
    const categoryColors = {
      career: { bg: colors.background, text: colors.primary, icon: 'briefcase' },
      health: { bg: colors.background, text: colors.success, icon: 'fitness' },
      finance: { bg: colors.background, text: colors.secondary, icon: 'cash' },
      personal: { bg: colors.background, text: colors.primary, icon: 'person' },
    };
    const style = categoryColors[safeCat] || categoryColors.personal;
    return (
      <View style={[dynamicStyles.categoryBadge, { backgroundColor: style.bg }]}>
        <Ionicons name={style.icon as any} size={10} color={style.text} style={{ marginRight: 4 }} />
        <Text style={[dynamicStyles.categoryText, { color: style.text }]}>{safeCat.toUpperCase()}</Text>
      </View>
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerArea: { paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
    pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 10 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    filterChipTextActive: { color: colors.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
    emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 12, fontWeight: '500' },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    goalCard: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 16, flexDirection: 'row', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: colors.border },
    goalCardCompleted: { backgroundColor: colors.background, borderColor: colors.border, opacity: 0.85 },
    goalContent: { flex: 1, padding: 16 },
    goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    goalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
    goalTitleCompleted: { color: colors.textSecondary },
    goalDesc: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 10 },
    goalDescCompleted: { color: colors.textSecondary },
    targetDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    targetDateText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    targetDateTextCompleted: { color: colors.textSecondary },
    daysBadge: { marginLeft: 2 },
    daysBadgeText: { fontSize: 11, color: colors.primary, fontWeight: '700' },
    categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    categoryText: { fontSize: 10, fontWeight: '800' },
    deleteArea: { padding: 16, justifyContent: 'flex-start', alignItems: 'center' },
    progressArea: { marginTop: 6, backgroundColor: colors.background, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
    progressValue: { fontSize: 12, fontWeight: '800', color: colors.text },
    progressBarWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    progressBarTrack: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    createCard: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    createCollapsedText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
    createExpanded: { padding: 16 },
    createTitleInput: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12, paddingVertical: 4 },
    createContentInput: { fontSize: 15, color: colors.text, minHeight: 50, textAlignVertical: 'top', marginBottom: 12 },
    inlineRow: { flexDirection: 'row', marginBottom: 16 },
    smallInput: { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text },
    dateInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, marginBottom: 16 },
    dateInputText: { fontSize: 14, color: colors.text, fontWeight: '500' },
    selectorLabelRow: { marginBottom: 8 },
    selectorLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    catOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    catOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catOptionText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
    catOptionTextActive: { color: colors.text },
    createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: colors.background, paddingTop: 12 },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    saveBtn: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
    saveBtnText: { color: colors.text, fontWeight: '700', fontSize: 14 },
    modalContainer: { flex: 1, backgroundColor: colors.card },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: colors.border },
    modalBody: { padding: 20, flex: 1 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    cancelText: { fontSize: 16, color: colors.textSecondary },
    saveHeaderBtnText: { fontSize: 16, fontWeight: '700', color: colors.primary },
    titleInput: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 20 },
    contentInput: { fontSize: 16, color: colors.text, backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 20 },
    subtaskSection: { marginBottom: 20 },
    subtaskList: { marginBottom: 12 },
    subtaskRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    subtaskCheckbox: { marginRight: 10 },
    subtaskText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
    subtaskTextCompleted: { color: colors.textSecondary, textDecorationLine: 'line-through' },
    subtaskEditInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0, borderBottomWidth: 1, borderBottomColor: colors.primary, marginRight: 10 },
    subtaskActionBtn: { padding: 4 },
    addSubtaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    addSubtaskInput: { flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: colors.text },
    addSubtaskBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    lockedProgressRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 16, borderRadius: 10, marginBottom: 16, gap: 10 },
    lockedProgressText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    filterRowSecondary: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 12 },
    dropdownContainer: { flex: 1, position: 'relative' },
    dropdownBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, gap: 6 },
    dropdownBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dropdownBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, flex: 1 },
    dropdownBtnTextActive: { color: colors.text },
    dropdownMenu: { position: 'absolute', top: 48, left: 0, right: 0, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, zIndex: 1000, shadowColor: colors.text, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.background },
    dropdownItemActive: { backgroundColor: colors.background },
    dropdownItemText: { fontSize: 14, color: colors.text, fontWeight: '500' },
    dropdownItemTextActive: { color: colors.primary, fontWeight: '600' },
  });

  const getDaysRemainingText = (deadline: string, isCompleted: boolean) => {
    if (!deadline || isCompleted) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadline);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return `${diffDays} days left`;
    if (diffDays === 0) return 'Due today';
    return `Overdue by ${Math.abs(diffDays)} days`;
  };

  const renderGoal = ({ item }: { item: Goal }) => {
    const isCompleted = item.status === 'achieved' || (item as any).status === 'completed';
    const targetVal = item.target_value || 100;
    const currentVal = item.current_value !== undefined ? item.current_value : (item as any).progress || 0;
    const progressPercent = Math.min(100, Math.max(0, (currentVal / targetVal) * 100));
    const safeUnit = item.unit || '%';
    const safeCat = item.category || 'personal';
    const userDeadline = item.deadline || (item as any).target_date;
    const hasTasks = item.tasks && item.tasks.length > 0;

    return (
      <View style={[dynamicStyles.goalCard, isCompleted && dynamicStyles.goalCardCompleted]}>
        <View style={dynamicStyles.goalContent}>
          <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
            <View style={dynamicStyles.goalHeaderRow}>
              <Text style={[dynamicStyles.goalTitle, isCompleted && dynamicStyles.goalTitleCompleted]} numberOfLines={1}>
                {item.title}
              </Text>
              <CategoryBadge category={safeCat} />
            </View>
            
            {item.description ? (
              <Text style={[dynamicStyles.goalDesc, isCompleted && dynamicStyles.goalDescCompleted]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            
            {userDeadline ? (
              <View style={dynamicStyles.targetDateRow}>
                <Ionicons name="calendar-outline" size={12} color={isCompleted ? "#94A3B8" : "#8B5CF6"} />
                <Text style={[dynamicStyles.targetDateText, isCompleted && dynamicStyles.targetDateTextCompleted]}>
                  Deadline: {userDeadline}
                </Text>
                
                {getDaysRemainingText(userDeadline, isCompleted) && (
                  <View style={dynamicStyles.daysBadge}>
                    <Text style={[
                      dynamicStyles.daysBadgeText, 
                      getDaysRemainingText(userDeadline, isCompleted)?.includes('Overdue') && { color: '#EF4444' }
                    ]}>
                      • {getDaysRemainingText(userDeadline, isCompleted)}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={dynamicStyles.progressArea}>
             <View style={dynamicStyles.progressHeader}>
                <Text style={dynamicStyles.progressLabel}>
                   {currentVal} / {targetVal} {hasTasks ? 'tasks completed' : safeUnit}
                </Text>
                <Text style={dynamicStyles.progressValue}>{Math.round(progressPercent)}%</Text>
             </View>
             <View style={dynamicStyles.progressBarWrapper}>
               <View style={dynamicStyles.progressBarTrack}>
                 <View style={[
                   dynamicStyles.progressBarFill, 
                   { width: `${progressPercent}%`, backgroundColor: progressPercent >= 100 ? '#22C55E' : '#3B82F6' }
                 ]} />
               </View>
             </View>
          </View>
        </View>

        <TouchableOpacity style={dynamicStyles.deleteArea} onPress={() => handleDelete(item.id)} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderListHeader = () => (
    <View style={dynamicStyles.createCard}>
      {isCreating ? (
        <View style={dynamicStyles.createExpanded}>
          <TextInput style={dynamicStyles.createTitleInput} placeholder="Goal Title" placeholderTextColor="#94A3B8" value={newTitle} onChangeText={setNewTitle} />
          <TextInput style={dynamicStyles.createContentInput} placeholder="Description (Optional)" placeholderTextColor="#94A3B8" multiline value={newDesc} onChangeText={setNewDesc} />
          
          <View style={dynamicStyles.selectorLabelRow}><Text style={dynamicStyles.selectorLabel}>Category:</Text></View>
          <View style={dynamicStyles.categoryOptions}>
            {(['health', 'finance', 'career', 'personal'] as GoalCategory[]).map(c => (
              <TouchableOpacity key={c} style={[dynamicStyles.catOption, newCategory === c && dynamicStyles.catOptionActive]} onPress={() => setNewCategory(c)}>
                <Text style={[dynamicStyles.catOptionText, newCategory === c && dynamicStyles.catOptionTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={dynamicStyles.selectorLabelRow}><Text style={dynamicStyles.selectorLabel}>Priority:</Text></View>
          <View style={dynamicStyles.categoryOptions}>
            {(['low', 'medium', 'high'] as GoalPriority[]).map(p => (
              <TouchableOpacity key={p} style={[dynamicStyles.catOption, newPriority === p && dynamicStyles.catOptionActive]} onPress={() => setNewPriority(p)}>
                <Text style={[dynamicStyles.catOptionText, newPriority === p && dynamicStyles.catOptionTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subtasks Section for Creation */}
          <View style={dynamicStyles.subtaskSection}>
             <Text style={dynamicStyles.selectorLabel}>Initial Goal Tasks</Text>
             <View style={dynamicStyles.subtaskList}>
               {newTasks.map(t => (
                 <View style={dynamicStyles.subtaskRow} key={t.id}>
                    <TouchableOpacity onPress={() => toggleNewTask(t.id)} style={dynamicStyles.subtaskCheckbox}>
                      <Ionicons name={t.completed ? "checkmark-circle" : "ellipse-outline"} size={24} color={t.completed ? "#22C55E" : "#94A3B8"} />
                    </TouchableOpacity>
                    {editingNewTaskId === t.id ? (
                      <TextInput
                        style={dynamicStyles.subtaskEditInput} value={editingNewTaskTitle} onChangeText={setEditingNewTaskTitle}
                        autoFocus onSubmitEditing={saveEditingNewTask} onBlur={saveEditingNewTask}
                      />
                    ) : (
                      <Text style={[dynamicStyles.subtaskText, t.completed && dynamicStyles.subtaskTextCompleted]}>{t.title}</Text>
                    )}
                    {editingNewTaskId === t.id ? (
                      <TouchableOpacity onPress={saveEditingNewTask} style={dynamicStyles.subtaskActionBtn}><Ionicons name="checkmark" size={20} color="#2563EB" /></TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => startEditingNewTask(t)} style={dynamicStyles.subtaskActionBtn}><Ionicons name="pencil-outline" size={18} color="#64748B" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => removeNewTask(t.id)} style={dynamicStyles.subtaskActionBtn}><Ionicons name="trash-outline" size={18} color="#FF5252" /></TouchableOpacity>
                      </View>
                    )}
                 </View>
               ))}
             </View>
             <View style={dynamicStyles.addSubtaskRow}>
                <TextInput 
                  style={dynamicStyles.addSubtaskInput} placeholder="Add a task to automatically track progress..." 
                  value={newSubtaskTitle} onChangeText={setNewSubtaskTitle} onSubmitEditing={handleAddNewSubtask}
                />
                <TouchableOpacity style={dynamicStyles.addSubtaskBtn} onPress={handleAddNewSubtask}>
                   <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
             </View>
          </View>

          {/* Dynamic Progress Configuration */}
          {newTasks.length === 0 ? (
             <View style={dynamicStyles.inlineRow}>
                <TextInput style={[dynamicStyles.smallInput, { flex: 1 }]} placeholder="Target Metric (e.g. 10)" placeholderTextColor="#94A3B8" keyboardType="numeric" value={newTargetValue} onChangeText={setNewTargetValue} />
                <TextInput style={[dynamicStyles.smallInput, { flex: 1, marginLeft: 10 }]} placeholder="Unit (e.g. kg)" placeholderTextColor="#94A3B8" value={newUnit} onChangeText={setNewUnit} />
             </View>
          ) : (
             <View style={dynamicStyles.lockedProgressRow}>
               <Ionicons name="lock-closed" size={14} color="#64748B" />
               <Text style={dynamicStyles.lockedProgressText}>Goal targets will dynamically calculate based on the {newTasks.length} {newTasks.length === 1 ? 'task' : 'tasks'} mapped above.</Text>
             </View>
          )}

          <TouchableOpacity style={dynamicStyles.dateInputWrapper} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={[dynamicStyles.dateInputText, !newDeadline && { color: '#94A3B8' }]}>
              {newDeadline ? `Deadline: ${newDeadline}` : 'Select Deadline'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker value={newDeadline ? new Date(newDeadline) : new Date()} mode="date" display="default" onChange={handleDateChange} />}
          
          <View style={dynamicStyles.createActions}>
            <TouchableOpacity style={dynamicStyles.cancelBtn} onPress={() => setIsCreating(false)}><Text style={dynamicStyles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={dynamicStyles.saveBtn} onPress={handleSaveNewGoal} disabled={isSavingNew}>
              {isSavingNew ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={dynamicStyles.saveBtnText}>Set Goal</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={dynamicStyles.createCollapsed} activeOpacity={0.8} onPress={() => setIsCreating(true)}>
          <Ionicons name="flag-outline" size={22} color={colors.primary} />
          <Text style={dynamicStyles.createCollapsedText}>Set a new milestone goal...</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={dynamicStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <View style={dynamicStyles.headerArea}><Text style={dynamicStyles.pageTitle}>My Goals</Text></View>

      <View style={dynamicStyles.filterRow}>
        <TouchableOpacity style={[dynamicStyles.filterChip, filterMode === 'all' && dynamicStyles.filterChipActive]} onPress={() => setFilterMode('all')}>
          <Text style={[dynamicStyles.filterChipText, filterMode === 'all' && dynamicStyles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[dynamicStyles.filterChip, filterMode === 'active' && dynamicStyles.filterChipActive]} onPress={() => setFilterMode('active')}>
          <Text style={[dynamicStyles.filterChipText, filterMode === 'active' && dynamicStyles.filterChipTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[dynamicStyles.filterChip, filterMode === 'achieved' && dynamicStyles.filterChipActive]} onPress={() => setFilterMode('achieved')}>
          <Text style={[dynamicStyles.filterChipText, filterMode === 'achieved' && dynamicStyles.filterChipTextActive]}>Achieved</Text>
        </TouchableOpacity>
      </View>

      {/* Category and Priority Filters */}
      <View style={dynamicStyles.filterRowSecondary}>
        {/* Category Filter */}
        <View style={dynamicStyles.dropdownContainer}>
          <TouchableOpacity 
            style={[dynamicStyles.dropdownBtn, selectedCategoryFilter && dynamicStyles.dropdownBtnActive]}
            onPress={() => {
              setShowCategoryDropdown(!showCategoryDropdown);
              setShowPriorityDropdown(false);
            }}
          >
            <Ionicons name="layers-outline" size={16} color={selectedCategoryFilter ? '#FFFFFF' : '#64748B'} />
            <Text style={[dynamicStyles.dropdownBtnText, selectedCategoryFilter && dynamicStyles.dropdownBtnTextActive]}>
              {selectedCategoryFilter ? selectedCategoryFilter.charAt(0).toUpperCase() + selectedCategoryFilter.slice(1) : 'Category'}
            </Text>
            <Ionicons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={selectedCategoryFilter ? '#FFFFFF' : '#64748B'} />
          </TouchableOpacity>
          
          {showCategoryDropdown && (
            <View style={dynamicStyles.dropdownMenu}>
              <TouchableOpacity 
                style={dynamicStyles.dropdownItem}
                onPress={() => {
                  setSelectedCategoryFilter(null);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text style={dynamicStyles.dropdownItemText}>All Categories</Text>
              </TouchableOpacity>
              {['health', 'finance', 'career', 'personal'].map((category) => (
                <TouchableOpacity 
                  key={category}
                  style={[dynamicStyles.dropdownItem, selectedCategoryFilter === category && dynamicStyles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedCategoryFilter(category as GoalCategory);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text style={[dynamicStyles.dropdownItemText, selectedCategoryFilter === category && dynamicStyles.dropdownItemTextActive]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Priority Filter */}
        <View style={dynamicStyles.dropdownContainer}>
          <TouchableOpacity 
            style={[dynamicStyles.dropdownBtn, selectedPriorityFilter && dynamicStyles.dropdownBtnActive]}
            onPress={() => {
              setShowPriorityDropdown(!showPriorityDropdown);
              setShowCategoryDropdown(false);
            }}
          >
            <Ionicons name="flame-outline" size={16} color={selectedPriorityFilter ? '#FFFFFF' : '#64748B'} />
            <Text style={[dynamicStyles.dropdownBtnText, selectedPriorityFilter && dynamicStyles.dropdownBtnTextActive]}>
              {selectedPriorityFilter ? selectedPriorityFilter.charAt(0).toUpperCase() + selectedPriorityFilter.slice(1) : 'Priority'}
            </Text>
            <Ionicons name={showPriorityDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={selectedPriorityFilter ? '#FFFFFF' : '#64748B'} />
          </TouchableOpacity>
          
          {showPriorityDropdown && (
            <View style={dynamicStyles.dropdownMenu}>
              <TouchableOpacity 
                style={dynamicStyles.dropdownItem}
                onPress={() => {
                  setSelectedPriorityFilter(null);
                  setShowPriorityDropdown(false);
                }}
              >
                <Text style={dynamicStyles.dropdownItemText}>All Priorities</Text>
              </TouchableOpacity>
              {['low', 'medium', 'high'].map((priority) => (
                <TouchableOpacity 
                  key={priority}
                  style={[dynamicStyles.dropdownItem, selectedPriorityFilter === priority && dynamicStyles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedPriorityFilter(priority as GoalPriority);
                    setShowPriorityDropdown(false);
                  }}
                >
                  <Text style={[dynamicStyles.dropdownItemText, selectedPriorityFilter === priority && dynamicStyles.dropdownItemTextActive]}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={dynamicStyles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredGoals}
          keyExtractor={(item) => item.id}
          renderItem={renderGoal}
          ListHeaderComponent={renderListHeader()}
          contentContainerStyle={dynamicStyles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
             <View style={dynamicStyles.emptyWrap}>
               <Ionicons name="trophy-outline" size={60} color="#CBD5E1" />
               <Text style={dynamicStyles.emptyText}>You haven't set any goals yet.</Text>
             </View>
          }
        />
      )}

      {/* Edit Goal / Task Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={dynamicStyles.modalContainer}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={dynamicStyles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={dynamicStyles.modalTitle}>Manage Goal</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={dynamicStyles.saveHeaderBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={dynamicStyles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput style={dynamicStyles.titleInput} placeholder="Goal Title" value={editTitle} onChangeText={setEditTitle} />
            <TextInput style={dynamicStyles.contentInput} placeholder="Description" multiline textAlignVertical="top" value={editDesc} onChangeText={setEditDesc} />

            <View style={dynamicStyles.selectorLabelRow}><Text style={dynamicStyles.selectorLabel}>Category:</Text></View>
            <View style={dynamicStyles.categoryOptions}>
              {(['health', 'finance', 'career', 'personal'] as GoalCategory[]).map(c => (
                <TouchableOpacity key={c} style={[dynamicStyles.catOption, editCategory === c && dynamicStyles.catOptionActive]} onPress={() => setEditCategory(c)}>
                  <Text style={[dynamicStyles.catOptionText, editCategory === c && dynamicStyles.catOptionTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={dynamicStyles.selectorLabelRow}><Text style={dynamicStyles.selectorLabel}>Priority:</Text></View>
            <View style={dynamicStyles.categoryOptions}>
              {(['low', 'medium', 'high'] as GoalPriority[]).map(p => (
                <TouchableOpacity key={p} style={[dynamicStyles.catOption, editPriority === p && dynamicStyles.catOptionActive]} onPress={() => setEditPriority(p)}>
                  <Text style={[dynamicStyles.catOptionText, editPriority === p && dynamicStyles.catOptionTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subtasks System */}
            <View style={dynamicStyles.subtaskSection}>
               <Text style={dynamicStyles.selectorLabel}>Goal Tasks</Text>
               <View style={dynamicStyles.subtaskList}>
                 {editTasks.map(t => (
                   <View style={dynamicStyles.subtaskRow} key={t.id}>
                      <TouchableOpacity onPress={() => toggleTask(t.id)} style={dynamicStyles.subtaskCheckbox}>
                        <Ionicons name={t.completed ? "checkmark-circle" : "ellipse-outline"} size={24} color={t.completed ? "#22C55E" : "#94A3B8"} />
                      </TouchableOpacity>
                      
                      {editingTaskId === t.id ? (
                        <TextInput
                          style={dynamicStyles.subtaskEditInput} value={editingTaskTitle} onChangeText={setEditingTaskTitle}
                          autoFocus onSubmitEditing={saveEditingTask} onBlur={saveEditingTask}
                        />
                      ) : (
                        <Text style={[dynamicStyles.subtaskText, t.completed && dynamicStyles.subtaskTextCompleted]}>{t.title}</Text>
                      )}

                      {editingTaskId === t.id ? (
                        <TouchableOpacity onPress={saveEditingTask} style={dynamicStyles.subtaskActionBtn}><Ionicons name="checkmark" size={20} color="#2563EB" /></TouchableOpacity>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity onPress={() => startEditingTask(t)} style={dynamicStyles.subtaskActionBtn}><Ionicons name="pencil-outline" size={18} color="#64748B" /></TouchableOpacity>
                          <TouchableOpacity onPress={() => removeTask(t.id)} style={dynamicStyles.subtaskActionBtn}><Ionicons name="trash-outline" size={18} color="#FF5252" /></TouchableOpacity>
                        </View>
                      )}
                   </View>
                 ))}
               </View>

               <View style={dynamicStyles.addSubtaskRow}>
                  <TextInput 
                    style={dynamicStyles.addSubtaskInput} placeholder="Add a new goal task..." 
                    value={newTaskTitle} onChangeText={setNewTaskTitle} onSubmitEditing={handleAddSubtask}
                  />
                  <TouchableOpacity style={dynamicStyles.addSubtaskBtn} onPress={handleAddSubtask}>
                     <Ionicons name="add" size={20} color="#FFF" />
                  </TouchableOpacity>
               </View>
            </View>

            {editTasks.length === 0 ? (
               <View style={dynamicStyles.inlineRow}>
                  <View style={{flex: 1}}>
                     <Text style={dynamicStyles.selectorLabel}>Current Progress</Text>
                     <TextInput style={dynamicStyles.smallInput} keyboardType="numeric" value={editCurrentValue} onChangeText={setEditCurrentValue} />
                  </View>
                  <View style={{flex: 1, marginLeft: 10}}>
                     <Text style={dynamicStyles.selectorLabel}>Target Value</Text>
                     <TextInput style={dynamicStyles.smallInput} keyboardType="numeric" value={editTargetValue} onChangeText={setEditTargetValue} />
                  </View>
               </View>
            ) : (
               <View style={dynamicStyles.lockedProgressRow}>
                 <Ionicons name="lock-closed" size={14} color="#64748B" />
                 <Text style={dynamicStyles.lockedProgressText}>Goal progress and target metrics are dynamically mapped to your saved task completion flow.</Text>
               </View>
            )}

            <TouchableOpacity style={[dynamicStyles.dateInputWrapper, { marginBottom: 40 }]} onPress={() => setShowEditDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={dynamicStyles.dateInputText}>{editDeadline ? `Deadline: ${editDeadline}` : 'Select Deadline'}</Text>
            </TouchableOpacity>
            {showEditDatePicker && <DateTimePicker value={editDeadline ? new Date(editDeadline) : new Date()} mode="date" display="default" onChange={handleEditDateChange} />}
            
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}
