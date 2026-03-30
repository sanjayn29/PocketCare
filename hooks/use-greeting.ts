import { useMemo } from 'react'

interface GreetingData {
  emoji: string
  message: string
  motivational: string
  timeOfDay: string
}

export const useGreeting = (userName: string): GreetingData => {
  return useMemo(() => {
    const hour = new Date().getHours()

    if (hour >= 5 && hour < 12) {
      return {
        emoji: '🌅',
        message: `Good morning, ${userName}`,
        motivational: "Let's start a productive day",
        timeOfDay: 'morning',
      }
    } else if (hour >= 12 && hour < 17) {
      return {
        emoji: '☀️',
        message: `Good afternoon, ${userName}`,
        motivational: 'Keep the momentum going',
        timeOfDay: 'afternoon',
      }
    } else if (hour >= 17 && hour < 21) {
      return {
        emoji: '🌙',
        message: `Good evening, ${userName}`,
        motivational: 'Time to wrap up strong',
        timeOfDay: 'evening',
      }
    } else {
      return {
        emoji: '✨',
        message: `Good night, ${userName}`,
        motivational: "Reflect on today's progress",
        timeOfDay: 'night',
      }
    }
  }, [userName])
}
