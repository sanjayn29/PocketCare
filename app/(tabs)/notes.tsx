
import { getCardSystem } from '@/constants/card-system';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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

import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { addNote, deleteNote, getNotes, Note, updateNote } from '../../lib/notes-service';

export default function NotesScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const router = useRouter();
  
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const cardSystem = getCardSystem(colors, isDark)
  
  const backButtonScale = useRef(new Animated.Value(1)).current;

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Inline Create state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Edit Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Time filter state
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState<Date>(new Date());
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (email) {
      loadNotes();
    } else {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(backButtonScale, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(backButtonScale, {
          toValue: 1.0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadNotes = async () => {
    if (!email) return;
    try {
      const fetchedNotes = await getNotes(email);
      fetchedNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setNotes(fetchedNotes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotes();
  };

  const handleSaveNewNote = async () => {
    if (!email) {
      Alert.alert('Authentication Error', 'You must be logged in to save notes.');
      return;
    }
    if (!newTitle.trim() && !newContent.trim()) {
      setIsCreating(false);
      return;
    }
    
    setIsSavingNew(true);
    try {
      await addNote(email, newTitle || 'Untitled Note', newContent);
      setNewTitle('');
      setNewContent('');
      setIsCreating(false);
      Keyboard.dismiss();
      loadNotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setIsSavingNew(false);
    }
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!email || !editingNote) return;
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    
    setIsSavingEdit(true);
    try {
      await updateNote(email, editingNote.id, { title: editTitle, content: editContent });
      setModalVisible(false);
      loadNotes();
    } catch (error) {
      Alert.alert('Error', 'Failed to update note');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!email) return;
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          await deleteNote(email, noteId);
          loadNotes();
        }
      }
    ]);
  };

  const getFilteredNotes = () => {
    if (timeFilter === 'all') return notes;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return notes.filter((note) => {
      const noteDate = new Date(note.updated_at);
      const noteDateOnly = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());

      switch (timeFilter) {
        case 'today':
          return noteDateOnly.getTime() === today.getTime();
        case 'month':
          return noteDate.getFullYear() === now.getFullYear() &&
                 noteDate.getMonth() === now.getMonth();
        case 'custom':
          return noteDateOnly.getTime() >= customStart.getTime() && noteDateOnly.getTime() <= customEnd.getTime();
        default:
          return true;
      }
    });
  };

  const renderNote = ({ item }: { item: Note }) => {
    const dateStr = new Date(item.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    return (
      <View style={dynamicStyles.noteCard}>
        <TouchableOpacity
          style={dynamicStyles.noteContentArea}
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}
        >
          <Text style={dynamicStyles.noteTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={dynamicStyles.noteContent} numberOfLines={3}>{item.content}</Text>
          <View style={dynamicStyles.noteMetaPanel}>
            <View style={dynamicStyles.noteMetaRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={dynamicStyles.noteDate}>Updated: {dateStr}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={dynamicStyles.noteActionRail}>
          <TouchableOpacity onPress={() => openEditModal(item)} hitSlop={10} style={dynamicStyles.noteActionButton}>
            <Ionicons name="create-outline" size={18} color="#D4AF37" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={10} style={dynamicStyles.noteActionButton}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
      color: isDark ? '#FFFFFF' : '#000000',
      letterSpacing: -0.5,
    },
    pageSubtitle: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
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
      color: colors.textSecondary,
      fontSize: 16,
      marginTop: 12,
      fontWeight: '500',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100, 
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
      marginBottom: 8,
      paddingVertical: 4,
    },
    createContentInput: {
      fontSize: 15,
      color: colors.text,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    createActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
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
      color: colors.card,
      fontWeight: '700',
      fontSize: 14,
    },
    // Note Card
    noteCard: {
      ...cardSystem.surface,
      marginBottom: 14,
      flexDirection: 'row',
    },
    noteContentArea: {
      flex: 1,
      padding: 16,
    },
    noteActionRail: { ...cardSystem.actionRail },
    noteActionButton: { ...cardSystem.actionButton },
    noteTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      fontFamily: 'Roboto Slab',
      letterSpacing: -0.3,
    },
    noteContent: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 10,
      fontWeight: '500',
    },
    noteMetaPanel: {
      marginTop: 2,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${isDark ? 0.05 : 0.02})`,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noteMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    noteDate: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    // Modal styles (Edit)
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
      height: '88%',
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
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
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },
    contentInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingHorizontal: 20,
      paddingTop: 10,
      lineHeight: 24,
    },
    // Filter Styles (Goals-inspired)
    segmentBlock: { flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    customDateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 16,
      marginTop: -6,
    },
    customDateBtn: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    customDateText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    dateRangeSeparator: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    // Date Picker Container Styles
    datePickerIOSContainer: {
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderRadius: 16,
      overflow: 'hidden',
      marginHorizontal: 16,
      marginBottom: 16,
    },
    // Calendar Styles (unused but kept for reference)
    calendarContent: {
      flex: 1,
      padding: 20,
    },
    datePickerContainer: {
      backgroundColor: colors.background,
      borderRadius: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    dateInputBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      backgroundColor: colors.card,
    },
    dateInputText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    calendarInfo: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    calendarInfoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 8,
    },
    calendarInfoDate: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    calendarInfoHint: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
  });

  const renderListHeader = () => (
    <>
      <View style={dynamicStyles.segmentBlock}>
        {(['all', 'today', 'month', 'custom'] as const).map((t) => {
          const themeColor = '#D4AF37';
          const getRgbaColor = (hex: string, opacity: number) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          };
          const label = t.charAt(0).toUpperCase() + t.slice(1);
          return (
            <TouchableOpacity
              key={t}
              style={[
                dynamicStyles.segmentBtn,
                timeFilter === t && {
                  backgroundColor: isDark ? getRgbaColor(themeColor, 0.15) : getRgbaColor(themeColor, 0.1),
                  borderColor: themeColor,
                  borderWidth: 1,
                },
              ]}
              onPress={() => {
                setTimeFilter(t);
                if (t !== 'custom') setShowDatePicker(null);
              }}
            >
              <Text
                style={[
                  dynamicStyles.segmentText,
                  timeFilter === t && { color: '#D4AF37', fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showDatePicker && (
        <View style={dynamicStyles.customDateContainer}>
          <TouchableOpacity
            onPress={() => setShowDatePicker('start')}
            style={dynamicStyles.customDateBtn}
          >
            <Text style={dynamicStyles.customDateText}>
              {customStart.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.dateRangeSeparator}>to</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker('end')}
            style={dynamicStyles.customDateBtn}
          >
            <Text style={dynamicStyles.customDateText}>
              {customEnd.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showDatePicker === 'start' && (
        <DateTimePicker
          value={customStart}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            if (Platform.OS !== 'ios') setShowDatePicker(null);
            if (date) {
              setCustomStart(date);
              setTimeFilter('custom');
            }
          }}
        />
      )}

      {showDatePicker === 'end' && (
        <DateTimePicker
          value={customEnd}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            if (Platform.OS !== 'ios') setShowDatePicker(null);
            if (date) {
              setCustomEnd(date);
              setTimeFilter('custom');
            }
          }}
        />
      )}

      <View style={dynamicStyles.createCard}>
        {isCreating ? (
          <View style={dynamicStyles.createExpanded}>
            <TextInput
              style={dynamicStyles.createTitleInput}
              placeholder="Note Title"
              placeholderTextColor={colors.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <TextInput
              style={dynamicStyles.createContentInput}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={newContent}
              onChangeText={setNewContent}
            />
            <View style={dynamicStyles.createActions}>
              <TouchableOpacity 
                style={dynamicStyles.cancelBtn} 
                onPress={() => {
                  setIsCreating(false);
                  setNewTitle('');
                  setNewContent('');
                  Keyboard.dismiss();
                }}
              >
                <Text style={dynamicStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={dynamicStyles.saveBtn} 
                onPress={handleSaveNewNote}
                disabled={isSavingNew}
              >
                {isSavingNew ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={dynamicStyles.saveBtnText}>Save Note</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={dynamicStyles.createCollapsed} 
            activeOpacity={0.8}
            onPress={() => setIsCreating(true)}
          >
            <Ionicons name="create-outline" size={22} color={colors.primary} />
            <Text style={dynamicStyles.createCollapsedText}>Write a new note...</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <View style={dynamicStyles.headerArea}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={dynamicStyles.headerRow}>
            <TouchableOpacity
              style={dynamicStyles.backButton}
              onPress={() => router.replace('/(tabs)')}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} color={isDark ? "#000000" : "#FFFFFF"} />
            </TouchableOpacity>
            <View>
              <Text style={dynamicStyles.pageTitle}>My Notes</Text>
              <Text style={dynamicStyles.pageSubtitle}>Capture and organize your thoughts</Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >

      {loading ? (
        <View style={dynamicStyles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={getFilteredNotes()}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          ListHeaderComponent={renderListHeader()}
          contentContainerStyle={dynamicStyles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
             <View style={dynamicStyles.emptyWrap}>
               <Ionicons name="document-text-outline" size={60} color={colors.border} />
               <Text style={dynamicStyles.emptyText}>No notes yet.</Text>
             </View>
          }
        />
      )}

      {/* Note Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior="padding"
            style={dynamicStyles.modalSheetWrap}
          >
            <View style={dynamicStyles.modalContainer}>
              <View style={dynamicStyles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={dynamicStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={dynamicStyles.modalTitle}>Edit Note</Text>
                <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
                  {isSavingEdit ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={dynamicStyles.saveHeaderBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TextInput
                style={dynamicStyles.titleInput}
                placeholder="Title"
                placeholderTextColor={colors.textSecondary}
                value={editTitle}
                onChangeText={setEditTitle}
              />
              <TextInput
                style={dynamicStyles.contentInput}
                placeholder="Write your note here..."
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                value={editContent}
                onChangeText={setEditContent}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>


        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
