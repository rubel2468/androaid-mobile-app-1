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
  Linking,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/Colors';
import OrderCard from '../../components/OrderCard';
import StatusBadge from '../../components/StatusBadge';
import FormInput from '../../components/FormInput';
import SearchBar from '../../components/SearchBar';
import EmptyState from '../../components/EmptyState';
import FadeInView from '../../components/FadeInView';
import CustomerLedgerModal from '../../components/CustomerLedgerModal';
import InvoicePrintModal from '../../components/InvoicePrintModal';
import ReportExportModal from '../../components/ReportExportModal';
import { apiGet, apiPost, apiPut } from '../../utils/api';
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

interface SalesOrder {
  _id: string;
  orderNumber: string;
  customer?: Customer;
  subtotal?: number;
  discount?: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  status: string;
  items: Array<{ product?: { name: string }; quantity: number; unitPrice: number; total: number }>;
  createdAt: string;
}

interface ProductItem {
  _id: string;
  name: string;
  sellingPrice: number;
  stockQuantity: number;
}

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function SalesScreen() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Registered Customer State (Mandatory Customer-First workflow)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [createCustomerModalVisible, setCreateCustomerModalVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Customer ID Wise Ledger State
  const [ledgerCustomerId, setLedgerCustomerId] = useState<string | null>(null);
  const [ledgerModalVisible, setLedgerModalVisible] = useState(false);

  // Invoice Print State
  const [printOrder, setPrintOrder] = useState<SalesOrder | null>(null);
  const [printModalVisible, setPrintModalVisible] = useState(false);

  // All Reports Export State
  const [reportModalVisible, setReportModalVisible] = useState(false);

  // High-Volume Fast Customer Suggestion & Inline Registration State
  const [inlineCustQuery, setInlineCustQuery] = useState('');
  const [quickCustSuggestions, setQuickCustSuggestions] = useState<Customer[]>([]);
  const [isSearchingCust, setIsSearchingCust] = useState(false);
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustAddress, setQuickCustAddress] = useState('');
  const [quickCustType, setQuickCustType] = useState<'cash' | 'credit'>('cash');
  const [savingQuickCust, setSavingQuickCust] = useState(false);

  const openCustomerLedger = (idOrCustomerId: string) => {
    setLedgerCustomerId(idOrCustomerId);
    setLedgerModalVisible(true);
  };

  // New Customer Form State
  const [newCustId, setNewCustId] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustType, setNewCustType] = useState<'cash' | 'credit'>('cash');
  const [newCustLimit, setNewCustLimit] = useState('50000');
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Form State
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);
  const [salePaymentType, setSalePaymentType] = useState<'cash' | 'credit' | 'partial'>('cash');
  const [customPaidAmount, setCustomPaidAmount] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'ssl' | 'bank'>('cash');
  const [submitting, setSubmitting] = useState(false);

  // Customer Dues Management State
  const [duesModalVisible, setDuesModalVisible] = useState(false);
  const [creditCustomers, setCreditCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [collectCustomer, setCollectCustomer] = useState<Customer | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('Cash');
  const [collectSubmitting, setCollectSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const url = filter === 'all' ? API_ENDPOINTS.sales : `${API_ENDPOINTS.sales}?status=${filter}`;
      const res = await apiGet<{ success: boolean; data: SalesOrder[] }>(url);
      if (res && res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to fetch sales' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  const loadProducts = async () => {
    try {
      const res = await apiGet<{ success: boolean; data: ProductItem[] }>(API_ENDPOINTS.products);
      if (res && res.data) {
        setAvailableProducts(res.data);
        if (res.data.length > 0) {
          setSelectedProductId(res.data[0]._id);
        }
      }
    } catch (e) {
      console.warn('Failed to preload products');
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await apiGet<{ success: boolean; data: Customer[] }>(API_ENDPOINTS.customers);
      if (res && res.data) {
        setCustomers(res.data);
      }
    } catch (e) {
      console.warn('Failed to load customers');
    }
  };

  useEffect(() => {
    fetchOrders();
    loadCustomers();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    loadCustomers();
  };

  const openCreateModal = () => {
    loadProducts();
    loadCustomers();
    setSelectedCustomer(null);
    setSalePaymentType('cash');
    setCustomPaidAmount('');
    setQuantity('1');
    setPaymentMethod('cash');
    setInlineCustQuery('');
    setQuickCustSuggestions([]);
    setShowQuickAddCust(false);
    setQuickCustName('');
    setQuickCustPhone('');
    setQuickCustAddress('');
    setModalVisible(true);
  };

  // High-Volume Fast Customer Search
  const handleInlineCustomerSearch = async (text: string) => {
    setInlineCustQuery(text);
    if (!text || text.trim().length === 0) {
      setQuickCustSuggestions([]);
      return;
    }
    setIsSearchingCust(true);
    try {
      const res = await apiGet<{ success: boolean; data: Customer[] }>(
        `${API_ENDPOINTS.customers}?search=${encodeURIComponent(text.trim())}&limit=8`
      );
      if (res && res.data) {
        setQuickCustSuggestions(res.data);
      }
    } catch (e) {
      // fallback to local filter
      const q = text.toLowerCase();
      setQuickCustSuggestions(
        customers.filter(
          (c) =>
            (c.customerId && c.customerId.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.name && c.name.toLowerCase().includes(q))
        ).slice(0, 8)
      );
    } finally {
      setIsSearchingCust(false);
    }
  };

  // Fast Inline Customer Quick-Add (1-Tap Registration)
  const handleQuickAddCustomer = async () => {
    const trimmedName = (quickCustName || '').trim();
    const trimmedPhone = (quickCustPhone || '').trim();
    const trimmedAddress = (quickCustAddress || '').trim();

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      Toast.show({
        type: 'error',
        text1: 'Customer Info Required',
        text2: 'নাম, মোবাইল নম্বর এবং ঠিকানা পূরণ করুন।',
      });
      return;
    }

    setSavingQuickCust(true);
    try {
      const autoId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await apiPost<{ success: boolean; data: Customer }>(API_ENDPOINTS.customers, {
        customerId: autoId,
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        customerType: quickCustType,
        creditLimit: 50000,
      });

      if (res && res.data) {
        setSelectedCustomer(res.data);
        setSalePaymentType(res.data.customerType === 'credit' ? 'credit' : 'cash');
        setShowQuickAddCust(false);
        setInlineCustQuery('');
        setQuickCustSuggestions([]);
        setQuickCustName('');
        setQuickCustPhone('');
        setQuickCustAddress('');
        loadCustomers();
        Toast.show({
          type: 'success',
          text1: 'Customer Registered',
          text2: `${res.data.name} (${res.data.customerId}) selected for this sale!`,
        });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: err.message });
    } finally {
      setSavingQuickCust(false);
    }
  };

  const openNewCustomerModal = () => {
    setNewCustId(`CUST-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setNewCustCity('');
    setNewCustEmail('');
    setNewCustType('cash');
    setNewCustLimit('50000');
    setCreateCustomerModalVisible(true);
  };

  const handleSaveCustomer = async () => {
    const trimmedName = (newCustName || '').trim();
    const trimmedPhone = (newCustPhone || '').trim();
    const trimmedAddress = (newCustAddress || '').trim();

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Customer name, phone and address are required.',
      });
      return;
    }

    setCreatingCustomer(true);
    try {
      const res = await apiPost<{ success: boolean; data: Customer }>(API_ENDPOINTS.customers, {
        customerId: (newCustId || '').trim(),
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        city: (newCustCity || '').trim(),
        email: (newCustEmail || '').trim() || undefined,
        customerType: newCustType,
        creditLimit: Number(newCustLimit) || 50000,
      });

      Toast.show({
        type: 'success',
        text1: 'Customer Registered',
        text2: `${res.data.name} (${res.data.customerId}) selected for invoice!`,
      });

      setSelectedCustomer(res.data);
      setSalePaymentType(res.data.customerType === 'credit' ? 'credit' : 'cash');
      setCreateCustomerModalVisible(false);
      setCustomerPickerVisible(false);
      loadCustomers();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: err.message });
    } finally {
      setCreatingCustomer(false);
    }
  };

  const openDuesModal = async () => {
    setDuesModalVisible(true);
    setLoadingCustomers(true);
    try {
      const res = await apiGet<{ success: boolean; data: any[] }>(API_ENDPOINTS.customers);
      if (res && res.data) {
        setCreditCustomers(res.data.filter((c) => (c.balance || 0) > 0 || c.customerType === 'credit'));
      }
    } catch (e) {
      console.warn('Failed to load credit customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleCollectDue = async () => {
    const payAmt = Number(collectAmount);
    if (!collectCustomer || isNaN(payAmt) || payAmt <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter valid collected amount.' });
      return;
    }

    setCollectSubmitting(true);
    try {
      const endpoint = API_ENDPOINTS.customerPayDue(collectCustomer._id);
      await apiPost(endpoint, {
        amount: payAmt,
        paymentMethod: collectMethod,
      });

      Toast.show({
        type: 'success',
        text1: 'Payment Collected',
        text2: `৳${payAmt.toLocaleString()} payment collected.`,
      });

      setCollectCustomer(null);
      setCollectAmount('');
      openDuesModal();
      fetchOrders();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Collection Failed', text2: err.message || 'Error collecting payment.' });
    } finally {
      setCollectSubmitting(false);
    }
  };

  const selectedProduct = availableProducts.find((p) => p._id === selectedProductId);
  const unitPrice = selectedProduct?.sellingPrice || 0;
  const qtyNumber = parseInt(quantity, 10) || 1;
  const subtotal = unitPrice * qtyNumber;

  // Discount System: 3000 taka beshi hole 2% discount hobe
  const isEligibleForDiscount = subtotal > 3000;
  const autoDiscountAmount = isEligibleForDiscount ? Math.round(subtotal * 0.02) : 0;
  const calculatedTotal = Math.max(0, subtotal - autoDiscountAmount);

  let finalPaidAmount = calculatedTotal;
  if (salePaymentType === 'credit') {
    finalPaidAmount = 0;
  } else if (salePaymentType === 'partial') {
    finalPaidAmount = Math.max(0, Math.min(calculatedTotal, Number(customPaidAmount) || 0));
  }
  const calculatedDue = Math.max(0, calculatedTotal - finalPaidAmount);

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      (c.customerId && c.customerId.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  const handleCreateSale = async () => {
    if (!selectedCustomer) {
      Toast.show({
        type: 'error',
        text1: 'Customer Required',
        text2: 'প্রথমে কাস্টমার তৈরি অথবা সিলেক্ট করুন। Invoice cannot be made without customer.',
      });
      return;
    }
    if (!selectedProductId) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select a product' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer: selectedCustomer._id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerEmail: selectedCustomer.email,
        customerAddress: selectedCustomer.address,
        customerType: selectedCustomer.customerType || 'cash',
        creditLimit: selectedCustomer.creditLimit || 50000,
        paymentType: salePaymentType,
        items: [
          {
            product: selectedProductId,
            qty: qtyNumber,
            quantity: qtyNumber,
            price: unitPrice,
            unitPrice: unitPrice,
          },
        ],
        paidAmount: finalPaidAmount,
        discount: autoDiscountAmount,
        paymentMethod: salePaymentType === 'credit' ? 'credit' : paymentMethod,
      };

      const res = await apiPost<{ success: boolean; data: SalesOrder }>(API_ENDPOINTS.sales, payload);
      const newOrder = res.data;

      // If SSLCommerz chosen, trigger payment gateway
      if (paymentMethod === 'ssl' && finalPaidAmount > 0) {
        Toast.show({ type: 'info', text1: 'SSLCommerz', text2: 'Opening payment gateway...' });
        try {
          const payRes = await apiPost<{ success: boolean; gatewayUrl: string; transactionId: string }>(
            `${API_ENDPOINTS.payment}/initiate`,
            {
              orderId: newOrder.orderNumber,
              amount: finalPaidAmount,
              customerName: selectedCustomer.name,
              customerEmail: (selectedCustomer.email || '').trim() || 'customer@example.com',
              customerPhone: (selectedCustomer.phone || '').trim() || '01700000000',
            }
          );

          if (payRes && payRes.gatewayUrl) {
            Linking.openURL(payRes.gatewayUrl);
          }
        } catch (payErr: any) {
          Toast.show({ type: 'error', text1: 'Gateway Notice', text2: 'Order created, payment link failed' });
        }
      } else {
        Toast.show({
          type: 'success',
          text1: 'Order Created',
          text2: salePaymentType === 'credit' ? `Credit order saved (Due: ৳${calculatedDue.toLocaleString()})` : 'Sale completed!',
        });
      }

      setModalVisible(false);
      fetchOrders();
      setPrintOrder(newOrder);
      setPrintModalVisible(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Order Creation Failed', text2: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, additionalPayload: object = {}) => {
    setUpdatingStatus(true);
    try {
      await apiPut(`${API_ENDPOINTS.sales}/${orderId}/status`, {
        status: newStatus,
        ...additionalPayload,
      });
      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `Order status is now ${newStatus.toUpperCase()}`,
      });
      setDetailModalVisible(false);
      fetchOrders();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: err.message || 'Could not update status' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelOrder = (order: SalesOrder) => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel ${order.orderNumber}? Product stock will be returned to inventory.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              await apiPut(`${API_ENDPOINTS.sales}/${order._id}/cancel`, {});
              Toast.show({ type: 'success', text1: 'Order Cancelled', text2: 'Stock has been restored.' });
              setDetailModalVisible(false);
              fetchOrders();
            } catch (err: any) {
              Toast.show({ type: 'error', text1: 'Cancellation Failed', text2: err.message });
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const handleQuickConfirm = (order: SalesOrder) => {
    Alert.alert(
      'Confirm Order',
      `Confirm order ${order.orderNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Now',
          onPress: () => handleUpdateOrderStatus(order._id, 'confirmed'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sales Orders</Text>
          <Text style={styles.subtitle}>{orders.length} orders recorded</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.reportsBtn}
            onPress={() => setReportModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text" size={15} color="#5F33E1" />
            <Text style={styles.reportsBtnText}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.duesBtn} onPress={openDuesModal} activeOpacity={0.85}>
            <Ionicons name="people" size={15} color="#92400E" />
            <Text style={styles.duesBtnText}>Dues</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openCreateModal} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Horizontal Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filter === s && styles.filterChipActive]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.filterChipText, filter === s && styles.filterChipTextActive]}>
              {s.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Orders List */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              title="No Sales Orders"
              message="Tap '+ New Sale' to create and process your first invoice."
              icon="cart-outline"
            />
          }
          renderItem={({ item, index }) => (
            <FadeInView delay={Math.min(index * 35, 300)}>
              <OrderCard
                orderNumber={item.orderNumber}
                customerName={item.customer?.name || 'Walk-in Customer'}
                date={new Date(item.createdAt).toLocaleDateString()}
                amount={`৳${(item.totalAmount ?? 0).toLocaleString()}`}
                status={item.status}
                itemCount={item.items?.length || 1}
                discount={item.discount}
                onConfirm={() => handleQuickConfirm(item)}
                onPress={() => {
                  setSelectedOrder(item);
                  setDetailModalVisible(true);
                }}
              />
            </FadeInView>
          )}
        />
      )}

      {/* Create Sale Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Sales Invoice</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Customer Selection Required (Customer First) */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>Customer Information (বাধ্যতামূলক) *</Text>
                {selectedCustomer && (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCustomer(null);
                      setInlineCustQuery('');
                      setQuickCustSuggestions([]);
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#5F33E1', fontWeight: '700' }}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedCustomer ? (
                <View style={styles.selectedCustCard}>
                  <View style={styles.selectedCustHeader}>
                    <View style={styles.custBadgeRow}>
                      <View style={styles.custIdBadge}>
                        <Text style={styles.custIdText}>{selectedCustomer.customerId || 'CUST-ID'}</Text>
                      </View>
                      <Text style={styles.selectedCustName}>{selectedCustomer.name}</Text>
                      <View style={[styles.custTypeBadge, { backgroundColor: selectedCustomer.customerType === 'credit' ? '#F3E8FF' : '#E7F7F8' }]}>
                        <Text style={[styles.custTypeText, { color: selectedCustomer.customerType === 'credit' ? '#5F33E1' : '#0D9488' }]}>
                          {(selectedCustomer.customerType || 'cash').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.custDetailRow}>
                    <Ionicons name="call-outline" size={14} color="#7A7689" />
                    <Text style={styles.custDetailText}>{selectedCustomer.phone}</Text>
                  </View>

                  <View style={styles.custDetailRow}>
                    <Ionicons name="location-outline" size={14} color="#5F33E1" />
                    <Text style={[styles.custDetailText, { color: '#1F1B2E', fontWeight: '600' }]}>
                      {selectedCustomer.address ? `${selectedCustomer.address}${selectedCustomer.city ? `, ${selectedCustomer.city}` : ''}` : 'Address not set'}
                    </Text>
                  </View>

                  {(selectedCustomer.balance ?? 0) > 0 && (
                    <View style={styles.custDueNotice}>
                      <Ionicons name="alert-circle" size={13} color="#DC2626" />
                      <Text style={styles.custDueNoticeText}>
                        Current outstanding balance: ৳{(selectedCustomer.balance ?? 0).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.fastCustSearchContainer}>
                  {/* Live Search Input with Instant Lookahead */}
                  <View style={styles.fastCustInputRow}>
                    <Ionicons name="search" size={18} color="#7A7689" />
                    <TextInput
                      style={styles.fastCustInput}
                      placeholder="Type Phone, Name, or Customer ID..."
                      placeholderTextColor="#94A3B8"
                      value={inlineCustQuery}
                      onChangeText={handleInlineCustomerSearch}
                    />
                    {isSearchingCust ? (
                      <ActivityIndicator size="small" color="#5F33E1" />
                    ) : inlineCustQuery.length > 0 ? (
                      <TouchableOpacity onPress={() => handleInlineCustomerSearch('')}>
                        <Ionicons name="close-circle" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Live Instant Suggestions Dropdown (Max 8 records for 60,000 scale) */}
                  {quickCustSuggestions.length > 0 && (
                    <View style={styles.suggestionsBox}>
                      {quickCustSuggestions.map((item) => (
                        <TouchableOpacity
                          key={item._id}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setSelectedCustomer(item);
                            setSalePaymentType(item.customerType === 'credit' ? 'credit' : 'cash');
                            setInlineCustQuery('');
                            setQuickCustSuggestions([]);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={styles.suggIdBadge}>
                                <Text style={styles.suggId}>{item.customerId || 'CUST'}</Text>
                              </View>
                              <Text style={styles.suggName}>{item.name}</Text>
                              <Text style={styles.suggPhone}>({item.phone})</Text>
                            </View>
                            <Text style={styles.suggAddress} numberOfLines={1}>{item.address || 'Address not set'}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#059669" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Inline 1-Tap Quick Registration Accordion */}
                  {showQuickAddCust ? (
                    <View style={styles.inlineRegisterBox}>
                      <View style={styles.inlineRegHeader}>
                        <Text style={styles.inlineRegTitle}>Quick Register New Customer</Text>
                        <TouchableOpacity onPress={() => setShowQuickAddCust(false)}>
                          <Ionicons name="close" size={18} color="#7A7689" />
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        style={styles.inlineInput}
                        placeholder="Customer Full Name *"
                        placeholderTextColor="#94A3B8"
                        value={quickCustName}
                        onChangeText={setQuickCustName}
                      />
                      <TextInput
                        style={styles.inlineInput}
                        placeholder="Phone Number (মোবাইল) *"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={quickCustPhone}
                        onChangeText={setQuickCustPhone}
                      />
                      <TextInput
                        style={styles.inlineInput}
                        placeholder="Full Address (ঠিকানা) *"
                        placeholderTextColor="#94A3B8"
                        value={quickCustAddress}
                        onChangeText={setQuickCustAddress}
                      />

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <TouchableOpacity
                          style={[styles.miniTypeBtn, quickCustType === 'cash' && styles.miniTypeBtnActive]}
                          onPress={() => setQuickCustType('cash')}
                        >
                          <Text style={[styles.miniTypeText, quickCustType === 'cash' && styles.miniTypeTextActive]}>
                            Cash Customer
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.miniTypeBtn, quickCustType === 'credit' && styles.miniTypeBtnActiveCredit]}
                          onPress={() => setQuickCustType('credit')}
                        >
                          <Text style={[styles.miniTypeText, quickCustType === 'credit' && styles.miniTypeTextActiveCredit]}>
                            Credit Customer (বাকি)
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.inlineSaveBtn}
                        onPress={handleQuickAddCustomer}
                        disabled={savingQuickCust}
                      >
                        {savingQuickCust ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <Text style={styles.inlineSaveBtnText}>+ Save & Auto-Select for Invoice</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.fastCustActionRow}>
                      <TouchableOpacity
                        style={styles.inlineAddBtn}
                        onPress={() => {
                          setShowQuickAddCust(true);
                          if (inlineCustQuery.length > 0) {
                            if (/^\d+$/.test(inlineCustQuery)) {
                              setQuickCustPhone(inlineCustQuery);
                            } else {
                              setQuickCustName(inlineCustQuery);
                            }
                          }
                        }}
                      >
                        <Ionicons name="person-add-outline" size={15} color="#5F33E1" />
                        <Text style={styles.inlineAddBtnText}>+ Quick Add Customer</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.browseAllBtn}
                        onPress={() => {
                          loadCustomers();
                          setCustomerPickerVisible(true);
                        }}
                      >
                        <Ionicons name="list-outline" size={15} color="#64748B" />
                        <Text style={styles.browseAllBtnText}>Browse All</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Product Selection */}
              <Text style={styles.fieldLabel}>Select Item *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productPillList}>
                {availableProducts.map((p) => {
                  const isSelected = p._id === selectedProductId;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      style={[styles.productPill, isSelected && styles.productPillSelected]}
                      onPress={() => setSelectedProductId(p._id)}
                    >
                      <Text style={[styles.productPillName, isSelected && styles.productPillTextSelected]}>
                        {p.name}
                      </Text>
                      <Text style={[styles.productPillPrice, isSelected && styles.productPillTextSelected]}>
                        ৳{p.sellingPrice} (Stock: {p.stockQuantity})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <FormInput
                label="Quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="1"
              />

              {/* Customer Paid Mode Selector */}
              <Text style={styles.fieldLabel}>Payment Mode (কাস্টমার পেমেন্ট) *</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, salePaymentType === 'cash' && styles.toggleBtnActive]}
                  onPress={() => {
                    setSalePaymentType('cash');
                    setPaymentMethod('cash');
                  }}
                >
                  <Text style={[styles.toggleText, salePaymentType === 'cash' && styles.toggleTextActive]}>
                    Full Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, salePaymentType === 'credit' && styles.toggleBtnActiveCredit]}
                  onPress={() => {
                    setSalePaymentType('credit');
                    setPaymentMethod('cash');
                  }}
                >
                  <Text style={[styles.toggleText, salePaymentType === 'credit' && styles.toggleTextActive]}>
                    Credit (বাকি)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, salePaymentType === 'partial' && styles.toggleBtnActivePartial]}
                  onPress={() => setSalePaymentType('partial')}
                >
                  <Text style={[styles.toggleText, salePaymentType === 'partial' && styles.toggleTextActive]}>
                    Partial (আংশিক)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick Cash Presets for High-Volume Fast Billing */}
              <View style={styles.quickCashPresetRow}>
                <TouchableOpacity
                  style={[styles.quickCashPill, salePaymentType === 'cash' && styles.quickCashPillActive]}
                  onPress={() => {
                    setSalePaymentType('cash');
                    setCustomPaidAmount(String(calculatedTotal));
                  }}
                >
                  <Text style={[styles.quickCashPillText, salePaymentType === 'cash' && styles.quickCashPillTextActive]}>
                    Full Cash
                  </Text>
                </TouchableOpacity>

                {[500, 1000, 2000, 5000].map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.quickCashPill}
                    onPress={() => {
                      setSalePaymentType('partial');
                      setCustomPaidAmount(String(amt));
                    }}
                  >
                    <Text style={styles.quickCashPillText}>৳{amt.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.quickCashPill, salePaymentType === 'credit' && styles.quickCashPillDueActive]}
                  onPress={() => {
                    setSalePaymentType('credit');
                    setCustomPaidAmount('0');
                  }}
                >
                  <Text style={[styles.quickCashPillText, salePaymentType === 'credit' && { color: '#DC2626', fontWeight: '800' }]}>
                    Full Due
                  </Text>
                </TouchableOpacity>
              </View>

              {salePaymentType === 'partial' && (
                <FormInput
                  label={`Custom Paid Amount (৳) * (Total: ৳${calculatedTotal.toLocaleString()})`}
                  value={customPaidAmount}
                  onChangeText={setCustomPaidAmount}
                  keyboardType="numeric"
                  placeholder="Enter collected cash"
                />
              )}

              {/* Payment Method Selector */}
              {salePaymentType !== 'credit' && (
                <>
                  <Text style={styles.fieldLabel}>Payment Method</Text>
                  <View style={styles.paymentMethodRow}>
                    <TouchableOpacity
                      style={[styles.methodCard, paymentMethod === 'ssl' && styles.methodCardActive]}
                      onPress={() => setPaymentMethod('ssl')}
                    >
                      <Ionicons name="card" size={20} color={paymentMethod === 'ssl' ? Colors.primary : Colors.textSecondary} />
                      <Text style={[styles.methodText, paymentMethod === 'ssl' && styles.methodTextActive]}>
                        SSLCommerz
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.methodCard, paymentMethod === 'cash' && styles.methodCardActive]}
                      onPress={() => setPaymentMethod('cash')}
                    >
                      <Ionicons name="cash" size={20} color={paymentMethod === 'cash' ? Colors.primary : Colors.textSecondary} />
                      <Text style={[styles.methodText, paymentMethod === 'cash' && styles.methodTextActive]}>
                        Cash
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.methodCard, paymentMethod === 'bank' && styles.methodCardActive]}
                      onPress={() => setPaymentMethod('bank')}
                    >
                      <Ionicons name="business" size={20} color={paymentMethod === 'bank' ? Colors.primary : Colors.textSecondary} />
                      <Text style={[styles.methodText, paymentMethod === 'bank' && styles.methodTextActive]}>
                        Bank
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Order Calculation Summary */}
              <View style={styles.calcBox}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Unit Price:</Text>
                  <Text style={styles.calcVal}>৳{unitPrice.toLocaleString()}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Quantity:</Text>
                  <Text style={styles.calcVal}>x {qtyNumber}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Subtotal:</Text>
                  <Text style={styles.calcVal}>৳{subtotal.toLocaleString()}</Text>
                </View>

                {isEligibleForDiscount ? (
                  <View style={[styles.calcRow, styles.discountRow]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="pricetag" size={14} color="#059669" />
                      <Text style={[styles.calcLabel, { color: '#059669', fontWeight: '700' }]}>
                        Discount (2% over ৳3,000):
                      </Text>
                    </View>
                    <Text style={[styles.calcVal, { color: '#059669', fontWeight: '800' }]}>
                      -৳{autoDiscountAmount.toLocaleString()}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.discountPromoBox}>
                    <Ionicons name="sparkles" size={13} color="#7C3AED" />
                    <Text style={styles.discountPromoText}>
                      ৳৩,০০০ টাকার বেশি অর্ডারে ২% অটো ডিসকাউন্ট (আরও ৳{(Math.max(1, 3001 - subtotal)).toLocaleString()} প্রয়োজন)
                    </Text>
                  </View>
                )}

                <View style={styles.calcDivider} />
                <View style={styles.calcRow}>
                  <Text style={styles.calcTotalLabel}>Grand Total:</Text>
                  <Text style={styles.calcTotalVal}>৳{(calculatedTotal ?? 0).toLocaleString()}</Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Paid Amount:</Text>
                  <Text style={[styles.calcVal, { color: '#059669', fontWeight: '800' }]}>
                    ৳{finalPaidAmount.toLocaleString()}
                  </Text>
                </View>
                {calculatedDue > 0 && (
                  <View style={styles.calcRow}>
                    <Text style={[styles.calcLabel, { color: '#DC2626' }]}>Customer Due (বাকি):</Text>
                    <Text style={[styles.calcVal, { color: '#DC2626', fontWeight: '800' }]}>
                      ৳{calculatedDue.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Dual Action Buttons: Save Invoice vs Save & 1-Tap Print */}
              <View style={styles.actionBtnRow}>
                <TouchableOpacity
                  style={[styles.printSubmitButton, submitting && { opacity: 0.7 }]}
                  onPress={handleCreateSale}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <View style={styles.btnInnerRow}>
                      <Ionicons name="print-outline" size={17} color="#FFF" />
                      <Text style={styles.submitText}>Save & Print</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, marginTop: 0 }, submitting && { opacity: 0.7 }]}
                  onPress={handleCreateSale}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <View style={styles.btnInnerRow}>
                      <Ionicons name="checkmark-done" size={17} color="#FFF" />
                      <Text style={styles.submitText}>
                        {paymentMethod === 'ssl' ? 'Pay SSL' : 'Save Invoice'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Order Details & Status Actions Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedOrder?.orderNumber || 'Order Details'}</Text>
                <Text style={styles.detailDate}>
                  {selectedOrder ? new Date(selectedOrder.createdAt).toLocaleDateString() : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedOrder && (
                <>
                  {/* Status Banner */}
                  <View style={styles.detailStatusRow}>
                    <View style={styles.detailStatusItem}>
                      <Text style={styles.detailLabel}>Order Status</Text>
                      <StatusBadge status={selectedOrder.status} />
                    </View>
                    <View style={styles.detailStatusItem}>
                      <Text style={styles.detailLabel}>Payment</Text>
                      <StatusBadge status={selectedOrder.paymentStatus || 'pending'} />
                    </View>
                    <View style={styles.detailStatusItem}>
                      <Text style={styles.detailLabel}>Method</Text>
                      <Text style={styles.detailMethodText}>
                        {(selectedOrder.paymentMethod || 'cash').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Customer Info Card */}
                  <View style={styles.infoCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={styles.infoCardTitle}>Customer Information</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {selectedOrder.customer?.customerId && (
                          <View style={styles.custIdBadge}>
                            <Text style={styles.custIdText}>{selectedOrder.customer.customerId}</Text>
                          </View>
                        )}
                        {selectedOrder.customer && (
                          <TouchableOpacity
                            style={styles.ledgerBtnSmall}
                            onPress={() => openCustomerLedger(selectedOrder.customer?.customerId || selectedOrder.customer?._id || '')}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="book-outline" size={12} color="#5F33E1" />
                            <Text style={styles.ledgerBtnSmallText}>Ledger (খতিয়ান)</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                      <Text style={styles.infoText}>{selectedOrder.customer?.name || 'Walk-in Customer'}</Text>
                    </View>
                    {!!selectedOrder.customer?.phone && (
                      <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.infoText}>{selectedOrder.customer.phone}</Text>
                      </View>
                    )}
                    {!!selectedOrder.customer?.address && (
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color="#5F33E1" />
                        <Text style={[styles.infoText, { color: '#1F1B2E', fontWeight: '600' }]}>
                          {selectedOrder.customer.address}{selectedOrder.customer.city ? `, ${selectedOrder.customer.city}` : ''}
                        </Text>
                      </View>
                    )}
                    {!!selectedOrder.customer?.email && (
                      <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.infoText}>{selectedOrder.customer.email}</Text>
                      </View>
                    )}
                  </View>

                  {/* Order Financials */}
                  <View style={styles.calcBox}>
                    {selectedOrder.subtotal !== undefined && selectedOrder.subtotal > 0 && (
                      <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Subtotal:</Text>
                        <Text style={styles.calcVal}>৳{selectedOrder.subtotal.toLocaleString()}</Text>
                      </View>
                    )}
                    {(selectedOrder.discount ?? 0) > 0 && (
                      <View style={[styles.calcRow, styles.discountRow]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Ionicons name="pricetag" size={13} color="#059669" />
                          <Text style={[styles.calcLabel, { color: '#059669', fontWeight: '700' }]}>
                            Discount (২% ছাড়):
                          </Text>
                        </View>
                        <Text style={[styles.calcVal, { color: '#059669', fontWeight: '800' }]}>
                          -৳{(selectedOrder.discount ?? 0).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Total Amount:</Text>
                      <Text style={styles.calcVal}>৳{(selectedOrder.totalAmount ?? 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Paid Amount:</Text>
                      <Text style={[styles.calcVal, { color: Colors.success }]}>
                        ৳{(selectedOrder.paidAmount ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.calcDivider} />
                    <View style={styles.calcRow}>
                      <Text style={styles.calcTotalLabel}>Due Amount:</Text>
                      <Text style={[styles.calcTotalVal, { color: Colors.error }]}>
                        ৳{Math.max(0, (selectedOrder.totalAmount || 0) - (selectedOrder.paidAmount || 0)).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Print & Share Invoice Action Button */}
                  <TouchableOpacity
                    style={styles.printInvoiceMainBtn}
                    onPress={() => {
                      setPrintOrder(selectedOrder);
                      setPrintModalVisible(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="print-outline" size={18} color="#FFF" />
                    <Text style={styles.printInvoiceMainBtnText}>Print / Share Invoice (ইনভয়েস প্রিন্ট)</Text>
                  </TouchableOpacity>

                  {/* Actions Section */}
                  <Text style={styles.actionSectionTitle}>Order Actions</Text>

                  {updatingStatus ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
                  ) : (
                    <View style={styles.actionButtonsContainer}>
                      {/* If Pending: Confirm Order Button */}
                      {selectedOrder.status === 'pending' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnConfirm]}
                          onPress={() => handleUpdateOrderStatus(selectedOrder._id, 'confirmed')}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.actionBtnText}>Confirm Order (কনফার্ম করুন)</Text>
                        </TouchableOpacity>
                      )}

                      {/* If Confirmed: Mark as Shipped */}
                      {selectedOrder.status === 'confirmed' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnShipped]}
                          onPress={() => handleUpdateOrderStatus(selectedOrder._id, 'shipped')}
                        >
                          <Ionicons name="airplane-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.actionBtnText}>Mark as Shipped (শিপড করুন)</Text>
                        </TouchableOpacity>
                      )}

                      {/* If Shipped or Confirmed: Mark as Delivered */}
                      {['confirmed', 'shipped'].includes(selectedOrder.status) && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnDelivered]}
                          onPress={() => handleUpdateOrderStatus(selectedOrder._id, 'delivered')}
                        >
                          <Ionicons name="cube-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.actionBtnText}>Mark as Delivered (ডেলিভার্ড সম্পন্ন)</Text>
                        </TouchableOpacity>
                      )}

                      {/* Mark as Paid if not fully paid */}
                      {selectedOrder.paymentStatus !== 'paid' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnPaid]}
                          onPress={() =>
                            handleUpdateOrderStatus(selectedOrder._id, selectedOrder.status, {
                              paymentStatus: 'paid',
                              paidAmount: selectedOrder.totalAmount - (selectedOrder.paidAmount || 0),
                            })
                          }
                        >
                          <Ionicons name="cash-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.actionBtnText}>Mark as Paid (পরিশোধ চিহ্নিত করুন)</Text>
                        </TouchableOpacity>
                      )}

                      {/* Cancel Order (if not delivered or cancelled) */}
                      {!['delivered', 'cancelled'].includes(selectedOrder.status) && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnCancel]}
                          onPress={() => handleCancelOrder(selectedOrder)}
                        >
                          <Ionicons name="close-circle-outline" size={18} color={Colors.error} style={{ marginRight: 6 }} />
                          <Text style={[styles.actionBtnText, { color: Colors.error }]}>Cancel Order (অর্ডার বাতিল)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer Dues Management Modal */}
      <Modal visible={duesModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Customer Credit Dues (বাকি আদায়)</Text>
                <Text style={styles.detailDate}>Manage customer balances and collect outstanding dues</Text>
              </View>
              <TouchableOpacity onPress={() => setDuesModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {loadingCustomers ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 24 }} />
              ) : creditCustomers.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle-outline" size={38} color="#059669" />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F1B2E', marginTop: 8 }}>
                    No Pending Customer Dues
                  </Text>
                  <Text style={{ fontSize: 12, color: '#7A7689', marginTop: 2 }}>
                    All customers are currently settled.
                  </Text>
                </View>
              ) : (
                creditCustomers.map((cust) => (
                  <View key={cust._id} style={styles.dueCustomerCard}>
                    <View style={styles.dueCustomerHeader}>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.dueCustomerName}>{cust.name}</Text>
                          <View style={[styles.custTypeBadge, { backgroundColor: cust.customerType === 'credit' ? '#F3E8FF' : '#E7F7F8' }]}>
                            <Text style={[styles.custTypeText, { color: cust.customerType === 'credit' ? '#5F33E1' : '#0D9488' }]}>
                              {(cust.customerType || 'cash').toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.dueCustomerPhone}>{cust.phone || 'No phone'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.dueAmountLabel}>Due Balance</Text>
                        <Text style={styles.dueAmountVal}>৳{(cust.balance ?? 0).toLocaleString()}</Text>
                      </View>
                    </View>

                    {collectCustomer?._id === cust._id ? (
                      <View style={styles.collectBox}>
                        <FormInput
                          label="Collected Amount (৳) *"
                          value={collectAmount}
                          onChangeText={setCollectAmount}
                          keyboardType="numeric"
                          placeholder={`Max: ৳${cust.balance}`}
                        />
                        <View style={styles.collectMethodRow}>
                          {(['Cash', 'Bank Transfer', 'bKash / Nagad'] as const).map((m) => (
                            <TouchableOpacity
                              key={m}
                              style={[styles.collectMethodBtn, collectMethod === m && styles.collectMethodBtnActive]}
                              onPress={() => setCollectMethod(m)}
                            >
                              <Text style={[styles.collectMethodText, collectMethod === m && styles.collectMethodTextActive]}>
                                {m}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                          <TouchableOpacity
                            style={[styles.collectSubmitBtn, { backgroundColor: '#F3F4F6' }]}
                            onPress={() => setCollectCustomer(null)}
                          >
                            <Text style={{ color: '#1F1B2E', fontWeight: '700' }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.collectSubmitBtn, { backgroundColor: '#059669', flex: 1 }]}
                            onPress={handleCollectDue}
                            disabled={collectSubmitting}
                          >
                            {collectSubmitting ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <Text style={{ color: '#FFF', fontWeight: '800' }}>Confirm Payment</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={styles.duesLedgerBtn}
                          onPress={() => openCustomerLedger(cust.customerId || cust._id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="book-outline" size={15} color="#5F33E1" />
                          <Text style={styles.duesLedgerBtnText}>Ledger (খতিয়ান)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.collectDueBtn, { flex: 1.2 }]}
                          onPress={() => {
                            setCollectCustomer(cust);
                            setCollectAmount(String(cust.balance || ''));
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="cash-outline" size={16} color="#059669" />
                          <Text style={styles.collectDueBtnText}>Collect (জমা)</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal visible={customerPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Customer</Text>
                <Text style={styles.subtitle}>কাস্টমার সিলেক্ট করুন বা নতুন যোগ করুন</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={styles.pickerNewBtn}
                  onPress={() => {
                    setCustomerPickerVisible(false);
                    openNewCustomerModal();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={styles.pickerNewBtnText}>New</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCustomerPickerVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#7A7689" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by ID, name, phone or address..."
                  placeholderTextColor="#A09CB0"
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  clearButtonMode="while-editing"
                />
                {customerSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCustomerSearch('')}>
                    <Ionicons name="close-circle" size={18} color="#A09CB0" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {filteredCustomers.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <EmptyState
                    title="No Customers Found"
                    message="No matching registered customer found."
                    icon="people-outline"
                  />
                  <TouchableOpacity
                    style={[styles.createNewCustBtn, { marginTop: 16, paddingHorizontal: 20 }]}
                    onPress={() => {
                      setCustomerPickerVisible(false);
                      openNewCustomerModal();
                    }}
                  >
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={styles.createNewCustBtnText}>Create Customer Now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredCustomers.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={styles.customerPickItem}
                    onPress={() => {
                      setSelectedCustomer(c);
                      setSalePaymentType(c.customerType === 'credit' ? 'credit' : 'cash');
                      setCustomerPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerCustLeft}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View style={styles.custIdBadge}>
                          <Text style={styles.custIdText}>{c.customerId || 'CUST'}</Text>
                        </View>
                        <Text style={styles.pickerCustName}>{c.name}</Text>
                        <View
                          style={[
                            styles.custTypeBadgeSmall,
                            { backgroundColor: c.customerType === 'credit' ? '#F3E8FF' : '#E7F7F8' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.custTypeTextSmall,
                              { color: c.customerType === 'credit' ? '#5F33E1' : '#0D9488' },
                            ]}
                          >
                            {(c.customerType || 'cash').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name="call-outline" size={13} color="#7A7689" />
                        <Text style={styles.pickerCustSub}>{c.phone}</Text>
                      </View>

                      {!!c.address && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Ionicons name="location-outline" size={13} color="#5F33E1" />
                          <Text style={[styles.pickerCustSub, { color: '#4B5563' }]} numberOfLines={1}>
                            {c.address}
                            {c.city ? `, ${c.city}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 4 }}>
                      {(c.balance ?? 0) > 0 ? (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.pickerDueLabel}>Due (বাকি)</Text>
                          <Text style={styles.pickerDueVal}>৳{(c.balance ?? 0).toLocaleString()}</Text>
                        </View>
                      ) : null}
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <TouchableOpacity
                          style={styles.pickerLedgerBtn}
                          onPress={() => openCustomerLedger(c.customerId || c._id)}
                        >
                          <Ionicons name="book-outline" size={12} color="#5F33E1" />
                          <Text style={styles.pickerLedgerBtnText}>Ledger</Text>
                        </TouchableOpacity>
                        <View style={styles.selectArrowPill}>
                          <Text style={styles.selectArrowText}>Select</Text>
                          <Ionicons name="chevron-forward" size={14} color="#5F33E1" />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Register New Customer Modal */}
      <Modal visible={createCustomerModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Customer Registration</Text>
                <Text style={styles.subtitle}>কাস্টমার আইডি ও ঠিকানা সহ তথ্য পূরণ করুন</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateCustomerModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <FormInput
                label="Customer ID (স্বয়ংক্রিয় / অনন্য) *"
                value={newCustId}
                onChangeText={setNewCustId}
                placeholder="CUST-1001"
              />

              <FormInput
                label="Full Name (কাস্টমার নাম) *"
                value={newCustName}
                onChangeText={setNewCustName}
                placeholder="e.g. Rahim Chowdhury"
              />

              <FormInput
                label="Phone Number (মোবাইল নম্বর) *"
                value={newCustPhone}
                onChangeText={setNewCustPhone}
                keyboardType="phone-pad"
                placeholder="e.g. 01700000000"
              />

              <FormInput
                label="Full Address (ঠিকানা) *"
                value={newCustAddress}
                onChangeText={setNewCustAddress}
                placeholder="House, Road, Area, Thana..."
              />

              <FormInput
                label="City / District (শহর / জেলা)"
                value={newCustCity}
                onChangeText={setNewCustCity}
                placeholder="e.g. Dhaka, Chittagong"
              />

              <FormInput
                label="Email (ঐচ্ছিক)"
                value={newCustEmail}
                onChangeText={setNewCustEmail}
                keyboardType="email-address"
                placeholder="e.g. customer@example.com"
              />

              <Text style={styles.fieldLabel}>Customer Type (কাস্টমার ধরন)</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, newCustType === 'cash' && styles.toggleBtnActive]}
                  onPress={() => setNewCustType('cash')}
                >
                  <Text style={[styles.toggleText, newCustType === 'cash' && styles.toggleTextActive]}>
                    Cash Customer (নগদ)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, newCustType === 'credit' && styles.toggleBtnActiveCredit]}
                  onPress={() => setNewCustType('credit')}
                >
                  <Text style={[styles.toggleText, newCustType === 'credit' && styles.toggleTextActive]}>
                    Credit Customer (বাকি)
                  </Text>
                </TouchableOpacity>
              </View>

              {newCustType === 'credit' && (
                <FormInput
                  label="Credit Limit (সর্বোচ্চ বাকি সীমা ৳)"
                  value={newCustLimit}
                  onChangeText={setNewCustLimit}
                  keyboardType="numeric"
                  placeholder="50000"
                />
              )}

              <TouchableOpacity
                style={[styles.submitButton, creatingCustomer && { opacity: 0.7 }, { marginTop: 16 }]}
                onPress={handleSaveCustomer}
                disabled={creatingCustomer}
              >
                {creatingCustomer ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Save & Select for Invoice</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer ID Wise Ledger & History Modal */}
      <CustomerLedgerModal
        visible={ledgerModalVisible}
        customerIdOrId={ledgerCustomerId}
        onClose={() => setLedgerModalVisible(false)}
        onPaymentSuccess={() => {
          fetchOrders();
          loadCustomers();
        }}
      />

      {/* Invoice Print & Share Modal */}
      <InvoicePrintModal
        visible={printModalVisible}
        order={printOrder}
        onClose={() => setPrintModalVisible(false)}
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  modalBody: {
    paddingBottom: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  productPillList: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  productPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  productPillSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  productPillName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  productPillPrice: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  productPillTextSelected: {
    color: '#FFFFFF',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  methodCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAFBFC',
  },
  methodCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceVariant,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  methodTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  calcBox: {
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  calcLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  calcVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#CFD8DC',
    marginVertical: 6,
  },
  calcTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  calcTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  detailDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  detailStatusItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  detailMethodText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  infoText: {
    fontSize: 13,
    color: Colors.text,
    marginLeft: 8,
  },
  actionSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
    marginBottom: 10,
  },
  actionButtonsContainer: {
    gap: 10,
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtnConfirm: {
    backgroundColor: Colors.success,
  },
  actionBtnShipped: {
    backgroundColor: '#0288D1',
  },
  actionBtnDelivered: {
    backgroundColor: '#2E7D32',
  },
  actionBtnPaid: {
    backgroundColor: Colors.primary,
  },
  actionBtnCancel: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  duesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1.2,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  duesBtnText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 12.5,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9F8FD',
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
    gap: 5,
  },
  toggleBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  toggleBtnActiveCredit: {
    backgroundColor: '#5F33E1',
    borderColor: '#5F33E1',
  },
  toggleBtnActivePartial: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F1B2E',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  dueCustomerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
  },
  dueCustomerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dueCustomerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1B2E',
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
  dueCustomerPhone: {
    fontSize: 12,
    color: '#7A7689',
    marginTop: 2,
  },
  dueAmountLabel: {
    fontSize: 10.5,
    color: '#DC2626',
    fontWeight: '700',
  },
  dueAmountVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#DC2626',
  },
  collectDueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 6,
  },
  collectDueBtnText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 13,
  },
  collectBox: {
    backgroundColor: '#F9F8FD',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  collectMethodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  collectMethodBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEBFB',
    alignItems: 'center',
  },
  collectMethodBtnActive: {
    backgroundColor: '#5F33E1',
    borderColor: '#5F33E1',
  },
  collectMethodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A7689',
  },
  collectMethodTextActive: {
    color: '#FFFFFF',
  },
  collectSubmitBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Customer-First Invoice Styles
  selectedCustCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  selectedCustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  custBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
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
    letterSpacing: 0.5,
  },
  selectedCustName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1B2E',
  },
  changeCustBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  changeCustBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  custDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  custDetailText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  custDueNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  custDueNoticeText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  noCustCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    marginBottom: 14,
  },
  noCustAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  noCustTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#581C87',
  },
  noCustSubtitle: {
    fontSize: 12,
    color: '#7E22CE',
    marginTop: 2,
    lineHeight: 16,
  },
  noCustBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectExistingCustBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#5F33E1',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  selectExistingCustBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#5F33E1',
  },
  createNewCustBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5F33E1',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  createNewCustBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5F33E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  pickerNewBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
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
  customerPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.2,
    borderColor: '#F1F5F9',
  },
  pickerCustLeft: {
    flex: 1,
    paddingRight: 10,
  },
  pickerCustName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  custTypeBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  custTypeTextSmall: {
    fontSize: 9,
    fontWeight: '800',
  },
  pickerCustSub: {
    fontSize: 12,
    color: '#64748B',
  },
  pickerDueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  pickerDueVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
  },
  selectArrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
    marginTop: 4,
  },
  selectArrowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5F33E1',
  },
  discountRow: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  discountPromoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  discountPromoText: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '700',
    flex: 1,
  },
  ledgerBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  ledgerBtnSmallText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5F33E1',
  },
  duesLedgerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    borderWidth: 1.2,
    borderColor: '#DDD6FE',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 5,
  },
  duesLedgerBtnText: {
    color: '#5F33E1',
    fontWeight: '800',
    fontSize: 12.5,
  },
  pickerLedgerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  pickerLedgerBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#5F33E1',
  },
  printInvoiceMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  printInvoiceMainBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
  },
  reportsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  reportsBtnText: {
    color: '#5F33E1',
    fontWeight: '700',
    fontSize: 12.5,
  },
  fastCustSearchContainer: {
    marginBottom: 14,
  },
  fastCustInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  fastCustInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F1B2E',
    padding: 0,
  },
  suggestionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggIdBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  suggId: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4F46E5',
  },
  suggName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1B2E',
  },
  suggPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  suggAddress: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  fastCustActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  inlineAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  inlineAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5F33E1',
  },
  browseAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  browseAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  inlineRegisterBox: {
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E9D5FF',
    padding: 12,
    marginTop: 8,
  },
  inlineRegHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inlineRegTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#581C87',
  },
  inlineInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12.5,
    color: '#1F1B2E',
    marginBottom: 6,
  },
  miniTypeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignItems: 'center',
  },
  miniTypeBtnActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  miniTypeBtnActiveCredit: {
    backgroundColor: '#5F33E1',
    borderColor: '#5F33E1',
  },
  miniTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  miniTypeTextActive: {
    color: '#FFFFFF',
  },
  miniTypeTextActiveCredit: {
    color: '#FFFFFF',
  },
  inlineSaveBtn: {
    backgroundColor: '#5F33E1',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: 8,
  },
  inlineSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  quickCashPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 10,
  },
  quickCashPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickCashPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  quickCashPillDueActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  quickCashPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  quickCashPillTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  printSubmitButton: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
