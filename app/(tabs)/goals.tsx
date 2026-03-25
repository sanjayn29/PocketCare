import FloatingActionButton from '@/components/FloatingActionButton';
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
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'achieved'>('all');
  
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
    if (filterMode === 'active') return goal.status === 'active';
    if (filterMode === 'achieved') return goal.status === 'achieved';
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
    const colors = {
      career: { bg: '#E0E7FF', text: '#2563EB', icon: 'briefcase' },
      health: { bg: '#DCFCE7', text: '#059669', icon: 'fitness' },
      finance: { bg: '#FEF9C3', text: '#D97706', icon: 'cash' },
      personal: { bg: '#F3E8FF', text: '#7E22CE', icon: 'person' },
    };
    const style = colors[safeCat] || colors.personal;
    return (
      <View style={[styles.categoryBadge, { backgroundColor: style.bg }]}>
        <Ionicons name={style.icon as any} size={10} color={style.text} style={{ marginRight: 4 }} />
        <Text style={[styles.categoryText, { color: style.text }]}>{safeCat.toUpperCase()}</Text>
      </View>
    );
  };

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
      <View style={[styles.goalCard, isCompleted && styles.goalCardCompleted]}>
        <View style={styles.goalContent}>
          <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.7}>
            <View style={styles.goalHeaderRow}>
              <Text style={[styles.goalTitle, isCompleted && styles.goalTitleCompleted]} numberOfLines={1}>
                {item.title}
              </Text>
              <CategoryBadge category={safeCat} />
            </View>
            
            {item.description ? (
              <Text style={[styles.goalDesc, isCompleted && styles.goalDescCompleted]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            
            {userDeadline ? (
              <View style={styles.targetDateRow}>
                <Ionicons name="calendar-outline" size={12} color={isCompleted ? "#94A3B8" : "#8B5CF6"} />
                <Text style={[styles.targetDateText, isCompleted && styles.targetDateTextCompleted]}>
                  Deadline: {userDeadline}
                </Text>
                
                {getDaysRemainingText(userDeadline, isCompleted) && (
                  <View style={styles.daysBadge}>
                    <Text style={[
                      styles.daysBadgeText, 
                      getDaysRemainingText(userDeadline, isCompleted)?.includes('Overdue') && { color: '#EF4444' }
                    ]}>
                      • {getDaysRemainingText(userDeadline, isCompleted)}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </TouchableOpacity>

          <View style={styles.progressArea}>
             <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                   {currentVal} / {targetVal} {hasTasks ? 'tasks completed' : safeUnit}
                </Text>
                <Text style={styles.progressValue}>{Math.round(progressPercent)}%</Text>
             </View>
             <View style={styles.progressBarWrapper}>
               <View style={styles.progressBarTrack}>
                 <View style={[
                   styles.progressBarFill, 
                   { width: `${progressPercent}%`, backgroundColor: progressPercent >= 100 ? '#22C55E' : '#3B82F6' }
                 ]} />
               </View>
             </View>
          </View>
        </View>

        <TouchableOpacity style={styles.deleteArea} onPress={() => handleDelete(item.id)} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderListHeader = () => (
    <View style={styles.createCard}>
      {isCreating ? (
        <View style={styles.createExpanded}>
          <TextInput style={styles.createTitleInput} placeholder="Goal Title" placeholderTextColor="#94A3B8" value={newTitle} onChangeText={setNewTitle} />
          <TextInput style={styles.createContentInput} placeholder="Description (Optional)" placeholderTextColor="#94A3B8" multiline value={newDesc} onChangeText={setNewDesc} />
          
          <View style={styles.selectorLabelRow}><Text style={styles.selectorLabel}>Category:</Text></View>
          <View style={styles.categoryOptions}>
            {(['health', 'finance', 'career', 'personal'] as GoalCategory[]).map(c => (
              <TouchableOpacity key={c} style={[styles.catOption, newCategory === c && styles.catOptionActive]} onPress={() => setNewCategory(c)}>
                <Text style={[styles.catOptionText, newCategory === c && styles.catOptionTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.selectorLabelRow}><Text style={styles.selectorLabel}>Priority:</Text></View>
          <View style={styles.categoryOptions}>
            {(['low', 'medium', 'high'] as GoalPriority[]).map(p => (
              <TouchableOpacity key={p} style={[styles.catOption, newPriority === p && styles.catOptionActive]} onPress={() => setNewPriority(p)}>
                <Text style={[styles.catOptionText, newPriority === p && styles.catOptionTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subtasks Section for Creation */}
          <View style={styles.subtaskSection}>
             <Text style={styles.selectorLabel}>Initial Goal Tasks</Text>
             <View style={styles.subtaskList}>
               {newTasks.map(t => (
                 <View style={styles.subtaskRow} key={t.id}>
                    <TouchableOpacity onPress={() => toggleNewTask(t.id)} style={styles.subtaskCheckbox}>
                      <Ionicons name={t.completed ? "checkmark-circle" : "ellipse-outline"} size={24} color={t.completed ? "#22C55E" : "#94A3B8"} />
                    </TouchableOpacity>
                    {editingNewTaskId === t.id ? (
                      <TextInput
                        style={styles.subtaskEditInput} value={editingNewTaskTitle} onChangeText={setEditingNewTaskTitle}
                        autoFocus onSubmitEditing={saveEditingNewTask} onBlur={saveEditingNewTask}
                      />
                    ) : (
                      <Text style={[styles.subtaskText, t.completed && styles.subtaskTextCompleted]}>{t.title}</Text>
                    )}
                    {editingNewTaskId === t.id ? (
                      <TouchableOpacity onPress={saveEditingNewTask} style={styles.subtaskActionBtn}><Ionicons name="checkmark" size={20} color="#2563EB" /></TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => startEditingNewTask(t)} style={styles.subtaskActionBtn}><Ionicons name="pencil-outline" size={18} color="#64748B" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => removeNewTask(t.id)} style={styles.subtaskActionBtn}><Ionicons name="trash-outline" size={18} color="#FF5252" /></TouchableOpacity>
                      </View>
                    )}
                 </View>
               ))}
             </View>
             <View style={styles.addSubtaskRow}>
                <TextInput 
                  style={styles.addSubtaskInput} placeholder="Add a task to automatically track progress..." 
                  value={newSubtaskTitle} onChangeText={setNewSubtaskTitle} onSubmitEditing={handleAddNewSubtask}
                />
                <TouchableOpacity style={styles.addSubtaskBtn} onPress={handleAddNewSubtask}>
                   <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
             </View>
          </View>

          {/* Dynamic Progress Configuration */}
          {newTasks.length === 0 ? (
             <View style={styles.inlineRow}>
                <TextInput style={[styles.smallInput, { flex: 1 }]} placeholder="Target Metric (e.g. 10)" placeholderTextColor="#94A3B8" keyboardType="numeric" value={newTargetValue} onChangeText={setNewTargetValue} />
                <TextInput style={[styles.smallInput, { flex: 1, marginLeft: 10 }]} placeholder="Unit (e.g. kg)" placeholderTextColor="#94A3B8" value={newUnit} onChangeText={setNewUnit} />
             </View>
          ) : (
             <View style={styles.lockedProgressRow}>
               <Ionicons name="lock-closed" size={14} color="#64748B" />
               <Text style={styles.lockedProgressText}>Goal targets will dynamically calculate based on the {newTasks.length} {newTasks.length === 1 ? 'task' : 'tasks'} mapped above.</Text>
             </View>
          )}

          <TouchableOpacity style={styles.dateInputWrapper} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={[styles.dateInputText, !newDeadline && { color: '#94A3B8' }]}>
              {newDeadline ? `Deadline: ${newDeadline}` : 'Select Deadline'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && <DateTimePicker value={newDeadline ? new Date(newDeadline) : new Date()} mode="date" display="default" onChange={handleDateChange} />}
          
          <View style={styles.createActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCreating(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNewGoal} disabled={isSavingNew}>
              {isSavingNew ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Set Goal</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.createCollapsed} activeOpacity={0.8} onPress={() => setIsCreating(true)}>
          <Ionicons name="flag-outline" size={22} color="#1D4ED8" />
          <Text style={styles.createCollapsedText}>Set a new milestone goal...</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <View style={styles.headerArea}><Text style={styles.pageTitle}>My Goals</Text></View>

      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterChip, filterMode === 'all' && styles.filterChipActive]} onPress={() => setFilterMode('all')}>
          <Text style={[styles.filterChipText, filterMode === 'all' && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, filterMode === 'active' && styles.filterChipActive]} onPress={() => setFilterMode('active')}>
          <Text style={[styles.filterChipText, filterMode === 'active' && styles.filterChipTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, filterMode === 'achieved' && styles.filterChipActive]} onPress={() => setFilterMode('achieved')}>
          <Text style={[styles.filterChipText, filterMode === 'achieved' && styles.filterChipTextActive]}>Achieved</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1D4ED8" /></View>
      ) : (
        <FlatList
          data={filteredGoals}
          keyExtractor={(item) => item.id}
          renderItem={renderGoal}
          ListHeaderComponent={renderListHeader()}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
             <View style={styles.emptyWrap}>
               <Ionicons name="trophy-outline" size={60} color="#CBD5E1" />
               <Text style={styles.emptyText}>You haven't set any goals yet.</Text>
             </View>
          }
        />
      )}

      {/* Edit Goal / Task Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Manage Goal</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? <ActivityIndicator size="small" color="#1D4ED8" /> : <Text style={styles.saveHeaderBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput style={styles.titleInput} placeholder="Goal Title" value={editTitle} onChangeText={setEditTitle} />
            <TextInput style={styles.contentInput} placeholder="Description" multiline textAlignVertical="top" value={editDesc} onChangeText={setEditDesc} />

            <View style={styles.selectorLabelRow}><Text style={styles.selectorLabel}>Category:</Text></View>
            <View style={styles.categoryOptions}>
              {(['health', 'finance', 'career', 'personal'] as GoalCategory[]).map(c => (
                <TouchableOpacity key={c} style={[styles.catOption, editCategory === c && styles.catOptionActive]} onPress={() => setEditCategory(c)}>
                  <Text style={[styles.catOptionText, editCategory === c && styles.catOptionTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.selectorLabelRow}><Text style={styles.selectorLabel}>Priority:</Text></View>
            <View style={styles.categoryOptions}>
              {(['low', 'medium', 'high'] as GoalPriority[]).map(p => (
                <TouchableOpacity key={p} style={[styles.catOption, editPriority === p && styles.catOptionActive]} onPress={() => setEditPriority(p)}>
                  <Text style={[styles.catOptionText, editPriority === p && styles.catOptionTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subtasks System */}
            <View style={styles.subtaskSection}>
               <Text style={styles.selectorLabel}>Goal Tasks</Text>
               <View style={styles.subtaskList}>
                 {editTasks.map(t => (
                   <View style={styles.subtaskRow} key={t.id}>
                      <TouchableOpacity onPress={() => toggleTask(t.id)} style={styles.subtaskCheckbox}>
                        <Ionicons name={t.completed ? "checkmark-circle" : "ellipse-outline"} size={24} color={t.completed ? "#22C55E" : "#94A3B8"} />
                      </TouchableOpacity>
                      
                      {editingTaskId === t.id ? (
                        <TextInput
                          style={styles.subtaskEditInput} value={editingTaskTitle} onChangeText={setEditingTaskTitle}
                          autoFocus onSubmitEditing={saveEditingTask} onBlur={saveEditingTask}
                        />
                      ) : (
                        <Text style={[styles.subtaskText, t.completed && styles.subtaskTextCompleted]}>{t.title}</Text>
                      )}

                      {editingTaskId === t.id ? (
                        <TouchableOpacity onPress={saveEditingTask} style={styles.subtaskActionBtn}><Ionicons name="checkmark" size={20} color="#2563EB" /></TouchableOpacity>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity onPress={() => startEditingTask(t)} style={styles.subtaskActionBtn}><Ionicons name="pencil-outline" size={18} color="#64748B" /></TouchableOpacity>
                          <TouchableOpacity onPress={() => removeTask(t.id)} style={styles.subtaskActionBtn}><Ionicons name="trash-outline" size={18} color="#FF5252" /></TouchableOpacity>
                        </View>
                      )}
                   </View>
                 ))}
               </View>

               <View style={styles.addSubtaskRow}>
                  <TextInput 
                    style={styles.addSubtaskInput} placeholder="Add a new goal task..." 
                    value={newTaskTitle} onChangeText={setNewTaskTitle} onSubmitEditing={handleAddSubtask}
                  />
                  <TouchableOpacity style={styles.addSubtaskBtn} onPress={handleAddSubtask}>
                     <Ionicons name="add" size={20} color="#FFF" />
                  </TouchableOpacity>
               </View>
            </View>

            {editTasks.length === 0 ? (
               <View style={styles.inlineRow}>
                  <View style={{flex: 1}}>
                     <Text style={styles.selectorLabel}>Current Progress</Text>
                     <TextInput style={styles.smallInput} keyboardType="numeric" value={editCurrentValue} onChangeText={setEditCurrentValue} />
                  </View>
                  <View style={{flex: 1, marginLeft: 10}}>
                     <Text style={styles.selectorLabel}>Target Value</Text>
                     <TextInput style={styles.smallInput} keyboardType="numeric" value={editTargetValue} onChangeText={setEditTargetValue} />
                  </View>
               </View>
            ) : (
               <View style={styles.lockedProgressRow}>
                 <Ionicons name="lock-closed" size={14} color="#64748B" />
                 <Text style={styles.lockedProgressText}>Goal progress and target metrics are dynamically mapped to your saved task completion flow.</Text>
               </View>
            )}

            <TouchableOpacity style={[styles.dateInputWrapper, { marginBottom: 40 }]} onPress={() => setShowEditDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <Text style={styles.dateInputText}>{editDeadline ? `Deadline: ${editDeadline}` : 'Select Deadline'}</Text>
            </TouchableOpacity>
            {showEditDatePicker && <DateTimePicker value={editDeadline ? new Date(editDeadline) : new Date()} mode="date" display="default" onChange={handleEditDateChange} />}
            
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerArea: { paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  filterChipText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: '#64748B', fontSize: 16, marginTop: 12, fontWeight: '500' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  goalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, flexDirection: 'row', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  goalCardCompleted: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', opacity: 0.85 },
  goalContent: { flex: 1, padding: 16 },
  goalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
  goalTitleCompleted: { color: '#64748B' },
  goalDesc: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 10 },
  goalDescCompleted: { color: '#94A3B8' },
  targetDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  targetDateText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  targetDateTextCompleted: { color: '#94A3B8' },
  daysBadge: { marginLeft: 2 },
  daysBadgeText: { fontSize: 11, color: '#8B5CF6', fontWeight: '700' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryText: { fontSize: 10, fontWeight: '800' },
  deleteArea: { padding: 16, justifyContent: 'flex-start', alignItems: 'center' },
  progressArea: { marginTop: 6, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  progressValue: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  progressBarWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressBarTrack: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  createCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 20, shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  createCollapsedText: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  createExpanded: { padding: 16 },
  createTitleInput: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12, paddingVertical: 4 },
  createContentInput: { fontSize: 15, color: '#334155', minHeight: 50, textAlignVertical: 'top', marginBottom: 12 },
  inlineRow: { flexDirection: 'row', marginBottom: 16 },
  smallInput: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#334155' },
  dateInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, marginBottom: 16 },
  dateInputText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  selectorLabelRow: { marginBottom: 8 },
  selectorLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  categoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  catOptionActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  catOptionText: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'capitalize' },
  catOptionTextActive: { color: '#FFFFFF' },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: '#1D4ED8', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  modalBody: { padding: 20, flex: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  cancelText: { fontSize: 16, color: '#64748B' },
  saveHeaderBtnText: { fontSize: 16, fontWeight: '700', color: '#1D4ED8' },
  titleInput: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 20 },
  contentInput: { fontSize: 16, color: '#334155', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 20 },
  
  // Tasks Section
  subtaskSection: { marginBottom: 20 },
  subtaskList: { marginBottom: 12 },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  subtaskCheckbox: { marginRight: 10 },
  subtaskText: { flex: 1, fontSize: 15, color: '#334155', fontWeight: '500' },
  subtaskTextCompleted: { color: '#94A3B8', textDecorationLine: 'line-through' },
  subtaskEditInput: { flex: 1, fontSize: 15, color: '#0F172A', padding: 0, borderBottomWidth: 1, borderBottomColor: '#1D4ED8', marginRight: 10 },
  subtaskActionBtn: { padding: 4 },
  addSubtaskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addSubtaskInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#334155' },
  addSubtaskBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center' },

  lockedProgressRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 10, marginBottom: 16, gap: 10 },
  lockedProgressText: { flex: 1, fontSize: 13, color: '#64748B', lineHeight: 18 }
});