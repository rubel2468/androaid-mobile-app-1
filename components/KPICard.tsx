import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface KPICardProps {
  label: string;
  value: string;
  icon: string;
  iconColor?: string;
  iconBg?: string;
  trend?: number; // positive = up, negative = down
  onPress?: () => void;
}

export default function KPICard({
  label,
  value,
  icon,
  iconColor = Colors.primary,
  iconBg = Colors.surfaceVariant,
  trend,
  onPress,
}: KPICardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const trendUp = trend !== undefined && trend >= 0;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          {trend !== undefined && (
            <View
              style={[
                styles.trendBadge,
                { backgroundColor: trendUp ? '#D1FAE5' : '#FEE2E2' },
              ]}
            >
              <Ionicons
                name={trendUp ? 'arrow-up' : 'arrow-down'}
                size={10}
                color={trendUp ? '#047857' : '#B91C1C'}
              />
              <Text style={[styles.trendText, { color: trendUp ? '#047857' : '#B91C1C' }]}>
                {Math.abs(trend)}%
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    marginHorizontal: 4,
    minWidth: 105,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBE7F7',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1F1B2E',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: '#7A7689',
    fontWeight: '600',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 14,
    gap: 2,
  },
  trendText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
