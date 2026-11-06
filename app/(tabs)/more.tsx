import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import FadeInView from '../../components/FadeInView';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of ERP Manager?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to sign out' });
          }
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'AD';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <Text style={styles.screenTitle}>Settings & More</Text>

        {/* User Profile Card */}
        <FadeInView delay={50} style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Admin User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'admin@company.com'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{(user?.role || 'admin').toUpperCase()} ACCOUNT</Text>
            </View>
          </View>
        </FadeInView>

        {/* Integration Badges */}
        <Text style={styles.sectionHeading}>System Status</Text>
        <FadeInView delay={120} style={styles.integrationCard}>
          <View style={styles.integrationRow}>
            <View style={styles.integrationLeft}>
              <Ionicons name="server-outline" size={20} color={Colors.primary} />
              <Text style={styles.integrationName}>Database (MongoDB Atlas)</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.statusTagText, { color: Colors.success }]}>Online</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.integrationRow}>
            <View style={styles.integrationLeft}>
              <Ionicons name="card-outline" size={20} color={Colors.primary} />
              <Text style={styles.integrationName}>Payment (SSLCommerz)</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: '#E3F2FD' }]}>
              <Text style={[styles.statusTagText, { color: Colors.primary }]}>Active</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.integrationRow}>
            <View style={styles.integrationLeft}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} />
              <Text style={styles.integrationName}>Email (Gmail Nodemailer)</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.statusTagText, { color: Colors.success }]}>Configured</Text>
            </View>
          </View>
        </FadeInView>

        {/* ERP Modules & Management */}
        <Text style={styles.sectionHeading}>Master Data & Configuration</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Toast.show({ type: 'info', text1: 'Customer Directory', text2: 'Manage customer accounts & credit limit' })}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="people-outline" size={22} color={Colors.primary} />
              <Text style={styles.menuTitle}>Customers Management</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Toast.show({ type: 'info', text1: 'Supplier Directory', text2: 'Manage registered vendor accounts' })}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="business-outline" size={22} color={Colors.primary} />
              <Text style={styles.menuTitle}>Suppliers Directory</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Toast.show({ type: 'info', text1: 'Category Tree', text2: 'Hierarchical product classifications' })}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="pricetags-outline" size={22} color={Colors.primary} />
              <Text style={styles.menuTitle}>Product Categories</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Preferences & Security */}
        <Text style={styles.sectionHeading}>Security & Preferences</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Toast.show({ type: 'info', text1: 'Security', text2: 'Update your account password' })}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
              <Text style={styles.menuTitle}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Toast.show({ type: 'info', text1: 'ERP System', text2: 'v1.0.0 Enterprise Build' })}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
              <Text style={styles.menuTitle}>About ERP Suite</Text>
            </View>
            <Text style={styles.versionText}>v1.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Enterprise ERP Mobile Solution © 2024</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  integrationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  integrationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  integrationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  integrationName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  versionText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 20,
  },
});
