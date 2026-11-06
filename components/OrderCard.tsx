import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import StatusBadge from './StatusBadge';

interface OrderCardProps {
  orderNumber: string;
  customerName: any;
  date: string;
  amount: string;
  status: string;
  itemCount?: number;
  discount?: number;
  onPress?: () => void;
  onConfirm?: () => void;
}

export default function OrderCard({
  orderNumber,
  customerName,
  date,
  amount,
  status,
  itemCount,
  discount,
  onPress,
  onConfirm,
}: OrderCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  const customerDisplay =
    typeof customerName === 'object' && customerName !== null
      ? (customerName as any).name || 'Walk-in Customer'
      : String(customerName || 'Walk-in Customer');

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.left}>
          <View style={styles.orderIconBox}>
            <Ionicons name="receipt" size={19} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.center}>
          <Text style={styles.orderNum}>{orderNumber}</Text>
          <Text style={styles.customer} numberOfLines={1}>
            {customerDisplay}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={Colors.textLight} />
            <Text style={styles.metaText}>{date}</Text>
            {itemCount !== undefined && (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{itemCount} item{itemCount > 1 ? 's' : ''}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.amount}>{amount}</Text>
          {discount !== undefined && discount > 0 && (
            <View style={styles.discountBadge}>
              <Ionicons name="pricetag" size={9} color="#059669" />
              <Text style={styles.discountBadgeText}>2% OFF</Text>
            </View>
          )}
          <StatusBadge status={status} small />
          {status === 'pending' && onConfirm && (
            <TouchableOpacity
              style={styles.quickConfirmBtn}
              onPress={(e) => {
                onConfirm();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={12} color="#FFF" style={{ marginRight: 3 }} />
              <Text style={styles.quickConfirmText}>Confirm</Text>
            </TouchableOpacity>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color={Colors.textLight} style={styles.chevron} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EBE7F7',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  left: {
    marginRight: 14,
  },
  orderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    paddingRight: 8,
  },
  orderNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1B2E',
    letterSpacing: -0.2,
  },
  customer: {
    fontSize: 12.5,
    color: '#7A7689',
    fontWeight: '500',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#A5A2B8',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 10,
    color: '#A5A2B8',
  },
  right: {
    alignItems: 'flex-end',
    marginRight: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1B2E',
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  chevron: {
    marginLeft: 2,
  },
  quickConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5F33E1',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  quickConfirmText: {
    color: '#FFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  discountBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
});
