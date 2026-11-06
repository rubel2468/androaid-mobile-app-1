import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/Colors';
import OrderCard from '../../components/OrderCard';
import ScalePressable from '../../components/ScalePressable';
import FadeInView from '../../components/FadeInView';
import { apiGet } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/Api';

const { width } = Dimensions.get('window');

interface DashboardData {
  kpi: {
    totalRevenue: number;
    totalSalesOrders: number;
    totalPurchasesCost: number;
    totalPurchasesCount: number;
    totalCustomers: number;
    totalProducts: number;
    totalEmployees: number;
    lowStockCount: number;
    totalStockValue?: number;
    totalStockRetailValue?: number;
    totalCustomerDue?: number;
    totalOperatingExpenses?: number;
    netProfit?: number;
  };
  chart: {
    labels: string[];
    datasets: { data: number[] }[];
  };
  recentSales: any[];
  recentPurchases: any[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(2); // Mid-week default
  const [activeTabFilter, setActiveTabFilter] = useState<'All' | 'Sales' | 'Stock'>('All');

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: DashboardData }>(API_ENDPOINTS.dashboard);
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const kpi = data?.kpi || {
    totalRevenue: 0,
    totalSalesOrders: 0,
    totalPurchasesCost: 0,
    totalPurchasesCount: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalEmployees: 0,
    lowStockCount: 0,
  };

  const chartData = data?.chart?.labels?.length
    ? {
        labels: data.chart.labels,
        datasets: [
          {
            data: data.chart.datasets[0]?.data?.length
              ? data.chart.datasets[0].data
              : [0, 0, 0, 0, 0, 0],
          },
        ],
      }
    : null;

