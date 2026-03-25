import FloatingActionButton from '@/components/FloatingActionButton';
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
        style={styles.noteCard} 
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.noteHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
          <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color="#FF5252" />
          </TouchableOpacity>
        </View>
        <Text style={styles.noteContent} numberOfLines={3}>{item.content}</Text>
        <Text style={styles.noteDate}>{dateStr}</Text>
      </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <>
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterBtn, timeFilter === 'all' && styles.filterBtnActive]}
          onPress={() => setTimeFilter('all')}
        >
          <Text style={[styles.filterBtnText, timeFilter === 'all' && styles.filterBtnTextActive]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterBtn, timeFilter === 'today' && styles.filterBtnActive]}
          onPress={() => setTimeFilter('today')}
        >
          <Text style={[styles.filterBtnText, timeFilter === 'today' && styles.filterBtnTextActive]}>Today</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterBtn, timeFilter === 'custom' && styles.filterBtnActive]}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Ionicons name="calendar-outline" size={18} color={timeFilter === 'custom' ? '#FFFFFF' : '#64748B'} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterBtn, timeFilter === '30days' && styles.filterBtnActive]}
          onPress={() => setTimeFilter('30days')}
        >
          <Text style={[styles.filterBtnText, timeFilter === '30days' && styles.filterBtnTextActive]}>30 Days</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterBtn, timeFilter === 'month' && styles.filterBtnActive]}
          onPress={() => setTimeFilter('month')}
        >
          <Text style={[styles.filterBtnText, timeFilter === 'month' && styles.filterBtnTextActive]}>Month</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && Platform.OS === 'ios' && (
        <View style={styles.datePickerIOSContainer}>
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
            textColor="#0F172A"
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

      <View style={styles.createCard}>
        {isCreating ? (
          <View style={styles.createExpanded}>
            <TextInput
              style={styles.createTitleInput}
              placeholder="Note Title"
              placeholderTextColor="#94A3B8"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <TextInput
              style={styles.createContentInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#94A3B8"
              multiline
              value={newContent}
              onChangeText={setNewContent}
            />
            <View style={styles.createActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => {
                  setIsCreating(false);
                  setNewTitle('');
                  setNewContent('');
                  Keyboard.dismiss();
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSaveNewNote}
                disabled={isSavingNew}
              >
                {isSavingNew ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Note</Text>
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
            <Ionicons name="create-outline" size={22} color="#1D4ED8" />
            <Text style={styles.createCollapsedText}>Write a new note...</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >

      
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>My Notes</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : (
        <FlatList
          data={getFilteredNotes()}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          ListHeaderComponent={renderListHeader()}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
             <View style={styles.emptyWrap}>
               <Ionicons name="document-text-outline" size={60} color="#CBD5E1" />
               <Text style={styles.emptyText}>No notes yet.</Text>
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
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Note</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? (
                <ActivityIndicator size="small" color="#1D4ED8" />
              ) : (
                <Text style={styles.saveHeaderBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Title"
            placeholderTextColor="#94A3B8"
            value={editTitle}
            onChangeText={setEditTitle}
          />
          <TextInput
            style={styles.contentInput}
            placeholder="Write your note here..."
            placeholderTextColor="#94A3B8"
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
  // Inline Create Styles
  createCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
    marginBottom: 8,
    paddingVertical: 4,
  },
  createContentInput: {
    fontSize: 15,
    color: '#334155',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
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
  // Note Card
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    color: '#1E293B',
    flex: 1,
    marginRight: 10,
  },
  noteContent: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 12,
  },
  noteDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
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
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterBtnActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  // Date Picker Container Styles
  datePickerIOSContainer: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dateInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  dateInputText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  calendarInfo: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  calendarInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  calendarInfoDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  calendarInfoHint: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
});
