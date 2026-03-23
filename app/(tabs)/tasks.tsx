import FloatingActionButton from '@/components/FloatingActionButton';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
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
import { getGoals, updateGoal } from '../../lib/goals-service';
import { addTask, deleteTask, getTasks, Task, TaskPriority, updateTask } from '../../lib/tasks-service';
import Navbar from './navbar';

export type ExtendedTask = Task & {
  isGoalTask?: boolean;
  originalGoalId?: string;
  originalTaskId?: string;
};

export default function TasksScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter state
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'pending' | 'completed' | 'overdue'>('all');
  
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setNewDueDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleEditDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowEditDatePicker(false);
    if (selectedDate) {
      setEditDueDate(selectedDate.toISOString().split('T')[0]);
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

      const allTasks = [...fetchedTasks, ...mappedGoalTasks];

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
      return Alert.alert('Mapped Goal Task', 'This is a subtask embedded inside a Goal. Please navigate to the Goals menu to heavily edit this subtask structurally.');
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
       return Alert.alert('Mapped Goal Task', 'This task is rigidly configured within a Goal. Navigate to the Goals tab to delete it.');
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
      medium: { bg: '#FEF3C7', text: '#F59E0B' },
      low: { bg: '#E0F2FE', text: '#0EA5E9' },
    };
    const style = colors[priority];
    return (
      <View style={[styles.priorityBadge, { backgroundColor: style.bg }]}>
        <Text style={[styles.priorityText, { color: style.text }]}>{priority.toUpperCase()}</Text>
      </View>
    );
  };

  const isValidDateOnlyString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  const renderTask = ({ item }: { item: ExtendedTask }) => {
    const isCompleted = item.status === 'completed';
    const hasDueDate = !!item.due_date && isValidDateOnlyString(item.due_date);
    const isOverdue = hasDueDate && !isCompleted && item.due_date < todayStr;
    return (
      <View style={[styles.taskCard, item.isGoalTask && { borderColor: '#E0E7FF', borderWidth: 1.5 }, isCompleted && styles.taskCardCompleted]}>
        <TouchableOpacity 
          style={styles.checkboxArea} 
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
          style={styles.taskContent} 
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}
        >
          <View style={styles.taskHeaderRow}>
            <Text style={[styles.taskTitle, item.isGoalTask && { color: '#1D4ED8' }, isCompleted && styles.taskTitleCompleted]} numberOfLines={1}>
              {item.title}
            </Text>
            <PriorityBadge priority={item.priority} />
          </View>
          
          {item.description ? (
            <Text style={[styles.taskDesc, item.isGoalTask && { color: '#0F172A', fontWeight: '500' }, isCompleted && styles.taskDescCompleted]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4}}>
             {item.due_date ? (
               <View style={styles.dueDateRow}>
                 <Ionicons name="calendar-outline" size={14} color={isCompleted ? "#94A3B8" : "#64748B"} />
                 <Text style={[styles.dueDateText, isCompleted && styles.dueDateTextCompleted]}>
                   Due: {item.due_date}
                 </Text>
                 {isOverdue && (
                   <View style={styles.overdueBadge}>
                     <Text style={styles.overdueBadgeText}>DUE DATE ENDED</Text>
                   </View>
                 )}
               </View>
             ) : <View/>}

             {item.isGoalTask && (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                   <Ionicons name="flag" size={12} color={isCompleted ? "#94A3B8" : "#3B82F6"} />
                   <Text style={{fontSize: 10, fontWeight: '700', color: isCompleted ? "#94A3B8" : "#3B82F6"}}>GOAL TASK</Text>
                </View>
             )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteArea} onPress={() => handleDelete(item.id)} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={item.isGoalTask ? "#CBD5E1" : "#FF5252"} />
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
    <View style={styles.prioritySelectorRow}>
      <Text style={styles.selectorLabel}>Priority:</Text>
      <View style={styles.priorityOptions}>
        {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
          <TouchableOpacity 
            key={p} 
            style={[styles.priorityOption, selected === p && styles.priorityOptionSelected]}
            onPress={() => onSelect(p)}
          >
            <Text style={[styles.priorityOptionText, selected === p && styles.priorityOptionTextSelected]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const filteredTasks = tasks.filter(task => {
    const hasDueDate = !!task.due_date && isValidDateOnlyString(task.due_date);
    const isOverdue = hasDueDate && task.status !== 'completed' && task.due_date < todayStr;

    if (filterMode === 'today') {
      return task.due_date === todayStr;
    }

    if (filterMode === 'pending') {
      return task.status === 'pending' && !isOverdue;
    }

    if (filterMode === 'completed') {
      return task.status === 'completed';
    }

    if (filterMode === 'overdue') {
      return isOverdue;
    }

    return true;
  });

  const renderListHeader = () => (
    <View style={styles.createCard}>
      {isCreating ? (
        <View style={styles.createExpanded}>
          <TextInput
            style={styles.createTitleInput}
            placeholder="Task Title"
            placeholderTextColor="#94A3B8"
            value={newTitle}
            onChangeText={setNewTitle}
            autoFocus
          />
          <TextInput
            style={styles.createContentInput}
            placeholder="Description (Optional)"
            placeholderTextColor="#94A3B8"
            multiline
            value={newDesc}
            onChangeText={setNewDesc}
          />
          
          <PrioritySelector selected={newPriority} onSelect={setNewPriority} />
          
          <TouchableOpacity 
            style={styles.dateInputWrapper}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={[styles.dateInputText, !newDueDate && { color: '#94A3B8' }]}>
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
          
          <View style={styles.createActions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={() => {
                setIsCreating(false);
                setNewTitle('');
                setNewDesc('');
                setNewDueDate('');
                Keyboard.dismiss();
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSaveNewTask}
              disabled={isSavingNew}
            >
              {isSavingNew ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Task</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.createCollapsed} 
          activeOpacity={0.8}
          onPress={() => setIsCreating(true)}
        >
          <Ionicons name="add-circle-outline" size={22} color="#1D4ED8" />
          <Text style={styles.createCollapsedText}>Add a new task...</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Navbar />
      
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>My Tasks</Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity 
          style={[styles.filterChip, filterMode === 'all' && styles.filterChipActive]}
          onPress={() => setFilterMode('all')}
        >
          <Text style={[styles.filterChipText, filterMode === 'all' && styles.filterChipTextActive]}>All Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filterMode === 'today' && styles.filterChipActive]}
          onPress={() => setFilterMode('today')}
        >
          <Text style={[styles.filterChipText, filterMode === 'today' && styles.filterChipTextActive]}>Today Only</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filterMode === 'pending' && styles.filterChipActive]}
          onPress={() => setFilterMode('pending')}
        >
          <Text style={[styles.filterChipText, filterMode === 'pending' && styles.filterChipTextActive]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filterMode === 'completed' && styles.filterChipActive]}
          onPress={() => setFilterMode('completed')}
        >
          <Text style={[styles.filterChipText, filterMode === 'completed' && styles.filterChipTextActive]}>Completed</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filterMode === 'overdue' && styles.filterChipActive]}
          onPress={() => setFilterMode('overdue')}
        >
          <Text style={[styles.filterChipText, filterMode === 'overdue' && styles.filterChipTextActive]}>Overdue</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          ListHeaderComponent={renderListHeader()}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
             <View style={styles.emptyWrap}>
               <Ionicons name="checkbox-outline" size={60} color="#CBD5E1" />
               <Text style={styles.emptyText}>No tasks pending. You're all caught up!</Text>
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
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Task</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? (
                <ActivityIndicator size="small" color="#1D4ED8" />
              ) : (
                <Text style={styles.saveHeaderBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <TextInput
              style={styles.titleInput}
              placeholder="Task Title"
              placeholderTextColor="#94A3B8"
              value={editTitle}
              onChangeText={setEditTitle}
            />
            
            <PrioritySelector selected={editPriority} onSelect={setEditPriority} />
            
            <TouchableOpacity 
              style={[styles.dateInputWrapper, { marginBottom: 20 }]}
              onPress={() => setShowEditDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={[styles.dateInputText, !editDueDate && { color: '#94A3B8' }]}>
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
              style={styles.contentInput}
              placeholder="Description"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              value={editDesc}
              onChangeText={setEditDesc}
            />
          </View>
        </KeyboardAvoidingView>
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
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
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
    color: '#64748B',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  taskCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
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
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  taskTitleCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  taskDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  taskDescCompleted: {
    color: '#94A3B8',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  overdueBadge: {
    marginLeft: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  overdueBadgeText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '800',
  },
  dueDateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dueDateTextCompleted: {
    color: '#94A3B8',
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
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Inline Create Styles
  createCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  createCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  createCollapsedText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  createExpanded: {
    padding: 16,
  },
  createTitleInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    paddingVertical: 4,
  },
  createContentInput: {
    fontSize: 15,
    color: '#334155',
    minHeight: 50,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  dateInputText: {
    fontSize: 14,
    color: '#334155',
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
    color: '#64748B',
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
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  priorityOptionSelected: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
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
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#1D4ED8',
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
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalBody: {
    padding: 20,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  cancelText: {
    fontSize: 16,
    color: '#64748B',
  },
  saveHeaderBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
});
