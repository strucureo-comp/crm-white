import { ref, push, set, get, update, remove, onValue, off } from 'firebase/database';
import { database as db } from '@/lib/firebase/config';

export interface ScheduledEvent {
  id: string | number;
  date: string | number;
  title: string;
  channel: string;
  time: string;
  type?: string;
  author: string;
  company?: string;
  client?: string;
  badgeChannel?: string;
  badgeStatus?: string;
  status?: string;
  color?: string;
}

const getCalendarRef = (companyId: string) => ref(db, `marketing_calendars/${companyId}`);
const getCalendarItemRef = (companyId: string, eventId: string | number) => ref(db, `marketing_calendars/${companyId}/${eventId}`);

export const subscribeToCalendar = (companyId: string, callback: (events: ScheduledEvent[]) => void) => {
  const eventsRef = getCalendarRef(companyId);
  onValue(eventsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const items = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      callback(items as ScheduledEvent[]);
    } else {
      callback([]);
    }
  });

  return () => off(eventsRef);
};

export const createCalendarEvent = async (companyId: string, event: Omit<ScheduledEvent, 'id'>) => {
  const eventsRef = getCalendarRef(companyId);
  const newEventRef = push(eventsRef);
  await set(newEventRef, event);
  return newEventRef.key;
};

export const updateCalendarEvent = async (companyId: string, eventId: string | number, updates: Partial<ScheduledEvent>) => {
  const eventRef = getCalendarItemRef(companyId, eventId);
  await update(eventRef, updates);
};

export const deleteCalendarEvent = async (companyId: string, eventId: string | number) => {
  const eventRef = getCalendarItemRef(companyId, eventId);
  await remove(eventRef);
};
