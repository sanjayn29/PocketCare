
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    addScheduleEvent,
    autoCompletePastScheduleEvents,
    deleteScheduleEvent,
    getScheduleEvents,
    ScheduleEvent,
    updateScheduleEvent,
} from '@/lib/schedule-service';
import {
  cancelScheduleEventReminder,
  scheduleScheduleEventReminder,
} from '@/utils/notifications';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIORITY_CONFIG = (colors: any): Record<'High' | 'Medium' | 'Low', { emoji: string; bg: string; text: string }> => ({
  High: { emoji: '🔴', bg: colors.danger, text: colors.danger },
  Medium: { emoji: '🟡', bg: colors.warning, text: colors.warning },
  Low: { emoji: '🟢', bg: colors.success, text: colors.success },
});

const STATUS_CONFIG_SCHEDULE = (colors: any): Record<'Upcoming' | 'Completed' | 'Cancelled', { bg: string; text: string }> => ({
  Upcoming: { bg: '#D4AF37', text: '#D4AF37' },
  Completed: { bg: colors.success, text: colors.success },
  Cancelled: { bg: colors.warning, text: colors.warning },
});

type TabType = 'Current' | 'Schedules';
type StatusFilter = 'All' | 'Upcoming' | 'Completed' | 'Cancelled';