  // Calendar dates matching Figma UI Kit ribbon
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const calendarDays = [-2, -1, 0, 1, 2].map((offset, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return {
      index: idx,
      dayNumber: d.getDate(),
      dayName: DAY_NAMES[d.getDay()] || 'Day',
      isToday: offset === 0,
    };
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header matching UI Kit */}
        <FadeInView duration={350} style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>
                  {(user?.name || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.greetingText}>Hello!</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || 'Livia Vaccaro'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/(tabs)/more')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={22} color="#1F1B2E" />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </FadeInView>

        {/* Signature Hero Purple Card */}
        <FadeInView delay={60} style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroTitle}>Your today's task{"\n"}almost done!</Text>
            <TouchableOpacity
              style={styles.heroPillBtn}
              onPress={() => router.push('/(tabs)/sales')}
              activeOpacity={0.9}
            >
              <Text style={styles.heroPillBtnText}>View Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroRight}>
            <View style={styles.heroProgressRingOuter}>
              <View style={styles.heroProgressRingInner}>
                <Text style={styles.heroProgressPercent}>85%</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* Section: In Progress (Pastel Cards Carousel) */}
        <FadeInView delay={120} style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithBadge}>
            <Text style={styles.sectionHeading}>In Progress</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>3</Text>
            </View>
          </View>
        </FadeInView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.inProgressScroll}
        >
          {/* Card 1: Mint Pastel */}
          <ScalePressable
            style={styles.inProgressCardWrapper}
            onPress={() => router.push('/(tabs)/sales')}
            delayEnter={150}
          >
            <View style={[styles.inProgressCard, { backgroundColor: '#E7F7F8', borderColor: '#D3F0F2' }]}>
              <View style={styles.cardTagPill}>
                <Text style={[styles.cardTagText, { color: '#0F766E' }]}>Sales & Orders</Text>
              </View>
              <Text style={styles.inProgressCardTitle}>Today's Invoices & Deliveries</Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '80%', backgroundColor: '#0D9488' }]} />
              </View>
              <View style={styles.inProgressCardFooter}>
                <View style={styles.footerIconPill}>
                  <Ionicons name="cart" size={13} color="#0F766E" />
                  <Text style={[styles.footerText, { color: '#0F766E' }]}>
                    {kpi.totalSalesOrders} Orders Active
                  </Text>
                </View>
                <Text style={styles.percentText}>80%</Text>
              </View>
            </View>
          </ScalePressable>

          {/* Card 2: Peach Pastel */}
          <ScalePressable
            style={styles.inProgressCardWrapper}
            onPress={() => router.push('/(tabs)/inventory')}
            delayEnter={200}
          >
            <View style={[styles.inProgressCard, { backgroundColor: '#FFF3EB', borderColor: '#FFE4D4' }]}>
              <View style={styles.cardTagPill}>
                <Text style={[styles.cardTagText, { color: '#C2410C' }]}>Warehouse Stock</Text>
              </View>
              <Text style={styles.inProgressCardTitle}>Low Stock & Inventory Reorder</Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '65%', backgroundColor: '#EA580C' }]} />
              </View>
              <View style={styles.inProgressCardFooter}>
                <View style={styles.footerIconPill}>
                  <Ionicons name="cube" size={13} color="#C2410C" />
                  <Text style={[styles.footerText, { color: '#C2410C' }]}>
                    {kpi.lowStockCount} Critical SKUs
                  </Text>
                </View>
                <Text style={styles.percentText}>65%</Text>
              </View>
            </View>
          </ScalePressable>

          {/* Card 3: Purple Pastel */}
          <ScalePressable
            style={styles.inProgressCardWrapper}
            onPress={() => router.push('/(tabs)/purchase')}
            delayEnter={250}
          >
            <View style={[styles.inProgressCard, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}>
              <View style={styles.cardTagPill}>
                <Text style={[styles.cardTagText, { color: '#6B21A8' }]}>Procurement & Cost</Text>
              </View>
              <Text style={styles.inProgressCardTitle}>Vendor PO & Supply Inflow</Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '90%', backgroundColor: '#7C3AED' }]} />
              </View>
              <View style={styles.inProgressCardFooter}>
                <View style={styles.footerIconPill}>
                  <Ionicons name="bag-handle" size={13} color="#6B21A8" />
                  <Text style={[styles.footerText, { color: '#6B21A8' }]}>
                    ৳{(kpi.totalPurchasesCost || 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.percentText}>90%</Text>
              </View>
            </View>
          </ScalePressable>
        </ScrollView>

        {/* Section: Task Groups (Operations Modules) */}
        <FadeInView delay={280} style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Task Groups</Text>
        </FadeInView>

        <View style={styles.taskGroupsList}>
          {/* Group 1: Office Project / Sales */}
          <ScalePressable
            style={styles.taskGroupCard}
            onPress={() => router.push('/(tabs)/sales')}
            delayEnter={300}
          >
            <View style={[styles.groupIconCircle, { backgroundColor: '#FFF3EB' }]}>
              <Ionicons name="briefcase" size={20} color="#EA580C" />
            </View>
            <View style={styles.groupInfoCol}>
              <Text style={styles.groupTitle}>Sales & Distribution</Text>
              <Text style={styles.groupSubtitle}>{kpi.totalSalesOrders} Orders / Invoices</Text>
            </View>
            <View style={[styles.groupPercentRing, { borderColor: '#EA580C' }]}>
              <Text style={[styles.groupPercentText, { color: '#EA580C' }]}>78%</Text>
            </View>
          </ScalePressable>

          {/* Group 2: Personal Project / Stock */}
          <ScalePressable
            style={styles.taskGroupCard}
            onPress={() => router.push('/(tabs)/inventory')}
            delayEnter={340}
          >
            <View style={[styles.groupIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="cube" size={20} color="#5F33E1" />
            </View>
            <View style={styles.groupInfoCol}>
              <Text style={styles.groupTitle}>Stock & Warehouse</Text>
              <Text style={styles.groupSubtitle}>৳{(kpi.totalStockValue || 0).toLocaleString()} Stock Value ({kpi.totalProducts} Items)</Text>
            </View>
            <View style={[styles.groupPercentRing, { borderColor: '#5F33E1' }]}>
              <Text style={[styles.groupPercentText, { color: '#5F33E1' }]}>92%</Text>
            </View>
          </ScalePressable>

          {/* Group 3: Daily Study / Finance */}
          <ScalePressable
            style={styles.taskGroupCard}
            onPress={() => router.push('/(tabs)/accounts')}
            delayEnter={380}
          >
            <View style={[styles.groupIconCircle, { backgroundColor: '#FFF9E6' }]}>
              <Ionicons name="wallet" size={20} color="#D97706" />
            </View>
            <View style={styles.groupInfoCol}>
              <Text style={styles.groupTitle}>Finance & Cashflow</Text>
              <Text style={styles.groupSubtitle}>৳{(kpi.netProfit || 0).toLocaleString()} Profit | Due: ৳{(kpi.totalCustomerDue || 0).toLocaleString()}</Text>
            </View>
            <View style={[styles.groupPercentRing, { borderColor: '#D97706' }]}>
              <Text style={[styles.groupPercentText, { color: '#D97706' }]}>64%</Text>
            </View>
          </ScalePressable>

          {/* Group 4: Human Resources */}
          <ScalePressable
            style={styles.taskGroupCard}
            onPress={() => router.push('/(tabs)/hr')}
            delayEnter={420}
          >
            <View style={[styles.groupIconCircle, { backgroundColor: '#E7F7F8' }]}>
              <Ionicons name="people" size={20} color="#0D9488" />
            </View>
            <View style={styles.groupInfoCol}>
              <Text style={styles.groupTitle}>HR & Employee Operations</Text>
              <Text style={styles.groupSubtitle}>{kpi.totalEmployees} Active Personnel</Text>
            </View>
            <View style={[styles.groupPercentRing, { borderColor: '#0D9488' }]}>
              <Text style={[styles.groupPercentText, { color: '#0D9488' }]}>85%</Text>
            </View>
          </ScalePressable>
        </View>

        {/* Date Selector Ribbon matching UI Kit "Today's Tasks" screen */}
        <FadeInView delay={450} style={styles.calendarSection}>
          <View style={styles.dateRibbonRow}>
            {calendarDays.map((d) => {
              const isSelected = selectedDayIndex === d.index;
              return (
                <TouchableOpacity
                  key={d.index}
                  style={[styles.datePill, isSelected && styles.datePillSelected]}
                  onPress={() => setSelectedDayIndex(d.index)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.dateDayText, isSelected && styles.dateDayTextSelected]}>
                    {d.dayName}
                  </Text>
                  <Text style={[styles.dateNumText, isSelected && styles.dateNumTextSelected]}>
                    {d.dayNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Horizontal Pill Filters */}
          <View style={styles.filterPillsRow}>
            {(['All', 'Sales', 'Stock'] as const).map((tab) => {
              const active = activeTabFilter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabFilterPill, active && styles.tabFilterPillActive]}
                  onPress={() => setActiveTabFilter(tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabFilterPillText, active && styles.tabFilterPillTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FadeInView>

        {/* Quick Actions Pastel Grid */}
        <View style={styles.quickActionsGrid}>
          <ScalePressable
            style={styles.actionCardWrapper}
            onPress={() => router.push('/(tabs)/sales')}
            delayEnter={480}
          >
            <View style={[styles.actionCard, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="cart" size={22} color="#5F33E1" />
              <Text style={styles.actionText}>New Sale</Text>
            </View>
          </ScalePressable>

          <ScalePressable
            style={styles.actionCardWrapper}
            onPress={() => router.push('/(tabs)/inventory')}
            delayEnter={500}
          >
            <View style={[styles.actionCard, { backgroundColor: '#E7F7F8' }]}>
              <Ionicons name="cube" size={22} color="#0D9488" />
              <Text style={styles.actionText}>Add Item</Text>
            </View>
          </ScalePressable>

          <ScalePressable
            style={styles.actionCardWrapper}
            onPress={() => router.push('/(tabs)/purchase')}
            delayEnter={520}
          >
            <View style={[styles.actionCard, { backgroundColor: '#FFF3EB' }]}>
              <Ionicons name="bag-handle" size={22} color="#EA580C" />
              <Text style={styles.actionText}>New PO</Text>
            </View>
          </ScalePressable>

          <ScalePressable
            style={styles.actionCardWrapper}
            onPress={() => router.push('/(tabs)/accounts')}
            delayEnter={540}
          >
            <View style={[styles.actionCard, { backgroundColor: '#FFF9E6' }]}>
              <Ionicons name="cash" size={22} color="#D97706" />
              <Text style={styles.actionText}>Expense</Text>
            </View>
          </ScalePressable>
        </View>

        {/* Revenue Analytics Chart */}
        {chartData && (
          <FadeInView delay={560} style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Revenue Trend</Text>
                <Text style={styles.chartSubtitle}>Last 6 Months Income Analytics</Text>
              </View>
              <View style={styles.chartBadge}>
                <Text style={styles.chartBadgeText}>৳{(kpi.totalRevenue ?? 0).toLocaleString()}</Text>
              </View>
            </View>

            <LineChart
              data={chartData}
              width={width - 56}
              height={190}
              chartConfig={{
                backgroundGradientFrom: '#FFFFFF',
                backgroundGradientTo: '#FFFFFF',
                color: (opacity = 1) => `rgba(95, 51, 225, ${opacity})`,
                labelColor: () => '#7A7689',
                strokeWidth: 3,
                decimalPlaces: 0,
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: Colors.primary,
                  fill: '#FFFFFF',
                },
                propsForBackgroundLines: {
                  strokeDasharray: '4',
                  stroke: '#F4F0FD',
                },
              }}
              bezier
              style={styles.chartStyle}
            />
          </FadeInView>
        )}

        {/* Recent Invoices List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Recent Orders</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/sales')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 24 }} />
        ) : data?.recentSales && data.recentSales.length > 0 ? (
          data.recentSales.slice(0, 4).map((order, idx) => (
            <FadeInView key={order._id} delay={580 + idx * 40}>
              <OrderCard
                orderNumber={order.orderNumber || 'ORD-000'}
                customerName={order.customer?.name || 'Walk-in Customer'}
                date={order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Today'}
                amount={`৳${(order.totalAmount ?? 0).toLocaleString()}`}
                status={order.status || 'pending'}
                itemCount={order.items?.length || 1}
                onPress={() => router.push('/(tabs)/sales')}
              />
            </FadeInView>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={32} color="#7A7689" />
            <Text style={styles.emptyText}>No recent orders recorded yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F8FD',
  },
  container: {
    padding: 18,
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3E8FF',
    borderWidth: 2,
    borderColor: '#5F33E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#5F33E1',
    fontSize: 20,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerTextCol: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 13,
    color: '#7A7689',
    fontWeight: '500',
  },
  userName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1F1B2E',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#5F33E1',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 7,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  heroPillBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    alignSelf: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  heroPillBtnText: {
    color: '#5F33E1',
    fontWeight: '800',
    fontSize: 13,
  },
  heroRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroProgressRingOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroProgressRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroProgressPercent: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F1B2E',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#F3E8FF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5F33E1',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5F33E1',
  },

  // In Progress Horizontal Cards
  inProgressScroll: {
    paddingBottom: 8,
    gap: 14,
    marginBottom: 20,
  },
  inProgressCardWrapper: {
    width: 228,
  },
  inProgressCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTagPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inProgressCardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#1F1B2E',
    marginBottom: 14,
    height: 40,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  inProgressCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F1B2E',
  },

  // Task Groups
  taskGroupsList: {
    gap: 12,
    marginBottom: 24,
  },
  taskGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  groupIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupInfoCol: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1B2E',
    letterSpacing: -0.2,
  },
  groupSubtitle: {
    fontSize: 12,
    color: '#7A7689',
    marginTop: 2,
    fontWeight: '500',
  },
  groupPercentRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  groupPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Calendar Section
  calendarSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dateRibbonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  datePill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 54,
    backgroundColor: '#F9F8FD',
  },
  datePillSelected: {
    backgroundColor: '#5F33E1',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateDayText: {
    fontSize: 11,
    color: '#7A7689',
    fontWeight: '600',
    marginBottom: 4,
  },
  dateDayTextSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dateNumText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F1B2E',
  },
  dateNumTextSelected: {
    color: '#FFFFFF',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabFilterPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
  },
  tabFilterPillActive: {
    backgroundColor: '#5F33E1',
  },
  tabFilterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5F33E1',
  },
  tabFilterPillTextActive: {
    color: '#FFFFFF',
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  actionCardWrapper: {
    flex: 1,
  },
  actionCard: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1F1B2E',
  },

  // Chart Card
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1B2E',
    letterSpacing: -0.3,
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#7A7689',
    marginTop: 1,
  },
  chartBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  chartBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5F33E1',
  },
  chartStyle: {
    borderRadius: 14,
    marginRight: 0,
    paddingRight: 16,
  },

  // Empty State
  emptyContainer: {
    padding: 28,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#7A7689',
    fontWeight: '500',
  },
});
