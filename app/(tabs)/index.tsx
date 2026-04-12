import { getCardSystem } from '@/constants/card-system'
import { getColors } from '@/constants/styles'
import { useColorScheme } from '@/hooks/use-color-scheme'
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
import { useFonts } from 'expo-font'
import { useRouter } from 'expo-router'
import LottieView from 'lottie-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    Animated,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// ─── Types ───────────────────────────────────────────────────────────────────
interface HomeData {
  streak: number
  maxStreak: number
  income: number
  expenses: number
  pendingTasks: number
  totalTasks: number
  completedTasks: number
  highPriorityTasks: number
  activeGoals: { title: string; pct: number; color: string }[]
  nextEvent: { title: string; date: string; time: string } | null
  fitnessToday: { name: string; done: boolean } | null
  placementLatest: {
    company: string
    status: string
    date: string
    studied: boolean
    company_status?: string
    roundsTotal: number
    roundsCleared: number
  } | null
  placementCounts: { applied: number; interview: number; offer: number; rejected: number; total: number }
  latestNote: { title: string; content: string; created_at: string } | null
  totalGoals: number
  completedGoals: number
  overdueTasksCount: number
}

// ─── Animated number hook ────────────────────────────────────────────────────
function useAnimatedNumber(target: number, duration = 900) {
  const anim = useRef(new Animated.Value(0)).current
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    Animated.timing(anim, { toValue: target, duration, useNativeDriver: false }).start()
    const id = anim.addListener(({ value }) => setDisplay(Math.round(value)))
    return () => anim.removeListener(id)
  }, [target, anim, duration])
  return display
}

// ─── Progress ring (simple arc using View) ───────────────────────────────────
const ProgressRing = ({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) => {
  const strokeW = 5
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeW, borderColor: color + '25',
        position: 'absolute',
      }} />
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeW,
        borderColor: color,
        borderTopColor: pct < 25 ? color + '25' : color,
        borderRightColor: pct < 50 ? color + '25' : color,
        borderBottomColor: pct < 75 ? color + '25' : color,
        position: 'absolute',
        transform: [{ rotate: '-45deg' }],
      }} />
      <Text style={{ fontSize: 11, fontWeight: '800', color }}>{pct}%</Text>
    </View>
  )
}

