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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors } from '../../constants/Colors';
import OrderCard from '../../components/OrderCard';
import FormInput from '../../components/FormInput';
import EmptyState from '../../components/EmptyState';
import FadeInView from '../../components/FadeInView';
import { apiGet, apiPost, apiPut } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/Api';

interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  supplier?: { name: string; phone?: string; company?: string };
  totalAmount: number;
  status: string;
  items: Array<{ product?: { name: string }; quantity: number; costPrice: number }>;
  createdAt: string;
}

interface ProductOption {
  _id: string;
  name: string;
  costPrice: number;
}

export default function PurchaseScreen() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiGet<{ success: boolean; data: PurchaseOrder[] }>(API_ENDPOINTS.purchases);
      if (res && res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to fetch purchases' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadProducts = async () => {
    try {
      const res = await apiGet<{ success: boolean; data: ProductOption[] }>(API_ENDPOINTS.products);
      if (res && res.data && res.data.length > 0) {
        setAvailableProducts(res.data);
        setSelectedProductId(res.data[0]._id);
        setCostPrice(String(res.data[0].costPrice || 0));
      }
    } catch (e) {
      console.warn('Failed to load products');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const openCreateModal = () => {
    loadProducts();
    setSupplierName('');
    setSupplierPhone('');
    setQuantity('10');
    setModalVisible(true);
  };

  const handleProductSelect = (p: ProductOption) => {
    setSelectedProductId(p._id);
    setCostPrice(String(p.costPrice || 0));
  };

  const handleCreatePO = async () => {
    const sName = (supplierName || '').trim();
    if (!sName || !selectedProductId) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill supplier & product.' });
      return;
    }

    setSubmitting(true);
    try {
      const qty = parseInt(quantity, 10) || 1;
      const unitCost = parseFloat(costPrice) || 0;

      const payload = {
        supplierName: sName,
        supplierPhone: (supplierPhone || '').trim() || '01700000000',
        items: [
          {
            product: selectedProductId,
            qty: qty,
            quantity: qty,
            costPrice: unitCost,
          },
        ],
        paidAmount: unitCost * qty,
      };

      await apiPost(API_ENDPOINTS.purchases, payload);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Purchase Order created.' });
      setModalVisible(false);
      fetchOrders();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Creation Failed', text2: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveOrder = (order: PurchaseOrder) => {
    if (order.status === 'received') {
      Toast.show({ type: 'info', text1: 'Already Received', text2: 'This order is already marked as received.' });
      return;
    }

    Alert.alert(
      'Receive Goods',
      `Mark ${order.orderNumber} as received? This will automatically update your inventory stock.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Receipt',
          onPress: async () => {
            try {
              await apiPut(`${API_ENDPOINTS.purchases}/${order._id}/receive`, {});
              Toast.show({ type: 'success', text1: 'Goods Received', text2: 'Stock has been updated.' });
              fetchOrders();
            } catch (err: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: err.message });
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Purchases</Text>
          <Text style={styles.subtitle}>{orders.length} Purchase Orders</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#FFF" />
          <Text style={styles.addBtnText}>New PO</Text>
        </TouchableOpacity>
      </View>

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
              title="No Purchase Orders"
              message="Create a purchase order to restock your inventory."
              icon="bag-handle-outline"
            />
          }
          renderItem={({ item, index }) => (
            <FadeInView delay={Math.min(index * 35, 300)}>
              <OrderCard
                orderNumber={item.orderNumber}
                customerName={item.supplier?.name || 'External Supplier'}
                date={new Date(item.createdAt).toLocaleDateString()}
                amount={`৳${(item.totalAmount ?? 0).toLocaleString()}`}
                status={item.status}
                itemCount={item.items?.length || 1}
                onPress={() => handleReceiveOrder(item)}
              />
            </FadeInView>
          )}
        />
      )}

      {/* Create PO Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Purchase Order</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <FormInput
                label="Supplier Name *"
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder="e.g. Acme Fabric Mills"
              />
              <FormInput
                label="Supplier Contact Phone"
                value={supplierPhone}
                onChangeText={setSupplierPhone}
                keyboardType="phone-pad"
                placeholder="018xxxxxxxx"
              />

              <Text style={styles.fieldLabel}>Select Item to Restock *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productPillList}>
                {availableProducts.map((p) => {
                  const isSelected = p._id === selectedProductId;
                  return (
                    <TouchableOpacity
                      key={p._id}
                      style={[styles.productPill, isSelected && styles.productPillSelected]}
                      onPress={() => handleProductSelect(p)}
                    >
                      <Text style={[styles.productPillName, isSelected && styles.productPillTextSelected]}>
                        {p.name}
                      </Text>
                      <Text style={[styles.productPillPrice, isSelected && styles.productPillTextSelected]}>
                        Cost: ৳{p.costPrice}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FormInput
                    label="Unit Cost (৳)"
                    value={costPrice}
                    onChangeText={setCostPrice}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FormInput
                    label="Quantity to Order"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                onPress={handleCreatePO}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Submit Purchase Order</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 12,
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
  formRow: {
    flexDirection: 'row',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
