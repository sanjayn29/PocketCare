
import { getCardSystem } from '@/constants/card-system';
import { getColors } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Animated, FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal, Platform, ScrollView, StyleSheet, Text,
    TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function HealthScreen() {
  const { user } = useUser();
  const router = useRouter();
  const email = user?.primaryEmailAddress?.emailAddress;

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const cardSystem = getCardSystem(colors, isDark)

  // Multi-color palette for premium feel
  const uiColors = {
    medical: '#10B981',  // Green
    diet: '#3B82F6',     // Blue
    fitness: '#EF4444',  // Red
  }

  useFonts({
    'Roboto Slab': require('../../assets/Font/RobotoSlab-VariableFont_wght.ttf'),
  })

  const getDaysDiff = (start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  const generateDateList = (start: string, end: string) => {
    const dates = [];
    const curr = new Date(start);
    const stop = new Date(end);
    let limit = 0;
    while(curr <= stop && limit < 365) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
      limit++;
    }
    return dates;
  }

  const [loading, setLoading] = useState(true);
  
  const [medicalList, setMedicalList] = useState<MedicalRecord[]>([]);
  const [dietList, setDietList] = useState<DietPlan[]>([]);
  const [fitnessList, setFitnessList] = useState<FitnessPlan[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>('Diet');

  const backButtonScale = useRef(new Animated.Value(1)).current

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

  const loadData = useCallback(async () => {
    if (!email) return;
    try {
      const data = await getHealthData(email);
      setMedicalList(data.medical.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setDietList(data.food_diet.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setFitnessList(data.fitness.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch {}
    finally { setLoading(false); }
  }, [email]);

  useEffect(() => {
    if (email) loadData();
    else setLoading(false);
  }, [email, loadData]);

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

  const renderTimeFilterBlock = () => {
    const themeColor = activeTab === 'Medical' ? uiColors.medical : activeTab === 'Diet' ? uiColors.diet : uiColors.fitness;
    const themeName = activeTab === 'Medical' ? 'medical' : activeTab === 'Diet' ? 'diet' : 'fitness';
    const getRgbaColor = (hex: string, opacity: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };
    const getActiveHexColor = () => {
      return themeName === 'medical' ? uiColors.medical : themeName === 'diet' ? uiColors.diet : '#B45309';
    };
    
    return (
    <View style={dynamicStyles.segmentBlock}>
      {(['All','Week','Month','Year','Custom'] as TimeFilter[]).map(t => (
        <TouchableOpacity key={t} style={[dynamicStyles.segmentBtn, timeFilter===t && {backgroundColor: isDark ? getRgbaColor(themeColor, 0.15) : getRgbaColor(themeColor, 0.1), borderColor: themeColor, borderWidth: 1}]} onPress={()=>setTimeFilter(t)}>
          <Text style={[dynamicStyles.segmentText, timeFilter===t && {color: isDark ? themeColor : getActiveHexColor(), fontWeight: '700'}]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  };

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
    const themeColor = type === 'Medical' ? uiColors.medical : type === 'Diet' ? uiColors.diet : uiColors.fitness;
    
    if (!isCreating) {
      return (
        <TouchableOpacity style={dynamicStyles.createCollapsed} onPress={()=>{ resetForm(); setCreating(true); }}>
          <View style={[dynamicStyles.createIconWrap, {backgroundColor: themeColor + '1A'}]}>
             <Ionicons name={type==='Medical'?"medkit-outline":type==='Diet'?"restaurant-outline":"barbell-outline"} size={22} color={themeColor} />
          </View>
          <Text style={dynamicStyles.createCollapsedText}>Create new {type} record...</Text>
          <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      );
    }

    return (
      <View style={dynamicStyles.createExpanded}>
        <TextInput style={dynamicStyles.titleInput} placeholder={`${type} Topic / Name`} placeholderTextColor={isDark ? '#FFFFFF' : '#A0AEC0'} value={formTopic} onChangeText={setFormTopic} autoFocus />
        <TextInput style={dynamicStyles.input} placeholder="Description (Optional)" placeholderTextColor={isDark ? '#FFFFFF' : '#A0AEC0'} value={formDesc} onChangeText={setFormDesc} />
        
        <View style={{flexDirection:'row', gap:10, marginBottom: 16}}>
           <View style={{flex:1}}>
              <Text style={dynamicStyles.selectorLabel}>Start Date</Text>
              <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('start')}>
                <Text style={{color: colors.text, fontSize: 16}}>{formStart}</Text>
              </TouchableOpacity>
           </View>
           <View style={{flex:1}}>
              <Text style={dynamicStyles.selectorLabel}>End Date</Text>
              <TouchableOpacity style={dynamicStyles.input} onPress={()=>setShowDatePicker('end')}>
                <Text style={{color: colors.text, fontSize: 16}}>{formEnd}</Text>
              </TouchableOpacity>
           </View>
        </View>

        <View style={dynamicStyles.rowBtns}>
          <TouchableOpacity style={dynamicStyles.cancelBtn} onPress={()=>setCreating(false)}><Text style={dynamicStyles.cancelBtnText}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[dynamicStyles.saveBtn, {backgroundColor: themeColor}]} onPress={saveHandler}><Text style={dynamicStyles.saveBtnText}>Save</Text></TouchableOpacity>
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
      ListEmptyComponent={<Text style={{textAlign:'center', color: colors.textSecondary, marginTop: 40, fontSize: 16}}>No medical records found.</Text>}
      renderItem={({item}) => (
        <View style={dynamicStyles.healthCard}>
          <View style={dynamicStyles.healthCardContent}>
            <View style={dynamicStyles.healthHeaderRow}>
              <Text style={dynamicStyles.healthTitle} numberOfLines={1} onPress={()=> openEditMedical(item)}>{item.topic}</Text>
              <View style={dynamicStyles.healthTopActions}>
                <TouchableOpacity onPress={()=> openEditMedical(item)} style={dynamicStyles.healthTopActionButton}>
                  <Ionicons name="create-outline" size={17} color="#D4AF37"/>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> {
                    Alert.alert('Delete', 'Delete medical record?', [
                      {text:'Cancel'}, {text:'Delete', style:'destructive', onPress:() => { deleteMedical(email!, item.id); loadData(); }}
                    ]);
                }} style={dynamicStyles.healthTopActionButton}>
                  <Ionicons name="trash-outline" size={17} color="#EF4444"/>
                </TouchableOpacity>
              </View>
            </View>
            {item.description ? <Text style={dynamicStyles.healthDesc} numberOfLines={2}>{item.description}</Text> : null}

            <View style={dynamicStyles.healthMetaPanel}>
              <View style={dynamicStyles.healthMetaRow}>
                <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                <Text style={dynamicStyles.healthMetaText}>From: {item.start_date}</Text>
              </View>
              <View style={dynamicStyles.healthMetaRow}>
                <Ionicons name="calendar-clear-outline" size={12} color={colors.textSecondary} />
                <Text style={dynamicStyles.healthMetaText}>To: {item.end_date}</Text>
              </View>
            </View>
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
     const colorTheme = isDiet ? uiColors.diet : uiColors.fitness;

     return (
       <View style={dynamicStyles.healthCard}>
          <View style={dynamicStyles.healthCardContent}>
            <View style={dynamicStyles.healthHeaderRow}>
              <Text style={dynamicStyles.healthTitle} numberOfLines={1} onPress={()=> isDiet ? openEditDiet(item as DietPlan) : openEditFitness(item as FitnessPlan)}>{item.name}</Text>
              <View style={dynamicStyles.healthTopActions}>
                <TouchableOpacity onPress={()=> isDiet ? openEditDiet(item as DietPlan) : openEditFitness(item as FitnessPlan)} style={dynamicStyles.healthTopActionButton}>
                  <Ionicons name="create-outline" size={17} color="#D4AF37"/>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> {
                    Alert.alert('Delete', `Delete ${isDiet ? 'diet' : 'fitness'} plan?`, [
                      {text:'Cancel'}, {text:'Delete', style:'destructive', onPress:() => {
                        if (isDiet) {
                          deleteDiet(email!, item.id);
                        } else {
                          deleteFitness(email!, item.id);
                        }
                        loadData();
                      }}
                    ]);
                }} style={dynamicStyles.healthTopActionButton}>
                  <Ionicons name="trash-outline" size={17} color="#EF4444"/>
                </TouchableOpacity>
              </View>
            </View>

            {item.description ? <Text style={dynamicStyles.healthDesc} numberOfLines={2}>{item.description}</Text> : null}

            <View style={dynamicStyles.healthMetaPanel}>
              <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 8}}>
                <Text style={{fontSize:13, fontWeight:'700', color: colors.textSecondary}}>Progress: {completedCount} / {totalDays}</Text>
                <Text style={{fontSize:16, fontWeight:'900', color: colorTheme}}>{pct}%</Text>
              </View>
              <View style={dynamicStyles.progressBar}>
                 <View style={[dynamicStyles.progressFill, {backgroundColor: colorTheme, width:`${pct}%` as any}]} />
              </View>
              <View style={{marginTop: 10}}>
                <Text style={{fontSize:12, fontWeight:'700', color: colors.textSecondary, marginBottom: 8}}>Daily Tracker</Text>
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
              </View>
            </View>
            <Text style={{fontSize:11, color: colors.textSecondary, marginTop: 8, textAlign:'center', fontStyle: 'italic'}}>Tap today&apos;s date to track your progress</Text>
          </View>
       </View>
     );
  }

  // Edit Modals Shared Builder
  const renderEditModal = (visible: boolean, onClose: () => void, onSave: () => void, titleHeader: string, themeColor: string) => (
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
        <View style={dynamicStyles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={dynamicStyles.modalSheetWrap}>
            <View style={dynamicStyles.modalContainer}>
              <View style={dynamicStyles.modalHeader}>
                <TouchableOpacity onPress={onClose}><Text style={{fontSize:16, color: colors.textSecondary}}>Cancel</Text></TouchableOpacity>
                <Text style={{fontSize:18, fontWeight:'700', color: colors.text}}>{titleHeader}</Text>
                <TouchableOpacity onPress={onSave}><Text style={{fontSize:16, fontWeight:'700', color: themeColor}}>Save</Text></TouchableOpacity>
              </View>
              <ScrollView style={dynamicStyles.modalBody} contentContainerStyle={{paddingBottom: 40}}>
                <View style={dynamicStyles.editFormCard}>
              <Text style={[dynamicStyles.selectorLabel, { color: themeColor }]}>Details</Text>
              <TextInput style={dynamicStyles.titleInput} placeholder="Topic / Name" placeholderTextColor={isDark ? '#FFFFFF' : '#A0AEC0'} value={editTopic} onChangeText={setEditTopic} autoFocus />
              <TextInput style={dynamicStyles.input} placeholder="Description (Optional)" placeholderTextColor={isDark ? '#FFFFFF' : '#A0AEC0'} value={editDesc} onChangeText={setEditDesc} />

              <Text style={[dynamicStyles.selectorLabel, { marginTop: 4, color: themeColor }]}>Timeline</Text>
              <View style={{flexDirection:'row', gap:10, marginBottom: 4}}>
                <View style={{flex:1}}>
                    <Text style={dynamicStyles.selectorLabel}>Start Date</Text>
                    <TouchableOpacity style={dynamicStyles.editDateButton} onPress={()=>setShowDatePicker('editStart')}>
                      <Ionicons name="calendar-outline" size={14} color={themeColor} />
                      <Text style={{color: colors.text, fontWeight: '600'}}>{editStart}</Text>
                    </TouchableOpacity>
                </View>
                <View style={{flex:1}}>
                    <Text style={dynamicStyles.selectorLabel}>End Date</Text>
                    <TouchableOpacity style={dynamicStyles.editDateButton} onPress={()=>setShowDatePicker('editEnd')}>
                      <Ionicons name="calendar-clear-outline" size={14} color={themeColor} />
                      <Text style={{color: colors.text, fontWeight: '600'}}>{editEnd}</Text>
                    </TouchableOpacity>
                </View>
              </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
  );

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    pageTitle: {
      fontSize: 24,
      fontFamily: 'Roboto Slab',
      fontWeight: '400',
      color: isDark ? '#FFFFFF' : '#000000',
      letterSpacing: -0.5,
    },
    pageSubtitle: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
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
    tabText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    tabTextActiveMedical: { color: uiColors.medical, fontWeight: '900' },
    tabTextActiveDiet: { color: uiColors.diet, fontWeight: '900' },
    tabTextActiveFitness: { color: uiColors.fitness, fontWeight: '900' },

    activeIndicatorMedical: {
      position: 'absolute', bottom: -8, width: '60%', height: 3, backgroundColor: uiColors.medical, borderRadius: 2,
      shadowColor: uiColors.medical, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    },
    activeIndicatorDiet: {
      position: 'absolute', bottom: -8, width: '60%', height: 3, backgroundColor: uiColors.diet, borderRadius: 2,
      shadowColor: uiColors.diet, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    },
    activeIndicatorFitness: {
      position: 'absolute', bottom: -8, width: '60%', height: 3, backgroundColor: uiColors.fitness, borderRadius: 2,
      shadowColor: uiColors.fitness, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4,
    },

    segmentBlock: { flexDirection: 'row', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
    segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    segmentBtnActive: { borderWidth: 1 },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    segmentTextActive: { color: isDark ? uiColors.medical : '#EF4444', fontWeight: '700' },

    card: {
      ...cardSystem.surface,
      padding: 16,
      marginBottom: 12,
    },
    healthCard: {
      ...cardSystem.surface,
      marginBottom: 14,
      flexDirection: 'row',
    },
    healthCardContent: {
      flex: 1,
      padding: 16,
    },
    healthHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    healthTopActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginLeft: 10,
    },
    healthTopActionButton: {
      ...cardSystem.actionButton,
      width: 34,
      height: 34,
      borderRadius: 10,
    },
    healthTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: colors.text,
      flex: 1,
      fontFamily: 'Roboto Slab',
      letterSpacing: -0.2,
    },
    healthDesc: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 10,
      fontWeight: '500',
    },
    healthMetaPanel: {
      marginTop: 2,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${isDark ? 0.05 : 0.02})`,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    healthMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    healthMetaText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
      flex: 1,
    },
    editFormCard: {
      ...cardSystem.subtleSurface,
      borderRadius: 18,
      padding: 16,
    },
    editDateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFFFFF',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },

    input: { 
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFFFFF', 
      borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, 
      fontSize: 16, color: colors.text, 
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    titleInput: { 
      backgroundColor: colors.card, 
      borderRadius: 10, 
      paddingHorizontal: 16, 
      paddingVertical: 14, 
      fontSize: 18, 
      fontWeight: '700', 
      color: colors.text, 
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    selectorLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },

    createCard: { ...cardSystem.createSurface, marginBottom: 16 },
    createCollapsed: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    createIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    createCollapsedText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
    createExpanded: { padding: 16 },

    rowBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 18, justifyContent: 'center' },
    cancelBtnText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
    saveBtn: { 
      paddingVertical: 14, paddingHorizontal: 24, borderRadius: 18, alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
    },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

    gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    gridBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset:{width:0, height:1}, shadowOpacity:0.05, shadowRadius:2, elevation:1 },
    gridText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },

    progressBar: { height: 12, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
    progressFill: { height: '100%', borderRadius: 6 },

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
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      maxHeight: '100%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: colors.border },
    modalBody: { paddingHorizontal: 20, paddingTop: 16 },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        <View style={dynamicStyles.headerArea}>
          <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={dynamicStyles.headerRow}>
            <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.replace('/(tabs)')}>
              <Ionicons name="chevron-back" size={22} color={isDark ? "#000000" : "#FFFFFF"} />
            </TouchableOpacity>
            <View>
              <Text style={dynamicStyles.pageTitle}>Health</Text>
              <Text style={dynamicStyles.pageSubtitle}>Wellness and fitness tracking</Text>
            </View>
          </View>
        </View>

        <View style={dynamicStyles.tabContainer}>
          {(['Diet', 'Fitness', 'Medical'] as TabType[]).map(t => (
            <TouchableOpacity 
              key={t} 
              style={dynamicStyles.tab} 
              onPress={()=>setActiveTab(t)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name={t==='Medical'?"medkit-outline":t==='Diet'?"restaurant-outline":"barbell-outline"} 
                  size={18} 
                  color={activeTab===t ? (t==='Medical'?uiColors.medical:t==='Diet'?uiColors.diet:uiColors.fitness) : '#64748B'}
                  style={{ marginRight: 8 }}
                />
                <Text style={[dynamicStyles.tabText, activeTab===t && (t==='Medical'?dynamicStyles.tabTextActiveMedical:t==='Diet'?dynamicStyles.tabTextActiveDiet:dynamicStyles.tabTextActiveFitness), { marginBottom: 0 }]}>{t}</Text>
              </View>
              {activeTab === t && (
                <View style={t==='Medical'?dynamicStyles.activeIndicatorMedical:t==='Diet'?dynamicStyles.activeIndicatorDiet:dynamicStyles.activeIndicatorFitness} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {loading ? <View style={{flex:1, justifyContent:'center'}}><ActivityIndicator size="large" color="#D4AF37" /></View> :
            activeTab === 'Medical' ? renderMedical() :
            activeTab === 'Diet' ? (
              <FlatList data={filteredDiet} keyExtractor={d=>d.id} ListHeaderComponent={<>{renderTimeFilterBlock()}{renderCustomDateFilters()}<View style={dynamicStyles.createCard}>{renderCreationCard('Diet', handleSaveDiet, isCreatingDiet, setIsCreatingDiet)}</View></>} contentContainerStyle={{padding: 16, paddingBottom: 100}} ListEmptyComponent={<Text style={{textAlign:'center', color: colors.textSecondary, marginTop: 40, fontSize: 16}}>No diet plans found.</Text>} renderItem={({item}) => renderPlanCard(item, true)} />
            ) : (
              <FlatList data={filteredFitness} keyExtractor={f=>f.id} ListHeaderComponent={<>{renderTimeFilterBlock()}{renderCustomDateFilters()}<View style={dynamicStyles.createCard}>{renderCreationCard('Fitness', handleSaveFit, isCreatingFit, setIsCreatingFit)}</View></>} contentContainerStyle={{padding: 16, paddingBottom: 100}} ListEmptyComponent={<Text style={{textAlign:'center', color: colors.textSecondary, marginTop: 40, fontSize: 16}}>No fitness plans found.</Text>} renderItem={({item}) => renderPlanCard(item, false)} />
            )
          }
        </KeyboardAvoidingView>
      </View>

      {showDatePicker && (
        <DateTimePicker value={new Date()} mode="date" display="default" onChange={onDateChange}/>
      )}

      {renderEditModal(editingMedical !== null, () => setEditingMedical(null), handleUpdateMedicalProps, 'Edit Medical Record', uiColors.medical)}
      {renderEditModal(editingDiet !== null, () => setEditingDiet(null), handleUpdateDietProps, 'Edit Diet Plan', uiColors.diet)}
      {renderEditModal(editingFitness !== null, () => setEditingFitness(null), handleUpdateFitnessProps, 'Edit Fitness Plan', uiColors.fitness)}

    </SafeAreaView>
  );
}
