import FloatingActionButton from '@/components/FloatingActionButton';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  addScheduleEvent,
  deleteScheduleEvent,
  getScheduleEvents,
  ScheduleEvent,
  updateScheduleEvent,
} from '@/lib/schedule-service';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIORITY_CONFIG = (colors: any): Record<'High' | 'Medium' | 'Low', { emoji: string; bg: string; text: string }> => ({
  High: { emoji: '🔴', bg: colors.danger, text: colors.danger },
  Medium: { emoji: '🟡', bg: colors.warning, text: colors.warning },
  Low: { emoji: '🟢', bg: colors.success, text: colors.success },
});

const STATUS_CONFIG_SCHEDULE = (colors: any): Record<'Upcoming' | 'Completed' | 'Cancelled', { bg: string; text: string }> => ({
  Upcoming: { bg: colors.info, text: colors.info },
  Completed: { bg: colors.success, text: colors.success },
  Cancelled: { bg: colors.warning, text: colors.warning },
});

type TabType = 'Current' | 'Schedules';
type StatusFilter = 'All' | 'Upcoming' | 'Completed' | 'Cancelled';

export default function ScheduleScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);

  // Dynamic styles based on theme
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('Current');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPurpose, setNewPurpose] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newLocation, setNewLocation] = useState('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newStatus, setNewStatus] = useState<'Upcoming' | 'Completed' | 'Cancelled'>('Upcoming');
  const [newReminder, setNewReminder] = useState(true);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPurpose, setEditPurpose] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPriority, setEditPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editStatus, setEditStatus] = useState<'Upcoming' | 'Completed' | 'Cancelled'>('Upcoming');
  const [editReminder, setEditReminder] = useState(true);
  const [showEditStartTimePicker, setShowEditStartTimePicker] = useState(false);
  const [showEditEndTimePicker, setShowEditEndTimePicker] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [email]);

  const loadEvents = async () => {
    try {
      if (email) {
        const fetchedEvents = await getScheduleEvents(email);
        setEvents(fetchedEvents);
      }
    } catch (error: unknown) {
      console.error('Failed to load events:', error);
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewPurpose('');
    setNewStartTime('09:00');
    setNewEndTime('10:00');
    setNewLocation('');
    setNewPriority('Medium');
    setNewStatus('Upcoming');
    setNewReminder(true);
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowStartTimePicker(false);
    if (selectedTime) {
      setNewStartTime(selectedTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowEndTimePicker(false);
    if (selectedTime) {
      setNewEndTime(selectedTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const handleEditStartTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowEditStartTimePicker(false);
    if (selectedTime) {
      setEditStartTime(selectedTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const handleEditEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowEditEndTimePicker(false);
    if (selectedTime) {
      setEditEndTime(selectedTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const handleSaveEvent = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Event title is required.');
      return;
    }

    try {
      setIsSaving(true);
      if (email) {
        await addScheduleEvent(
          email,
          newTitle.trim(),
          newPurpose.trim(),
          selectedDate,
          newStartTime,
          newEndTime,
          newLocation.trim(),
          newPriority,
          newStatus,
          newReminder
        );

        const updated = await getScheduleEvents(email);
        setEvents(updated);
        setShowCreateModal(false);
        resetCreateForm();
        Keyboard.dismiss();
        Alert.alert('Success', 'Event scheduled!');
      }
    } catch (error: unknown) {
      console.error('Failed to save event:', error);
      Alert.alert('Error', 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = (id: string) => {
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (email) {
              await deleteScheduleEvent(email, id);
              const updated = await getScheduleEvents(email);
              setEvents(updated);
            }
          } catch (error: unknown) {
            console.error('Failed to delete event:', error);
            Alert.alert('Error', 'Failed to delete event');
          }
        },
      },
    ]);
  };

  const handleOpenEditModal = (event: ScheduleEvent) => {
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditPurpose(event.purpose);
    setEditStartTime(event.startTime);
    setEditEndTime(event.endTime);
    setEditLocation(event.location || '');
    setEditPriority(event.priority);
    setEditStatus(event.status);
    setEditReminder(event.reminder);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Event title is required.');
      return;
    }

    try {
      setIsEditSaving(true);
      if (email) {
        await updateScheduleEvent(
          email,
          editingEvent.id,
          editTitle.trim(),
          editPurpose.trim(),
          editingEvent.date,
          editStartTime,
          editEndTime,
          editLocation.trim(),
          editPriority,
          editStatus,
          editReminder
        );

        const updated = await getScheduleEvents(email);
        setEvents(updated);
        setShowEditModal(false);
        Alert.alert('Success', 'Event updated!');
      }
    } catch (error: unknown) {
      console.error('Failed to update event:', error);
      Alert.alert('Error', 'Failed to update event');
    } finally {
      setIsEditSaving(false);
    }
  };

  const getEventsForDate = useMemo(() => {
    return events.filter(e => e.date === selectedDate);
  }, [events, selectedDate]);

  const filteredScheduleEvents = useMemo(() => {
    let filtered = events;
    if (statusFilter !== 'All') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }
    return filtered.sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [events, statusFilter]);

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const goToPreviousMonth = () => {
      setCurrentMonth(new Date(year, month - 1));
    };

    const goToNextMonth = () => {
      setCurrentMonth(new Date(year, month + 1));
    };

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={goToPreviousMonth}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={goToNextMonth}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekDay}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEvents = events.some(e => e.date === dateStr);
            const isSelected = selectedDate === dateStr;

            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  hasEvents && styles.dayCellHasEvents,
                ]}
                onPress={() => handleDateSelect(dateStr)}
              >
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                  {day}
                </Text>
                {hasEvents && <View style={styles.eventDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderEventCard = ({ item }: { item: ScheduleEvent }) => {
    const priorityConfig = PRIORITY_CONFIG(colors)[item.priority];
    const statusConfig = STATUS_CONFIG_SCHEDULE(colors)[item.status];

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleOpenEditModal(item)}
      >
        <View style={styles.eventCardHeader}>
          <View style={styles.eventTitleRow}>
            <Text style={styles.priorityEmoji}>{priorityConfig.emoji}</Text>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteEvent(item.id)} hitSlop={10}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {item.purpose && <Text style={styles.eventPurpose} numberOfLines={2}>{item.purpose}</Text>}

        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {item.startTime} - {item.endTime}
            </Text>
          </View>

          {item.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}

          <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.bg }]}>
            <Text style={[styles.priorityText, { color: priorityConfig.text }]}>
              {item.priority}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {item.status}
            </Text>
          </View>

          {item.reminder && (
            <View style={styles.metaItem}>
              <Ionicons name="notifications-outline" size={13} color={colors.warning} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.headerArea, { borderBottomColor: colors.border }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Schedule</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Plan your meetings</Text>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Tab Navigation */}
          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'Current' && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab('Current')}
            >
              <Ionicons name="calendar" size={18} color={activeTab === 'Current' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'Current' && { color: colors.primary }]}>Current</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'Schedules' && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab('Schedules')}
            >
              <Ionicons name="list" size={18} color={activeTab === 'Schedules' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'Schedules' && { color: colors.primary }]}>Schedules</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.content, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
            {/* Current Tab */}
            {activeTab === 'Current' && (
              <>
                {renderCalendar()}

                <View style={styles.eventsSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Events for {selectedDate}</Text>
                    <TouchableOpacity onPress={handleOpenCreateModal} style={styles.addButton}>
                      <Ionicons name="add" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {getEventsForDate.length > 0 ? (
                    <FlatList
                      data={getEventsForDate}
                      keyExtractor={item => item.id}
                      renderItem={renderEventCard}
                      scrollEnabled={false}
                      style={styles.eventsList}
                    />
                  ) : (
                    <View style={styles.emptyWrap}>
                      <Ionicons name="calendar-outline" size={50} color={colors.border} />
                      <Text style={styles.emptyText}>No events scheduled for this date.</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Schedules Tab */}
            {activeTab === 'Schedules' && (
              <View style={styles.schedulesSection}>
                {/* Status Filters */}
                <View style={styles.filterRow}>
                  {(['All', 'Upcoming', 'Completed', 'Cancelled'] as StatusFilter[]).map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                      onPress={() => setStatusFilter(status)}
                    >
                      <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Schedules List */}
                {filteredScheduleEvents.length > 0 ? (
                  <FlatList
                    data={filteredScheduleEvents}
                    keyExtractor={item => item.id}
                    renderItem={renderEventCard}
                    scrollEnabled={false}
                    style={styles.eventsList}
                  />
                ) : (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="calendar-outline" size={50} color={colors.border} />
                    <Text style={styles.emptyText}>No schedules found.</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${newStartTime}`)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartTimeChange}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${newEndTime}`)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndTimeChange}
        />
      )}

      {showEditStartTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${editStartTime}`)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEditStartTimeChange}
        />
      )}

      {showEditEndTimePicker && (
        <DateTimePicker
          value={new Date(`2000-01-01T${editEndTime}`)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEditEndTimeChange}
        />
      )}

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Meeting</Text>
            <TouchableOpacity onPress={handleSaveEvent} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Meeting Title"
              placeholderTextColor="#94A3B8"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <TextInput
              style={styles.input}
              placeholder="Purpose"
              placeholderTextColor="#94A3B8"
              value={newPurpose}
              onChangeText={setNewPurpose}
              multiline
            />

            <TouchableOpacity style={styles.input} onPress={() => setShowStartTimePicker(true)}>
              <Text style={{ color: colors.text }}>Start Time: {newStartTime}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.input} onPress={() => setShowEndTimePicker(true)}>
              <Text style={{ color: colors.text }}>End Time: {newEndTime}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Location (optional)"
              placeholderTextColor="#94A3B8"
              value={newLocation}
              onChangeText={setNewLocation}
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityGrid}>
              {(['High', 'Medium', 'Low'] as const).map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityBtn,
                    newPriority === priority && styles.priorityBtnActive,
                  ]}
                  onPress={() => setNewPriority(priority)}
                >
                  <Text style={styles.priorityBtnEmoji}>{PRIORITY_CONFIG(colors)[priority].emoji}</Text>
                  <Text
                    style={[
                      styles.priorityBtnText,
                      newPriority === priority && styles.priorityBtnTextActive,
                    ]}
                  >
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.statusGrid}>
              {(['Upcoming', 'Completed', 'Cancelled'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusBtn,
                    newStatus === status && styles.statusBtnActive,
                  ]}
                  onPress={() => setNewStatus(status)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      newStatus === status && styles.statusBtnTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.reminderToggle}
              onPress={() => setNewReminder(!newReminder)}
            >
              <Ionicons
                name={newReminder ? 'checkbox' : 'square-outline'}
                size={24}
                color={colors.primary}
              />
              <Text style={styles.reminderText}>Remind me</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Meeting</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isEditSaving}>
              {isEditSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Meeting Title"
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <TextInput
              style={styles.input}
              placeholder="Purpose"
              value={editPurpose}
              onChangeText={setEditPurpose}
              multiline
            />

            <TouchableOpacity style={styles.input} onPress={() => setShowEditStartTimePicker(true)}>
              <Text style={{ color: colors.text }}>Start Time: {editStartTime}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.input} onPress={() => setShowEditEndTimePicker(true)}>
              <Text style={{ color: colors.text }}>End Time: {editEndTime}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Location (optional)"
              value={editLocation}
              onChangeText={setEditLocation}
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityGrid}>
              {(['High', 'Medium', 'Low'] as const).map(priority => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityBtn,
                    editPriority === priority && styles.priorityBtnActive,
                  ]}
                  onPress={() => setEditPriority(priority)}
                >
                  <Text style={styles.priorityBtnEmoji}>{PRIORITY_CONFIG(colors)[priority].emoji}</Text>
                  <Text
                    style={[
                      styles.priorityBtnText,
                      editPriority === priority && styles.priorityBtnTextActive,
                    ]}
                  >
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.statusGrid}>
              {(['Upcoming', 'Completed', 'Cancelled'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusBtn,
                    editStatus === status && styles.statusBtnActive,
                  ]}
                  onPress={() => setEditStatus(status)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      editStatus === status && styles.statusBtnTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.reminderToggle}
              onPress={() => setEditReminder(!editReminder)}
            >
              <Ionicons
                name={editReminder ? 'checkbox' : 'square-outline'}
                size={24}
                color={colors.primary}
              />
              <Text style={styles.reminderText}>Remind me</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerArea: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 16 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  calendar: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginVertical: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', flex: 1 },
  weekDays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  weekDay: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, width: '14.28%', textAlign: 'center' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCellSelected: { backgroundColor: colors.info, borderColor: colors.info },
  dayCellHasEvents: { borderWidth: 2, borderColor: colors.warning },
  dayNumber: { fontSize: 14, fontWeight: '600', color: colors.text },
  dayNumberSelected: { color: '#FFFFFF', fontWeight: '700' },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning, marginTop: 4 },

  eventsSection: { marginVertical: 16, paddingBottom: 140 },
  sectionHeader: { marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  addButton: { backgroundColor: colors.info, borderRadius: 8, padding: 8, justifyContent: 'center', alignItems: 'center' },
  eventsList: { gap: 10 },

  eventCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityEmoji: { fontSize: 18 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  eventPurpose: { fontSize: 13, color: colors.textSecondary, marginBottom: 10, lineHeight: 18 },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.textSecondary },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center' },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelText: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  saveText: { fontSize: 16, color: colors.info, fontWeight: '700' },
  modalBody: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 15,
    color: colors.text,
  },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10, marginTop: 6 },

  priorityGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  priorityBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  priorityBtnActive: { backgroundColor: colors.overlay, borderColor: colors.danger },
  priorityBtnEmoji: { fontSize: 20 },
  priorityBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  priorityBtnTextActive: { color: colors.danger, fontWeight: '700' },

  statusGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statusBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnActive: { backgroundColor: colors.overlay, borderColor: colors.info },
  statusBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  statusBtnTextActive: { color: colors.info, fontWeight: '700' },

  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.overlay,
    borderRadius: 10,
    marginBottom: 20,
  },
  reminderText: { fontSize: 15, fontWeight: '600', color: colors.text },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  tabBtnActive: {
    backgroundColor: colors.overlay,
    borderBottomWidth: 2,
    borderBottomColor: colors.info,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.info,
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 10,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.info,
    borderColor: colors.info,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },

  schedulesSection: {
    paddingVertical: 16,
  },
});
