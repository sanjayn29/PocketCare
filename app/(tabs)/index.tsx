import { getColors } from '@/constants/styles'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useGreeting } from '@/hooks/use-greeting'
import { getFinanceData } from '@/lib/finance-service'
import { getGoals } from '@/lib/goals-service'
import { getHealthData } from '@/lib/health-service'
import { getNotes } from '@/lib/notes-service'
import { getPlacements } from '@/lib/placement-service'
import { saveUserToFirestore } from '@/lib/save-user'
import { getScheduleEvents } from '@/lib/schedule-service'
import { getStreakData } from '@/lib/streak-service'
import { getTasks } from '@/lib/tasks-service'
import {
    ALL_WIDGETS,
    WidgetConfig,
    WidgetId,
    getWidgetConfig,
    saveWidgetConfig,
} from '@/lib/widget-service'
import { useUser } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import LottieView from 'lottie-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    Animated,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface HomeData {
  streak: number
  maxStreak: number
  income: number
  expenses: number
  pendingTasks: number
  totalTasks: number
  activeGoals: { title: string; pct: number; color: string }[]
  nextEvent: { title: string; date: string; time: string } | null
  fitnessToday: { name: string; done: boolean } | null
  placementLatest: { company: string; status: string } | null
  latestNote: { title: string; content: string } | null
  totalGoals: number
  completedGoals: number
}

// Animated number hook
function useAnimatedNumber(target: number, duration = 800) {
  const anim = useRef(new Animated.Value(0)).current
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration, useNativeDriver: false }).start()
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)))
    return () => anim.removeListener(id)
  }, [target])
  return display
}

