import FloatingActionButton from '@/components/FloatingActionButton';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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

import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { addNote, deleteNote, getNotes, Note, updateNote } from '../../lib/notes-service';

export default function NotesScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)

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
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '30days' | 'month' | 'custom'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  useEffect(() => {
    if (email) {
      loadNotes();
    } else {
      setLoading(false);
    }
  }, [email]);

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
        case '30days':
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return noteDateOnly.getTime() >= thirtyDaysAgo.getTime();
        case 'month':
          return noteDate.getFullYear() === now.getFullYear() &&
                 noteDate.getMonth() === now.getMonth();
        case 'custom':
          const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          return noteDateOnly.getTime() === selectedDateOnly.getTime();
        default:
          return true;
      }
    });
  };

  const renderNote = ({ item }: { item: Note }) => {
    const dateStr = new Date(item.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    return (
      <TouchableOpacity 
        style={dynamicStyles.noteCard} 
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={dynamicStyles.noteHeader}>
          <Text style={dynamicStyles.noteTitle} numberOfLines={1}>{item.title}</Text>
          <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
        <Text style={dynamicStyles.noteContent} numberOfLines={3}>{item.content}</Text>
        <Text style={dynamicStyles.noteDate}>{dateStr}</Text>
      </TouchableOpacity>
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background, 
    },
    headerArea: {
      paddingHorizontal: 20,
      marginTop: 20, 
      marginBottom: 10,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
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
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    noteTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 10,
    },
    noteContent: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 12,
    },
    noteDate: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
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
    // Filter Styles
    filterContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
      paddingHorizontal: 0,
    },
    filterBtn: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterBtnTextActive: {
      color: colors.card,
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
      <View style={dynamicStyles.filterContainer}>
        <TouchableOpacity 
          style={[dynamicStyles.filterBtn, timeFilter === 'all' && dynamicStyles.filterBtnActive]}
          onPress={() => setTimeFilter('all')}
        >
          <Text style={[dynamicStyles.filterBtnText, timeFilter === 'all' && dynamicStyles.filterBtnTextActive]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.filterBtn, timeFilter === 'today' && dynamicStyles.filterBtnActive]}
          onPress={() => setTimeFilter('today')}
        >
          <Text style={[dynamicStyles.filterBtnText, timeFilter === 'today' && dynamicStyles.filterBtnTextActive]}>Today</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.filterBtn, timeFilter === 'custom' && dynamicStyles.filterBtnActive]}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Ionicons name="calendar-outline" size={18} color={timeFilter === 'custom' ? colors.card : colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.filterBtn, timeFilter === '30days' && dynamicStyles.filterBtnActive]}
          onPress={() => setTimeFilter('30days')}
        >
          <Text style={[dynamicStyles.filterBtnText, timeFilter === '30days' && dynamicStyles.filterBtnTextActive]}>30 Days</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[dynamicStyles.filterBtn, timeFilter === 'month' && dynamicStyles.filterBtnActive]}
          onPress={() => setTimeFilter('month')}
        >
          <Text style={[dynamicStyles.filterBtnText, timeFilter === 'month' && dynamicStyles.filterBtnTextActive]}>Month</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && Platform.OS === 'ios' && (
        <View style={dynamicStyles.datePickerIOSContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              if (date) {
                setSelectedDate(date);
                setTimeFilter('custom');
              }
            }}
            textColor={colors.text}
          />
        </View>
      )}

      {showDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
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
    <KeyboardAvoidingView 
      style={dynamicStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >

      
      <View style={dynamicStyles.headerArea}>
        <Text style={dynamicStyles.pageTitle}>My Notes</Text>
      </View>

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
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={dynamicStyles.modalContainer}
        >
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
        </KeyboardAvoidingView>
      </Modal>

      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}
