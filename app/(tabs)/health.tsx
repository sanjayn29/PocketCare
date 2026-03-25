import FloatingActionButton from '@/components/FloatingActionButton';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Modal, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, Keyboard
} from 'react-native';
import {
  MedicalRecord, DietPlan, FitnessPlan, getHealthData,
  addMedical, updateMedical, deleteMedical,
  addDiet, updateDiet, deleteDiet, toggleDietDate,
  addFitness, updateFitness, deleteFitness, toggleFitnessDate
} from '../../lib/health-service';

// ─── UTILS ──────────────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().split('T')[0];
type TabType = 'Medical' | 'Diet' | 'Fitness';

const getDaysDiff = (start: string, end: string) => {
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
}

const generateDateList = (start: string, end: string) => {
  const dates = [];
  const curr = new Date(start);
  const stop = new Date(end);
  let limit = 0;
  while(curr <= stop && limit < 365) { // Cap at 365 days for UI safety
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
    limit++;
  }
  return dates;
}

export default function HealthScreen() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const [loading, setLoading] = useState(true);
  
  const [medicalList, setMedicalList] = useState<MedicalRecord[]>([]);
  const [dietList, setDietList] = useState<DietPlan[]>([]);
  const [fitnessList, setFitnessList] = useState<FitnessPlan[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>('Medical');

  // Creation Cards
  const [isCreatingMed, setIsCreatingMed] = useState(false);
  const [isCreatingDiet, setIsCreatingDiet] = useState(false);
  const [isCreatingFit, setIsCreatingFit] = useState(false);

  // Form States (Shared dynamically based on active tab)
  const [formTopic, setFormTopic] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStart, setFormStart] = useState(todayStr);
  const [formEnd, setFormEnd] = useState(todayStr);

  const [showDatePicker, setShowDatePicker] = useState<'start'|'end'|'editStart'|'editEnd'|null>(null);

  // ── Edit Form States
  const [editingMedical, setEditingMedical] = useState<MedicalRecord | null>(null);
  const [editingDiet, setEditingDiet] = useState<DietPlan | null>(null);
  const [editingFitness, setEditingFitness] = useState<FitnessPlan | null>(null);

  const [editTopic, setEditTopic] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStart, setEditStart] = useState(todayStr);
  const [editEnd, setEditEnd] = useState(todayStr);

  useEffect(() => {
    if (email) loadData();
    else setLoading(false);
  }, [email]);

  const loadData = async () => {
    if (!email) return;
    try {
      const data = await getHealthData(email);
      setMedicalList(data.medical.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setDietList(data.food_diet.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setFitnessList(data.fitness.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch(e) {}
    finally { setLoading(false); }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(null);
    if (selectedDate && showDatePicker) {
      const d = selectedDate.toISOString().split('T')[0];
      if (showDatePicker === 'start') setFormStart(d);
      else if (showDatePicker === 'end') setFormEnd(d);
      else if (showDatePicker === 'editStart') setEditStart(d);
      else if (showDatePicker === 'editEnd') setEditEnd(d);
    }
  };

  const resetForm = () => {
    setFormTopic(''); setFormDesc(''); setFormStart(todayStr); setFormEnd(todayStr);
    Keyboard.dismiss();
  }

  // ── Actions: CREATE
  const handleSaveMed = async () => {
    if(!email) return;
    if(!formTopic) return Alert.alert('Error', 'Topic requested.');
    await addMedical(email, formTopic, formDesc, formStart, formEnd);
    resetForm(); setIsCreatingMed(false); loadData();
  };
  const handleSaveDiet = async () => {
    if(!email) return;
    if(!formTopic) return Alert.alert('Error', 'Diet Name requested.');
    await addDiet(email, formTopic, formDesc, formStart, formEnd);
    resetForm(); setIsCreatingDiet(false); loadData();
  };
  const handleSaveFit = async () => {
    if(!email) return;
    if(!formTopic) return Alert.alert('Error', 'Fitness Plan Name requested.');
    await addFitness(email, formTopic, formDesc, formStart, formEnd);
    resetForm(); setIsCreatingFit(false); loadData();
  };

  const toggleDayAction = async (type: 'diet'|'fitness', id: string, dateStr: string) => {
    if(!email) return;
    if (type === 'diet') await toggleDietDate(email, id, dateStr);
    else await toggleFitnessDate(email, id, dateStr);
    loadData(); // Re-fetch to update tick boxes
  }

  // ── Actions: OPEN EDIT
  const openEditMedical = (m: MedicalRecord) => {
    setEditTopic(m.topic); setEditDesc(m.description || ''); setEditStart(m.start_date); setEditEnd(m.end_date);
    setEditingMedical(m);
  }
  const openEditDiet = (d: DietPlan) => {
    setEditTopic(d.name); setEditDesc(d.description || ''); setEditStart(d.start_date); setEditEnd(d.end_date);
    setEditingDiet(d);
  }
  const openEditFitness = (f: FitnessPlan) => {
    setEditTopic(f.name); setEditDesc(f.description || ''); setEditStart(f.start_date); setEditEnd(f.end_date);
    setEditingFitness(f);
  }

  // ── Actions: UPDATE (SAVE)
  const handleUpdateMedicalProps = async () => {
    if(!email || !editingMedical) return;
    if(!editTopic) return Alert.alert('Error', 'Valid topic required.');
    await updateMedical(email, editingMedical.id, { topic: editTopic, description: editDesc, start_date: editStart, end_date: editEnd });
    setEditingMedical(null); loadData();
  }
  const handleUpdateDietProps = async () => {
    if(!email || !editingDiet) return;
    if(!editTopic) return Alert.alert('Error', 'Valid name required.');
    await updateDiet(email, editingDiet.id, { name: editTopic, description: editDesc, start_date: editStart, end_date: editEnd });
    setEditingDiet(null); loadData();
  }
  const handleUpdateFitnessProps = async () => {
    if(!email || !editingFitness) return;
    if(!editTopic) return Alert.alert('Error', 'Valid name required.');
    await updateFitness(email, editingFitness.id, { name: editTopic, description: editDesc, start_date: editStart, end_date: editEnd });
    setEditingFitness(null); loadData();
  }

  // ── UI Snippets
  const renderCreationCard = (type: TabType, saveHandler: () => void, isCreating: boolean, setCreating: (b:boolean)=>void) => {
    if (!isCreating) {
      return (
        <TouchableOpacity style={styles.createCollapsed} onPress={()=>{ resetForm(); setCreating(true); }}>
          <View style={[styles.createIconWrap, {backgroundColor: type==='Medical'?'#FEE2E2':type==='Diet'?'#DCFCE7':'#E0E7FF'}]}>
             <Ionicons name={type==='Medical'?"medkit-outline":type==='Diet'?"restaurant-outline":"barbell-outline"} size={20} color={type==='Medical'?'#EF4444':type==='Diet'?'#10B981':'#4F46E5'} />
          </View>
          <Text style={styles.createCollapsedText}>Create new {type} record...</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.createExpanded}>
        <TextInput style={styles.titleInput} placeholder={`${type} Topic / Name`} value={formTopic} onChangeText={setFormTopic} autoFocus />
        <TextInput style={styles.input} placeholder="Description (Optional)" value={formDesc} onChangeText={setFormDesc} />
        
        <View style={{flexDirection:'row', gap:10, marginBottom: 16}}>
           <View style={{flex:1}}>
              <Text style={styles.selectorLabel}>Start Date</Text>
              <TouchableOpacity style={styles.input} onPress={()=>setShowDatePicker('start')}>
                <Text style={{color: '#334155'}}>{formStart}</Text>
              </TouchableOpacity>
           </View>
           <View style={{flex:1}}>
              <Text style={styles.selectorLabel}>End Date</Text>
              <TouchableOpacity style={styles.input} onPress={()=>setShowDatePicker('end')}>
                <Text style={{color: '#334155'}}>{formEnd}</Text>
              </TouchableOpacity>
           </View>
        </View>

        <View style={styles.rowBtns}>
          <TouchableOpacity style={styles.cancelBtn} onPress={()=>setCreating(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#3B82F6'}]} onPress={saveHandler}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderMedical = () => (
    <FlatList
      data={medicalList}
      keyExtractor={item => item.id}
      ListHeaderComponent={<View style={styles.createCard}>{renderCreationCard('Medical', handleSaveMed, isCreatingMed, setIsCreatingMed)}</View>}
      contentContainerStyle={{padding: 16, paddingBottom: 100}}
      ListEmptyComponent={<Text style={{textAlign:'center', color:'#94A3B8', marginTop: 40}}>No medical records found.</Text>}
      renderItem={({item}) => (
        <View style={styles.card}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
            <View style={{flex: 1, paddingRight: 10}}>
              <Text style={{fontSize:20, fontWeight:'900', color: '#0F172A'}}>{item.topic}</Text>
              {item.description ? <Text style={{fontSize:14, color:'#64748B', marginTop: 6}}>{item.description}</Text> : null}
            </View>
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity onPress={()=> openEditMedical(item)}>
                <Ionicons name="pencil-outline" size={20} color="#64748B"/>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=> {
                  Alert.alert('Delete', 'Delete medical record?', [
                    {text:'Cancel'}, {text:'Delete', style:'destructive', onPress:() => { deleteMedical(email!, item.id); loadData(); }}
                  ]);
              }}>
                <Ionicons name="trash-outline" size={20} color="#EF4444"/>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{marginTop: 16, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8}}>
             <Text style={{fontSize:13, fontWeight:'700', color: '#475569'}}>Timeline:</Text>
             <Text style={{fontSize:13, color: '#64748B', marginTop: 4}}>{item.start_date}   ➔   {item.end_date}</Text>
          </View>
        </View>
      )}
    />
  );

  const renderPlanCard = (item: DietPlan | FitnessPlan, isDiet: boolean) => {
     const totalDays = getDaysDiff(item.start_date, item.end_date);
     const completedCount = item.completed_dates.length;
     const pct = totalDays > 0 ? Math.min(Math.round((completedCount / totalDays) * 100), 100) : 0;
     const datesArray = generateDateList(item.start_date, item.end_date);
     const colorTheme = isDiet ? '#10B981' : '#4F46E5';

     return (
       <View style={styles.card}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 12}}>
            <Text style={{fontSize:20, fontWeight:'900', color: '#0F172A', flex: 1}}>{item.name}</Text>
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity onPress={()=> isDiet ? openEditDiet(item as DietPlan) : openEditFitness(item as FitnessPlan)}>
                <Ionicons name="pencil-outline" size={20} color="#64748B"/>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=> {
                  Alert.alert('Delete', `Delete ${isDiet ? 'diet' : 'fitness'} plan?`, [
                    {text:'Cancel'}, {text:'Delete', style:'destructive', onPress:() => { 
                      isDiet ? deleteDiet(email!, item.id) : deleteFitness(email!, item.id); loadData(); 
                    }}
                  ]);
              }}>
                <Ionicons name="trash-outline" size={20} color="#EF4444"/>
              </TouchableOpacity>
            </View>
          </View>

          {item.description ? <Text style={{fontSize:14, color:'#64748B', marginBottom: 12}}>{item.description}</Text> : null}

          {/* Progress Bar Header */}
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 6}}>
            <Text style={{fontSize:13, fontWeight:'700', color:'#475569'}}>Days Complete: {completedCount} / {totalDays}</Text>
            <Text style={{fontSize:16, fontWeight:'900', color: colorTheme}}>{pct}%</Text>
          </View>

          <View style={{height:10, backgroundColor:'#E2E8F0', borderRadius:5, overflow:'hidden', marginBottom: 16}}>
             <View style={{height:'100%', backgroundColor: colorTheme, width:`${pct}%` as any}} />
          </View>

          <Text style={{fontSize:13, fontWeight:'700', color:'#475569', marginBottom: 8}}>Track Daily Progress:</Text>
          <View style={styles.gridWrap}>
             {datesArray.map(dStr => {
               const dObj = new Date(dStr);
               const dayLabel = dObj.getDate().toString();
               const isTicked = item.completed_dates.includes(dStr);
               
               return (
                 <TouchableOpacity 
                   key={dStr} 
                   style={[styles.gridBox, isTicked && {backgroundColor: colorTheme, borderColor: colorTheme}]}
                   onPress={() => toggleDayAction(isDiet ? 'diet' : 'fitness', item.id, dStr)}
                 >
                   <Text style={[styles.gridText, isTicked && {color: '#FFF'}]}>{dayLabel}</Text>
                 </TouchableOpacity>
               );
             })}
          </View>
          <Text style={{fontSize:11, color:'#94A3B8', marginTop: 10, textAlign:'center'}}>Tap the date bubbles to track days!</Text>
       </View>
     );
  }

  // Edit Modals Shared Builder
  const renderEditModal = (visible: boolean, onClose: () => void, onSave: () => void, titleHeader: string, themeColor: string) => (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={{fontSize:16, color:'#64748B'}}>Cancel</Text></TouchableOpacity>
            <Text style={{fontSize:18, fontWeight:'700'}}>{titleHeader}</Text>
            <TouchableOpacity onPress={onSave}><Text style={{fontSize:16, fontWeight:'700', color: themeColor}}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={{padding:20}}>
            <TextInput style={styles.titleInput} placeholder="Topic / Name" value={editTopic} onChangeText={setEditTopic} autoFocus />
            <TextInput style={styles.input} placeholder="Description (Optional)" value={editDesc} onChangeText={setEditDesc} />
            
            <View style={{flexDirection:'row', gap:10, marginBottom: 16}}>
              <View style={{flex:1}}>
                  <Text style={styles.selectorLabel}>Start Date</Text>
                  <TouchableOpacity style={styles.input} onPress={()=>setShowDatePicker('editStart')}>
                    <Text style={{color: '#334155'}}>{editStart}</Text>
                  </TouchableOpacity>
              </View>
              <View style={{flex:1}}>
                  <Text style={styles.selectorLabel}>End Date</Text>
                  <TouchableOpacity style={styles.input} onPress={()=>setShowDatePicker('editEnd')}>
                    <Text style={{color: '#334155'}}>{editEnd}</Text>
                  </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>Health</Text>
      </View>

      <View style={styles.mainTabRow}>
        {(['Medical', 'Diet', 'Fitness'] as TabType[]).map(t => (
          <TouchableOpacity key={t} style={[styles.mainTab, activeTab===t && styles.mainTabActive]} onPress={()=>setActiveTab(t)}>
            <Text style={[styles.mainTabText, activeTab===t && styles.mainTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" color="#3B82F6" /></View> : 
        activeTab === 'Medical' ? renderMedical() :
        activeTab === 'Diet' ? (
          <FlatList data={dietList} keyExtractor={d=>d.id} ListHeaderComponent={<View style={styles.createCard}>{renderCreationCard('Diet', handleSaveDiet, isCreatingDiet, setIsCreatingDiet)}</View>} contentContainerStyle={{padding: 16, paddingBottom: 100}} ListEmptyComponent={<Text style={{textAlign:'center', color:'#94A3B8', marginTop: 40}}>No diet plans.</Text>} renderItem={({item}) => renderPlanCard(item, true)} />
        ) : (
          <FlatList data={fitnessList} keyExtractor={f=>f.id} ListHeaderComponent={<View style={styles.createCard}>{renderCreationCard('Fitness', handleSaveFit, isCreatingFit, setIsCreatingFit)}</View>} contentContainerStyle={{padding: 16, paddingBottom: 100}} ListEmptyComponent={<Text style={{textAlign:'center', color:'#94A3B8', marginTop: 40}}>No fitness plans.</Text>} renderItem={({item}) => renderPlanCard(item, false)} />
        )
      }

      {showDatePicker && (
        <DateTimePicker value={new Date()} mode="date" display="default" onChange={onDateChange}/>
      )}

      {renderEditModal(editingMedical !== null, () => setEditingMedical(null), handleUpdateMedicalProps, 'Edit Medical Record', '#EF4444')}
      {renderEditModal(editingDiet !== null, () => setEditingDiet(null), handleUpdateDietProps, 'Edit Diet Plan', '#10B981')}
      {renderEditModal(editingFitness !== null, () => setEditingFitness(null), handleUpdateFitnessProps, 'Edit Fitness Plan', '#4F46E5')}

      <FloatingActionButton />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerArea: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 10 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  
  mainTabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 10 },
  mainTab: { flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  mainTabActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  mainTabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  mainTabTextActive: { color: '#FFF' },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.04, shadowRadius:8, elevation:2 },

  input: { backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#334155', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  titleInput: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '700', color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  selectorLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6 },

  createCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
  createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  createIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  createCollapsedText: { flex: 1, fontSize: 15, color: '#64748B', fontWeight: '500' },
  createExpanded: { padding: 16 },

  rowBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset:{width:0, height:1}, shadowOpacity:0.05, shadowRadius:2, elevation:1 },
  gridText: { fontSize: 13, fontWeight: '700', color: '#64748B' },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#F1F5F9' },
});
