import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/Colors';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import { apiGet, apiPost } from '../utils/api';
import { API_ENDPOINTS } from '../constants/Api';

export interface CustomerSummary {
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

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'invoice' | 'payment' | 'due_collection' | 'cancellation';
  reference: string;
  particulars: string;
  items?: Array<{ name: string; qty: number; price: number; total: number }>;
  debit: number;
  credit: number;
  discount?: number;
  runningBalance: number;
  paymentStatus?: string;
  paymentMethod?: string;
  status?: string;
}

export interface LedgerResponse {
  customer: CustomerSummary;
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalDiscount: number;
    currentBalance: number;
    totalOrders: number;
    totalTransactions: number;
  };
  entries: LedgerEntry[];
}

interface CustomerLedgerModalProps {
  visible: boolean;
  customerIdOrId: string | null;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}

export default function CustomerLedgerModal({
  visible,
  customerIdOrId,
  onClose,
  onPaymentSuccess,
}: CustomerLedgerModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'invoice' | 'payment'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Collect Payment inline form
  const [showCollectForm, setShowCollectForm] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState<'Cash' | 'Bank Transfer' | 'bKash / Nagad'>('Cash');
  const [collectNotes, setCollectNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchLedger = useCallback(async () => {
    if (!customerIdOrId) return;
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: LedgerResponse }>(
        API_ENDPOINTS.customerLedger(customerIdOrId)
      );
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Ledger Load Error',
        text2: err.message || 'Could not load customer ledger.',
      });
    } finally {
      setLoading(false);
    }
  }, [customerIdOrId]);

  useEffect(() => {
    if (visible && customerIdOrId) {
      fetchLedger();
      setShowCollectForm(false);
      setSearchTerm('');
      setActiveFilter('all');
    }
  }, [visible, customerIdOrId, fetchLedger]);

  const handleCollectDue = async () => {
    if (!data?.customer?._id) return;
    const amt = Number(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid amount.' });
      return;
    }

    setSubmittingPayment(true);
    try {
      await apiPost(API_ENDPOINTS.customerPayDue(data.customer._id), {
        amount: amt,
        paymentMethod: collectMethod,
        notes: collectNotes.trim() || undefined,
      });

      Toast.show({
        type: 'success',
        text1: 'Payment Recorded',
        text2: `৳${amt.toLocaleString()} payment collected.`,
      });

      setShowCollectForm(false);
      setCollectAmount('');
      setCollectNotes('');
      fetchLedger();
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Payment Failed', text2: err.message || 'Could not record payment.' });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const filteredEntries = (data?.entries || []).filter((entry) => {
    if (activeFilter === 'invoice' && entry.type !== 'invoice') return false;
    if (activeFilter === 'payment' && entry.type !== 'payment' && entry.type !== 'due_collection') return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchRef = (entry.reference || '').toLowerCase().includes(q);
      const matchPart = (entry.particulars || '').toLowerCase().includes(q);
      return matchRef || matchPart;
    }
    return true;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.title}>Customer Ledger</Text>
                <View style={styles.bengaliBadge}>
                  <Text style={styles.bengaliBadgeText}>খতিয়ান হিসাব</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                {data?.customer?.customerId ? `Customer ID: ${data.customer.customerId}` : 'Detailed Statement'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#1F1B2E" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#5F33E1" />
              <Text style={styles.loadingText}>Loading customer ledger...</Text>
            </View>
          ) : !data ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <EmptyState title="Ledger Not Found" message="Could not find ledger history for this customer." icon="receipt-outline" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              {/* Customer Info Hero Card */}
              <View style={styles.customerHero}>
                <View style={styles.custHeroTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={styles.custIdBadge}>
                        <Text style={styles.custIdText}>{data.customer.customerId || 'CUST'}</Text>
                      </View>
                      <View
                        style={[
                          styles.custTypeBadge,
                          { backgroundColor: data.customer.customerType === 'credit' ? '#F3E8FF' : '#E7F7F8' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.custTypeText,
                            { color: data.customer.customerType === 'credit' ? '#5F33E1' : '#0D9488' },
                          ]}
                        >
                          {(data.customer.customerType || 'cash').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.custName}>{data.customer.name}</Text>
                  </View>

                  {/* Due Amount Highlight */}
                  <View style={styles.dueBox}>
                    <Text style={styles.dueBoxLabel}>Current Due</Text>
                    <Text style={styles.dueBoxVal}>৳{(data.customer.balance ?? 0).toLocaleString()}</Text>
                  </View>
                </View>

                {/* Contact and Address */}
                <View style={styles.contactRow}>
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={13} color="#7A7689" />
                    <Text style={styles.contactText}>{data.customer.phone}</Text>
                  </View>
                  {!!data.customer.address && (
                    <View style={styles.contactItem}>
                      <Ionicons name="location-outline" size={13} color="#5F33E1" />
                      <Text style={[styles.contactText, { color: '#1F1B2E', fontWeight: '600' }]}>
                        {data.customer.address}{data.customer.city ? `, ${data.customer.city}` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 4-Stat Metric Summary Grid */}
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, { borderLeftColor: '#2563EB' }]}>
                  <Text style={styles.sumLabel}>Total Invoiced (বিক্রি)</Text>
                  <Text style={[styles.sumVal, { color: '#2563EB' }]}>
                    ৳{(data.summary.totalBilled ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.sumSub}>{data.summary.totalOrders} order(s)</Text>
                </View>

                <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}>
                  <Text style={styles.sumLabel}>Total Paid (জমা)</Text>
                  <Text style={[styles.sumVal, { color: '#059669' }]}>
                    ৳{(data.summary.totalPaid ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.sumSub}>Received</Text>
                </View>

                <View style={[styles.summaryCard, { borderLeftColor: '#7C3AED' }]}>
                  <Text style={styles.sumLabel}>Total Discount (ছাড়)</Text>
                  <Text style={[styles.sumVal, { color: '#7C3AED' }]}>
                    ৳{(data.summary.totalDiscount ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.sumSub}>2% Offer</Text>
                </View>

                <View style={[styles.summaryCard, { borderLeftColor: '#DC2626' }]}>
                  <Text style={styles.sumLabel}>Outstanding (বাকি)</Text>
                  <Text style={[styles.sumVal, { color: '#DC2626' }]}>
                    ৳{(data.summary.currentBalance ?? 0).toLocaleString()}
                  </Text>
                  <Text style={styles.sumSub}>Payable</Text>
                </View>
              </View>

              {/* Collect Payment Drawer / Action */}
              {(data.customer.balance ?? 0) > 0 && (
                <View style={styles.collectActionCard}>
                  {showCollectForm ? (
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={styles.collectFormTitle}>Collect Payment (বাকি টাকা জমা নিন)</Text>
                        <TouchableOpacity onPress={() => setShowCollectForm(false)}>
                          <Ionicons name="close-circle" size={20} color="#7A7689" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formInputBox}>
                        <Text style={styles.inputLabel}>Collected Amount (৳) *</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="numeric"
                          placeholder={`Max: ৳${(data.customer.balance ?? 0).toLocaleString()}`}
                          placeholderTextColor="#9CA3AF"
                          value={collectAmount}
                          onChangeText={setCollectAmount}
                        />
                      </View>

                      <View style={styles.methodRow}>
                        {(['Cash', 'Bank Transfer', 'bKash / Nagad'] as const).map((m) => (
                          <TouchableOpacity
                            key={m}
                            style={[styles.methodBtn, collectMethod === m && styles.methodBtnActive]}
                            onPress={() => setCollectMethod(m)}
                          >
                            <Text style={[styles.methodBtnText, collectMethod === m && styles.methodBtnTextActive]}>
                              {m}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={styles.formInputBox}>
                        <Text style={styles.inputLabel}>Notes / Reference</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Paid in cash at counter"
                          placeholderTextColor="#9CA3AF"
                          value={collectNotes}
                          onChangeText={setCollectNotes}
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.confirmPayBtn}
                        onPress={handleCollectDue}
                        disabled={submittingPayment}
                      >
                        {submittingPayment ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.confirmPayBtnText}>Confirm & Update Ledger (জমা কনফার্ম করুন)</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.openPayBtn}
                      onPress={() => {
                        setCollectAmount(String(data.customer.balance || ''));
                        setShowCollectForm(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="cash-outline" size={18} color="#059669" />
                      <Text style={styles.openPayBtnText}>
                        Collect Due Payment (বাকি ৳{(data.customer.balance ?? 0).toLocaleString()} জমা নিন)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* History Search & Filters */}
              <View style={styles.filterSection}>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color="#7A7689" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search invoices or payments..."
                    placeholderTextColor="#9CA3AF"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                  />
                  {searchTerm.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchTerm('')}>
                      <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, activeFilter === 'all' && styles.chipActive]}
                    onPress={() => setActiveFilter('all')}
                  >
                    <Text style={[styles.chipText, activeFilter === 'all' && styles.chipTextActive]}>
                      All History ({data.entries.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.chip, activeFilter === 'invoice' && styles.chipActive]}
                    onPress={() => setActiveFilter('invoice')}
                  >
                    <Text style={[styles.chipText, activeFilter === 'invoice' && styles.chipTextActive]}>
                      Invoices (বিক্রি)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.chip, activeFilter === 'payment' && styles.chipActive]}
                    onPress={() => setActiveFilter('payment')}
                  >
                    <Text style={[styles.chipText, activeFilter === 'payment' && styles.chipTextActive]}>
                      Payments (জমা)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Chronological Ledger Table List */}
              <View style={styles.ledgerListSection}>
                <View style={styles.ledgerHeaderRow}>
                  <Text style={styles.ledgerHeaderTitle}>Transaction History (খতিয়ান বিবরণী)</Text>
                  <Text style={styles.ledgerHeaderCount}>{filteredEntries.length} record(s)</Text>
                </View>

                {filteredEntries.length === 0 ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <EmptyState
                      title="No Entries"
                      message="No transaction matches your search filter."
                      icon="document-text-outline"
                    />
                  </View>
                ) : (
                  filteredEntries.map((entry) => {
                    const isInvoice = entry.type === 'invoice';
                    const isCancellation = entry.type === 'cancellation';
                    return (
                      <View key={entry.id} style={styles.ledgerCard}>
                        {/* Top row: Date, Ref and Type Badge */}
                        <View style={styles.ledgerCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                              name={isInvoice ? 'receipt' : isCancellation ? 'close-circle' : 'cash'}
                              size={16}
                              color={isInvoice ? '#2563EB' : isCancellation ? '#DC2626' : '#059669'}
                            />
                            <Text style={styles.entryRef}>{entry.reference}</Text>
                            <View
                              style={[
                                styles.entryTypeBadge,
                                {
                                  backgroundColor: isInvoice
                                    ? '#EFF6FF'
                                    : isCancellation
                                    ? '#FEF2F2'
                                    : '#ECFDF5',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.entryTypeText,
                                  {
                                    color: isInvoice
                                      ? '#1D4ED8'
                                      : isCancellation
                                      ? '#DC2626'
                                      : '#059669',
                                  },
                                ]}
                              >
                                {isInvoice ? 'INVOICE' : isCancellation ? 'CANCELLED' : 'PAYMENT'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.entryDate}>
                            {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>

                        {/* Description & line items */}
                        <Text style={styles.entryPart}>{entry.particulars}</Text>
                        {entry.items && entry.items.length > 0 && (
                          <View style={styles.itemsBox}>
                            {entry.items.map((it, idx) => (
                              <Text key={idx} style={styles.itemLine}>
                                • {it.name} (x{it.qty}) - ৳{it.total}
                              </Text>
                            ))}
                          </View>
                        )}

                        {/* Financial Columns */}
                        <View style={styles.entryFinancialRow}>
                          <View style={styles.entryFinCol}>
                            <Text style={styles.finColLabel}>Billed (+)</Text>
                            <Text
                              style={[
                                styles.finColVal,
                                { color: entry.debit > 0 ? '#DC2626' : '#9CA3AF' },
                              ]}
                            >
                              {entry.debit > 0 ? `৳${entry.debit.toLocaleString()}` : '-'}
                            </Text>
                          </View>

                          <View style={styles.entryFinCol}>
                            <Text style={styles.finColLabel}>Paid (-)</Text>
                            <Text
                              style={[
                                styles.finColVal,
                                { color: entry.credit > 0 ? '#059669' : '#9CA3AF' },
                              ]}
                            >
                              {entry.credit > 0 ? `৳${entry.credit.toLocaleString()}` : '-'}
                            </Text>
                          </View>

                          <View style={[styles.entryFinCol, { alignItems: 'flex-end' }]}>
                            <Text style={styles.finColLabel}>Running Due</Text>
                            <View style={styles.runningBalBadge}>
                              <Text style={styles.runningBalText}>
                                ৳{(entry.runningBalance ?? 0).toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Extra tags (Discount, Payment Method) */}
                        {(entry.discount ?? 0) > 0 && (
                          <View style={styles.entryDiscountPill}>
                            <Ionicons name="pricetag" size={11} color="#059669" />
                            <Text style={styles.entryDiscountText}>
                              2% Discount Applied: -৳{(entry.discount ?? 0).toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  bengaliBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bengaliBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5F33E1',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 36,
  },
  customerHero: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  custHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    fontSize: 11.5,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 0.5,
  },
  custTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  custTypeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  custName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  dueBox: {
    alignItems: 'flex-end',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dueBoxLabel: {
    fontSize: 10.5,
    color: '#DC2626',
    fontWeight: '700',
  },
  dueBoxVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#DC2626',
  },
  contactRow: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
  },
  sumLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sumVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  sumSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  collectActionCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
  },
  openPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  openPayBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#059669',
  },
  collectFormTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  formInputBox: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  methodBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  methodBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  methodBtnTextActive: {
    color: '#FFFFFF',
  },
  confirmPayBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  confirmPayBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filterSection: {
    marginBottom: 12,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: '#5F33E1',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  ledgerListSection: {
    gap: 10,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ledgerHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  ledgerHeaderCount: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#F1F5F9',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  ledgerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryRef: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  entryTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  entryTypeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  entryDate: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  entryPart: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  itemsBox: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    gap: 2,
  },
  itemLine: {
    fontSize: 11.5,
    color: '#64748B',
  },
  entryFinancialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  entryFinCol: {
    flex: 1,
  },
  finColLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  finColVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  runningBalBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  runningBalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5F33E1',
  },
  entryDiscountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entryDiscountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
});
