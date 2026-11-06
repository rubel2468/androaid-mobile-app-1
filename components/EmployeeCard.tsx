import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface EmployeeCardProps {
  name: string;
  designation: string;
  department: string;
  email: string;
  phone?: string;
  salary?: number;
  isActive?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
}

export default function EmployeeCard({
  name,
  designation,
  department,
  email,
  phone,
  salary,
  isActive = true,
  onPress,
  onEdit,
}: EmployeeCardProps) {
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

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || 'EM'}</Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? Colors.success : Colors.textLight },
            ]}
          />
        </View>

        <View style={styles.details}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {salary !== undefined && salary !== null && (
              <Text style={styles.salaryText}>৳{(salary ?? 0).toLocaleString()}</Text>
            )}
          </View>

          <Text style={styles.designation} numberOfLines={1}>
            {designation}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.deptBadge}>
              <Text style={styles.deptText}>{department || 'General'}</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.contactText} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>
        </View>

        {onEdit && (
          <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={17} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 5,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2.5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
    flex: 1,
    paddingRight: 6,
  },
  salaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.2,
  },
  designation: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  deptBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deptText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  contactText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  editBtn: {
    padding: 6,
    marginLeft: 4,
  },
});
