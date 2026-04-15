
import { db } from '@/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

const GROQ_API_KEY = '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'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * Fetches ALL user data from every Firestore collection using CORRECT paths.
 * Each service uses a single doc keyed by email with a sub-array inside.
 */
const getUserContext = async (email: string): Promise<string> => {
  const parts: string[] = []

  // ── Tasks → collection: 'Tasks', doc: email, field: tasks[] ─────────────
  try {
    const snap = await getDoc(doc(db, 'Tasks', email))
    if (snap.exists()) {
      const tasks: any[] = snap.data().tasks || []
      const pending = tasks
        .filter(t => t.status !== 'completed')
        .slice(0, 8)
        .map(t => `${t.title}(${t.priority},due:${t.due_date || 'none'})`)
      const done = tasks.filter(t => t.status === 'completed').length
      parts.push(`TASKS: pending=${pending.length}[${pending.join(', ')}] completed=${done}`)
    }
  } catch {}

  // ── Goals → collection: 'Goals', doc: email, field: goals[] ─────────────
  try {
    const snap = await getDoc(doc(db, 'Goals', email))
    if (snap.exists()) {
      const goals: any[] = snap.data().goals || []
      const active = goals
        .filter(g => g.status === 'active')
        .slice(0, 5)
        .map(g => `${g.title}(${g.current_value}/${g.target_value} ${g.unit}, ${g.category})`)
      const achieved = goals.filter(g => g.status === 'achieved').length
      parts.push(`GOALS: active=${active.length}[${active.join(', ')}] achieved=${achieved}`)
    }
  } catch {}

  // ── Finance → collection: 'finance', doc: email ──────────────────────────
  try {
    const snap = await getDoc(doc(db, 'finance', email))
    if (snap.exists()) {
      const data = snap.data()
      const txs: any[] = data.transactions || []
      const debts: any[] = data.debts || []
      const fGoals: any[] = data.goals || []

      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const balance = income - expense
      const recentTxs = txs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)
        .map(t => `${t.type}:₹${t.amount}(${t.category})`)

      const unpaid = debts.filter(d => !d.given_back)
        .slice(0, 3)
        .map(d => `${d.to_whom}:₹${d.amount}`)

      const savingsGoals = fGoals
        .slice(0, 3)
        .map(g => `${g.title}:₹${g.current_amount}/₹${g.target_amount}`)

      parts.push(`FINANCE: income=₹${income.toFixed(0)}, expense=₹${expense.toFixed(0)}, balance=₹${balance.toFixed(0)}`)
      parts.push(`RECENT_TXS: ${recentTxs.join(', ') || 'none'}`)
      if (unpaid.length) parts.push(`DEBTS_UNPAID: ${unpaid.join(', ')}`)
      if (savingsGoals.length) parts.push(`SAVING_GOALS: ${savingsGoals.join(', ')}`)
    }
  } catch {}

  // ── Health → collection: 'health', doc: email ────────────────────────────
  try {
    const snap = await getDoc(doc(db, 'health', email))
    if (snap.exists()) {
      const h = snap.data()
      parts.push(`HEALTH: water=${h.waterIntake ?? 0}ml, sleep=${h.sleepHours ?? 0}h, steps=${h.steps ?? 0}, calories=${h.calories ?? 0}`)
    }
  } catch {}

  // ── Notes → collection: 'Notes', doc: email, field: notes[] ─────────────
  try {
    const snap = await getDoc(doc(db, 'Notes', email))
    if (snap.exists()) {
      const notes: any[] = snap.data().notes || []
      const titles = notes.slice(0, 5).map(n => n.title).filter(Boolean)
      if (titles.length) parts.push(`NOTES(${notes.length} total): ${titles.join(', ')}`)
    }
  } catch {}

  // ── Schedule → collection: 'schedules', doc: email, field: events[] ──────
  try {
    const snap = await getDoc(doc(db, 'schedules', email))
    if (snap.exists()) {
      const events: any[] = snap.data().events || []
      const todayStr = (() => {
        const n = new Date()
        return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`
      })()
      const upcoming = events
        .filter(e => e.date >= todayStr && e.status === 'Upcoming')
        .slice(0, 5)
        .map(e => `${e.title}(${e.date} ${e.startTime}, ${e.priority})`)
      if (upcoming.length) parts.push(`SCHEDULE_UPCOMING: ${upcoming.join(', ')}`)
    }
  } catch {}

  // ── Placement → collection: 'Placements', doc: email, field: placements[] ─
  try {
    const snap = await getDoc(doc(db, 'Placements', email))
    if (snap.exists()) {
      const placements: any[] = snap.data().placements || []
      const list = placements
        .slice(0, 6)
        .map(p => {
          const rounds = (p.rounds || []).length
          const cleared = (p.rounds || []).filter((r: any) => r.result === 'success').length
          return `${p.company_name}(status:${p.status},company:${p.company_status || 'N/A'},rounds:${cleared}/${rounds})`
        })
      const offers = placements.filter(p => p.status === 'offer').length
      const rejected = placements.filter(p => p.status === 'rejected').length
      parts.push(`PLACEMENTS(${placements.length} total, ${offers} offers, ${rejected} rejected): ${list.join(', ')}`)
    }
  } catch {}

  // ── Skills → collection: 'Skills', doc: email, field: skills[] ──────────
  try {
    const snap = await getDoc(doc(db, 'Skills', email))
    if (snap.exists()) {
      const skills: any[] = snap.data().skills || []
      const list = skills
        .slice(0, 6)
        .map(s => {
          const done = (s.progress || []).filter((t: any) => t.completed).length
          const total = (s.progress || []).length
          return `${s.name}(${s.level},${done}/${total} tasks)`
        })
      if (list.length) parts.push(`SKILLS: ${list.join(', ')}`)
    }
  } catch {}

  return parts.length ? parts.join('\n') : 'No data available yet.'
}

/**
 * Gets AI response — short, data-accurate, concise replies only.
 */
export const getAIResponse = async (
  userMessage: string,
  email: string | undefined,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> => {
  if (!email) return 'Please log in to use the AI assistant.'

  try {
    const userContext = await getUserContext(email)

    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: `You are PocketCare AI, a personal assistant for ${email}.

USER REAL-TIME DATA:
${userContext}

STRICT RULES:
- ONLY use the data provided above. Never guess or make up numbers.
- Keep EVERY reply SHORT: max 2-3 sentences.
- Be direct and friendly. No long paragraphs.
- Quote exact values when answering data questions (e.g. balance, task count).
- Use at most 1 emoji per reply.
- If data field is missing, say "I don't see that data yet."`,
      },
      ...conversationHistory.slice(-10),
      { role: 'user', content: userMessage },
    ]

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.3,
        max_tokens: 150,
      }),
    })

    if (!response.ok) {
      console.error('Groq Error:', await response.json())
      return 'Something went wrong. Please try again.'
    }

    const data = await response.json()
    return data.choices[0]?.message?.content?.trim() || 'No response.'
  } catch (error) {
    console.error('AI error:', error)
    return 'Sorry, I encountered an error. Please try again.'
  }
}
