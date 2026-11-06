import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/Colors';
import FormInput from '../../components/FormInput';
import EmptyState from '../../components/EmptyState';
import FadeInView from '../../components/FadeInView';
import CustomerLedgerModal from '../../components/CustomerLedgerModal';
import ReportExportModal from '../../components/ReportExportModal';
import { apiGet, apiPost } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/Api';

interface Customer {
  _id: string;
  customerId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  customerType?: 'cash' | 'credit';
  creditLimit?: number;
  balance?: number;
}

interface TransactionItem {
  _id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  reference?: string;
  date: string;
}

interface FinancialReportData {
  summary: {
    totalRevenue: number;
    paidRevenue: number;
    totalPurchases: number;
    grossProfit: number;
    totalOperatingExpenses: number;
    netProfit: number;
    totalStockCost: number;
    totalStockRetail: number;
    totalReceivables: number;
    creditCustomersCount: number;
  };
  expenseCategories: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
}

interface DailySummaryData {
  date: string;
  dailySalesTotal: number;
  dailyOrdersCount: number;
  dailySalesCashCollected: number;
  dailyDueSales: number;
  dailyPreviousDuesCollected: number;
  totalCashCollectedToday: number;
  totalBankDepositedToday: number;
  netCashInHandToday: number;
  allTimeRemainingCash: number;
  cumulativeBankDeposited: number;
  dayOrders: Array<{
    _id: string;
    orderNumber: string;
    customer?: { customerId?: string; name: string; phone: string };
    totalAmount: number;
    paidAmount: number;
    paymentStatus: string;
    createdAt: string;
  }>;
  dayDueCollections: Array<{
    _id: string;
    amount: number;
    description: string;
    reference: string;
    date: string;
    customer?: { customerId?: string; name: string };
  }>;
  dayBankDeposits: Array<{
    _id: string;
    amount: number;
    bankName?: string;
    accountNumber?: string;
    depositSlip?: string;
    description: string;
    reference: string;
    date: string;
    createdBy?: { name: string };
  }>;
}

const POPULAR_BANKS = [
  'Dutch-Bangla Bank',
  'BRAC Bank',
  'Islami Bank',
  'City Bank',
  'bKash / Nagad',
  'Eastern Bank',
  'Sonali Bank',
];

const EXPENSE_CATEGORIES = [
  'Office Rent',
  'Utilities & Bills',
  'Employee Salaries',
  'Purchases & Supplies',
  'Marketing & Ads',
  'Repair & Maintenance',
  'Office Supplies',
  'Logistics & Courier',
  'Damaged Goods / Loss',
  'Other Expense',
];

const INCOME_CATEGORIES = [
  'Sales Revenue',
  'Customer Due Payment',
  'Service Income',
  'Investment / Loan',
  'Other Income',
];

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'bKash / Nagad', 'Card'];

