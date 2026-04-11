
import { getCardSystem } from '@/constants/card-system';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert,
    Animated,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGoals, Goal, updateGoal } from '../../lib/goals-service';
import { getSkills, Skill, updateSkill } from '../../lib/skills-service';
import { addTask, deleteTask, getTasks, Task, TaskPriority, updateTask } from '../../lib/tasks-service';


export type ExtendedTask = Task & {
  isGoalTask?: boolean;
  originalGoalId?: string;
  originalTaskId?: string;
  // Skill task extras
  isSkillTask?: boolean;
  originalSkillId?: string;
  originalSkillTaskId?: string;
};

export default function TasksScreen() {
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
  
  const dynamicStyles = StyleSheet.create({
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
    pageSubtitle: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    segmentBlock: { flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 3, marginBottom: 12, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
    segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
    segmentText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 60,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 16,
      marginTop: 12,
      fontWeight: '500',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100, 
    },
    // Task Card
    taskCard: {
      ...cardSystem.surface,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    taskCardCompleted: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      opacity: 0.8,
    },
    checkboxArea: {
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    taskContent: {
      flex: 1,
      paddingVertical: 14,
      paddingRight: 10,
    },
    taskHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    taskTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    taskTitleCompleted: {
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    taskDesc: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    taskDescCompleted: {
      color: colors.textSecondary,
    },
    dueDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
      flexShrink: 1,
      minWidth: 0,
      maxWidth: '100%',
    },
    overdueBadge: {
      marginLeft: 6,
      backgroundColor: colors.danger,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    overdueBadgeText: {
      color: colors.card,
      fontSize: 10,
      fontWeight: '800',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 4,
      gap: 8,
    },
    dueDateText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
      flexShrink: 1,
    },
    dueDateTextCompleted: {
      color: colors.textSecondary,
    },
    goalTaskPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.1)',
    },
    goalTaskPillText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    priorityText: {
      fontSize: 10,
      fontWeight: '800',
    },
    deleteArea: {
      ...cardSystem.actionRail,
      padding: 16,
      gap: 0,
    },
    // Inline Create Styles
    createCard: {
      ...cardSystem.createSurface,
      marginBottom: 20,
    },
    createCollapsed: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    createCollapsedText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    createExpanded: {
      padding: 16,
    },
    createTitleInput: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
      paddingVertical: 4,
    },
    createContentInput: {
      fontSize: 15,
      color: colors.text,
      minHeight: 50,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    dateInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateInputText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    prioritySelectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    selectorLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginRight: 10,
    },
    priorityOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    priorityOption: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    priorityOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    priorityOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    priorityOptionTextSelected: {
      color: '#FFFFFF',
    },
    createActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingTop: 12,
    },
    cancelBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 14,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 20,
      justifyContent: 'center',
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    // Modal styles (Edit)
    modalContainer: {
      flex: 1,
      backgroundColor: colors.card,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalBody: {
      padding: 20,
      flex: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    cancelText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    saveHeaderBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    titleInput: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    contentInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
    },
    // Dropdown Filter Styles
    filterRowSecondary: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 20, gap: 12, marginTop: 4 },
    dropdownContainer: { flex: 1, position: 'relative', minHeight: 44 },
    dropdownBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, gap: 6, shadowColor: colors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
    dropdownBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
    dropdownBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      flex: 1,
    },
    dropdownBtnTextActive: { color: '#FFFFFF', fontWeight: '700' },
    dropdownMenu: {
      position: 'absolute',
      top: 48,
      left: 0,
      right: 0,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 1000,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
      overflow: 'hidden',
    },
    dropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.background,
    },
    dropdownItemActive: { backgroundColor: colors.background, borderLeftWidth: 4, borderLeftColor: colors.primary, paddingHorizontal: 12 },
    dropdownItemText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    dropdownItemTextActive: { color: colors.primary, fontWeight: '700' },
  });
  
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  // Filter state
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'pending' | 'completed'>('all');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string | null>(null);
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string | null>(null);
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);
  
  // Inline Create state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Edit Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<ExtendedTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const toLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setNewDueDate(toLocalDateString(selectedDate));
    }
  };

  const handleEditDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEditDatePicker(false);
    if (selectedDate) {
      setEditDueDate(toLocalDateString(selectedDate));
    }
  };

  useEffect(() => {
    if (email) {
      loadTasks();
    } else {
      setLoading(false);
    }
  }, [email]);

  const loadTasks = async () => {
    if (!email) return;
    try {
      const fetchedTasks = await getTasks(email);
      const fetchedGoals = await getGoals(email);
      const fetchedSkills = await getSkills(email);

      setSkills(fetchedSkills);
      setGoals(fetchedGoals);

      const mappedGoalTasks: ExtendedTask[] = fetchedGoals.flatMap(goal => {
        if (!goal.tasks) return [];
        return goal.tasks.map(t => ({
          id: `goaltask_${goal.id}_${t.id}`,
          title: `Goal: ${goal.title}`,
          description: t.title,
          status: t.completed ? 'completed' : 'pending',
          priority: goal.priority as TaskPriority,
          due_date: goal.deadline || (goal as any).target_date || '',
          created_at: goal.created_at,
          isGoalTask: true,
          originalGoalId: goal.id,
          originalTaskId: t.id
        }));
      });

      const mappedSkillTasks: ExtendedTask[] = fetchedSkills.flatMap(skill => {
        if (!skill.progress || skill.progress.length === 0) return [];
        return skill.progress.map(t => ({
          id: `skilltask_${skill.id}_${t.id}`,
          title: `Skill: ${skill.name}`,
          description: t.title,
          status: t.completed ? 'completed' : 'pending',
          priority: 'medium' as TaskPriority,
          due_date: '',
          created_at: skill.created_at,
          isSkillTask: true,
          originalSkillId: skill.id,
          originalSkillTaskId: t.id,
        }));
      });

      const allTasks = [...fetchedTasks, ...mappedGoalTasks, ...mappedSkillTasks];

      // Sort tasks: pending first, then by priority, then newest
      allTasks.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        const pOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[b.priority] - pOrder[a.priority];
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setTasks(allTasks);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const handleSaveNewTask = async () => {
    if (!email) {
      Alert.alert('Authentication Error', 'You must be logged in to save tasks.');
      return;
    }
    if (!newTitle.trim()) {
      setIsCreating(false);
      return;
    }
    
    setIsSavingNew(true);
    try {
      await addTask(email, newTitle, newDesc, 'pending', newPriority, newDueDate);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('medium');
      setNewDueDate('');
      setIsCreating(false);
      Keyboard.dismiss();
      loadTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to save task');
    } finally {
      setIsSavingNew(false);
    }
  };

  const toggleTaskStatus = async (task: ExtendedTask) => {
    if (!email) return;
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      if (task.isGoalTask && task.originalGoalId && task.originalTaskId) {
        const goalList = await getGoals(email);
        const parentGoal = goalList.find(g => g.id === task.originalGoalId);
        
        if (parentGoal && parentGoal.tasks) {
          const updatedSubtasks = parentGoal.tasks.map(subt => 
            subt.id === task.originalTaskId ? { ...subt, completed: newStatus === 'completed' } : subt
          );
          await updateGoal(email, parentGoal.id, { tasks: updatedSubtasks });
        }
      } else if (task.isSkillTask && task.originalSkillId && task.originalSkillTaskId) {
        const skillList = await getSkills(email);
        const parentSkill = skillList.find(s => s.id === task.originalSkillId);
        if (parentSkill) {
          const updatedProgress = parentSkill.progress.map(pt =>
            pt.id === task.originalSkillTaskId ? { ...pt, completed: newStatus === 'completed' } : pt
          );
          await updateSkill(email, parentSkill.id, { progress: updatedProgress });
        }
      } else {
        await updateTask(email, task.id, { status: newStatus });
      }
    } catch (error) {
      // Revert if error
      loadTasks();
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const openEditModal = (task: ExtendedTask) => {
    if (task.isGoalTask) {
      return Alert.alert('Mapped Goal Task', 'This is a subtask inside a Goal. Navigate to Goals to edit it.');
    }
    if (task.isSkillTask) {
      return Alert.alert('Skill Progress Task', 'This task is part of a Skill. Navigate to Skills to edit it.');
    }
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditPriority(task.priority);
    setEditDueDate(task.due_date);
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!email || !editingTask) return;
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    
    setIsSavingEdit(true);
    try {
      if (!editingTask.isGoalTask) {
        await updateTask(email, editingTask.id, { 
          title: editTitle, 
          description: editDesc,
          priority: editPriority,
          due_date: editDueDate
        });
      }
      setModalVisible(false);
      loadTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!email) return;
    
    const targetTask = tasks.find(t => t.id === taskId);
    if (targetTask?.isGoalTask) {
      return Alert.alert('Mapped Goal Task', 'Navigate to Goals to delete this task.');
    }
    if (targetTask?.isSkillTask) {
      return Alert.alert('Skill Progress Task', 'Navigate to Skills to delete this task.');
    }

    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          await deleteTask(email, taskId);
          loadTasks();
        }
      }
    ]);
  };

  const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
    const colors = {
      high: { bg: '#FEE2E2', text: '#EF4444' },
      medium: { bg: '#D4AF37', text: '#FFFFFF' },
      low: { bg: '#E0F2FE', text: '#0EA5E9' },
    };
    const style = colors[priority];
    return (
      <View style={[dynamicStyles.priorityBadge, { backgroundColor: style.bg }]}>
        <Text style={[dynamicStyles.priorityText, { color: style.text }]}>{priority.toUpperCase()}</Text>
      </View>
    );
  };

  const isValidDateOnlyString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  const renderTask = ({ item }: { item: ExtendedTask }) => {
    const isCompleted = item.status === 'completed';
    const hasDueDate = !!item.due_date && isValidDateOnlyString(item.due_date);
    const isOverdue = hasDueDate && !isCompleted && item.due_date < todayStr;


    return (
      <View style={[dynamicStyles.taskCard, item.isGoalTask && { borderColor: '#E0E7FF', borderWidth: 1.5 }, isCompleted && dynamicStyles.taskCardCompleted]}>
        <TouchableOpacity 
          style={[dynamicStyles.checkboxArea]}
          onPress={() => toggleTaskStatus(item)}
          activeOpacity={0.6}
        >
          <Ionicons 
            name={isCompleted ? "checkmark-circle" : "ellipse-outline"} 
            size={28} 
            color={isCompleted ? "#22C55E" : "#CBD5E1"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.taskContent]}
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}
        >
          <View style={[dynamicStyles.taskHeaderRow]}>
            <Text style={[dynamicStyles.taskTitle, item.isGoalTask && { color: colors.primary }, isCompleted && dynamicStyles.taskTitleCompleted]} numberOfLines={1}>
              {item.title}
            </Text>
            <PriorityBadge priority={item.priority} />
          </View>
          
          {item.description ? (
            <Text style={[dynamicStyles.taskDesc, item.isGoalTask && { color: colors.text, fontWeight: '500' }, isCompleted && dynamicStyles.taskDescCompleted]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          
          <View style={dynamicStyles.metaRow}>
             {item.due_date ? (
               <View style={dynamicStyles.dueDateRow}>
                  <Ionicons name="calendar-outline" size={14} color={isCompleted ? "#94A3B8" : "#64748B"} />
                  <Text style={[dynamicStyles.dueDateText, isCompleted && dynamicStyles.dueDateTextCompleted]}>
                    Due: {item.due_date}
                  </Text>
                  {isOverdue && (
                    <View style={[dynamicStyles.overdueBadge]}>
                      <Text style={[dynamicStyles.overdueBadgeText]}>DUE DATE ENDED</Text>
                    </View>
                  )}
                </View>
              ) : null}

              {item.isGoalTask && (
                 <View style={dynamicStyles.goalTaskPill}>
                    <Ionicons name="flag" size={12} color={isCompleted ? colors.textSecondary : colors.primary} />
                    <Text style={[dynamicStyles.goalTaskPillText, isCompleted && { color: colors.textSecondary }]}>GOAL TASK</Text>
                 </View>
              )}
           </View>
        </TouchableOpacity>

        <TouchableOpacity style={[dynamicStyles.deleteArea]} onPress={() => handleDelete(item.id)} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const PrioritySelector = ({ 
    selected, 
    onSelect 
  }: { 
    selected: TaskPriority; 
    onSelect: (p: TaskPriority) => void 
  }) => (
    <View style={[dynamicStyles.prioritySelectorRow]}>
      <Text style={[dynamicStyles.selectorLabel]}>Priority:</Text>
      <View style={[dynamicStyles.priorityOptions]}>
        {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
          <TouchableOpacity 
            key={p} 
            style={[dynamicStyles.priorityOption, selected === p && dynamicStyles.priorityOptionSelected]}
            onPress={() => onSelect(p)}
          >
            <Text style={[dynamicStyles.priorityOptionText, selected === p && dynamicStyles.priorityOptionTextSelected]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const todayStr = toLocalDateString(new Date());
  const filteredTasks = tasks.filter(task => {
    const hasDueDate = !!task.due_date && isValidDateOnlyString(task.due_date);
    const isOverdue = hasDueDate && task.status !== 'completed' && task.due_date < todayStr;

    // Filter by skill
    if (selectedSkillFilter) {
      if (!task.isSkillTask || task.originalSkillId !== selectedSkillFilter) {
        return false;
      }
    }

    // Filter by goal
    if (selectedGoalFilter) {
      if (!task.isGoalTask || task.originalGoalId !== selectedGoalFilter) {
        return false;
      }
    }

    if (filterMode === 'today') {
      return task.due_date === todayStr;
    }

    if (filterMode === 'pending') {
      return task.status === 'pending' && !isOverdue;
    }

    if (filterMode === 'completed') {
      return task.status === 'completed';
    }

    return true;
  });

  const renderListHeader = () => (
    <View style={[dynamicStyles.createCard]}>
      {isCreating ? (
        <View style={[dynamicStyles.createExpanded]}>
          <TextInput
            style={[dynamicStyles.createTitleInput]}
            placeholder="Task Title"
            placeholderTextColor={colors.textSecondary}
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
          />
          <TextInput
            style={[dynamicStyles.createContentInput]}
            placeholder="Description (Optional)"
            placeholderTextColor={colors.textSecondary}
            multiline
            value={newDesc}
            onChangeText={setNewDesc}
          />
          
          <PrioritySelector selected={newPriority} onSelect={setNewPriority} />
          
          <TouchableOpacity 
            style={[dynamicStyles.dateInputWrapper]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[dynamicStyles.dateInputText, !newDueDate && { color: colors.textSecondary }]}>
              {newDueDate ? `Due: ${newDueDate}` : 'Select Due Date (Optional)'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={newDueDate ? new Date(newDueDate) : new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
          
          <View style={[dynamicStyles.createActions]}>
            <TouchableOpacity 
              style={[dynamicStyles.cancelBtn]}
              onPress={() => {
                setIsCreating(false);
                setNewTitle('');
                setNewDesc('');
                setNewDueDate('');
                Keyboard.dismiss();
              }}
            >
              <Text style={[dynamicStyles.cancelBtnText]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[dynamicStyles.saveBtn]}
              onPress={handleSaveNewTask}
              disabled={isSavingNew}
            >
              {isSavingNew ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={[dynamicStyles.saveBtnText]}>Save Task</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={[dynamicStyles.createCollapsed]}
          activeOpacity={0.8}
          onPress={() => setIsCreating(true)}
        >
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={[dynamicStyles.createCollapsedText]}>Add a new task...</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const filterLabels: Record<'all' | 'today' | 'pending' | 'completed', string> = {
    all: 'All',
    today: 'Today',
    pending: 'Pending',
    completed: 'Completed',
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
              <Text style={dynamicStyles.pageTitle}>Tasks</Text>
              <Text style={dynamicStyles.pageSubtitle}>Manage and prioritize your work</Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }}>

        <View style={dynamicStyles.segmentBlock}>
          {(['all', 'today', 'pending', 'completed'] as const).map((t) => {
            const themeColor = '#D4AF37';
            const getRgbaColor = (hex: string, opacity: number) => {
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            };
            return (
              <TouchableOpacity
                key={t}
                style={[
                  dynamicStyles.segmentBtn,
                  filterMode === t && {
                    backgroundColor: isDark ? getRgbaColor(themeColor, 0.15) : getRgbaColor(themeColor, 0.1),
                    borderColor: themeColor,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setFilterMode(t)}
              >
                <Text
                  style={[
                    dynamicStyles.segmentText,
                    filterMode === t && { color: '#D4AF37', fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {filterLabels[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

      {/* Skill and Goal Filters */}
      <View style={[dynamicStyles.filterRowSecondary]}>
        {/* Skill Filter */}
        <View style={[dynamicStyles.dropdownContainer]}>
          <TouchableOpacity 
            style={[dynamicStyles.dropdownBtn, selectedSkillFilter && dynamicStyles.dropdownBtnActive]}
            onPress={() => {
              setShowSkillDropdown(!showSkillDropdown);
              setShowGoalDropdown(false);
            }}
          >
            <Ionicons name="bulb-outline" size={16} color={selectedSkillFilter ? '#FFFFFF' : '#64748B'} />
            <Text style={[dynamicStyles.dropdownBtnText, selectedSkillFilter && dynamicStyles.dropdownBtnTextActive]}>
              {selectedSkillFilter ? skills.find(s => s.id === selectedSkillFilter)?.name || 'Skill' : 'Skill'}
            </Text>
            <Ionicons name={showSkillDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={selectedSkillFilter ? '#FFFFFF' : '#64748B'} />
          </TouchableOpacity>
          
          {showSkillDropdown && (
            <View style={[dynamicStyles.dropdownMenu]}>
              <TouchableOpacity 
                style={[dynamicStyles.dropdownItem]}
                onPress={() => {
                  setSelectedSkillFilter(null);
                  setShowSkillDropdown(false);
                }}
              >
                <Text style={[dynamicStyles.dropdownItemText]}>All Skills</Text>
              </TouchableOpacity>
              {skills.map(skill => (
                <TouchableOpacity 
                  key={skill.id}
                  style={[dynamicStyles.dropdownItem, selectedSkillFilter === skill.id && dynamicStyles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedSkillFilter(skill.id);
                    setShowSkillDropdown(false);
                  }}
                >
                  <Text style={[dynamicStyles.dropdownItemText, selectedSkillFilter === skill.id && dynamicStyles.dropdownItemTextActive]}>
                    {skill.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Goal Filter */}
        <View style={[dynamicStyles.dropdownContainer]}>
          <TouchableOpacity 
            style={[dynamicStyles.dropdownBtn, selectedGoalFilter && dynamicStyles.dropdownBtnActive]}
            onPress={() => {
              setShowGoalDropdown(!showGoalDropdown);
              setShowSkillDropdown(false);
            }}
          >
            <Ionicons name="flag-outline" size={16} color={selectedGoalFilter ? '#FFFFFF' : '#64748B'} />
            <Text style={[dynamicStyles.dropdownBtnText, selectedGoalFilter && dynamicStyles.dropdownBtnTextActive]}>
              {selectedGoalFilter ? goals.find(g => g.id === selectedGoalFilter)?.title || 'Goal' : 'Goal'}
            </Text>
            <Ionicons name={showGoalDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={selectedGoalFilter ? '#FFFFFF' : '#64748B'} />
          </TouchableOpacity>
          
          {showGoalDropdown && (
            <View style={[dynamicStyles.dropdownMenu]}>
              <TouchableOpacity 
                style={[dynamicStyles.dropdownItem]}
                onPress={() => {
                  setSelectedGoalFilter(null);
                  setShowGoalDropdown(false);
                }}
              >
                <Text style={[dynamicStyles.dropdownItemText]}>All Goals</Text>
              </TouchableOpacity>
              {goals.map(goal => (
                <TouchableOpacity 
                  key={goal.id}
                  style={[dynamicStyles.dropdownItem, selectedGoalFilter === goal.id && dynamicStyles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedGoalFilter(goal.id);
                    setShowGoalDropdown(false);
                  }}
                >
                  <Text style={[dynamicStyles.dropdownItemText, selectedGoalFilter === goal.id && dynamicStyles.dropdownItemTextActive]}>
                    {goal.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={[dynamicStyles.center]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          ListHeaderComponent={renderListHeader()}
          contentContainerStyle={dynamicStyles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
             <View style={[dynamicStyles.emptyWrap]}>
               <Ionicons name="checkbox-outline" size={60} color={colors.border} />
               <Text style={[dynamicStyles.emptyText]}>No tasks pending. You're all caught up!</Text>
             </View>
          }
        />
      )}

        {/* Task Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[dynamicStyles.modalContainer]}
          >
            <View style={[dynamicStyles.modalHeader]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[dynamicStyles.cancelText]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[dynamicStyles.modalTitle]}>Edit Task</Text>
              <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[dynamicStyles.saveHeaderBtnText]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={[dynamicStyles.modalBody]}>
              <TextInput
                style={[dynamicStyles.titleInput]}
                placeholder="Task Title"
                placeholderTextColor={colors.textSecondary}
                value={editTitle}
                onChangeText={setEditTitle}
              />
              
              <PrioritySelector selected={editPriority} onSelect={setEditPriority} />
              
              <TouchableOpacity 
                style={[dynamicStyles.dateInputWrapper, { marginBottom: 20 }]}
                onPress={() => setShowEditDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[dynamicStyles.dateInputText, !editDueDate && { color: colors.textSecondary }]}>
                  {editDueDate ? `Due: ${editDueDate}` : 'Select Due Date'}
                </Text>
              </TouchableOpacity>

              {showEditDatePicker && (
                <DateTimePicker
                  value={editDueDate ? new Date(editDueDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleEditDateChange}
                />
              )}
              
              <TextInput
                style={[dynamicStyles.contentInput]}
                placeholder="Description"
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                value={editDesc}
                onChangeText={setEditDesc}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>

        </View>
      </View>
    </SafeAreaView>
  );
}




