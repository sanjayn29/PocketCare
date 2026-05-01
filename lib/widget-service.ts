import AsyncStorage from '@react-native-async-storage/async-storage';

export type WidgetId =
  | 'greeting'
  | 'streak'
  | 'finance_summary'
  | 'tasks_today'
  | 'goals_progress'
  | 'next_event'
  | 'fitness_today'
  | 'placement_status'
  | 'notes_quick'
  | 'ai_tip'
  | 'game_scores';

export interface WidgetConfig {
  id: WidgetId;
  enabled: boolean;
  order: number;
}

export const ALL_WIDGETS: { id: WidgetId; title: string; subtitle: string; iconName: string; color: string }[] = [
  { id: 'greeting',         title: 'Greeting',        subtitle: 'Personalized welcome',     iconName: 'sunny',               color: '#D4AF37' },
  { id: 'streak',           title: 'Streak',           subtitle: 'Daily visit streak',        iconName: 'flame',               color: '#F97316' },
  { id: 'finance_summary',  title: 'Finance',          subtitle: 'Income vs Expense',         iconName: 'wallet',              color: '#22C55E' },
  { id: 'tasks_today',      title: 'Tasks Today',      subtitle: 'Pending tasks due today',   iconName: 'checkmark-circle',    color: '#3B82F6' },
  { id: 'goals_progress',   title: 'Goals',            subtitle: 'Active goal progress',      iconName: 'trophy',              color: '#8B5CF6' },
  { id: 'next_event',       title: 'Next Event',       subtitle: 'Upcoming schedule item',    iconName: 'calendar',            color: '#EC4899' },
  { id: 'fitness_today',    title: 'Fitness',          subtitle: "Today's fitness plan",      iconName: 'barbell',             color: '#14B8A6' },
  { id: 'placement_status', title: 'Placement',        subtitle: 'Latest placement status',   iconName: 'business',            color: '#84CC16' },
  { id: 'notes_quick',      title: 'Recent Note',      subtitle: 'Latest quick note',         iconName: 'document-text',       color: '#F43F5E' },
  { id: 'ai_tip',           title: 'AI Tips',          subtitle: 'Daily AI-powered insight',  iconName: 'sparkles',            color: '#06B6D4' },
  { id: 'game_scores',      title: 'Game Scores',      subtitle: 'Best scores from all games', iconName: 'game-controller',     color: '#D4AF37' },
];

const STORAGE_KEY = 'pocketcare_widget_config';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'greeting',         enabled: true,  order: 0 },
  { id: 'streak',           enabled: true,  order: 1 },
  { id: 'finance_summary',  enabled: true,  order: 2 },
  { id: 'tasks_today',      enabled: true,  order: 3 },
  { id: 'goals_progress',   enabled: true,  order: 4 },
  { id: 'next_event',       enabled: true,  order: 5 },
  { id: 'fitness_today',    enabled: true,  order: 6 },
  { id: 'placement_status', enabled: false, order: 7 },
  { id: 'notes_quick',      enabled: true,  order: 8 },
  { id: 'ai_tip',           enabled: true,  order: 9 },
  { id: 'game_scores',      enabled: true,  order: 10 },
];

export async function getWidgetConfig(): Promise<WidgetConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    const saved: WidgetConfig[] = JSON.parse(raw);
    // Merge: add any new widget IDs not in saved config
    const savedIds = new Set(saved.map(w => w.id));
    const missing = DEFAULT_WIDGETS.filter(w => !savedIds.has(w.id));
    return [...saved, ...missing];
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export async function saveWidgetConfig(config: WidgetConfig[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save widget config', e);
  }
}