export default function AccountsScreen() {
  const [activeTab, setActiveTab] = useState<'daily' | 'customer_ledger' | 'ledger' | 'reports'>('daily');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [report, setReport] = useState<FinancialReportData | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummaryData | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Bank Deposit State
  const [bankDepositModalVisible, setBankDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositBank, setDepositBank] = useState('Dutch-Bangla Bank');
  const [depositAccount, setDepositAccount] = useState('');
  const [depositSlip, setDepositSlip] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [dailyHistoryTab, setDailyHistoryTab] = useState<'deposits' | 'sales' | 'dues'>('deposits');

  // Customer ID Wise Ledger State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [custFilter, setCustFilter] = useState<'all' | 'due' | 'credit'>('all');
  const [selectedLedgerCustomerId, setSelectedLedgerCustomerId] = useState<string | null>(null);
  const [ledgerModalVisible, setLedgerModalVisible] = useState(false);

  // All Reports Export State
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // Form State
  const [transType, setTransType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Office Rent');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAccountsData = useCallback(async () => {
    try {
      const [transRes, repRes, custRes, dailyRes] = await Promise.all([
        apiGet<{ success: boolean; data: TransactionItem[] }>(
          filterType === 'all'
            ? `${API_ENDPOINTS.accounts}/transactions`
            : `${API_ENDPOINTS.accounts}/transactions?type=${filterType}`
        ),
        apiGet<{ success: boolean; data: FinancialReportData }>(
          API_ENDPOINTS.financialReport
        ).catch(() => null),
        apiGet<{ success: boolean; data: Customer[] }>(
          API_ENDPOINTS.customers
        ).catch(() => null),
        apiGet<{ success: boolean; data: DailySummaryData }>(
          `${API_ENDPOINTS.dailySummary}?date=${selectedDate}`
        ).catch(() => null),
      ]);

      if (transRes && transRes.data) {
        setTransactions(transRes.data);
      }
      if (repRes && repRes.data) {
        setReport(repRes.data);
      }
      if (custRes && custRes.data) {
        setCustomers(custRes.data);
      }
      if (dailyRes && dailyRes.data) {
        setDailySummary(dailyRes.data);
      }
    } catch (err: any) {
      console.warn('Accounts load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterType, selectedDate]);

  useEffect(() => {
    fetchAccountsData();
  }, [fetchAccountsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAccountsData();
  };

  const openAddModal = (type: 'income' | 'expense') => {
    setTransType(type);
    setCategory(type === 'expense' ? 'Office Rent' : 'Sales Revenue');
    setPaymentMethod('Cash');
    setAmount('');
    setDescription('');
    setReference(`REF-${Date.now().toString(36).toUpperCase()}`);
    setModalVisible(true);
  };

  const handleAddTransaction = async () => {
    const numAmount = Number(amount);
    if (!category.trim() || isNaN(numAmount) || numAmount <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid amount greater than 0.' });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost(`${API_ENDPOINTS.accounts}/transaction`, {
        type: transType,
        category: category.trim(),
        amount: numAmount,
        description: `${description ? `${description} ` : ''}(Paid via ${paymentMethod})`.trim(),
        reference: (reference || '').trim(),
        date: new Date(),
      });

      Toast.show({ type: 'success', text1: 'Success', text2: 'Transaction recorded successfully.' });
      setModalVisible(false);
      fetchAccountsData();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to save transaction.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordBankDeposit = async () => {
    const numAmt = Number(depositAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid deposit amount.' });
      return;
    }
    if (!depositBank.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select or enter bank name.' });
      return;
    }

    setSubmittingDeposit(true);
    try {
      await apiPost(API_ENDPOINTS.bankDeposit, {
        amount: numAmt,
        bankName: depositBank.trim(),
        accountNumber: depositAccount.trim() || undefined,
        depositSlip: depositSlip.trim() || undefined,
        notes: depositNotes.trim() || undefined,
        date: selectedDate,
      });

      Toast.show({
        type: 'success',
        text1: 'Bank Deposit Recorded',
        text2: `৳${numAmt.toLocaleString()} deposited to ${depositBank}. Cash collection reduced!`,
      });

      setBankDepositModalVisible(false);
      setDepositAmount('');
      setDepositAccount('');
      setDepositSlip('');
      setDepositNotes('');
      fetchAccountsData();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Deposit Failed', text2: err.message || 'Could not record bank deposit.' });
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const summary = report?.summary || {
    totalRevenue: 0,
    paidRevenue: 0,
    totalPurchases: 0,
    grossProfit: 0,
    totalOperatingExpenses: 0,
    netProfit: 0,
    totalStockCost: 0,
    totalStockRetail: 0,
    totalReceivables: 0,
    creditCustomersCount: 0,
  };

  const filteredCustomers = customers.filter((c) => {
    if (custFilter === 'due' && (c.balance || 0) <= 0) return false;
    if (custFilter === 'credit' && c.customerType !== 'credit') return false;
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      return (
        (c.customerId && c.customerId.toLowerCase().includes(q)) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Finance & Accounts</Text>
          <Text style={styles.subtitle}>Ledger, Expenses & Financial Reports</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.reportsHeaderBtn}
            onPress={() => setReportModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text" size={16} color="#5F33E1" />
            <Text style={styles.reportsHeaderBtnText}>Reports</Text>
          </TouchableOpacity>

          {activeTab === 'daily' ? (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: '#2563EB' }]}
              onPress={() => {
                setDepositAmount(String(dailySummary?.netCashInHandToday || ''));
                setBankDepositModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="business-outline" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>+ Deposit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => openAddModal('expense')}
              activeOpacity={0.85}
            >
              <Ionicons name="remove-circle-outline" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>Expense</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'daily' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('daily')}
          >
            <Ionicons name="wallet-outline" size={15} color={activeTab === 'daily' ? '#5F33E1' : '#7A7689'} />
            <Text style={[styles.tabSwitchText, activeTab === 'daily' && styles.tabSwitchTextActive]}>
              Daily Cash & Bank
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'customer_ledger' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('customer_ledger')}
          >
            <Ionicons name="book-outline" size={15} color={activeTab === 'customer_ledger' ? '#5F33E1' : '#7A7689'} />
            <Text style={[styles.tabSwitchText, activeTab === 'customer_ledger' && styles.tabSwitchTextActive]}>
              Customer Ledger (খতিয়ান)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'ledger' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('ledger')}
          >
            <Ionicons name="receipt-outline" size={15} color={activeTab === 'ledger' ? '#5F33E1' : '#7A7689'} />
            <Text style={[styles.tabSwitchText, activeTab === 'ledger' && styles.tabSwitchTextActive]}>
              General Expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabSwitchBtn, activeTab === 'reports' && styles.tabSwitchBtnActive]}
            onPress={() => setActiveTab('reports')}
          >
            <Ionicons name="bar-chart-outline" size={15} color={activeTab === 'reports' ? '#5F33E1' : '#7A7689'} />
            <Text style={[styles.tabSwitchText, activeTab === 'reports' && styles.tabSwitchTextActive]}>
              Reports
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {activeTab === 'daily' ? (
          /* ── Daily Sales vs. Cash Collection & Bank Deposit View ── */
          <View style={styles.dailyContainer}>
            {/* Date Navigator Header */}
            <View style={styles.dateNavRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar" size={18} color="#5F33E1" />
                <Text style={styles.dateNavTitle}>Date: {selectedDate}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={styles.dateNavBtn}
                  onPress={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                >
                  <Ionicons name="chevron-back" size={15} color="#475569" />
                  <Text style={styles.dateNavBtnText}>Prev</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateNavBtn, { backgroundColor: '#5F33E1' }]}
                  onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                >
                  <Text style={[styles.dateNavBtnText, { color: '#FFF' }]}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateNavBtn}
                  onPress={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                >
                  <Text style={styles.dateNavBtnText}>Next</Text>
                  <Ionicons name="chevron-forward" size={15} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Hero Net Cash In Hand Card (ক্যাশ ড্রয়ারে অবশিষ্ট টাকা) */}
            <FadeInView delay={50} style={styles.cashHeroCard}>
              <View style={styles.cashHeroTop}>
                <View style={styles.cashHeroBadge}>
                  <Ionicons name="wallet" size={14} color="#059669" />
                  <Text style={styles.cashHeroBadgeText}>Net Cash in Hand (হাতে নগদ টাকা)</Text>
                </View>
                <Text style={styles.cashHeroDate}>{selectedDate}</Text>
              </View>

              <Text style={styles.cashHeroAmount}>
                ৳{(dailySummary?.netCashInHandToday ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.cashHeroFormula}>
                মোট কালেকশন ৳{(dailySummary?.totalCashCollectedToday ?? 0).toLocaleString()} - ব্যাংক জমা ৳{(dailySummary?.totalBankDepositedToday ?? 0).toLocaleString()}
              </Text>

              {/* Action: Bank Deposit Button */}
              <TouchableOpacity
                style={styles.bankDepositActionBtn}
                onPress={() => {
                  setDepositAmount(String(dailySummary?.netCashInHandToday || ''));
                  setBankDepositModalVisible(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="business" size={16} color="#FFF" />
                <Text style={styles.bankDepositActionBtnText}>
                  + Bank Deposit Entry (ব্যাংকে জমা করুন)
                </Text>
              </TouchableOpacity>
            </FadeInView>

            {/* Daily Inflow Breakdown (আজকে যা সেলস হয় তার মধ্যে কত টাকা কালেকশন হয়) */}
            <View style={styles.dailyBreakdownCard}>
              <Text style={styles.sectionHeading}>
                Sales vs. Cash Collection (সেলস বনাম নগদ কালেকশন)
              </Text>

              <View style={styles.breakdownRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.breakdownLabel}>Today's Total Sales (দিনের মোট বিক্রি)</Text>
                  <Text style={[styles.breakdownVal, { color: '#1E293B' }]}>
                    ৳{(dailySummary?.dailySalesTotal ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.breakdownSub}>{dailySummary?.dailyOrdersCount ?? 0} invoices created</Text>
                </View>

                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.breakdownLabel}>Sales Paid Cash (বিক্রি থেকে নগদ)</Text>
                  <Text style={[styles.breakdownVal, { color: '#059669' }]}>
                    ৳{(dailySummary?.dailySalesCashCollected ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.breakdownSub}>Collected at checkout</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.breakdownLabel}>Due Sales (আজকের বাকি বিক্রি)</Text>
                  <Text style={[styles.breakdownVal, { color: '#DC2626' }]}>
                    ৳{(dailySummary?.dailyDueSales ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.breakdownSub}>Added to customer dues</Text>
                </View>

                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.breakdownLabel}>Previous Dues (পূর্বের বকেয়া আদায়)</Text>
                  <Text style={[styles.breakdownVal, { color: '#059669' }]}>
                    +৳{(dailySummary?.dailyPreviousDuesCollected ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.breakdownSub}>Received from ledger dues</Text>
                </View>
              </View>

              <View style={[styles.highlightRow, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <View>
                  <Text style={[styles.highlightLabel, { color: '#166534' }]}>Total Cash Inflow (দিনের মোট নগদ কালেকশন)</Text>
                  <Text style={styles.highlightSub}>আজকের সেলস ক্যাশ + পূর্বের বকেয়া জমা</Text>
                </View>
                <Text style={[styles.highlightVal, { color: '#166534' }]}>
                  ৳{(dailySummary?.totalCashCollectedToday ?? 0).toLocaleString()}
                </Text>
              </View>

              <View style={[styles.highlightRow, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', marginTop: 8 }]}>
                <View>
                  <Text style={[styles.highlightLabel, { color: '#1E40AF' }]}>Deposited to Bank (ব্যাংকে জমা দেওয়া হয়েছে)</Text>
                  <Text style={styles.highlightSub}>টোটাল কালেকশন থেকে বিয়োগকৃত</Text>
                </View>
                <Text style={[styles.highlightVal, { color: '#1E40AF' }]}>
                  -৳{(dailySummary?.totalBankDepositedToday ?? 0).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Daily History Sub-Tabs */}
            <View style={styles.dailySubTabsRow}>
              <TouchableOpacity
                style={[styles.dailySubTab, dailyHistoryTab === 'deposits' && styles.dailySubTabActive]}
                onPress={() => setDailyHistoryTab('deposits')}
              >
                <Text style={[styles.dailySubTabText, dailyHistoryTab === 'deposits' && styles.dailySubTabTextActive]}>
                  Bank Deposits ({dailySummary?.dayBankDeposits?.length ?? 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dailySubTab, dailyHistoryTab === 'sales' && styles.dailySubTabActive]}
                onPress={() => setDailyHistoryTab('sales')}
              >
                <Text style={[styles.dailySubTabText, dailyHistoryTab === 'sales' && styles.dailySubTabTextActive]}>
                  Today's Invoices ({dailySummary?.dayOrders?.length ?? 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dailySubTab, dailyHistoryTab === 'dues' && styles.dailySubTabActive]}
                onPress={() => setDailyHistoryTab('dues')}
              >
                <Text style={[styles.dailySubTabText, dailyHistoryTab === 'dues' && styles.dailySubTabTextActive]}>
                  Dues Collected ({dailySummary?.dayDueCollections?.length ?? 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Daily Sub-Tab Contents */}
            {dailyHistoryTab === 'deposits' && (
              <View style={styles.subTabList}>
                {(!dailySummary?.dayBankDeposits || dailySummary.dayBankDeposits.length === 0) ? (
                  <View style={styles.emptyDailyBox}>
                    <Ionicons name="business-outline" size={36} color="#94A3B8" />
                    <Text style={styles.emptyDailyTitle}>No Bank Deposits Today</Text>
                    <Text style={styles.emptyDailySub}>Tap '+ Bank Deposit Entry' to deposit cash into bank.</Text>
                  </View>
                ) : (
                  dailySummary.dayBankDeposits.map((dep) => (
                    <View key={dep._id} style={styles.dailyItemCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="business" size={16} color="#2563EB" />
                          <Text style={styles.depBankName}>{dep.bankName || 'Bank Deposit'}</Text>
                        </View>
                        <Text style={styles.depAmount}>-৳{(dep.amount ?? 0).toLocaleString()}</Text>
                      </View>
                      <Text style={styles.depDesc}>{dep.description}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={styles.depSlip}>Slip: {dep.depositSlip || dep.reference || 'N/A'}</Text>
                        <Text style={styles.depTime}>{new Date(dep.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {dailyHistoryTab === 'sales' && (
              <View style={styles.subTabList}>
                {(!dailySummary?.dayOrders || dailySummary.dayOrders.length === 0) ? (
                  <View style={styles.emptyDailyBox}>
                    <Ionicons name="cart-outline" size={36} color="#94A3B8" />
                    <Text style={styles.emptyDailyTitle}>No Sales Orders Today</Text>
                  </View>
                ) : (
                  dailySummary.dayOrders.map((ord) => (
                    <View key={ord._id} style={styles.dailyItemCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.depBankName}>{ord.orderNumber}</Text>
                        <Text style={[styles.depAmount, { color: '#0F172A' }]}>৳{(ord.totalAmount ?? 0).toLocaleString()}</Text>
                      </View>
                      <Text style={styles.depDesc}>
                        Customer: {ord.customer?.name || 'Walk-in'} {ord.customer?.customerId ? `(${ord.customer.customerId})` : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>
                          Cash Paid: ৳{(ord.paidAmount ?? 0).toLocaleString()}
                        </Text>
                        {(ord.totalAmount - ord.paidAmount) > 0 && (
                          <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: '800' }}>
                            Due: ৳{(ord.totalAmount - ord.paidAmount).toLocaleString()}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {dailyHistoryTab === 'dues' && (
              <View style={styles.subTabList}>
                {(!dailySummary?.dayDueCollections || dailySummary.dayDueCollections.length === 0) ? (
                  <View style={styles.emptyDailyBox}>
                    <Ionicons name="receipt-outline" size={36} color="#94A3B8" />
                    <Text style={styles.emptyDailyTitle}>No Due Collections Today</Text>
                  </View>
                ) : (
                  dailySummary.dayDueCollections.map((col) => (
                    <View key={col._id} style={styles.dailyItemCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.depBankName}>{col.reference || 'DUE-PAY'}</Text>
                        <Text style={[styles.depAmount, { color: '#059669' }]}>+৳{(col.amount ?? 0).toLocaleString()}</Text>
                      </View>
                      <Text style={styles.depDesc}>{col.description}</Text>
                      <Text style={styles.depTime}>{new Date(col.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        ) : activeTab === 'reports' ? (
          /* ── Financial Reports View ──────────────────────────────── */
          <View style={styles.reportsContainer}>
            {/* 1-Click All Reports Download & Print Hub Banner */}
            <TouchableOpacity
              style={styles.reportsBannerBtn}
              onPress={() => setReportModalVisible(true)}
              activeOpacity={0.88}
            >
              <View style={styles.reportsBannerLeft}>
                <View style={styles.reportsBannerIconBox}>
                  <Ionicons name="print-outline" size={24} color="#5F33E1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportsBannerTitle}>All Business Reports & Statements</Text>
                  <Text style={styles.reportsBannerSub}>
                    Daily Sales, Dues, Stock Valuation, P&L এবং Bank Deposit প্রিন্ট ও PDF ডাউনলোড করুন
                  </Text>
                </View>
              </View>
              <View style={styles.reportsBannerBadge}>
                <Text style={styles.reportsBannerBadgeText}>Download / Print</Text>
                <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Net Business Profit Hero Card */}
            <FadeInView delay={60} style={[styles.profitCard, { backgroundColor: summary.netProfit >= 0 ? '#5F33E1' : '#DC2626' }]}>
              <View style={styles.profitHeaderRow}>
                <View style={styles.profitBadge}>
                  <Ionicons name="trending-up" size={14} color="#5F33E1" />
                  <Text style={styles.profitBadgeText}>Net Business Profit</Text>
                </View>
                <Text style={styles.reportTimeframe}>All Time Financials</Text>
              </View>
              <Text style={styles.profitAmount}>
                ৳{summary.netProfit.toLocaleString()}
              </Text>
              <Text style={styles.profitSubtext}>
                Gross Sales (৳{summary.totalRevenue.toLocaleString()}) - COGS (৳{summary.totalPurchases.toLocaleString()}) - Expenses (৳{summary.totalOperatingExpenses.toLocaleString()})
              </Text>
            </FadeInView>

            {/* Core Financial Metrics Grid */}
            <FadeInView delay={120} style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: '#E7F7F8' }]}>
                <Ionicons name="cart" size={20} color="#0D9488" />
                <Text style={styles.metricCardLabel}>Total Sales Revenue</Text>
                <Text style={[styles.metricCardVal, { color: '#0F766E' }]}>৳{summary.totalRevenue.toLocaleString()}</Text>
                <Text style={styles.metricCardSub}>Cash Collected: ৳{summary.paidRevenue.toLocaleString()}</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: '#FFF3EB' }]}>
                <Ionicons name="bag-handle" size={20} color="#EA580C" />
                <Text style={styles.metricCardLabel}>Purchases (COGS)</Text>
                <Text style={[styles.metricCardVal, { color: '#C2410C' }]}>৳{summary.totalPurchases.toLocaleString()}</Text>
                <Text style={styles.metricCardSub}>Gross Margin: ৳{summary.grossProfit.toLocaleString()}</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="cash" size={20} color="#DC2626" />
                <Text style={styles.metricCardLabel}>Operating Expenses</Text>
                <Text style={[styles.metricCardVal, { color: '#B91C1C' }]}>৳{summary.totalOperatingExpenses.toLocaleString()}</Text>
                <Text style={styles.metricCardSub}>Rent, Utilities, Wages</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="cube" size={20} color="#5F33E1" />
                <Text style={styles.metricCardLabel}>Stock Value (Asset)</Text>
                <Text style={[styles.metricCardVal, { color: '#5F33E1' }]}>৳{summary.totalStockCost.toLocaleString()}</Text>
                <Text style={styles.metricCardSub}>Retail: ৳{summary.totalStockRetail.toLocaleString()}</Text>
              </View>
            </FadeInView>

            {/* Customer Receivables (Total Credit Dues) */}
            <FadeInView delay={180} style={styles.dueAlertCard}>
              <View style={styles.dueAlertLeft}>
                <View style={styles.dueIconBox}>
                  <Ionicons name="people" size={22} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.dueAlertTitle}>Customer Receivables (বাকি)</Text>
                  <Text style={styles.dueAlertSub}>{summary.creditCustomersCount} customers have pending dues</Text>
                </View>
              </View>
              <Text style={styles.dueAlertAmount}>৳{summary.totalReceivables.toLocaleString()}</Text>
            </FadeInView>

            {/* Operating Expenses Breakdown */}
            <FadeInView delay={220} style={styles.expenseBreakdownCard}>
              <Text style={styles.breakdownTitle}>Operating Expenses Breakdown</Text>
              {report?.expenseCategories && report.expenseCategories.length > 0 ? (
                report.expenseCategories.map((item, idx) => {
                  const percent = summary.totalOperatingExpenses > 0
                    ? Math.round((item.amount / summary.totalOperatingExpenses) * 100)
                    : 0;
                  return (
                    <View key={idx} style={styles.expenseBreakdownRow}>
                      <View style={styles.expenseRowHeader}>
                        <Text style={styles.expenseCatName}>{item.category}</Text>
                        <Text style={styles.expenseCatAmount}>৳{item.amount.toLocaleString()} ({percent}%)</Text>
                      </View>
                      <View style={styles.expenseTrack}>
                        <View style={[styles.expenseFill, { width: `${Math.min(100, Math.max(5, percent))}%` }]} />
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noExpensesText}>No categorized expenses recorded yet.</Text>
              )}
            </FadeInView>
          </View>
        ) : activeTab === 'customer_ledger' ? (
          /* ── Customer ID Wise Ledger View ────────────────────────── */
          <View style={styles.custLedgerContainer}>
            {/* Search Box */}
            <View style={styles.custSearchBox}>
              <Ionicons name="search" size={18} color="#7A7689" />
              <TextInput
                style={styles.custSearchInput}
                placeholder="Search by Customer ID (e.g. CUST-8899), name..."
                placeholderTextColor="#9CA3AF"
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
              {customerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCustomerSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Metrics Bar */}
            <View style={styles.custMetricsRow}>
              <View style={[styles.custMetricCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={styles.custMetricLabel}>Total Customer Dues (বাকি)</Text>
                <Text style={[styles.custMetricVal, { color: '#DC2626' }]}>
                  ৳{summary.totalReceivables.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.custMetricCard, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                <Text style={styles.custMetricLabel}>Credit Customers</Text>
                <Text style={[styles.custMetricVal, { color: '#5F33E1' }]}>
                  {summary.creditCustomersCount} Accounts
                </Text>
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.custPillRow}>
              <TouchableOpacity
                style={[styles.custFilterPill, custFilter === 'all' && styles.custFilterPillActive]}
                onPress={() => setCustFilter('all')}
              >
                <Text style={[styles.custFilterPillText, custFilter === 'all' && styles.custFilterPillTextActive]}>
                  All ({customers.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.custFilterPill, custFilter === 'due' && styles.custFilterPillActive]}
                onPress={() => setCustFilter('due')}
              >
                <Text style={[styles.custFilterPillText, custFilter === 'due' && styles.custFilterPillTextActive]}>
                  Due Accounts ({customers.filter((c) => (c.balance || 0) > 0).length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.custFilterPill, custFilter === 'credit' && styles.custFilterPillActive]}
                onPress={() => setCustFilter('credit')}
              >
                <Text style={[styles.custFilterPillText, custFilter === 'credit' && styles.custFilterPillTextActive]}>
                  Credit Type ({customers.filter((c) => c.customerType === 'credit').length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Customer List */}
            {filteredCustomers.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No Customers Found"
                message="No matching customer found. Check your search keyword."
              />
            ) : (
              filteredCustomers.map((cust, idx) => (
                <FadeInView key={cust._id} delay={Math.min(idx * 30, 250)} style={styles.custCard}>
                  <View style={styles.custCardTop}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View style={styles.custIdBadge}>
                          <Text style={styles.custIdText}>{cust.customerId || 'CUST'}</Text>
                        </View>
                        <View
                          style={[
                            styles.custTypeBadge,
                            { backgroundColor: cust.customerType === 'credit' ? '#F3E8FF' : '#E7F7F8' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.custTypeText,
                              { color: cust.customerType === 'credit' ? '#5F33E1' : '#0D9488' },
                            ]}
                          >
                            {(cust.customerType || 'cash').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.custCardName}>{cust.name}</Text>
                      <Text style={styles.custCardPhone}>
                        <Ionicons name="call-outline" size={12} color="#7A7689" /> {cust.phone}
                      </Text>
                      {!!cust.address && (
                        <Text style={styles.custCardAddress} numberOfLines={1}>
                          <Ionicons name="location-outline" size={12} color="#5F33E1" /> {cust.address}
                          {cust.city ? `, ${cust.city}` : ''}
                        </Text>
                      )}
                    </View>

                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text style={styles.custDueLabel}>Current Due</Text>
                      <Text
                        style={[
                          styles.custDueVal,
                          { color: (cust.balance || 0) > 0 ? '#DC2626' : '#059669' },
                        ]}
                      >
                        ৳{(cust.balance || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.openLedgerBtn}
                    onPress={() => {
                      setSelectedLedgerCustomerId(cust.customerId || cust._id);
                      setLedgerModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="book-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.openLedgerBtnText}>
                      View Customer Ledger & History (খতিয়ান ও সকল ইতিহাস)
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </FadeInView>
              ))
            )}
          </View>
        ) : (
          /* ── Expenses & Ledger View ──────────────────────────────── */
          <View style={styles.ledgerContainer}>
            {/* Summary Cards */}
            <FadeInView delay={60} style={styles.quickSummaryRow}>
              <View style={[styles.quickSumCard, { backgroundColor: '#E7F7F8' }]}>
                <Text style={styles.quickSumLabel}>Total Inflow</Text>
                <Text style={[styles.quickSumVal, { color: '#0F766E' }]}>৳{summary.totalRevenue.toLocaleString()}</Text>
              </View>
              <View style={[styles.quickSumCard, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.quickSumLabel}>Total Outflow</Text>
                <Text style={[styles.quickSumVal, { color: '#B91C1C' }]}>
                  ৳{(summary.totalOperatingExpenses + summary.totalPurchases).toLocaleString()}
                </Text>
              </View>
            </FadeInView>

            {/* Filter Chips */}
            <View style={styles.filterRow}>
              {(['all', 'expense', 'income'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.filterChip, filterType === t && styles.filterChipActive]}
                  onPress={() => setFilterType(t)}
                >
                  <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
                    {t === 'all' ? 'All Transactions' : t === 'expense' ? 'Expenses Only' : 'Income Only'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transactions List */}
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
            ) : transactions.length === 0 ? (
              <EmptyState
                icon="wallet-outline"
                title="No transactions found"
                message="Record an expense or sales income to populate the accounting ledger."
              />
            ) : (
              transactions.map((item, idx) => {
                const isExpense = item.type === 'expense';
                return (
                  <FadeInView key={item._id} delay={idx * 25} style={styles.txnCard}>
                    <View style={[styles.txnIconBox, { backgroundColor: isExpense ? '#FEE2E2' : '#D1FAE5' }]}>
                      <Ionicons
                        name={isExpense ? 'arrow-down' : 'arrow-up'}
                        size={18}
                        color={isExpense ? '#DC2626' : '#059669'}
                      />
                    </View>
                    <View style={styles.txnInfo}>
                      <Text style={styles.txnCategory}>{item.category}</Text>
                      <Text style={styles.txnDesc} numberOfLines={1}>
                        {item.description || item.reference || 'General Entry'}
                      </Text>
                      <Text style={styles.txnDate}>{new Date(item.date).toLocaleDateString()}</Text>
                    </View>
                    <Text style={[styles.txnAmount, { color: isExpense ? '#DC2626' : '#059669' }]}>
                      {isExpense ? '-' : '+'}৳{Number(item.amount).toLocaleString()}
                    </Text>
                  </FadeInView>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Transaction / Expense Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {transType === 'expense' ? 'Record Expense' : 'Record Income'}
                </Text>
                <Text style={styles.modalSubtitle}>Enter details to post into financial accounting</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#7A7689" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Type Switcher */}
              <View style={styles.modalTypeRow}>
                <TouchableOpacity
                  style={[styles.modalTypeBtn, transType === 'expense' && styles.modalTypeBtnActiveExpense]}
                  onPress={() => openAddModal('expense')}
                >
                  <Text style={[styles.modalTypeBtnText, transType === 'expense' && styles.modalTypeBtnTextActive]}>
                    Expense (খরচ)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalTypeBtn, transType === 'income' && styles.modalTypeBtnActiveIncome]}
                  onPress={() => openAddModal('income')}
                >
                  <Text style={[styles.modalTypeBtnText, transType === 'income' && styles.modalTypeBtnTextActive]}>
                    Income (আয়)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Category Pills */}
              <Text style={styles.inputLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {(transType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catPill, category === c && styles.catPillActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.catPillText, category === c && styles.catPillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Payment Method Pills */}
              <Text style={styles.inputLabel}>Payment Method *</Text>
              <View style={styles.payMethodRow}>
                {PAYMENT_METHODS.map((pm) => (
                  <TouchableOpacity
                    key={pm}
                    style={[styles.pmPill, paymentMethod === pm && styles.pmPillActive]}
                    onPress={() => setPaymentMethod(pm)}
                  >
                    <Text style={[styles.pmPillText, paymentMethod === pm && styles.pmPillTextActive]}>{pm}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FormInput
                label="Amount (৳) *"
                placeholder="e.g. 5000"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <FormInput
                label="Description / Purpose"
                placeholder="e.g. Office electricity bill for this month"
                value={description}
                onChangeText={setDescription}
              />

              <FormInput
                label="Reference / Voucher #"
                placeholder="e.g. VOUCH-001"
                value={reference}
                onChangeText={setReference}
              />
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddTransaction} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Post to Accounting</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bank Deposit Entry Modal */}
      <Modal visible={bankDepositModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Bank Deposit Entry</Text>
                <Text style={styles.modalSubtitle}>ব্যাংকে টাকা জমা দিন (কালেকশন থেকে বিয়োগ হবে)</Text>
              </View>
              <TouchableOpacity onPress={() => setBankDepositModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#7A7689" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Notice Banner */}
              <View style={styles.depositNotice}>
                <Ionicons name="information-circle" size={16} color="#2563EB" />
                <Text style={styles.depositNoticeText}>
                  Current Cash in Hand: ৳{(dailySummary?.netCashInHandToday ?? 0).toLocaleString()}
                </Text>
              </View>

              <FormInput
                label="Deposit Amount (টাকার পরিমাণ) *"
                placeholder="e.g. 5000"
                keyboardType="numeric"
                value={depositAmount}
                onChangeText={setDepositAmount}
              />

              <Text style={styles.inputLabel}>Select Bank (ব্যাংক নির্বাচন করুন) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {POPULAR_BANKS.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.catPill, depositBank === b && styles.catPillActive]}
                    onPress={() => setDepositBank(b)}
                  >
                    <Text style={[styles.catPillText, depositBank === b && styles.catPillTextActive]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <FormInput
                label="Account Number (অ্যাকাউন্ট নম্বর)"
                placeholder="e.g. 123.101.45678"
                value={depositAccount}
                onChangeText={setDepositAccount}
              />

              <FormInput
                label="Deposit Slip / Voucher # (রসিদ নম্বর)"
                placeholder="e.g. SLIP-7890"
                value={depositSlip}
                onChangeText={setDepositSlip}
              />

              <FormInput
                label="Notes / Deposited By (মন্তব্য)"
                placeholder="e.g. Deposited by Manager Rahim"
                value={depositNotes}
                onChangeText={setDepositNotes}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#2563EB' }]}
              onPress={handleRecordBankDeposit}
              disabled={submittingDeposit}
            >
              {submittingDeposit ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Confirm Bank Deposit (ব্যাংক জমা নিশ্চিত করুন)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Customer ID Wise Ledger & History Modal */}
      <CustomerLedgerModal
        visible={ledgerModalVisible}
        customerIdOrId={selectedLedgerCustomerId}
        onClose={() => setLedgerModalVisible(false)}
        onPaymentSuccess={() => {
          fetchAccountsData();
        }}
      />

      {/* Comprehensive All-Reports Export & Print Modal */}
      <ReportExportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F8FD',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDFA',
  },
  reportsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  reportsHeaderBtnText: {
    color: '#5F33E1',
    fontWeight: '700',
    fontSize: 13,
  },
  reportsBannerBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  reportsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportsBannerIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportsBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F1B2E',
  },
  reportsBannerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 16,
  },
  reportsBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#5F33E1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 12,
    gap: 4,
  },
  reportsBannerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F1B2E',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    color: '#7A7689',
    marginTop: 2,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 5,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDFA',
    gap: 10,
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F9F8FD',
    gap: 6,
  },
  tabSwitchBtnActive: {
    backgroundColor: '#F3E8FF',
  },
  tabSwitchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A7689',
  },
  tabSwitchTextActive: {
    color: '#5F33E1',
  },
  reportsContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  profitCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 7,
  },
  profitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  profitBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#5F33E1',
  },
  reportTimeframe: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  profitAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  profitSubtext: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '48.5%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
  },
  metricCardLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7A7689',
    marginTop: 8,
  },
  metricCardVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  metricCardSub: {
    fontSize: 10.5,
    color: '#7A7689',
    marginTop: 4,
    fontWeight: '500',
  },
  dueAlertCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#FDE68A',
    marginBottom: 16,
  },
  dueAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dueIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dueAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  dueAlertSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  dueAlertAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#B45309',
  },
  expenseBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1B2E',
    marginBottom: 14,
  },
  expenseBreakdownRow: {
    marginBottom: 12,
  },
  expenseRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  expenseCatName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1F1B2E',
  },
  expenseCatAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  expenseTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  expenseFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 3,
  },
  noExpensesText: {
    fontSize: 12,
    color: '#7A7689',
    textAlign: 'center',
    paddingVertical: 12,
  },
  ledgerContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  quickSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  quickSumCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
  },
  quickSumLabel: {
    fontSize: 11.5,
    color: '#7A7689',
    fontWeight: '600',
  },
  quickSumVal: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
  },
  filterChipActive: {
    backgroundColor: '#5F33E1',
    borderColor: '#5F33E1',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A7689',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
  },
  txnIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txnInfo: {
    flex: 1,
  },
  txnCategory: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1B2E',
  },
  txnDesc: {
    fontSize: 11.5,
    color: '#7A7689',
    marginTop: 1,
  },
  txnDate: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 27, 46, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1F1B2E',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#7A7689',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F0FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modalTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9F8FD',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
  },
  modalTypeBtnActiveExpense: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  modalTypeBtnActiveIncome: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modalTypeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1B2E',
  },
  modalTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1B2E',
    marginBottom: 8,
    marginTop: 4,
  },
  catScroll: {
    marginBottom: 14,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#F9F8FD',
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: '#5F33E1',
    borderColor: '#5F33E1',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A7689',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  payMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  pmPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F9F8FD',
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
  },
  pmPillActive: {
    backgroundColor: '#5F33E1',
    borderColor: '#5F33E1',
  },
  pmPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7A7689',
  },
  pmPillTextActive: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#5F33E1',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  // Customer Ledger Tab Styles
  custLedgerContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  custSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 12,
  },
  custSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
  custMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  custMetricCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.2,
  },
  custMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  custMetricVal: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  custPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  custFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  custFilterPillActive: {
    backgroundColor: '#5F33E1',
  },
  custFilterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  custFilterPillTextActive: {
    color: '#FFFFFF',
  },
  custCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: '#F1F5F9',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  custCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  custIdBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  custIdText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4338CA',
  },
  custTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  custTypeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  custCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  custCardPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  custCardAddress: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  custDueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  custDueVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  openLedgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5F33E1',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  openLedgerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Daily Cash & Bank Deposit Styles
  dailyContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  dateNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateNavTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  dateNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  dateNavBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  cashHeroCard: {
    backgroundColor: '#064E3B',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cashHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cashHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  cashHeroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#064E3B',
  },
  cashHeroDate: {
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: '600',
  },
  cashHeroAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  cashHeroFormula: {
    fontSize: 12,
    color: '#D1FAE5',
    marginTop: 4,
    marginBottom: 16,
  },
  bankDepositActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  bankDepositActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  dailyBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  breakdownVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  breakdownSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  highlightSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  highlightVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  dailySubTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 14,
    gap: 4,
    marginBottom: 10,
  },
  dailySubTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
  },
  dailySubTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  dailySubTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  dailySubTabTextActive: {
    color: '#5F33E1',
  },
  subTabList: {
    gap: 8,
  },
  emptyDailyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyDailyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyDailySub: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  dailyItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  depBankName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  depAmount: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  depDesc: {
    fontSize: 12,
    color: '#475569',
  },
  depSlip: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  depTime: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  depositNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  depositNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
});
