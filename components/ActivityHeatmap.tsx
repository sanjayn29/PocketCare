
import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface ActivityHeatmapProps {
  activityDates: Set<string>; // Set of dates in YYYY-MM-DD format
  onDayPress?: (date: string) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_SIZE = 12;
const CELL_GAP = 2;

export default function ActivityHeatmap({ activityDates, onDayPress }: ActivityHeatmapProps) {
  // Generate the grid layout (7 rows for days, 53 columns for weeks)
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const weeks: (string | null)[][] = Array.from({ length: 7 }, () => []);
    const monthLabels: { week: number; month: string }[] = [];

    // Generate last 365 days and organize into weeks
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      weeks[dayOfWeek].push(dateStr);

      // Track month changes for labels
      if (dayOfWeek === 0 && i > 0) {
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        monthLabels.push({
          week: Math.floor((364 - i) / 7),
          month: monthName,
        });
      }
    }

    return { weeks, monthLabels };
  }, []);

  // Render a single day cell
  const renderDayCell = (date: string | null) => {
    if (!date) {
      return (
        <View
          key={`empty-${Math.random()}`}
          style={[styles.cell, { backgroundColor: 'transparent' }]}
        />
      );
    }

    const isActive = activityDates.has(date);
    const backgroundColor = isActive ? '#1DB854' : '#0F1419';

    const handlePress = () => {
      if (onDayPress) {
        onDayPress(date);
      }
    };

    return (
      <TouchableOpacity
        key={date}
        style={[
          styles.cell,
          {
            backgroundColor,
            borderRadius: 2,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <Text style={styles.subtitle}>365 days</Text>
      </View>

      {/* Heatmap with day labels */}
      <View style={styles.heatmapWrapper}>
        {/* Day labels column */}
        <View style={styles.dayLabelsContainer}>
          {DAYS_OF_WEEK.map((day) => (
            <Text key={day} style={styles.dayLabel}>
              {day.charAt(0)}
            </Text>
          ))}
        </View>

        {/* Scrollable heatmap grid */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollViewContainer}
        >
          <View style={styles.grid}>
            {weeks[0].map((_: string | null, weekIndex: number) => (
              <View key={weekIndex} style={styles.week}>
                {DAYS_OF_WEEK.map((_: string, dayIndex: number) => {
                  const date = weeks[dayIndex][weekIndex] || null;
                  return renderDayCell(date);
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={[styles.legendCell, { backgroundColor: '#0F1419' }]} />
        <View style={[styles.legendCell, { backgroundColor: '#1DB854' }]} />
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0a0e27',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1a1f3a',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#7a8099',
  },
  heatmapWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dayLabelsContainer: {
    width: CELL_SIZE + 4,
    paddingRight: 8,
    justifyContent: 'center',
  },
  dayLabel: {
    fontSize: 10,
    color: '#4a6fa5',
    height: CELL_SIZE + CELL_GAP,
    lineHeight: CELL_SIZE,
    textAlign: 'center',
    fontWeight: '500',
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingRight: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  week: {
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1f3a',
  },
  legendText: {
    fontSize: 10,
    color: '#7a8099',
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