// ─── Animated bar ────────────────────────────────────────────────────────────
const MiniBar = ({ value, max, color, isDark, height = 7 }: {
  value: number; max: number; color: string; isDark: boolean; height?: number
}) => {
  const w = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(w, { toValue: max > 0 ? (value / max) * 100 : 0, duration: 1000, useNativeDriver: false }).start()
  }, [value, max, w])
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <Animated.View style={{
        height, borderRadius: height / 2, backgroundColor: color,
        width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
      }} />
    </View>
  )
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
const Chip = ({ icon, label, color }: { icon: string; label: string; color: string }) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
    backgroundColor: color + '18', borderWidth: 1, borderColor: color + '35',
    alignSelf: 'flex-start',
  }}>
    <Ionicons name={icon as any} size={11} color={color} />
    <Text style={{ fontSize: 11, fontWeight: '700', color }}>{label}</Text>
  </View>
)

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useUser()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const colors = getColors(isDark)
  const email = user?.emailAddresses?.[0]?.emailAddress

  const [data, setData] = useState<HomeData>({
    streak: 0, maxStreak: 0, income: 0, expenses: 0,
    pendingTasks: 0, totalTasks: 0, completedTasks: 0, highPriorityTasks: 0,
    activeGoals: [], nextEvent: null, fitnessToday: null,
    placementLatest: null,
    placementCounts: { applied: 0, interview: 0, offer: 0, rejected: 0, total: 0 },
    latestNote: null, totalGoals: 0, completedGoals: 0, overdueTasksCount: 0,
  })
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [fontsLoaded] = useFonts({
    'Roboto Slab': require('../../assets/Font/RobotoSlab-VariableFont_wght.ttf'),
  })
  const pickerSlide = useRef(new Animated.Value(700)).current
  const pickerFade = useRef(new Animated.Value(0)).current

  // Card entrance animations
  const cardAnims = useRef(Array.from({ length: 12 }, () => new Animated.Value(0))).current

  const animIncome = useAnimatedNumber(data.income)
  const animExpenses = useAnimatedNumber(data.expenses)
  const animStreak = useAnimatedNumber(data.streak)
  const animTasks = useAnimatedNumber(data.pendingTasks)

  useEffect(() => {
    if (user && email) {
      const provider = user.externalAccounts?.length > 0
        ? user.externalAccounts[0].provider || 'google' : 'email'
      saveUserToFirestore({ email, firstName: user.firstName, lastName: user.lastName, imageUrl: user.imageUrl, clerkUserId: user.id, provider })
    }
  }, [user, email])

  useEffect(() => { getWidgetConfig().then(setWidgets) }, [])

  const runCardAnimations = useCallback(() => {
    cardAnims.forEach(a => a.setValue(0))
    Animated.stagger(70, cardAnims.map(a =>
      Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 })
    )).start()
  }, [cardAnims])

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

      const todayTasks = tasks.filter(t => t.due_date === today)
      const pendingTasks = todayTasks.filter(t => t.status === 'pending').length
      const completedTasks = todayTasks.filter(t => t.status !== 'pending').length
      const highPriorityTasks = todayTasks.filter(t => t.priority === 'high' && t.status === 'pending').length
      const overdueTasksCount = tasks.filter(t => t.due_date < today && t.status === 'pending').length

      const goalColors = ['#8B5CF6', '#3B82F6', '#EC4899', '#F97316']
      const activeGoals = goals.filter(g => g.status === 'active').slice(0, 3)
        .map((g, i) => ({ title: g.title, pct: Math.min(100, Math.round((g.current_value / Math.max(g.target_value, 1)) * 100)), color: goalColors[i % goalColors.length] }))

      const upcoming = events.filter(e => e.date >= today && e.status === 'Upcoming').sort((a, b) => a.date.localeCompare(b.date))
      const nextEvent = upcoming[0] ? { title: upcoming[0].title, date: upcoming[0].date, time: upcoming[0].startTime } : null

      const todayFitness = healthData.fitness.find(f => f.start_date <= today && f.end_date >= today)
      const fitnessToday = todayFitness ? { name: todayFitness.name, done: todayFitness.completed_dates.includes(today) } : null

      const sortedP = [...(placements || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
      const latestP = sortedP[0]
      const placementLatest = latestP
        ? {
            company: latestP.company_name,
            status: latestP.status,
            date: latestP.date || '',
            studied: latestP.studied || false,
            company_status: latestP.company_status,
            roundsTotal: latestP.rounds?.length || 0,
            roundsCleared: latestP.rounds?.filter(r => r.result === 'success').length || 0,
          }
        : null
      const placementCounts = {
        applied:   placements.filter(p => p.status === 'applied').length,
        interview: placements.filter(p => p.status === 'interview').length,
        offer:     placements.filter(p => p.status === 'offer').length,
        rejected:  placements.filter(p => p.status === 'rejected').length,
        total:     placements.length,
      }

      const sortedNotes = [...(notes || [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
      const latestNote = sortedNotes[0]
        ? { title: sortedNotes[0].title, content: sortedNotes[0].content?.slice(0, 100) || '', created_at: sortedNotes[0].created_at }
        : null

      setData({
        streak: streakData.currentStreak, maxStreak: streakData.maxStreak,
        income, expenses, pendingTasks, totalTasks: todayTasks.length,
        completedTasks, highPriorityTasks, overdueTasksCount,
        activeGoals, nextEvent, fitnessToday, placementLatest, placementCounts,
        latestNote, totalGoals: goals.length,
        completedGoals: goals.filter(g => g.status === 'achieved').length,
      })
      runCardAnimations()
    } catch (e) { console.error(e) }
    finally { setRefreshing(false) }
  }, [email, runCardAnimations])

  useEffect(() => { if (email) loadData() }, [email, loadData])

  const onRefresh = () => { setRefreshing(true); loadData() }

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

  const getEventDaysLeft = (dateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatCurrency = (n: number) => n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n.toLocaleString()}`

  const s = getStyles(colors, isDark)

  // ── Widget Routes ──────────────────────────────────────────────────────────
  const widgetRoutes: Partial<Record<WidgetId, string>> = {
    finance_summary: '/(tabs)/finance',
    tasks_today: '/(tabs)/tasks',
    goals_progress: '/(tabs)/goals',
    next_event: '/(tabs)/schedule',
    fitness_today: '/(tabs)/health',
    placement_status: '/(tabs)/placement',
    notes_quick: '/(tabs)/notes',
    ai_tip: '/(tabs)/ai',
    streak: '/(tabs)/profile',
    greeting: '/(tabs)/profile',
  }

  // ── Widget Bodies ─────────────────────────────────────────────────────────
  const renderWidget = (id: WidgetId, color: string) => {
    const net = data.income - data.expenses

    switch (id) {

      // ── GREETING ─────────────────────────────────────────────────────────
      case 'greeting':
        const hour = new Date().getHours()
        const timeLabel = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 21 ? 'Evening' : 'Night'
        const displayName = user?.firstName || 'User'
        const initials = (user?.firstName?.[0] || 'U').toUpperCase()
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28, backgroundColor: color + '25',
              borderWidth: 2, borderColor: color + '50', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
              ) : (
                <Text style={{ fontSize: 24, fontWeight: '900', color }}>{initials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>
                Good {timeLabel}
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>
                {displayName}
              </Text>
            </View>
          </View>
        )

      // ── STREAK ──────────────────────────────────────────────────────────
      case 'streak':
        const streakPct = data.maxStreak > 0 ? Math.round((data.streak / data.maxStreak) * 100) : 0
        const milestones = [7, 14, 30, 60, 100]
        const nextMilestone = milestones.find(m => m > data.streak) || 100
        const daysToMilestone = nextMilestone - data.streak
        return (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <ProgressRing pct={streakPct} color={color} size={64} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                  <Text style={{ fontSize: 36, fontWeight: '900', color, letterSpacing: -2 }}>{animStreak}</Text>
                  <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 6, fontWeight: '700' }}>days</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Streak</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>{data.maxStreak}</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>Best</Text>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <MiniBar value={data.streak} max={Math.max(data.maxStreak, 1)} color={color} isDark={isDark} height={8} />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Chip icon="flame" label={`${data.streak} day${data.streak !== 1 ? 's' : ''} strong`} color={color} />
              <Chip icon="flag-outline" label={`${daysToMilestone}d to ${nextMilestone}`} color="#9CA3AF" />
            </View>
          </View>
        )

      // ── FINANCE ─────────────────────────────────────────────────────────
      case 'finance_summary':
        const savingsRate = data.income > 0 ? Math.max(0, Math.round(((data.income - data.expenses) / data.income) * 100)) : 0
        const spentPct = data.income > 0 ? Math.min(100, Math.round((data.expenses / data.income) * 100)) : 0
        return (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <ProgressRing pct={spentPct} color={spentPct > 80 ? '#EF4444' : color} size={60} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Net Balance</Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color: net >= 0 ? '#22C55E' : '#EF4444', letterSpacing: -1 }}>
                  {net >= 0 ? '+' : ''}{formatCurrency(Math.abs(net))}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  {savingsRate}% savings rate
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 1, marginBottom: 10 }}>
              <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: '#22C55E12', borderRadius: 10, borderWidth: 1, borderColor: '#22C55E25' }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#22C55E' }}>{formatCurrency(animIncome)}</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2, fontWeight: '600' }}>Income</Text>
              </View>
              <View style={{ width: 8 }} />
              <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: '#EF444412', borderRadius: 10, borderWidth: 1, borderColor: '#EF444425' }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#EF4444' }}>{formatCurrency(animExpenses)}</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2, fontWeight: '600' }}>Expenses</Text>
              </View>
            </View>

            <MiniBar value={data.expenses} max={Math.max(data.income, 1)} color={spentPct > 80 ? '#EF4444' : color} isDark={isDark} height={6} />
            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 5, fontWeight: '500' }}>
              {spentPct}% spent of total income
            </Text>
          </View>
        )

      // ── TASKS ──────────────────────────────────────────────────────────
      case 'tasks_today':
        const taskDone = data.totalTasks - data.pendingTasks
        const taskPct = data.totalTasks > 0 ? Math.round((taskDone / data.totalTasks) * 100) : 0
        return (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <ProgressRing pct={taskPct} color={taskPct === 100 ? '#22C55E' : color} size={60} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                  <Text style={{ fontSize: 30, fontWeight: '900', color: taskPct === 100 ? '#22C55E' : color, letterSpacing: -1 }}>{animTasks}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>pending</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>
                  {taskDone} of {data.totalTasks} done today
                </Text>
              </View>
            </View>

            <MiniBar value={taskDone} max={Math.max(data.totalTasks, 1)} color={taskPct === 100 ? '#22C55E' : color} isDark={isDark} height={8} />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {data.highPriorityTasks > 0 && (
                <Chip icon="alert-circle" label={`${data.highPriorityTasks} high priority`} color="#EF4444" />
              )}
              {data.overdueTasksCount > 0 && (
                <Chip icon="time" label={`${data.overdueTasksCount} overdue`} color="#F97316" />
              )}
              {data.highPriorityTasks === 0 && data.overdueTasksCount === 0 && (
                <Chip icon={taskPct === 100 ? 'checkmark-circle' : 'checkmark-circle-outline'} label={taskPct === 100 ? 'All done!' : 'On track'} color={color} />
              )}
            </View>
          </View>
        )

      // ── GOALS ──────────────────────────────────────────────────────────
      case 'goals_progress':
        return (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '900', color, letterSpacing: -0.5 }}>{data.activeGoals.length}</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Goals</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ alignItems: 'center', padding: 8, backgroundColor: '#22C55E12', borderRadius: 10, minWidth: 44 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#22C55E' }}>{data.completedGoals}</Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: '600' }}>Done</Text>
                </View>
                <View style={{ alignItems: 'center', padding: 8, backgroundColor: color + '15', borderRadius: 10, minWidth: 44 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color }}>{data.totalGoals}</Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: '600' }}>Total</Text>
                </View>
              </View>
            </View>

            {data.activeGoals.length > 0 ? (
              <View style={{ gap: 10 }}>
                {data.activeGoals.map((g, i) => (
                  <View key={i}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>{g.title}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: g.color, marginLeft: 8 }}>{g.pct}%</Text>
                    </View>
                    <MiniBar value={g.pct} max={100} color={g.color} isDark={isDark} height={6} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Ionicons name="trophy-outline" size={28} color={colors.border} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6 }}>No active goals</Text>
              </View>
            )}
          </View>
        )

      // ── NEXT EVENT ────────────────────────────────────────────────────
      case 'next_event':
        if (!data.nextEvent) return (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name="calendar-outline" size={24} color={color} />
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>No upcoming events</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, opacity: 0.7, marginTop: 2 }}>Tap to add one</Text>
          </View>
        )
        const daysLeft = getEventDaysLeft(data.nextEvent.date)
        const urgencyColor = daysLeft === 0 ? '#EF4444' : daysLeft <= 2 ? '#F97316' : color
        return (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2, marginBottom: 10 }} numberOfLines={2}>
              {data.nextEvent.title}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Chip icon="calendar-outline" label={data.nextEvent.date} color={color} />
              <Chip icon="time-outline" label={data.nextEvent.time || 'TBD'} color={color} />
            </View>
            <View style={{ marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: urgencyColor + '12', borderWidth: 1, borderColor: urgencyColor + '30', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={daysLeft === 0 ? 'alert-circle' : 'hourglass-outline'} size={16} color={urgencyColor} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: urgencyColor }}>
                {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days away`}
              </Text>
            </View>
          </View>
        )

      // ── FITNESS ───────────────────────────────────────────────────────
      case 'fitness_today':
        if (!data.fitnessToday) return (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name="barbell-outline" size={24} color={color} />
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Rest day — no plan</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, opacity: 0.7, marginTop: 2 }}>Add a fitness plan</Text>
          </View>
        )
        return (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="barbell-outline" size={24} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {data.fitnessToday.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Today&apos;s Plan</Text>
              </View>
            </View>
            <View style={{
              padding: 12, borderRadius: 12,
              backgroundColor: (data.fitnessToday.done ? '#22C55E' : color) + '15',
              borderWidth: 1.5, borderColor: (data.fitnessToday.done ? '#22C55E' : color) + '40',
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <Ionicons
                name={data.fitnessToday.done ? 'checkmark-circle' : 'radio-button-off-outline'}
                size={22}
                color={data.fitnessToday.done ? '#22C55E' : color}
              />
              <View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: data.fitnessToday.done ? '#22C55E' : color }}>
                  {data.fitnessToday.done ? '✓ Completed Today!' : 'Mark as Done'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  Tap Health to track
                </Text>
              </View>
            </View>
          </View>
        )

      // ── PLACEMENT ────────────────────────────────────────────────────
      case 'placement_status':
        const pStatusColors: Record<string, string> = {
          offer: '#22C55E', applied: '#D4AF37', interview: '#F97316', rejected: '#EF4444'
        }
        const pStatusIcons: Record<string, string> = {
          offer: 'trophy', applied: 'paper-plane', interview: 'mic', rejected: 'close-circle'
        }
        const pCompanyStatusColors: Record<string, string> = {
          present: '#D4AF37', completed: '#22C55E', upcoming: '#F97316'
        }
        const pCompanyStatusLabels: Record<string, string> = {
          present: 'Ongoing', completed: 'Completed', upcoming: 'Upcoming'
        }
        // Empty state
        if (data.placementCounts.total === 0) return (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name="business-outline" size={24} color={color} />
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>No applications tracked</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, opacity: 0.7, marginTop: 2 }}>Tap to add your first one</Text>
          </View>
        )
        return (
          <View>
            {/* Pipeline row */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {[
                { label: 'Applied', count: data.placementCounts.applied, c: '#D4AF37' },
                { label: 'Interview', count: data.placementCounts.interview, c: '#F97316' },
                { label: 'Offer', count: data.placementCounts.offer, c: '#22C55E' },
                { label: 'Rejected', count: data.placementCounts.rejected, c: '#EF4444' },
              ].map((item, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: item.c + '12', borderWidth: 1, borderColor: item.c + '30' }}>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: item.c }}>{item.count}</Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: '700', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Latest company card */}
            {data.placementLatest && (
              <View style={{ borderRadius: 14, borderWidth: 1.5, borderColor: (pStatusColors[data.placementLatest.status] || color) + '45', overflow: 'hidden' }}>
                {/* Card top: company name + status badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Latest</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }} numberOfLines={1}>{data.placementLatest.company}</Text>
                    {data.placementLatest.date ? (
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{data.placementLatest.date}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, backgroundColor: (pStatusColors[data.placementLatest.status] || color) + '18' }}>
                    <Ionicons name={(pStatusIcons[data.placementLatest.status] || 'briefcase') as any} size={20} color={pStatusColors[data.placementLatest.status] || color} />
                    <Text style={{ fontSize: 8, fontWeight: '800', color: pStatusColors[data.placementLatest.status] || color, marginTop: 2 }}>
                      {data.placementLatest.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 12 }} />

                {/* Meta row: rounds + studied + company_status */}
                <View style={{ flexDirection: 'row', gap: 6, padding: 10, flexWrap: 'wrap' }}>
                  {data.placementLatest.roundsTotal > 0 && (
                    <Chip
                      icon="layers-outline"
                      label={`${data.placementLatest.roundsCleared}/${data.placementLatest.roundsTotal} Rounds`}
                      color={color}
                    />
                  )}
                  <Chip
                    icon={data.placementLatest.studied ? 'checkmark-circle' : 'close-circle-outline'}
                    label={data.placementLatest.studied ? 'Prepared' : 'Not Studied'}
                    color={data.placementLatest.studied ? '#22C55E' : '#9CA3AF'}
                  />
                  {data.placementLatest.company_status && (
                    <Chip
                      icon="business-outline"
                      label={pCompanyStatusLabels[data.placementLatest.company_status] || data.placementLatest.company_status}
                      color={pCompanyStatusColors[data.placementLatest.company_status] || color}
                    />
                  )}
                </View>
              </View>
            )}
          </View>
        )

      // ── NOTES ────────────────────────────────────────────────────────
      case 'notes_quick':
        if (!data.latestNote) return (
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ionicons name="document-text-outline" size={24} color={color} />
            </View>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>No notes yet</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, opacity: 0.7, marginTop: 2 }}>Tap to add your first note</Text>
          </View>
        )
        return (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="document-text" size={18} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>{data.latestNote.title}</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                  {new Date(data.latestNote.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>
            <View style={{ padding: 10, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }} numberOfLines={3}>
                {data.latestNote.content || 'No content'}
              </Text>
            </View>
          </View>
        )

      // ── AI TIP ───────────────────────────────────────────────────────
      case 'ai_tip':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: color + '60' }}>
              <LottieView source={require('../../assets/animations/AI.json')} autoPlay loop style={{ width: 44, height: 44 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 4 }}>Ask Pocket AI</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                Get insights about your finances, health, goals & more.
              </Text>
              <View style={{ marginTop: 8 }}>
                <Chip icon="sparkles" label="Tap to chat" color={color} />
              </View>
            </View>
          </View>
        )

      default: return null
    }
  }

  if (!fontsLoaded) {
    return null
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <View style={s.headerBrand}>
            <Image source={require('../../assets/Logo2.png')} style={s.headerLogo} />
            <Text style={s.headerTitle}>PocketCare</Text>
          </View>
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

      {/* ── Widget Grid ── */}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" colors={['#D4AF37']} />}
      >
        {enabledWidgets.map((w, idx) => {
          const meta = ALL_WIDGETS.find(a => a.id === w.id)!
          const anim = cardAnims[idx] || new Animated.Value(1)
          const route = widgetRoutes[w.id]

          return (
            <Animated.View
              key={w.id}
              style={[s.card, {
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
              }]}
            >
              {/* Card header */}
              <View style={s.cardHeader}>
                <View style={[s.cardIcon, { backgroundColor: meta.color + '22' }]}>
                  <Ionicons name={meta.iconName as any} size={16} color={meta.color} />
                </View>
                <Text style={[s.cardLabel, { color: meta.color }]}>{meta.title.toUpperCase()}</Text>
                <View style={{ flex: 1 }} />
                {!editMode && route && (
                  <TouchableOpacity
                    onPress={() => router.push(route as any)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: meta.color + '12' }}
                  >
                    <Text style={{ fontSize: 10, color: meta.color, fontWeight: '700' }}>Open</Text>
                    <Ionicons name="chevron-forward" size={11} color={meta.color} />
                  </TouchableOpacity>
                )}
                {editMode && (
                  <View style={s.editRow}>
                    <TouchableOpacity style={s.orderBtn} onPress={() => moveWidget(idx, Math.max(0, idx - 1))} disabled={idx === 0}>
                      <Ionicons name="chevron-up" size={14} color={idx === 0 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.orderBtn} onPress={() => moveWidget(idx, Math.min(enabledWidgets.length - 1, idx + 1))} disabled={idx === enabledWidgets.length - 1}>
                      <Ionicons name="chevron-down" size={14} color={idx === enabledWidgets.length - 1 ? colors.border : colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleWidget(w.id)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Color accent line */}
              <View style={[s.accent, { backgroundColor: meta.color }]} />

              {/* Body — tappable to open feature */}
              <TouchableOpacity
                style={s.cardBody}
                onPress={() => route && !editMode ? router.push(route as any) : undefined}
                activeOpacity={route && !editMode ? 0.75 : 1}
              >
                {renderWidget(w.id, meta.color)}
              </TouchableOpacity>
            </Animated.View>
          )
        })}

        {enabledWidgets.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="grid-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>No Widgets</Text>
            <Text style={s.emptySub}>Customize your dashboard</Text>
            <TouchableOpacity style={[s.emptyBtn, { backgroundColor: '#D4AF37' }]} onPress={openPicker}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.emptyBtnText}>Add Widgets</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Widget Picker Modal ── */}
      <Modal visible={showPicker} transparent animationType="none">
        <Animated.View style={[s.backdrop, { opacity: pickerFade }]}>
          <TouchableWithoutFeedback onPress={closePicker}><View style={{ flex: 1 }} /></TouchableWithoutFeedback>
        </Animated.View>
        <Animated.View style={[s.sheet, { transform: [{ translateY: pickerSlide }] }]}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetTitle}>Customize Dashboard</Text>
              <Text style={s.sheetSub}>Toggle widgets on or off</Text>
            </View>
            <TouchableOpacity style={s.sheetClose} onPress={closePicker}>
              <Ionicons name="close" size={17} color={isDark ? '#000' : '#fff'} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {ALL_WIDGETS.map(meta => {
              const enabled = widgets.find(w => w.id === meta.id)?.enabled ?? false
              return (
                <TouchableOpacity
                  key={meta.id}
                  style={[s.pickerRow, enabled && { backgroundColor: meta.color + '12', borderColor: meta.color + '40' }]}
                  onPress={() => toggleWidget(meta.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.pickerIcon, { backgroundColor: meta.color + '22' }]}>
                    <Ionicons name={meta.iconName as any} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerItemTitle}>{meta.title}</Text>
                    <Text style={s.pickerItemSub}>{meta.subtitle}</Text>
                  </View>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const getStyles = (colors: any, isDark: boolean) => {
  const cardSystem = getCardSystem(colors, isDark)

  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    backgroundColor: colors.background,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  headerTitle: { fontSize: 28, fontFamily: 'MomoSignature', color: '#D4AF37', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: '600', letterSpacing: 0.2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  hBtn: {
    width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
    borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
  },

  // ── Edit Banner ──
  editBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : 'rgba(212,175,55,0.07)',
    paddingVertical: 9, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(212,175,55,0.22)',
  },
  editBannerText: { fontSize: 12, color: '#D4AF37', fontWeight: '700', letterSpacing: 0.2 },

  // ── Scroll ──
  scroll: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24, gap: 16 },

  // ── Card ──
  card: {
    ...cardSystem.surface,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8,
  },
  cardIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderBtn: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
  },

  // ── Accent Line ──
  accent: { height: 2, marginHorizontal: 18, borderRadius: 1, opacity: 0.5, marginBottom: 16 },

  // ── Card Body ──
  cardBody: { paddingHorizontal: 18, paddingBottom: 20 },

  // ── Empty State ──
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Modal ──
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '78%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 20, paddingBottom: 32,
    borderTopWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 24,
  },
  handle: {
    alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
    backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)',
    marginTop: 12, marginBottom: 18,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  sheetSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  sheetClose: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' },

  // ── Picker rows ──
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 18, marginBottom: 10,
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    borderWidth: 1, borderColor: colors.border,
  },
  pickerIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pickerItemTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  pickerItemSub: { fontSize: 12, color: colors.textSecondary },

  // ── Toggle ──
  toggle: {
    width: 48, height: 26, borderRadius: 13,
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 2, elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  })
}