import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  Modal, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import FloatingActionButton from '@/components/FloatingActionButton';
import Navbar from './navbar';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { addNote, getNotes, updateNote, deleteNote, Note } from '../../lib/notes-service';

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
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Navbar />
      
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>My Notes</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : (
        <FlatList
          data={notes}
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
});
