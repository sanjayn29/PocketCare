
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

    // Fetch streak data - visits subcollection
    try {
      const visitsSnapshot = await getDocs(
        collection(db, 'users', email, 'visits')
      )
      const visitCount = visitsSnapshot.docs.length
      const visitDates = visitsSnapshot.docs.map(d => d.id).sort().join(', ')
      contextParts.push(`📅 APP VISITS (${visitCount} days):\nVisit dates: ${visitDates || 'No visits yet'}\n`)
      console.log(`✓ Visits found: ${visitCount}`)
    } catch (e) {
      console.error('Error fetching visits:', e)
      contextParts.push(`📅 APP VISITS: No data available\n`)
    }

    // Fetch tasks - full document content
    try {
      const tasksSnapshot = await getDocs(collection(db, 'Tasks'))
      const userTasksDoc = tasksSnapshot.docs.find(d => d.id === email)
      
      if (userTasksDoc && userTasksDoc.exists()) {
        const tasksData = userTasksDoc.data()
        const tasksContent = JSON.stringify(tasksData, null, 2)
        contextParts.push(`📋 TASKS:\n${tasksContent}\n`)
        console.log(`✓ Tasks document found with ${Object.keys(tasksData).length} items`)
      } else {
        contextParts.push(`📋 TASKS: No tasks\n`)
      }
    } catch (e) {
      console.error('Error fetching tasks:', e)
      contextParts.push(`📋 TASKS: Error fetching\n`)
    }

    // Fetch notes - full document content
    try {
      const notesSnapshot = await getDocs(collection(db, 'Notes'))
      const userNotesDoc = notesSnapshot.docs.find(d => d.id === email)
      
      if (userNotesDoc && userNotesDoc.exists()) {
        const notesData = userNotesDoc.data()
        const notesContent = JSON.stringify(notesData, null, 2)
        contextParts.push(`📝 NOTES:\n${notesContent}\n`)
        console.log(`✓ Notes found`)
      } else {
        contextParts.push(`📝 NOTES: No notes\n`)
      }
    } catch (e) {
      console.error('Error fetching notes:', e)
      contextParts.push(`📝 NOTES: Error fetching\n`)
    }

    // Fetch goals - full document content
    try {
      const goalsSnapshot = await getDocs(collection(db, 'Goals'))
      const userGoalsDoc = goalsSnapshot.docs.find(d => d.id === email)
      
      if (userGoalsDoc && userGoalsDoc.exists()) {
        const goalsData = userGoalsDoc.data()
        const goalsContent = JSON.stringify(goalsData, null, 2)
        contextParts.push(`🎯 GOALS:\n${goalsContent}\n`)
        console.log(`✓ Goals found`)
      } else {
        contextParts.push(`🎯 GOALS: No goals\n`)
      }
    } catch (e) {
      console.error('Error fetching goals:', e)
      contextParts.push(`🎯 GOALS: Error fetching\n`)
    }

    // Fetch health data - full document content
    try {
      const healthSnapshot = await getDocs(collection(db, 'health'))
      const userHealthDoc = healthSnapshot.docs.find(d => d.id === email)
      
      if (userHealthDoc && userHealthDoc.exists()) {
        const healthData = userHealthDoc.data()
        const healthContent = JSON.stringify(healthData, null, 2)
        contextParts.push(`❤️ HEALTH:\n${healthContent}\n`)
        console.log(`✓ Health found`)
      } else {
        contextParts.push(`❤️ HEALTH: No health data\n`)
      }
    } catch (e) {
      console.error('Error fetching health:', e)
      contextParts.push(`❤️ HEALTH: Error fetching\n`)
    }

    // Fetch schedule data - full document content
    try {
      const scheduleSnapshot = await getDocs(collection(db, 'schedules'))
      const userScheduleDoc = scheduleSnapshot.docs.find(d => d.id === email)
      
      if (userScheduleDoc && userScheduleDoc.exists()) {
        const scheduleData = userScheduleDoc.data()
        const scheduleContent = JSON.stringify(scheduleData, null, 2)
        contextParts.push(`📅 SCHEDULE:\n${scheduleContent}\n`)
        console.log(`✓ Schedule found`)
      } else {
        contextParts.push(`📅 SCHEDULE: No scheduled events\n`)
      }
    } catch (e) {
      console.error('Error fetching schedule:', e)
      contextParts.push(`📅 SCHEDULE: Error fetching\n`)
    }

    // Fetch finance data - full document content
    try {
      const financeSnapshot = await getDocs(collection(db, 'finance'))
      const userFinanceDoc = financeSnapshot.docs.find(d => d.id === email)
      
      if (userFinanceDoc && userFinanceDoc.exists()) {
        const financeData = userFinanceDoc.data()
        const financeContent = JSON.stringify(financeData, null, 2)
        contextParts.push(`💰 FINANCE:\n${financeContent}\n`)
        console.log(`✓ Finance found`)
      } else {
        contextParts.push(`💰 FINANCE: No finance data\n`)
      }
    } catch (e) {
      console.error('Error fetching finance:', e)
      contextParts.push(`💰 FINANCE: Error fetching\n`)
    }

    // Fetch skills data - full document content
    try {
      const skillsSnapshot = await getDocs(collection(db, 'Skills'))
      const userSkillsDoc = skillsSnapshot.docs.find(d => d.id === email)
      
      if (userSkillsDoc && userSkillsDoc.exists()) {
        const skillsData = userSkillsDoc.data()
        const skillsContent = JSON.stringify(skillsData, null, 2)
        contextParts.push(`🎓 SKILLS:\n${skillsContent}\n`)
        console.log(`✓ Skills found`)
      } else {
        contextParts.push(`🎓 SKILLS: No skills\n`)
      }
    } catch (e) {
      console.error('Error fetching skills:', e)
      contextParts.push(`🎓 SKILLS: Error fetching\n`)
    }

    // Fetch placements data - full document content
    try {
      const placementsSnapshot = await getDocs(collection(db, 'Placements'))
      const userPlacementsDoc = placementsSnapshot.docs.find(d => d.id === email)
      
      if (userPlacementsDoc && userPlacementsDoc.exists()) {
        const placementsData = userPlacementsDoc.data()
        const placementsContent = JSON.stringify(placementsData, null, 2)
        contextParts.push(`💼 PLACEMENTS:\n${placementsContent}\n`)
        console.log(`✓ Placements found`)
      } else {
        contextParts.push(`💼 PLACEMENTS: No placements\n`)
      }
    } catch (e) {
      console.error('Error fetching placements:', e)
      contextParts.push(`💼 PLACEMENTS: Error fetching\n`)
    }

    // Fetch games data - full document content
    try {
      const gamesSnapshot = await getDocs(collection(db, 'games'))
      const userGamesDoc = gamesSnapshot.docs.find(d => d.id === email)
      
      if (userGamesDoc && userGamesDoc.exists()) {
        const gamesData = userGamesDoc.data()
        const gamesContent = JSON.stringify(gamesData, null, 2)
        contextParts.push(`🎮 GAMES:\n${gamesContent}\n`)
        console.log(`✓ Games found`)
      } else {
        contextParts.push(`🎮 GAMES: No game data\n`)
      }
    } catch (e) {
      console.error('Error fetching games:', e)
      contextParts.push(`🎮 GAMES: Error fetching\n`)
    }

    // Fetch calculator history - full document content
    try {
      const calcSnapshot = await getDocs(collection(db, 'calculator'))
      const userCalcDoc = calcSnapshot.docs.find(d => d.id === email)
      
      if (userCalcDoc && userCalcDoc.exists()) {
        const calcData = userCalcDoc.data()
        const calcContent = JSON.stringify(calcData, null, 2)
        contextParts.push(`🧮 CALCULATOR:\n${calcContent}\n`)
        console.log(`✓ Calculator found`)
      } else {
        contextParts.push(`🧮 CALCULATOR: No calculation history\n`)
      }
    } catch (e) {
      console.error('Error fetching calculator:', e)
      contextParts.push(`🧮 CALCULATOR: Error fetching\n`)
    }

    const finalContext = contextParts.join('')
    console.log('📊 Final comprehensive context ready for AI')
    return finalContext
  } catch (error) {
    console.error('Error fetching user context:', error)
    return 'Unable to fetch user data - please try again'
  }
}

/**
 * Gets AI response from Groq using llama-3.3-70b-versatile model
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
        content: `You are an advanced personal productivity AI assistant for the PocketCare app for user: ${email}
        
USER'S COMPLETE PROFILE:
${userContext}

Your responsibilities:
1. Analyze ALL available user data to provide intelligent, personalized advice
2. Help prioritize tasks, goals, and health objectives
3. Identify patterns in user's activities and suggest improvements
4. Connect different areas (tasks, goals, health, schedule, finance, skills)
5. Provide motivation and track progress across all domains
6. Answer questions about productivity using their complete profile

APPROACH:
- Always reference their specific data
- Give concrete, actionable steps
- Consider their entire workload when making suggestions
- Be encouraging, supportive, and practical
- Use emojis for better readability
- Provide insights no other AI can by using their complete PocketCare profile
- Be detailed and thorough - give comprehensive advice`,
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
        model: 'llama-3.3-70b-versatile',
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
        model: 'llama-3.3-70b-versatile',
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