export default function ScheduleScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getColors(isDark);

  const backButtonScale = useRef(new Animated.Value(1)).current
  const [fontsLoaded] = useFonts({
    'Roboto Slab': require('../../assets/Font/RobotoSlab-VariableFont_wght.ttf'),
  })

  // Dynamic styles based on theme
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

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
    loadEvents();
  }, [email]);

  const loadEvents = async () => {
    try {
      if (email) {
        const fetchedEvents = await autoCompletePastScheduleEvents(email);
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
        const eventId = await addScheduleEvent(
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

        if (newReminder && newStatus === 'Upcoming') {
          const isScheduled = await scheduleScheduleEventReminder({
            eventId,
            email,
            title: newTitle.trim(),
            purpose: newPurpose.trim(),
            date: selectedDate,
            startTime: newStartTime,
          });
          if (!isScheduled) {
            Alert.alert(
              'Reminder Not Scheduled',
              'Reminder could not be set. Please check notification permission and selected time.'
            );
          }
        } else {
          await cancelScheduleEventReminder(eventId);
        }

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
              await cancelScheduleEventReminder(id);
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
        const updatedTitle = editTitle.trim();
        const updatedPurpose = editPurpose.trim();
        const updatedLocation = editLocation.trim();

        await updateScheduleEvent(
          email,
          editingEvent.id,
          updatedTitle,
          updatedPurpose,
          editingEvent.date,
          editStartTime,
          editEndTime,
          updatedLocation,
          editPriority,
          editStatus,
          editReminder
        );

        if (editReminder && editStatus === 'Upcoming') {
          const isScheduled = await scheduleScheduleEventReminder({
            eventId: editingEvent.id,
            email,
            title: updatedTitle,
            purpose: updatedPurpose,
            date: editingEvent.date,
            startTime: editStartTime,
          });
          if (!isScheduled) {
            Alert.alert(
              'Reminder Not Scheduled',
              'Reminder could not be set. Please check notification permission and selected time.'
            );
          }
        } else {
          await cancelScheduleEventReminder(editingEvent.id);
        }

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
            <Ionicons name="chevron-back" size={24} color={activeTab === 'Current' ? '#3B82F6' : '#10B981'} />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={goToNextMonth}>
            <Ionicons name="chevron-forward" size={24} color={activeTab === 'Current' ? '#3B82F6' : '#10B981'} />
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
                  isSelected && { backgroundColor: activeTab === 'Current' ? '#3B82F6' : '#10B981', borderColor: activeTab === 'Current' ? '#3B82F6' : '#10B981' },
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
    const isSchedulesTab = activeTab === 'Schedules';

    if (isSchedulesTab) {
      return (
        <View style={styles.scheduleCard}>
          <TouchableOpacity
            style={styles.scheduleContent}
            onPress={() => handleOpenEditModal(item)}
            activeOpacity={0.7}
          >
            <View style={styles.scheduleHeaderRow}>
              <Text style={styles.scheduleTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.scheduleBadgeRow}>
                <View style={[styles.schedulePriorityBadge, { borderColor: priorityConfig.bg }]}> 
                  <Ionicons name="flag-outline" size={11} color={priorityConfig.text} />
                  <Text style={[styles.schedulePriorityText, { color: priorityConfig.text }]}>{item.priority}</Text>
                </View>
                <View style={[styles.scheduleStatusBadge, { borderColor: statusConfig.bg }]}> 
                  <Ionicons name="checkmark-done-outline" size={11} color={statusConfig.text} />
                  <Text style={[styles.scheduleStatusText, { color: statusConfig.text }]}>{item.status}</Text>
                </View>
              </View>
            </View>

            {item.purpose ? <Text style={styles.schedulePurpose} numberOfLines={2}>{item.purpose}</Text> : null}

            <View style={styles.scheduleInfoPanel}>
              <View style={styles.scheduleMetaRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.scheduleMetaText}>{item.date}</Text>
              </View>
              <View style={styles.scheduleMetaRow}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.scheduleMetaText}>{item.startTime} - {item.endTime}</Text>
              </View>
              {item.location ? (
                <View style={styles.scheduleMetaRow}>
                  <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.scheduleMetaText} numberOfLines={1}>{item.location}</Text>
                </View>
              ) : null}
              {item.reminder ? (
                <View style={styles.scheduleMetaRow}>
                  <Ionicons name="notifications-outline" size={12} color={colors.warning} />
                  <Text style={styles.scheduleMetaText}>Reminder On</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>

          <View style={styles.scheduleActionRail}>
            <TouchableOpacity onPress={() => handleOpenEditModal(item)} hitSlop={10} style={styles.scheduleActionButton}>
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteEvent(item.id)} hitSlop={10} style={styles.scheduleActionButton}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerArea}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)')}>
              <Ionicons name="chevron-back" size={22} color={isDark ? "#000000" : "#FFFFFF"} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.pageTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Schedule</Text>
              <Text style={styles.pageSubtitle}>Plan your meetings</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={activeTab === 'Current' ? '#3B82F6' : '#10B981'} />
          </View>
        ) : (
          <>
            <View style={styles.tabContainer}>
              <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('Current')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="calendar" size={18} color={activeTab === 'Current' ? '#3B82F6' : '#64748B'} style={{ marginRight: 8 }} />
                  <Text style={[styles.tabText, activeTab === 'Current' && { ...styles.tabTextActive, color: '#3B82F6' }]}>Current</Text>
                </View>
                {activeTab === 'Current' && <View style={{ ...styles.activeIndicator, backgroundColor: '#3B82F6', shadowColor: '#3B82F6' }} />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('Schedules')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="list" size={18} color={activeTab === 'Schedules' ? '#10B981' : '#64748B'} style={{ marginRight: 8 }} />
                  <Text style={[styles.tabText, activeTab === 'Schedules' && { ...styles.tabTextActive, color: '#10B981' }]}>Schedules</Text>
                </View>
                {activeTab === 'Schedules' && <View style={{ ...styles.activeIndicator, backgroundColor: '#10B981', shadowColor: '#10B981' }} />}
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
                    <TouchableOpacity onPress={handleOpenCreateModal} style={[styles.addButton, { backgroundColor: activeTab === 'Current' ? '#3B82F6' : '#10B981' }]}>
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
                <View style={styles.segmentBlock}>
                  {(['All', 'Upcoming', 'Completed', 'Cancelled'] as StatusFilter[]).map(status => {
                    const activeColor = '#10B981'; // Schedules tab is always green
                    return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.segmentBtn,
                        statusFilter === status && { borderWidth: 1, borderColor: activeColor },
                      ]}
                      onPress={() => setStatusFilter(status)}
                    >
                      <Text style={[styles.segmentText, statusFilter === status && { color: activeColor, fontWeight: '700' }]} numberOfLines={1} ellipsizeMode="clip">
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                  })}
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
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Meeting</Text>
            <TouchableOpacity onPress={handleSaveEvent} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={activeTab === 'Current' ? '#3B82F6' : '#10B981'} />
              ) : (
                <Text style={[styles.saveText, { color: activeTab === 'Current' ? '#3B82F6' : '#10B981' }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Meeting Title"
              placeholderTextColor={colors.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            <TextInput
              style={styles.input}
              placeholder="Purpose"
              placeholderTextColor={colors.textSecondary}
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
              placeholderTextColor={colors.textSecondary}
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
                color={activeTab === 'Current' ? '#3B82F6' : '#10B981'}
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
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top + 8, 20) }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Meeting</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isEditSaving}>
              {isEditSaving ? (
                <ActivityIndicator size="small" color={activeTab === 'Current' ? '#3B82F6' : '#10B981'} />
              ) : (
                <Text style={[styles.saveText, { color: activeTab === 'Current' ? '#3B82F6' : '#10B981' }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              placeholder="Meeting Title"
              placeholderTextColor={colors.textSecondary}
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <TextInput
              style={styles.input}
              placeholder="Purpose"
              placeholderTextColor={colors.textSecondary}
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
              placeholderTextColor={colors.textSecondary}
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
                color={activeTab === 'Current' ? '#3B82F6' : '#10B981'}
              />
              <Text style={styles.reminderText}>Remind me</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerArea: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 20,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 0,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4AF37',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  pageTitle: { fontSize: 24, fontFamily: 'Roboto Slab', color: '#000000', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 16 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  calendar: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginVertical: 12,
    padding: 16,
    borderWidth: 1.5,
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
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayCellSelected: { },
  dayCellHasEvents: { borderWidth: 2, borderColor: colors.warning },
  dayNumber: { fontSize: 14, fontWeight: '600', color: colors.text },
  dayNumberSelected: { color: '#FFFFFF', fontWeight: '700' },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning, marginTop: 4 },

  eventsSection: { marginVertical: 16, paddingBottom: 140 },
  sectionHeader: { marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  addButton: { borderRadius: 8, padding: 8, justifyContent: 'center', alignItems: 'center' },
  eventsList: { gap: 10 },

  eventCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 10,
  },
  scheduleCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 14,
    flexDirection: 'row',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  scheduleContent: {
    flex: 1,
    padding: 16,
  },
  scheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  scheduleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  scheduleBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  schedulePriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.2,
    backgroundColor: colors.background,
  },
  schedulePriorityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scheduleStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.2,
    backgroundColor: colors.background,
  },
  scheduleStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  schedulePurpose: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
    fontWeight: '500',
  },
  scheduleInfoPanel: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${isDark ? 0.05 : 0.02})`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  scheduleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  scheduleActionRail: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 1.5,
    borderLeftColor: colors.border,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
  },
  scheduleActionButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
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
  saveText: { fontSize: 16, fontWeight: '700' },
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
  statusBtnActive: { backgroundColor: colors.overlay, borderColor: '#D4AF37' },
  statusBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  statusBtnTextActive: { color: '#D4AF37', fontWeight: '700' },

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

  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  tabText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  tabTextActive: { fontWeight: '900' },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: '60%',
    height: 3,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },

  segmentBlock: { flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentBtnActive: { borderWidth: 1, borderColor: '#D4AF37' },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  segmentTextActive: { color: isDark ? '#D4AF37' : '#B8860B', fontWeight: '700' },

  schedulesSection: {
    paddingVertical: 16,
  },
});
