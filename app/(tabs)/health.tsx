
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import {
  addDiet,
  addFitness,
  addMedical,
  deleteDiet,
  deleteFitness,
  deleteMedical,
  DietPlan, FitnessPlan, getHealthData,
  MedicalRecord,
  toggleDietDate,
  toggleFitnessDate,
  updateDiet,
  updateFitness,
  updateMedical
} from '../../lib/health-service';

// ─── UTILS ──────────────────────────────────────────────────────────────────
const todayStr = new Date().toISOString().split('T')[0];
type TabType = 'Medical' | 'Diet' | 'Fitness';
type TimeFilter = 'Week' | 'Month' | 'Year' | 'All' | 'Custom';

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

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)

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

  const [showDatePicker, setShowDatePicker] = useState<
    'start'|'end'|'editStart'|'editEnd'|'customStart'|'customEnd'|null
  >(null);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('All');
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

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
      else if (showDatePicker === 'customStart') setCustomStart(d);
      else if (showDatePicker === 'customEnd') setCustomEnd(d);
    }
  };

  const filterByDate = (dateStr: string) => {
    if (timeFilter === 'All') return true;
    if (timeFilter === 'Custom') {
      const t = new Date(dateStr).getTime();
      const sContext = new Date(customStart).getTime();
      const eContext = new Date(customEnd).getTime() + 86399999;
      return t >= sContext && t <= eContext;
    }
    const dTime = new Date(dateStr).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.ceil(Math.abs(nowTime - dTime) / (1000*60*60*24));
    if (timeFilter === 'Week') return diffDays <= 7;
    if (timeFilter === 'Month') return diffDays <= 30;
    if (timeFilter === 'Year') return diffDays <= 365;
    return true;
  }

  const filteredMedical = medicalList.filter(m => filterByDate(m.start_date));
  const filteredDiet = dietList.filter(d => filterByDate(d.start_date));
  const filteredFitness = fitnessList.filter(f => filterByDate(f.start_date));

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

  const renderTimeFilterBlock = () => (
    <View style={dynamicStyles.segmentBlock}>
      {(['Week','Month','Year','All','Custom'] as TimeFilter[]).map(t => (
        <TouchableOpacity key={t} style={[dynamicStyles.segmentBtn, timeFilter===t && dynamicStyles.segmentBtnActive]} onPress={()=>setTimeFilter(t)}>
          <Text style={[dynamicStyles.segmentText, timeFilter===t && dynamicStyles.segmentTextActive]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCustomDateFilters = () => {
    if (timeFilter !== 'Custom') return null;
    return (
      <View style={{flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: -6}}>
        <TouchableOpacity style={{flex: 1, backgroundColor: colors.card, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center'}} onPress={() => setShowDatePicker('customStart')}>
          <Text style={{fontSize: 12, color: colors.textSecondary, fontWeight: '700'}}>Start Date</Text>
          <Text style={{fontSize: 14, color: colors.text, fontWeight: '700', marginTop: 4}}>{customStart}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{flex: 1, backgroundColor: colors.card, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center'}} onPress={() => setShowDatePicker('customEnd')}>
          <Text style={{fontSize: 12, color: colors.textSecondary, fontWeight: '700'}}>End Date</Text>
          <Text style={{fontSize: 14, color: colors.text, fontWeight: '700', marginTop: 4}}>{customEnd}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCreationCard = (type: TabType, saveHandler: () => void, isCreating: boolean, setCreating: (b:boolean)=>void) => {
    if (!isCreating) {
      return (
        <TouchableOpacity style={dynamicStyles.createCollapsed} onPress={()=>{ resetForm(); setCreating(true); }}>
          <View style={[dynamicStyles.createIconWrap, {backgroundColor: type==='Medical' ? colors.danger + '1A' : type==='Diet' ? colors.success + '1A' : colors.primary + '1A'}]}>
             <Ionicons name={type==='Medical'?"medkit-outline":type==='Diet'?"restaurant-outline":"barbell-outline"} size={20} color={type==='Medical'?colors.danger:type==='Diet'?colors.success:colors.primary} />
          </View>
          <Text style={dynamicStyles.createCollapsedText}>Create new {type} record...</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={dynamicStyles.createExpanded}>
        <TextInput style={dynamicStyles.titleInput} placeholder={`${type} Topic / Name`} value={formTopic} onChangeText={setFormTopic} autoFocus />
        <TextInput style={dynamicStyles.input} placeholder="Description (Optional)" value={formDesc} onChangeText={setFormDesc} />
        
        <View style={{flexDirection:'row', gap:10, marginBottom: 16}}>
           <View style={{flex:1}}>
              <Text style={dynamicStyles.selectorLabel}>Start Date</Text>
              <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('start')}>
                <Text style={{color: colors.text}}>{formStart}</Text>
              </TouchableOpacity>
           </View>
           <View style={{flex:1}}>
              <Text style={dynamicStyles.selectorLabel}>End Date</Text>
              <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('end')}>
                <Text style={{color: colors.text}}>{formEnd}</Text>
              </TouchableOpacity>
           </View>
        </View>

        <View style={dynamicStyles.rowBtns}>
          <TouchableOpacity style={dynamicStyles.cancelBtn} onPress={()=>setCreating(false)}><Text style={dynamicStyles.cancelBtnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[dynamicStyles.saveBtn, {backgroundColor: colors.primary}]} onPress={saveHandler}><Text style={dynamicStyles.saveBtnText}>Save</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderMedical = () => (
    <FlatList
      data={filteredMedical}
      keyExtractor={item => item.id}
      ListHeaderComponent={
        <>
          {renderTimeFilterBlock()}
          {renderCustomDateFilters()}
          <View style={dynamicStyles.createCard}>{renderCreationCard('Medical', handleSaveMed, isCreatingMed, setIsCreatingMed)}</View>
        </>
      }
      contentContainerStyle={{padding: 16, paddingBottom: 100}}
      ListEmptyComponent={<Text style={{textAlign:'center', color: colors.textSecondary, marginTop: 40}}>No medical records found.</Text>}
      renderItem={({item}) => (
        <View style={dynamicStyles.card}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
            <View style={{flex: 1, paddingRight: 10}}>
              <Text style={{fontSize:20, fontWeight:'900', color: colors.text}}>{item.topic}</Text>
              {item.description ? <Text style={{fontSize:14, color: colors.textSecondary, marginTop: 6}}>{item.description}</Text> : null}
            </View>
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity onPress={()=> openEditMedical(item)}>
                <Ionicons name="pencil-outline" size={20} color={colors.textSecondary}/>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=> {
                  Alert.alert('Delete', 'Delete medical record?', [
                    {text:'Cancel'}, {text:'Delete', style:'destructive', onPress:() => { deleteMedical(email!, item.id); loadData(); }}
                  ]);
              }}>
                <Ionicons name="trash-outline" size={20} color={colors.danger}/>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{marginTop: 16, backgroundColor: colors.border, padding: 10, borderRadius: 8}}>
             <Text style={{fontSize:13, fontWeight:'700', color: colors.textSecondary}}>Timeline:</Text>
             <Text style={{fontSize:13, color: colors.textSecondary, marginTop: 4}}>{item.start_date}   ➔   {item.end_date}</Text>
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
     const colorTheme = isDiet ? colors.success : colors.primary;

     return (
       <View style={dynamicStyles.card}>
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 12}}>
            <Text style={{fontSize:20, fontWeight:'900', color: colors.text, flex: 1}}>{item.name}</Text>
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity onPress={()=> isDiet ? openEditDiet(item as DietPlan) : openEditFitness(item as FitnessPlan)}>
                <Ionicons name="pencil-outline" size={20} color={colors.textSecondary}/>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=> {
                  Alert.alert('Delete', `Delete ${isDiet ? 'diet' : 'fitness'} plan?`, [
                    {text:'Cancel'}, {text:'Delete', style:'destructive', onPress:() => { 
                      isDiet ? deleteDiet(email!, item.id) : deleteFitness(email!, item.id); loadData(); 
                    }}
                  ]);
              }}>
                <Ionicons name="trash-outline" size={20} color={colors.danger}/>
              </TouchableOpacity>
            </View>
          </View>

          {item.description ? <Text style={{fontSize:14, color: colors.textSecondary, marginBottom: 12}}>{item.description}</Text> : null}

          {/* Progress Bar Header */}
          <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 6}}>
            <Text style={{fontSize:13, fontWeight:'700', color: colors.textSecondary}}>Days Complete: {completedCount} / {totalDays}</Text>
            <Text style={{fontSize:16, fontWeight:'900', color: colorTheme}}>{pct}%</Text>
          </View>

          <View style={{height:10, backgroundColor: colors.border, borderRadius:5, overflow:'hidden', marginBottom: 16}}>
             <View style={{height:'100%', backgroundColor: colorTheme, width:`${pct}%` as any}} />
          </View>

          <Text style={{fontSize:13, fontWeight:'700', color: colors.textSecondary, marginBottom: 8}}>Track Daily Progress:</Text>
          <View style={dynamicStyles.gridWrap}>
             {datesArray.map(dStr => {
               const dObj = new Date(dStr);
               const dayLabel = dObj.getDate().toString();
               const isToday = dStr === todayStr;
               const isTicked = item.completed_dates.includes(dStr);
               const canSelect = isToday;
               
               return (
                 <TouchableOpacity 
                   key={dStr} 
                   style={[dynamicStyles.gridBox, isTicked && {backgroundColor: colorTheme, borderColor: colorTheme}]}
                   onPress={() => canSelect && toggleDayAction(isDiet ? 'diet' : 'fitness', item.id, dStr)}
                   disabled={!canSelect}
                 >
                   <Text style={[dynamicStyles.gridText, isTicked && {color: '#FFF'}]}>{dayLabel}</Text>
                 </TouchableOpacity>
               );
             })}
          </View>
          <Text style={{fontSize:11, color: colors.textSecondary, marginTop: 10, textAlign:'center'}}>Completed dates are highlighted. Tap today's date to track!</Text>
       </View>
     );
  }

  // Edit Modals Shared Builder
  const renderEditModal = (visible: boolean, onClose: () => void, onSave: () => void, titleHeader: string, themeColor: string) => (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={{fontSize:16, color: colors.textSecondary}}>Cancel</Text></TouchableOpacity>
            <Text style={{fontSize:18, fontWeight:'700'}}>{titleHeader}</Text>
            <TouchableOpacity onPress={onSave}><Text style={{fontSize:16, fontWeight:'700', color: themeColor}}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView style={{padding:20}}>
            <TextInput style={dynamicStyles.titleInput} placeholder="Topic / Name" value={editTopic} onChangeText={setEditTopic} autoFocus />
            <TextInput style={dynamicStyles.input} placeholder="Description (Optional)" value={editDesc} onChangeText={setEditDesc} />
            
            <View style={{flexDirection:'row', gap:10, marginBottom: 16}}>
              <View style={{flex:1}}>
                  <Text style={dynamicStyles.selectorLabel}>Start Date</Text>
                  <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('editStart')}>
                    <Text style={{color: colors.text}}>{editStart}</Text>
                  </TouchableOpacity>
              </View>
              <View style={{flex:1}}>
                  <Text style={dynamicStyles.selectorLabel}>End Date</Text>
                  <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('editEnd')}>
                    <Text style={{color: colors.text}}>{editEnd}</Text>
                  </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
  );

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerArea: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 10 },
    pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    
    mainTabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 10 },
    mainTab: { flex: 1, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.border, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    mainTabActive: { backgroundColor: colors.text, borderColor: colors.text },
    mainTabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    mainTabTextActive: { color: colors.card },

    segmentBlock: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: 10, padding: 4, marginBottom: 16 },
    segmentBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    segmentBtnActive: { backgroundColor: colors.card, shadowColor:'#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.06, shadowRadius:4, elevation: 2 },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    segmentTextActive: { color: colors.text, fontWeight: '800' },

    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.04, shadowRadius:8, elevation:2 },

    input: { backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    titleInput: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '700', color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    selectorLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },

    createCard: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
    createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    createIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    createCollapsedText: { flex: 1, fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    createExpanded: { padding: 16 },

    rowBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center' },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    saveBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center' },
    saveBtnText: { color: colors.card, fontWeight: '700', fontSize: 14 },

    gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    gridBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset:{width:0, height:1}, shadowOpacity:0.05, shadowRadius:2, elevation:1 },
    gridText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: colors.border },
  });

  return (
    <KeyboardAvoidingView style={dynamicStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={dynamicStyles.headerArea}>
        <Text style={dynamicStyles.pageTitle}>Health</Text>
      </View>

      <View style={dynamicStyles.mainTabRow}>
        {(['Medical', 'Diet', 'Fitness'] as TabType[]).map(t => (
          <TouchableOpacity key={t} style={[dynamicStyles.mainTab, activeTab===t && dynamicStyles.mainTabActive]} onPress={()=>setActiveTab(t)}>
            <Text style={[dynamicStyles.mainTabText, activeTab===t && dynamicStyles.mainTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" color={colors.primary} /></View> : 
        activeTab === 'Medical' ? renderMedical() :
        activeTab === 'Diet' ? (
          <FlatList data={filteredDiet} keyExtractor={d=>d.id} ListHeaderComponent={<>{renderTimeFilterBlock()}{renderCustomDateFilters()}<View style={dynamicStyles.createCard}>{renderCreationCard('Diet', handleSaveDiet, isCreatingDiet, setIsCreatingDiet)}</View></>} contentContainerStyle={{padding: 16, paddingBottom: 100}} ListEmptyComponent={<Text style={{textAlign:'center', color: colors.textSecondary, marginTop: 40}}>No diet plans.</Text>} renderItem={({item}) => renderPlanCard(item, true)} />
        ) : (
          <FlatList data={filteredFitness} keyExtractor={f=>f.id} ListHeaderComponent={<>{renderTimeFilterBlock()}{renderCustomDateFilters()}<View style={dynamicStyles.createCard}>{renderCreationCard('Fitness', handleSaveFit, isCreatingFit, setIsCreatingFit)}</View></>} contentContainerStyle={{padding: 16, paddingBottom: 100}} ListEmptyComponent={<Text style={{textAlign:'center', color: colors.textSecondary, marginTop: 40}}>No fitness plans.</Text>} renderItem={({item}) => renderPlanCard(item, false)} />
        )
      }

      {showDatePicker && (
        <DateTimePicker value={new Date()} mode="date" display="default" onChange={onDateChange}/>
      )}

      {renderEditModal(editingMedical !== null, () => setEditingMedical(null), handleUpdateMedicalProps, 'Edit Medical Record', colors.danger)}
      {renderEditModal(editingDiet !== null, () => setEditingDiet(null), handleUpdateDietProps, 'Edit Diet Plan', colors.success)}
      {renderEditModal(editingFitness !== null, () => setEditingFitness(null), handleUpdateFitnessProps, 'Edit Fitness Plan', colors.primary)}


    </KeyboardAvoidingView>
  );
}


