import { getFinanceData } from './finance-service'
import { getGoals } from './goals-service'
import { getHealthData } from './health-service'
import { getNotes } from './notes-service'
import { getPlacements } from './placement-service'
import { getScheduleEvents } from './schedule-service'
import { getSkills } from './skills-service'
import { getTasks } from './tasks-service'

export type UserDataExport = {
  exportDate: string
  exportedBy: string
  finance?: any
  goals?: any
  health?: any
  notes?: any
  placement?: any
  schedule?: any
  skills?: any
  tasks?: any
}

/**
 * Downloads all user data from various services and creates a JSON file
 */
export async function downloadAllUserData(email: string): Promise<UserDataExport | null> {
  try {
    const now = new Date().toISOString()
    
    console.log('📋 Fetching comprehensive data for user:', email)
    
    // Fetch all data in parallel
    const [financeData, goalsData, healthData, notesData, placementData, scheduleData, skillsData, tasksData] = await Promise.all([
      getFinanceData(email).catch(err => {
        console.error('Error fetching finance data:', err)
        return null
      }),
      getGoals(email).catch(err => {
        console.error('Error fetching goals data:', err)
        return null
      }),
      getHealthData(email).catch(err => {
        console.error('Error fetching health data:', err)
        return null
      }),
      getNotes(email).catch(err => {
        console.error('Error fetching notes data:', err)
        return null
      }),
      getPlacements(email).catch(err => {
        console.error('Error fetching placement data:', err)
        return null
      }),
      getScheduleEvents(email).catch(err => {
        console.error('Error fetching schedule data:', err)
        return null
      }),
      getSkills(email).catch(err => {
        console.error('Error fetching skills data:', err)
        return null
      }),
      getTasks(email).catch(err => {
        console.error('Error fetching tasks data:', err)
        return null
      }),
    ])

    console.log('✅ Finance data:', financeData)
    console.log('✅ Goals data:', goalsData)
    console.log('✅ Health data:', healthData)
    console.log('✅ Notes data:', notesData)
    console.log('✅ Placement data:', placementData)
    console.log('✅ Schedule data:', scheduleData)
    console.log('✅ Skills data:', skillsData)
    console.log('✅ Tasks data:', tasksData)

    const exportData: UserDataExport = {
      exportDate: now,
      exportedBy: email,
      finance: financeData,
      goals: goalsData,
      health: healthData,
      notes: notesData,
      placement: placementData,
      schedule: scheduleData,
      skills: skillsData,
      tasks: tasksData,
    }

    console.log('📦 Final export data:', JSON.stringify(exportData, null, 2))
    return exportData
  } catch (error) {
    console.error('Error downloading user data:', error)
    return null
  }
}

/**
 * Converts export data to JSON string
 */
export function exportToJSON(data: UserDataExport): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Creates a downloadable file from the export data
 */
export async function createDownloadFile(
  data: UserDataExport,
  fileName: string = `pocketcare-data-${new Date().toISOString().split('T')[0]}.json`
): Promise<string> {
  try {
    const jsonString = exportToJSON(data)
    
    // For Expo/React Native, we typically use file system APIs
    // This function returns the JSON string that can be shared
    return jsonString
  } catch (error) {
    console.error('Error creating download file:', error)
    throw error
  }
}