// Mini bar chart
const MiniBar = ({ value, max, color, isDark }: { value: number; max: number; color: string; isDark: boolean }) => {
  const w = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(w, { toValue: max > 0 ? (value / max) * 100 : 0, duration: 900, useNativeDriver: false }).start()
  }, [value, max])
  return (
    <View style={{ height: 7, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <Animated.View style={{ height: 7, borderRadius: 4, backgroundColor: color, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  )
}

export default function HomeScreen() {
  const { user } = useUser()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const greeting = useGreeting(user?.firstName || 'User')
  const email = user?.emailAddresses?.[0]?.emailAddress

  const [data, setData] = useState<HomeData>({
    streak: 0, maxStreak: 0, income: 0, expenses: 0,
    pendingTasks: 0, totalTasks: 0, activeGoals: [],
    nextEvent: null, fitnessToday: null, placementLatest: null, latestNote: null,
    totalGoals: 0, completedGoals: 0,
  })
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const pickerSlide = useRef(new Animated.Value(700)).current
  const pickerFade = useRef(new Animated.Value(0)).current

  // Animated numbers
  const animStreak = useAnimatedNumber(data.streak)
  const animIncome = useAnimatedNumber(data.income)
  const animExpenses = useAnimatedNumber(data.expenses)
  const animTasks = useAnimatedNumber(data.pendingTasks)

  useEffect(() => {
    if (user && email) {
      const provider = user.externalAccounts?.length > 0
        ? user.externalAccounts[0].provider || 'google' : 'email'
      saveUserToFirestore({ email, firstName: user.firstName, lastName: user.lastName, imageUrl: user.imageUrl, clerkUserId: user.id, provider })
    }
  }, [user, email])

  useEffect(() => { getWidgetConfig().then(setWidgets) }, [])

  const loadData = useCallback(async () => {
    if (!email) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const [streakData, finData, tasks, goals, healthData, events, placements, notes] = await Promise.all([
        getStreakData(email), getFinanceData(email), getTasks(email),
        getGoals(email), getHealthData(email), getScheduleEvents(email),
        getPlacements(email), getNotes(email),
      ])

      const income = (finData.transactions || []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expenses = (finData.transactions || []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const pendingTasks = tasks.filter(t => t.status === 'pending' && t.due_date === today).length
      const goalColors = ['#8B5CF6', '#3B82F6', '#EC4899', '#F97316']
      const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3)
        .map((g, i) => ({ title: g.title, pct: Math.min(100, Math.round((g.current_value / Math.max(g.target_value, 1)) * 100)), color: goalColors[i % goalColors.length] }))

      const upcoming = events.filter(e => e.date >= today && e.status === 'Upcoming').sort((a, b) => a.date.localeCompare(b.date))
      const nextEvent = upcoming[0] ? { title: upcoming[0].title, date: upcoming[0].date, time: upcoming[0].startTime } : null

      const todayFitness = healthData.fitness.find(f => f.start_date <= today && f.end_date >= today)
      const fitnessToday = todayFitness ? { name: todayFitness.name, done: todayFitness.completed_dates.includes(today) } : null

      const latestP = placements.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      const placementLatest = latestP ? { company: latestP.company_name, status: latestP.status } : null

      const sortedNotes = [...(notes || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
      const latestNote = sortedNotes[0] ? { title: sortedNotes[0].title, content: sortedNotes[0].content?.slice(0, 80) || '' } : null

      setData({
        streak: streakData.currentStreak, maxStreak: streakData.maxStreak,
        income, expenses, pendingTasks, totalTasks: tasks.filter(t => t.due_date === today).length,
        activeGoals, nextEvent, fitnessToday, placementLatest, latestNote,
        totalGoals: goals.length, completedGoals: goals.filter(g => g.status === 'achieved').length,
      })
    } catch (e) { console.error(e) }
  }, [email])

  useEffect(() => { if (email) loadData() }, [email, loadData])

  const openPicker = () => {
    setShowPicker(true)
    Animated.parallel([
      Animated.spring(pickerSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(pickerFade, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start()
  }
  const closePicker = () => {
    Animated.parallel([
      Animated.timing(pickerSlide, { toValue: 700, duration: 260, useNativeDriver: true }),
      Animated.timing(pickerFade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setShowPicker(false))
  }
  const toggleWidget = (id: WidgetId) => {
    const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w)
    setWidgets(updated); saveWidgetConfig(updated)
  }
  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order)
  const moveWidget = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    const re = [...enabledWidgets]; const [m] = re.splice(fromIdx, 1); re.splice(toIdx, 0, m)
    const updated = widgets.map(w => { const n = re.findIndex(r => r.id === w.id); return n !== -1 ? { ...w, order: n } : w })
    setWidgets(updated); saveWidgetConfig(updated)
  }

  const s = getStyles(colors, isDark)

  // ── Widget content renderer ─────────────────────────────────────────────────
  const renderWidget = (id: WidgetId, color: string) => {
    switch (id) {

      case 'greeting':
        return (
          <View>
            <Text style={s.wHeadline} numberOfLines={2}>{greeting.message}</Text>
            <View style={[s.wDividerH, { backgroundColor: color + '40', marginVertical: 10 }]} />
            <Text style={s.wBodyText} numberOfLines={2}>{greeting.motivational}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={[s.chip, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                <Ionicons name="time-outline" size={11} color={color} />
                <Text style={[s.chipText, { color }]}>{new Date().toLocaleDateString('en-IN', { weekday: 'long' })}</Text>
              </View>
            </View>
          </View>
        )

      case 'streak':
        return (
          <View>
            <View style={s.wStatRow}>
              <View style={s.wStatBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[s.wBigNum, { color }]}>{animStreak}</Text>
                  <Text style={[s.wUnit, { color }]}>days</Text>
                </View>
                <Text style={s.wStatLabel}>Current Streak</Text>
              </View>
              <View style={[s.wVertDiv, { backgroundColor: color + '30' }]} />
              <View style={s.wStatBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[s.wBigNum, { color: colors.text }]}>{data.maxStreak}</Text>
                  <Text style={s.wUnit}>days</Text>
                </View>
                <Text style={s.wStatLabel}>Best Streak</Text>
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              <MiniBar value={data.streak} max={Math.max(data.maxStreak, 1)} color={color} isDark={isDark} />
              <Text style={[s.wCaption, { marginTop: 5 }]}>{data.streak > 0 ? `${Math.round((data.streak / Math.max(data.maxStreak, 1)) * 100)}% of your best` : 'Start your streak today!'}</Text>
            </View>
          </View>
        )

      case 'finance_summary':
        const net = data.income - data.expenses
        return (
          <View>
            <View style={s.wStatRow}>
              <View style={s.wStatBlock}>
                <Text style={[s.wBigNum, { color: '#22C55E', fontSize: 20 }]}>₹{animIncome.toLocaleString()}</Text>
                <Text style={s.wStatLabel}>Income</Text>
              </View>
              <View style={[s.wVertDiv, { backgroundColor: '#ffffff20' }]} />
              <View style={s.wStatBlock}>
                <Text style={[s.wBigNum, { color: '#EF4444', fontSize: 20 }]}>₹{animExpenses.toLocaleString()}</Text>
                <Text style={s.wStatLabel}>Expense</Text>
              </View>
            </View>
            <View style={[s.wDividerH, { backgroundColor: color + '30', marginVertical: 10 }]} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.wBodyText}>Net Balance</Text>
              <View style={[s.chip, { backgroundColor: (net >= 0 ? '#22C55E' : '#EF4444') + '20', borderColor: (net >= 0 ? '#22C55E' : '#EF4444') + '40' }]}>
                <Ionicons name={net >= 0 ? 'trending-up' : 'trending-down'} size={12} color={net >= 0 ? '#22C55E' : '#EF4444'} />
                <Text style={[s.chipText, { color: net >= 0 ? '#22C55E' : '#EF4444', fontWeight: '800' }]}>₹{Math.abs(net).toLocaleString()}</Text>
              </View>
            </View>
            <MiniBar value={data.expenses} max={Math.max(data.income, 1)} color="#EF4444" isDark={isDark} />
            <Text style={[s.wCaption, { marginTop: 4 }]}>
              {data.income > 0 ? `${Math.round((data.expenses / data.income) * 100)}% spent of income` : 'No income tracked'}
            </Text>
          </View>
        )

      case 'tasks_today':
        const done = data.totalTasks - data.pendingTasks
        return (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={[s.wBigNum, { color }]}>{animTasks}</Text>
                <Text style={s.wStatLabel}>Tasks due today</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[s.wBigNum, { color: '#22C55E', fontSize: 20 }]}>{done}</Text>
                <Text style={s.wStatLabel}>Done</Text>
              </View>
            </View>
            <View style={{ marginTop: 10 }}>
              <MiniBar value={done} max={Math.max(data.totalTasks, 1)} color="#22C55E" isDark={isDark} />
              <Text style={[s.wCaption, { marginTop: 5 }]}>
                {data.totalTasks > 0 ? `${done}/${data.totalTasks} completed` : 'No tasks due today'}
              </Text>
            </View>
          </View>
        )

      case 'goals_progress':
        return data.activeGoals.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Ionicons name="trophy-outline" size={28} color={colors.border} />
            <Text style={[s.wBodyText, { marginTop: 6, textAlign: 'center' }]}>No active goals</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {data.activeGoals.map((g, i) => (
              <View key={i}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={s.wBodyText} numberOfLines={1}>{g.title}</Text>
                  <Text style={[s.wCaption, { fontWeight: '700', color: g.color }]}>{g.pct}%</Text>
                </View>
                <MiniBar value={g.pct} max={100} color={g.color} isDark={isDark} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[s.chip, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                <Ionicons name="checkmark-circle" size={11} color={color} />
                <Text style={[s.chipText, { color }]}>{data.completedGoals} achieved</Text>
              </View>
              <View style={[s.chip, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                <Ionicons name="ellipse-outline" size={11} color={color} />
                <Text style={[s.chipText, { color }]}>{data.totalGoals} total</Text>
              </View>
            </View>
          </View>
        )

      case 'next_event':
        return data.nextEvent ? (
          <View>
            <Text style={s.wHeadline} numberOfLines={1}>{data.nextEvent.title}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <View style={[s.chip, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                <Ionicons name="calendar-outline" size={11} color={color} />
                <Text style={[s.chipText, { color }]}>{data.nextEvent.date}</Text>
              </View>
              <View style={[s.chip, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                <Ionicons name="time-outline" size={11} color={color} />
                <Text style={[s.chipText, { color }]}>{data.nextEvent.time}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Ionicons name="calendar-outline" size={28} color={colors.border} />
            <Text style={[s.wBodyText, { marginTop: 6 }]}>No upcoming events</Text>
          </View>
        )

      case 'fitness_today':
        return data.fitnessToday ? (
          <View>
            <Text style={s.wHeadline} numberOfLines={1}>{data.fitnessToday.name}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={[s.chip, { backgroundColor: (data.fitnessToday.done ? '#22C55E' : color) + '20', borderColor: (data.fitnessToday.done ? '#22C55E' : color) + '40' }]}>
                <Ionicons name={data.fitnessToday.done ? 'checkmark-circle' : 'ellipse-outline'} size={11} color={data.fitnessToday.done ? '#22C55E' : color} />
                <Text style={[s.chipText, { color: data.fitnessToday.done ? '#22C55E' : color }]}>{data.fitnessToday.done ? 'Completed' : 'Pending'}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Ionicons name="bed-outline" size={28} color={colors.border} />
            <Text style={[s.wBodyText, { marginTop: 6 }]}>Rest day — no plan</Text>
          </View>
        )

      case 'placement_status':
        const statusColors: Record<string, string> = { offer: '#22C55E', applied: '#3B82F6', interview: '#F97316', rejected: '#EF4444' }
        const sc = statusColors[data.placementLatest?.status || ''] || color
        return data.placementLatest ? (
          <View>
            <Text style={s.wHeadline} numberOfLines={1}>{data.placementLatest.company}</Text>
            <View style={{ marginTop: 8 }}>
              <View style={[s.chip, { backgroundColor: sc + '20', borderColor: sc + '40' }]}>
                <Ionicons name="briefcase-outline" size={11} color={sc} />
                <Text style={[s.chipText, { color: sc, fontWeight: '700' }]}>{data.placementLatest.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Ionicons name="business-outline" size={28} color={colors.border} />
            <Text style={[s.wBodyText, { marginTop: 6 }]}>No placements tracked</Text>
          </View>
        )

      case 'notes_quick':
        return data.latestNote ? (
          <View>
            <Text style={[s.wBodyText, { fontWeight: '700', color: colors.text }]} numberOfLines={1}>{data.latestNote.title}</Text>
            <View style={[s.wDividerH, { backgroundColor: color + '30', marginVertical: 8 }]} />
            <Text style={s.wBodyText} numberOfLines={3}>{data.latestNote.content}</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Ionicons name="document-text-outline" size={28} color={colors.border} />
            <Text style={[s.wBodyText, { marginTop: 6 }]}>No notes yet</Text>
          </View>
        )

      case 'ai_tip':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.wHeadline}>Ask anything</Text>
              <Text style={s.wBodyText}>Get AI insights about your finances, health, goals & more.</Text>
            </View>
            <LottieView source={require('../../assets/animations/Loader.json')} autoPlay loop style={{ width: 48, height: 48 }} />
          </View>
        )

      default: return null
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1} adjustsFontSizeToFit>PocketCare</Text>
          <Text style={s.headerSub}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <View style={s.headerActions}>
          {editMode && (
            <TouchableOpacity style={[s.hBtn, { backgroundColor: '#22C55E20', borderColor: '#22C55E50' }]} onPress={() => setEditMode(false)}>
              <Ionicons name="checkmark" size={18} color="#22C55E" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.hBtn} onPress={() => setEditMode(e => !e)}>
            <Ionicons name="swap-vertical-outline" size={19} color={editMode ? '#D4AF37' : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.hBtn, { backgroundColor: '#D4AF3715', borderColor: '#D4AF3740' }]} onPress={openPicker}>
            <Ionicons name="apps-outline" size={19} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      </View>

      {editMode && (
        <View style={s.editBanner}>
          <Ionicons name="information-circle-outline" size={14} color="#D4AF37" />
          <Text style={s.editBannerText}>Use ▲▼ to reorder · Tap × to remove</Text>
        </View>
      )}

      {/* ── Widget grid ── */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {enabledWidgets.map((w, idx) => {
          const meta = ALL_WIDGETS.find(a => a.id === w.id)!
          return (
            <View key={w.id} style={s.card}>
              {/* Card header row */}
              <View style={s.cardHeader}>
                <View style={[s.cardIcon, { backgroundColor: meta.color + '22' }]}>
                  <Ionicons name={meta.iconName as any} size={18} color={meta.color} />
                </View>
                <Text style={[s.cardLabel, { color: meta.color }]}>{meta.title.toUpperCase()}</Text>
                {editMode && (
                  <View style={s.editRow}>
                    <TouchableOpacity style={s.orderBtn} onPress={() => moveWidget(idx, Math.max(0, idx - 1))} disabled={idx === 0}>
                      <Ionicons name="chevron-up" size={15} color={idx === 0 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.orderBtn} onPress={() => moveWidget(idx, Math.min(enabledWidgets.length - 1, idx + 1))} disabled={idx === enabledWidgets.length - 1}>
                      <Ionicons name="chevron-down" size={15} color={idx === enabledWidgets.length - 1 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleWidget(w.id)}>
                      <Ionicons name="close-circle" size={19} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Accent */}
              <View style={[s.accent, { backgroundColor: meta.color }]} />

              {/* Body */}
              <View style={s.cardBody}>
                {renderWidget(w.id, meta.color)}
              </View>
            </View>
          )
        })}

        {enabledWidgets.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="grid-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>No widgets</Text>
            <Text style={s.emptySub}>Tap the grid icon to add widgets</Text>
            <TouchableOpacity style={[s.emptyBtn, { backgroundColor: '#D4AF37' }]} onPress={openPicker}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.emptyBtnText}>Add Widgets</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Widget Picker ── */}
      <Modal visible={showPicker} transparent animationType="none">
        <Animated.View style={[s.backdrop, { opacity: pickerFade }]}>
          <TouchableWithoutFeedback onPress={closePicker}><View style={{ flex: 1 }} /></TouchableWithoutFeedback>
        </Animated.View>
        <Animated.View style={[s.sheet, { transform: [{ translateY: pickerSlide }] }]}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetTitle}>Customize Widgets</Text>
              <Text style={s.sheetSub}>Choose what appears on your home</Text>
            </View>
            <TouchableOpacity style={s.sheetClose} onPress={closePicker}>
              <Ionicons name="close" size={17} color={isDark ? '#000' : '#fff'} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {ALL_WIDGETS.map(meta => {
              const enabled = widgets.find(w => w.id === meta.id)?.enabled ?? false
              return (
                <TouchableOpacity key={meta.id} style={[s.pickerRow, enabled && { backgroundColor: meta.color + '12', borderColor: meta.color + '40' }]} onPress={() => toggleWidget(meta.id)} activeOpacity={0.8}>
                  <View style={[s.pickerIcon, { backgroundColor: meta.color + '22' }]}>
                    <Ionicons name={meta.iconName as any} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerItemTitle}>{meta.title}</Text>
                    <Text style={s.pickerItemSub}>{meta.subtitle}</Text>
                  </View>
                  {/* Custom toggle */}
                  <View style={[s.toggle, enabled && { backgroundColor: meta.color }]}>
                    <View style={[s.toggleThumb, enabled && s.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              )
            })}
            <View style={{ height: 48 }} />
          </ScrollView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  )
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    backgroundColor: colors.background,
  },
  headerTitle: { fontSize: 28, fontFamily: 'MomoSignature', color: '#D4AF37', letterSpacing: -0.8 },
  headerSub: { fontSize: 15, fontFamily: 'RobotoSlab', color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8 },
  hBtn: {
    width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  },
  editBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : 'rgba(212,175,55,0.08)',
    paddingVertical: 7, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  editBannerText: { fontSize: 12, color: '#D4AF37', fontWeight: '600' },
  scroll: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 120, gap: 14 },
  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: isDark ? '#000' : '#888',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
  },
  cardIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderBtn: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
  accent: { height: 2, marginHorizontal: 14, borderRadius: 1, opacity: 0.5, marginBottom: 10 },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  // Widget atoms
  wHeadline: { fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  wBodyText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  wBigNum: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  wUnit: { fontSize: 13, color: colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  wStatRow: { flexDirection: 'row', alignItems: 'center' },
  wStatBlock: { flex: 1, alignItems: 'center' },
  wStatLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  wVertDiv: { width: 1, height: 44, marginHorizontal: 8 },
  wDividerH: { height: 1 },
  wCaption: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  // Empty
  empty: { alignItems: 'center', paddingVertical: 70, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Picker
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '78%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 16, paddingBottom: 24,
    borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 20,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)', marginTop: 10, marginBottom: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sheetClose: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 16, marginBottom: 8,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    borderWidth: 1, borderColor: colors.border,
  },
  pickerIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pickerItemTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  pickerItemSub: { fontSize: 12, color: colors.textSecondary },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', justifyContent: 'center', paddingHorizontal: 2 },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleThumbOn: { alignSelf: 'flex-end' },
})