import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface ProductCardProps {
  name: string;
  sku: string;
  price: string;
  costPrice?: string;
  stock: number;
  minStock?: number;
  category?: string | { _id?: string; name?: string; title?: string };
  onEdit?: () => void;
  onDelete?: () => void;
  onAdjustStock?: () => void;
  onPress?: () => void;
}

function getStockStatus(stock: number, minStock: number = 10): 'low' | 'medium' | 'good' {
  if (stock <= minStock) return 'low';
  if (stock <= minStock * 2) return 'medium';
  return 'good';
}

const STOCK_CONFIG = {
  low: { color: '#EF4444', bg: '#FEE2E2', border: '#FECACA' },
  medium: { color: '#F59E0B', bg: '#FEF3C7', border: '#FDE68A' },
  good: { color: '#10B981', bg: '#D1FAE5', border: '#A7F3D0' },
};

export default function ProductCard({
  name,
  sku,
  price,
  costPrice,
  stock,
  minStock,
  category,
  onEdit,
  onDelete,
  onAdjustStock,
  onPress,
}: ProductCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const stockStatus = getStockStatus(stock, minStock);
  const cfg = STOCK_CONFIG[stockStatus];

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

  const categoryName =
    typeof category === 'object' && category !== null
      ? (category as any).name || (category as any).title || ''
      : category
      ? String(category)
      : '';

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.imagePlaceholder}>
          <Ionicons name="cube" size={24} color={Colors.primary} />
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.subRow}>
            <Text style={styles.sku}>SKU: {sku}</Text>
            {categoryName ? (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.category} numberOfLines={1}>
                  {categoryName}
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.bottomRow}>
            <View>
              <Text style={styles.price}>{price}</Text>
              {costPrice ? <Text style={styles.costPriceText}>Cost: {costPrice}</Text> : null}
            </View>
            <View style={[styles.stockBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <View style={[styles.stockDot, { backgroundColor: cfg.color }]} />
              <Text style={[styles.stockText, { color: cfg.color }]}>
                {stock} in stock
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {onAdjustStock && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}
              onPress={onAdjustStock}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-vertical" size={15} color="#5F33E1" />
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity style={styles.actionBtn} onPress={onEdit} activeOpacity={0.7}>
              <Ionicons name="pencil" size={15} color={Colors.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete} activeOpacity={0.7}>
              <Ionicons name="trash" size={15} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2.5,
  },
  imagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    paddingRight: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  sku: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
  },
  dot: {
    fontSize: 10,
    color: Colors.textLight,
  },
  category: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  costPriceText: {
    fontSize: 11,
    color: '#7A7689',
    fontWeight: '500',
    marginTop: 1,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7.5,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  stockText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  actions: {
    gap: 6,
    marginLeft: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
  },
});
