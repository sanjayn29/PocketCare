
import { db } from '@/firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'

const GROQ_API_KEY = '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'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * Fetches user's complete document data from Firebase for context
 */
const getUserContext = async (email: string): Promise<string> => {
  try {
    const contextParts: string[] = []
    console.log(`📋 Fetching comprehensive data for user: ${email}`)

    // Fetch tasks - concise summary
    try {
      const tasksSnapshot = await getDocs(collection(db, 'Tasks'))
      const userTasksDoc = tasksSnapshot.docs.find(d => d.id === email)
      
      if (userTasksDoc && userTasksDoc.exists()) {
        const tasksData = userTasksDoc.data()
        // Extract only pending tasks to save tokens
        const pendingTasks = Object.values(tasksData)
          .filter((t: any) => t.status !== 'completed')
          .slice(0, 5)
          .map((t: any) => `${t.title} (${t.priority})`)
        contextParts.push(`📋 TOP TASKS: ${pendingTasks.join(', ') || 'No pending tasks'}\n`)
      }
    } catch (e) {
      console.error('Error fetching tasks:', e)
    }

    // Fetch goals - titles only
    try {
      const goalsSnapshot = await getDocs(collection(db, 'Goals'))
      const userGoalsDoc = goalsSnapshot.docs.find(d => d.id === email)
      
      if (userGoalsDoc && userGoalsDoc.exists()) {
        const goalsData = userGoalsDoc.data()
        const activeGoals = Object.values(goalsData)
          .slice(0, 3)
          .map((g: any) => g.title)
        contextParts.push(`🎯 GOALS: ${activeGoals.join(', ') || 'No active goals'}\n`)
      }
    } catch (e) {
      console.error('Error fetching goals:', e)
    }

    // Fetch health - basic stats
    try {
      const healthSnapshot = await getDocs(collection(db, 'health'))
      const userHealthDoc = healthSnapshot.docs.find(d => d.id === email)
      
      if (userHealthDoc && userHealthDoc.exists()) {
        const healthData = userHealthDoc.data()
        contextParts.push(`❤️ HEALTH: Water: ${healthData.waterIntake || 0}ml, Sleep: ${healthData.sleepHours || 0}h\n`)
      }
    } catch (e) {
      console.error('Error fetching health:', e)
    }

    const finalContext = contextParts.join('')
    return finalContext
  } catch (error) {
    console.error('Error fetching user context:', error)
    return 'User profile info not available.'
  }
}

/**
 * Gets AI response from Groq using llama-3.1-8b-instant model
 */
export const getAIResponse = async (
  userMessage: string,
  email: string | undefined,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> => {
  if (!email) {
    return 'Please log in to use the AI assistant.'
  }

  try {
    // Fetch user context
    const userContext = await getUserContext(email)

    // Build conversations with system prompt
    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: `You are a helpful personal assistant for user: ${email}. Profile summary: ${userContext}. Be concise and friendly.`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage,
      },
    ]

    console.log('Sending to Groq with context:', userContext)

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Groq API Error:', error)
      return 'Sorry, I encountered an error. Please try again.'
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || 'No response generated'
    console.log('AI Response received:', aiResponse)
    return aiResponse
  } catch (error) {
    console.error('Error getting AI response:', error)
    return 'Sorry, I encountered an error. Please try again.'
  }
}

/**
 * Gets a quick tip or insight about the user's productivity
 */
export const getProductivityInsight = async (
  email: string | undefined
): Promise<string> => {
  if (!email) return ''

  try {
    const userContext = await getUserContext(email)

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are an advanced productivity coach analyzing complete user data for ${email}. Provide ONE specific, highly personalized, actionable tip.
            
RULES:
- Maximum 1-2 sentences
- Be specific to their complete data
- Use an emoji
- Be encouraging and insightful
- Reference their actual activities when possible`,
          },
          {
            role: 'user',
            content: `My current productivity data:\n${userContext}\n\nGive me ONE actionable tip right now.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    })

    if (!response.ok) {
      console.error('Groq Insight Error:', await response.json())
      return '💡 Keep going! Every task completed gets you closer to your goals.'
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Error getting productivity insight:', error)
    return '💡 Stay focused and prioritize your top 3 tasks for today!'
  }
}
