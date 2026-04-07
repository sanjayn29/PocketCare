import { firebaseApp } from '@/firebaseConfig';
import { doc, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';

const db = getFirestore(firebaseApp);

export interface ScheduleEvent {
  id: string;
  title: string;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  reminder: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getScheduleEvents(userEmail: string): Promise<ScheduleEvent[]> {
  try {
    const userDocRef = doc(db, 'schedules', userEmail);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return [];
    }
    
    const events = userDoc.data()?.events || [];
    return events;
  } catch (error) {
    console.error('Error fetching schedule events:', error);
    throw error;
  }
}

function isPastDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(`${dateStr}T00:00:00`);
  eventDate.setHours(0, 0, 0, 0);
  return eventDate.getTime() < today.getTime();
}

export async function autoCompletePastScheduleEvents(userEmail: string): Promise<ScheduleEvent[]> {
  try {
    const userDocRef = doc(db, 'schedules', userEmail);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return [];
    }

    const events: ScheduleEvent[] = userDoc.data()?.events || [];
    let hasChanges = false;
    const now = new Date().toISOString();

    const normalizedEvents = events.map((event) => {
      if (event.status === 'Upcoming' && isPastDate(event.date)) {
        hasChanges = true;
        return {
          ...event,
          status: 'Completed' as const,
          updatedAt: now,
        };
      }
      return event;
    });

    if (hasChanges) {
      await updateDoc(userDocRef, { events: normalizedEvents });
    }

    return normalizedEvents;
  } catch (error) {
    console.error('Error auto-completing past schedule events:', error);
    throw error;
  }
}

export async function addScheduleEvent(
  userEmail: string,
  title: string,
  purpose: string,
  date: string,
  startTime: string,
  endTime: string,
  location: string,
  priority: 'High' | 'Medium' | 'Low',
  status: 'Upcoming' | 'Completed' | 'Cancelled',
  reminder: boolean
): Promise<string> {
  try {
    const now = new Date().toISOString();
    const eventId = `event_${Date.now()}`;
    const newEvent: ScheduleEvent = {
      id: eventId,
      title,
      purpose,
      date,
      startTime,
      endTime,
      location,
      priority,
      status,
      reminder,
      createdAt: now,
      updatedAt: now,
    };

    const userDocRef = doc(db, 'schedules', userEmail);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create new user document with events array
      await setDoc(userDocRef, { events: [newEvent] });
    } else {
      // Add to existing events array
      const existingEvents = userDoc.data()?.events || [];
      await updateDoc(userDocRef, {
        events: [...existingEvents, newEvent],
      });
    }

    return eventId;
  } catch (error) {
    console.error('Error adding schedule event:', error);
    throw error;
  }
}

export async function updateScheduleEvent(
  userEmail: string,
  eventId: string,
  title: string,
  purpose: string,
  date: string,
  startTime: string,
  endTime: string,
  location: string,
  priority: 'High' | 'Medium' | 'Low',
  status: 'Upcoming' | 'Completed' | 'Cancelled',
  reminder: boolean
): Promise<void> {
  try {
    const userDocRef = doc(db, 'schedules', userEmail);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('User schedule document not found');
    }

    const events = userDoc.data()?.events || [];
    const updatedEvents = events.map((event: ScheduleEvent) =>
      event.id === eventId
        ? {
            ...event,
            title,
            purpose,
            date,
            startTime,
            endTime,
            location,
            priority,
            status,
            reminder,
            updatedAt: new Date().toISOString(),
          }
        : event
    );

    await updateDoc(userDocRef, { events: updatedEvents });
  } catch (error) {
    console.error('Error updating schedule event:', error);
    throw error;
  }
}

export async function deleteScheduleEvent(userEmail: string, eventId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'schedules', userEmail);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error('User schedule document not found');
    }

    const events = userDoc.data()?.events || [];
    const filteredEvents = events.filter((event: ScheduleEvent) => event.id !== eventId);

    await updateDoc(userDocRef, { events: filteredEvents });
  } catch (error) {
    console.error('Error deleting schedule event:', error);
    throw error;
  }
}
