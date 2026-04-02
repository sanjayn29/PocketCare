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
import { LinearGradient } from 'expo-linear-gradient'
import LottieView from 'lottie-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// ─── Data snapshot type ───────────────────────────────────────────────────────
interface HomeData {
  streak: number
  maxStreak: number
  income: number
  expenses: number
  pendingTasks: number
  activeGoals: { title: string; pct: number }[]
  nextEvent: { title: string; time: string } | null
  fitnessToday: string | null
  placementLatest: { company: string; status: string } | null
  latestNote: string | null
}

export default function HomeScreen() {
  const { user } = useUser()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const greeting = useGreeting(user?.firstName || 'User')
  const email = user?.emailAddresses?.[0]?.emailAddress

  const [data, setData] = useState<HomeData>({
    streak: 0, maxStreak: 0,
    income: 0, expenses: 0,
    pendingTasks: 0,
    activeGoals: [],
    nextEvent: null,
    fitnessToday: null,
    placementLatest: null,
    latestNote: null,
  })

  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)

  // Drag state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const dragY = useRef(new Animated.Value(0)).current
  const dragStartY = useRef(0)
  const itemHeight = 92
  const pickerSlide = useRef(new Animated.Value(600)).current
  const pickerFade = useRef(new Animated.Value(0)).current

  // ── Load config & data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      const provider = user.externalAccounts?.length > 0
        ? user.externalAccounts[0].provider || 'google' : 'email'
      saveUserToFirestore({ email, firstName: user.firstName, lastName: user.lastName, imageUrl: user.imageUrl, clerkUserId: user.id, provider })
    }
  }, [user])

  useEffect(() => {
    getWidgetConfig().then(setWidgets)
  }, [])

  const loadData = useCallback(async () => {
    if (!email) return
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const [streakData, finData, tasks, goals, healthData, events, placements, notes] = await Promise.all([
        getStreakData(email),
        getFinanceData(email),
        getTasks(email),
        getGoals(email),
        getHealthData(email),
        getScheduleEvents(email),
        getPlacements(email),
        getNotes(email),
      ])

      // Finance
      const income = (finData.transactions || []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expenses = (finData.transactions || []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      // Tasks due today
      const pendingTasks = tasks.filter(t => t.status === 'pending' && t.due_date === today).length

      // Goals
      const activeGoals = goals
        .filter(g => g.status === 'active')
        .slice(0, 2)
        .map(g => ({ title: g.title, pct: Math.min(100, Math.round((g.current_value / Math.max(g.target_value, 1)) * 100)) }))

      // Next event
      const upcoming = events.filter(e => e.date >= today && e.status === 'Upcoming').sort((a, b) => a.date.localeCompare(b.date))
      const nextEvent = upcoming[0] ? { title: upcoming[0].title, time: `${upcoming[0].date} ${upcoming[0].startTime}` } : null

      // Fitness today
      const todayFitness = healthData.fitness.find(f => f.start_date <= today && f.end_date >= today)
      const fitnessToday = todayFitness?.name || null

      // Placement
      const latest = placements.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      const placementLatest = latest ? { company: latest.company_name, status: latest.status } : null

      // Notes
      const sortedNotes = [...(notes || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
      const latestNote = sortedNotes[0]?.content?.slice(0, 60) || null

      setData({ streak: streakData.currentStreak, maxStreak: streakData.maxStreak, income, expenses, pendingTasks, activeGoals, nextEvent, fitnessToday, placementLatest, latestNote })
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [email])

  useEffect(() => { if (email) loadData() }, [email, loadData])

  // ── Widget picker ────────────────────────────────────────────────────────────
  const openPicker = () => {
    setShowPicker(true)
    Animated.parallel([
      Animated.spring(pickerSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(pickerFade, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start()
  }

  const closePicker = () => {
    Animated.parallel([
      Animated.timing(pickerSlide, { toValue: 600, duration: 260, useNativeDriver: true }),
      Animated.timing(pickerFade, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setShowPicker(false))
  }

  const toggleWidget = (id: WidgetId) => {
    const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w)
    setWidgets(updated)
    saveWidgetConfig(updated)
  }

  // ── Drag-and-drop (simple swap on long press) ────────────────────────────────
  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order)

  const moveWidget = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    const reordered = [...enabledWidgets]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    const updated = widgets.map(w => {
      const newOrder = reordered.findIndex(r => r.id === w.id)
      return newOrder !== -1 ? { ...w, order: newOrder } : w
    })
    setWidgets(updated)
    saveWidgetConfig(updated)
  }

  // ── Render individual widget content ─────────────────────────────────────────
  const renderWidgetContent = (id: WidgetId) => {
    switch (id) {
      case 'greeting':
        return (
          <View style={s.wRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.wTitle}>{greeting.message}</Text>
              <Text style={[s.wSub, { marginTop: 4 }]} numberOfLines={2}>{greeting.motivational}</Text>
            </View>
            <LottieView source={require('../../assets/animations/Intro.json')} autoPlay loop style={{ width: 56, height: 56 }} />
          </View>
        )
      case 'streak':
        return (
          <View style={s.wRow}>
            <View style={s.wStatBlock}>
              <Text style={s.wBigNum}>{data.streak}</Text>
              <Text style={s.wStatLabel}>Current</Text>
            </View>
            <View style={s.wDivider} />
            <View style={s.wStatBlock}>
              <Text style={s.wBigNum}>{data.maxStreak}</Text>
              <Text style={s.wStatLabel}>Best</Text>
            </View>
            <LottieView source={require('../../assets/animations/Morphing.json')} autoPlay loop style={{ width: 52, height: 52 }} />
          </View>
        )
      case 'finance_summary':
        const net = data.income - data.expenses
        return (
          <View>
            <View style={s.wRow}>
              <View style={s.wStatBlock}>
                <Text style={[s.wBigNum, { color: '#22C55E' }]}>₹{data.income.toLocaleString()}</Text>
                <Text style={s.wStatLabel}>Income</Text>
              </View>
              <View style={s.wDivider} />
              <View style={s.wStatBlock}>
                <Text style={[s.wBigNum, { color: '#EF4444' }]}>₹{data.expenses.toLocaleString()}</Text>
                <Text style={s.wStatLabel}>Expense</Text>
              </View>
            </View>
            <Text style={[s.wSub, { marginTop: 6 }]}>Net: <Text style={{ color: net >= 0 ? '#22C55E' : '#EF4444', fontWeight: '700' }}>₹{net.toLocaleString()}</Text></Text>
          </View>
        )
      case 'tasks_today':
        return (
          <View style={s.wRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.wBigNum}>{data.pendingTasks}</Text>
              <Text style={s.wSub}>{data.pendingTasks === 1 ? 'task due today' : 'tasks due today'}</Text>
            </View>
            <View style={[s.wIconCircle, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="checkmark-done" size={22} color="#3B82F6" />
            </View>
          </View>
        )
      case 'goals_progress':
        return data.activeGoals.length === 0 ? (
          <Text style={s.wSub}>No active goals</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {data.activeGoals.map(g => (
              <View key={g.title}>
                <View style={[s.wRow, { marginBottom: 3 }]}>
                  <Text style={s.wSub} numberOfLines={1}>{g.title}</Text>
                  <Text style={[s.wSub, { fontWeight: '700' }]}>{g.pct}%</Text>
                </View>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${g.pct}%` as any, backgroundColor: '#8B5CF6' }]} />
                </View>
              </View>
            ))}
          </View>
        )
      case 'next_event':
        return data.nextEvent ? (
          <View style={s.wRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.wTitle} numberOfLines={1}>{data.nextEvent.title}</Text>
              <Text style={s.wSub}>{data.nextEvent.time}</Text>
            </View>
            <View style={[s.wIconCircle, { backgroundColor: '#EC489920' }]}>
              <Ionicons name="calendar" size={20} color="#EC4899" />
            </View>
          </View>
        ) : <Text style={s.wSub}>No upcoming events</Text>
      case 'fitness_today':
        return (
          <View style={s.wRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.wTitle} numberOfLines={1}>{data.fitnessToday || 'Rest day'}</Text>
              <Text style={s.wSub}>Today's fitness plan</Text>
            </View>
            <View style={[s.wIconCircle, { backgroundColor: '#14B8A620' }]}>
              <Ionicons name="barbell" size={20} color="#14B8A6" />
            </View>
          </View>
        )
      case 'placement_status':
        return data.placementLatest ? (
          <View style={s.wRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.wTitle} numberOfLines={1}>{data.placementLatest.company}</Text>
              <View style={[s.badge, { backgroundColor: data.placementLatest.status === 'offer' ? '#22C55E20' : '#6366F120' }]}>
                <Text style={[s.badgeText, { color: data.placementLatest.status === 'offer' ? '#22C55E' : '#6366F1' }]}>
                  {data.placementLatest.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={[s.wIconCircle, { backgroundColor: '#6366F120' }]}>
              <Ionicons name="business" size={20} color="#6366F1" />
            </View>
          </View>
        ) : <Text style={s.wSub}>No placements tracked</Text>
      case 'notes_quick':
        return (
          <View style={s.wRow}>
            <Text style={[s.wSub, { flex: 1, fontStyle: data.latestNote ? 'italic' : 'normal' }]} numberOfLines={2}>
              {data.latestNote || 'No notes yet'}
            </Text>
            <View style={[s.wIconCircle, { backgroundColor: '#A855F720' }]}>
              <Ionicons name="document-text" size={20} color="#A855F7" />
            </View>
          </View>
        )
      case 'ai_tip':
        return (
          <View style={s.wRow}>
            <Text style={[s.wSub, { flex: 1 }]}>Ask PocketCare AI for daily tips, insights, and help with your plans.</Text>
            <LottieView source={require('../../assets/animations/Loader.json')} autoPlay loop style={{ width: 44, height: 44 }} />
          </View>
        )
      default: return null
    }
  }

  const s = getStyles(colors, isDark)

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#ffffff', '#f8f9ff']}
        style={s.header}
      >
        <View>
          <Text style={s.headerHi}>PocketCare ✨</Text>
          <Text style={s.headerSub}>Your personal dashboard</Text>
        </View>
        <View style={s.headerActions}>
          {editMode && (
            <TouchableOpacity style={[s.headerBtn, { backgroundColor: '#22C55E20', borderColor: '#22C55E40' }]} onPress={() => setEditMode(false)}>
              <Ionicons name="checkmark" size={18} color="#22C55E" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.headerBtn} onPress={() => setEditMode(e => !e)}>
            <Ionicons name={editMode ? 'reorder-three' : 'reorder-three-outline'} size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: '#D4AF3720', borderColor: '#D4AF3740' }]} onPress={openPicker}>
            <Ionicons name="add-circle" size={20} color="#D4AF37" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Edit mode banner ── */}
      {editMode && (
        <View style={s.editBanner}>
          <Ionicons name="swap-vertical" size={14} color="#D4AF37" />
          <Text style={s.editBannerText}>Long press a widget to drag and reorder</Text>
        </View>
      )}

      {/* ── Widget List ── */}
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {enabledWidgets.map((w, idx) => {
          const meta = ALL_WIDGETS.find(a => a.id === w.id)!
          return (
            <View key={w.id} style={s.widgetCard}>
              {/* Widget header */}
              <View style={s.widgetHeader}>
                <View style={[s.widgetIconWrap, { backgroundColor: meta.color + '22' }]}>
                  <Text style={s.widgetEmoji}>{meta.emoji}</Text>
                </View>
                <Text style={s.widgetLabel}>{meta.title}</Text>
                {editMode && (
                  <View style={s.editControls}>
                    <TouchableOpacity
                      style={s.orderBtn}
                      onPress={() => moveWidget(idx, Math.max(0, idx - 1))}
                      disabled={idx === 0}
                    >
                      <Ionicons name="chevron-up" size={16} color={idx === 0 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.orderBtn}
                      onPress={() => moveWidget(idx, Math.min(enabledWidgets.length - 1, idx + 1))}
                      disabled={idx === enabledWidgets.length - 1}
                    >
                      <Ionicons name="chevron-down" size={16} color={idx === enabledWidgets.length - 1 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.removeBtn} onPress={() => toggleWidget(w.id)}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Accent line */}
              <View style={[s.accentLine, { backgroundColor: meta.color }]} />

              {/* Widget content */}
              <View style={s.widgetBody}>
                {renderWidgetContent(w.id)}
              </View>
            </View>
          )
        })}

        {enabledWidgets.length === 0 && (
          <View style={s.emptyState}>
            <LottieView source={require('../../assets/animations/Rocketship.json')} autoPlay loop style={{ width: 120, height: 120 }} />
            <Text style={s.emptyTitle}>No widgets yet</Text>
            <Text style={s.emptySub}>Tap the + button to add your first widget</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openPicker}>
              <Text style={s.emptyBtnText}>Add Widgets</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Widget Picker Modal ── */}
      <Modal visible={showPicker} transparent animationType="none">
        <Animated.View style={[s.backdrop, { opacity: pickerFade }]}>
          <TouchableWithoutFeedback onPress={closePicker}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View style={[s.pickerSheet, { transform: [{ translateY: pickerSlide }] }]}>
          {/* Handle */}
          <View style={s.dragHandle} />

          {/* Picker header */}
          <View style={s.pickerHeader}>
            <View>
              <Text style={s.pickerTitle}>Customize Widgets</Text>
              <Text style={s.pickerSub}>Toggle to show or hide on your home</Text>
            </View>
            <TouchableOpacity style={s.pickerClose} onPress={closePicker}>
              <Ionicons name="close" size={18} color={isDark ? '#000' : '#fff'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {ALL_WIDGETS.map(meta => {
              const wConfig = widgets.find(w => w.id === meta.id)
              const enabled = wConfig?.enabled ?? false
              return (
                <TouchableOpacity
                  key={meta.id}
                  style={[s.pickerItem, enabled && s.pickerItemActive]}
                  onPress={() => toggleWidget(meta.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.pickerEmoji, { backgroundColor: meta.color + '22' }]}>
                    <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerItemTitle}>{meta.title}</Text>
                    <Text style={s.pickerItemSub}>{meta.subtitle}</Text>
                  </View>
                  <View style={[s.toggle, enabled && s.toggleOn]}>
                    <View style={[s.toggleThumb, enabled && s.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              )
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  )
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
  },
  headerHi: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  },
  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : 'rgba(212,175,55,0.08)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.2)',
  },
  editBannerText: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 120,
    gap: 14,
  },
  widgetCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  widgetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetEmoji: { fontSize: 16 },
  widgetLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  editControls: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  orderBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  removeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentLine: {
    height: 2,
    marginHorizontal: 14,
    borderRadius: 1,
    opacity: 0.6,
    marginBottom: 10,
  },
  widgetBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  // Widget content atoms
  wRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  wSub: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  wBigNum: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  wStatBlock: { alignItems: 'center', flex: 1 },
  wStatLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  wDivider: { width: 1, height: 36, backgroundColor: colors.border },
  wIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Picker
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pickerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '78%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)',
    marginTop: 10,
    marginBottom: 14,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  pickerSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerClose: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerItemActive: {
    backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : 'rgba(212,175,55,0.08)',
    borderColor: 'rgba(212,175,55,0.35)',
  },
  pickerEmoji: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  pickerItemSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: '#D4AF37' },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
})