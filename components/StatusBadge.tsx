import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

type StatusType =
  | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  | 'active' | 'inactive' | 'paid' | 'unpaid' | 'partial'
  | 'approved' | 'rejected' | 'low' | 'medium' | 'good';

const STATUS_MAP: Record<StatusType, { bg: string; border: string; color: string; label: string }> = {
  pending:   { bg: '#FFF3EB', border: '#FFE4D6', color: '#FF7A59', label: 'Pending' },
  confirmed: { bg: '#F3E8FF', border: '#E9D5FF', color: '#5F33E1', label: 'Confirmed' },
  shipped:   { bg: '#E7F7F8', border: '#CCF0F3', color: '#00A8B8', label: 'Shipped' },
  delivered: { bg: '#E6F9F3', border: '#C6F6E6', color: '#059669', label: 'Delivered' },
  cancelled: { bg: '#FEE2E2', border: '#FECACA', color: '#EF4444', label: 'Cancelled' },
  active:    { bg: '#E6F9F3', border: '#C6F6E6', color: '#059669', label: 'Active' },
  inactive:  { bg: '#F3F0FA', border: '#EBE7F7', color: '#7A7689', label: 'Inactive' },
  paid:      { bg: '#E6F9F3', border: '#C6F6E6', color: '#059669', label: 'Paid' },
  unpaid:    { bg: '#FEE2E2', border: '#FECACA', color: '#EF4444', label: 'Unpaid' },
  partial:   { bg: '#FFF3EB', border: '#FFE4D6', color: '#FF7A59', label: 'Partial' },
  approved:  { bg: '#E6F9F3', border: '#C6F6E6', color: '#059669', label: 'Approved' },
  rejected:  { bg: '#FEE2E2', border: '#FECACA', color: '#EF4444', label: 'Rejected' },
  low:       { bg: '#FEE2E2', border: '#FECACA', color: '#EF4444', label: 'Low Stock' },
  medium:    { bg: '#FFF9E6', border: '#FEF08A', color: '#D97706', label: 'Medium' },
  good:      { bg: '#E6F9F3', border: '#C6F6E6', color: '#059669', label: 'Good' },
};

interface StatusBadgeProps {
  status: string;
  small?: boolean;
}

export default function StatusBadge({ status, small }: StatusBadgeProps) {
  const key = status ? (status.toLowerCase() as StatusType) : 'pending';
  const config = STATUS_MAP[key] ?? {
    bg: Colors.surfaceVariant,
    border: Colors.border,
    color: Colors.textSecondary,
    label: status || 'Unknown',
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        small && styles.small,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }, small && styles.smallDot]} />
      <Text style={[styles.text, { color: config.color }, small && styles.smallText]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  smallDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  smallText: {
    fontSize: 9.5,
  },
});
