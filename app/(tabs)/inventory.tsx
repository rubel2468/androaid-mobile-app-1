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
import ProductCard from '../../components/ProductCard';
import SearchBar from '../../components/SearchBar';
import FormInput from '../../components/FormInput';
import EmptyState from '../../components/EmptyState';
import FadeInView from '../../components/FadeInView';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/Api';

interface Product {
  _id: string;
  name?: string;
  sku?: string;
  category?: string | { _id?: string; name?: string };
  costPrice?: number;
  sellingPrice?: number;
  stockQuantity?: number;
  minStockLevel?: number;
  unit?: string;
}

interface StockValuation {
  totalProducts: number;
  totalUnits: number;
  totalCostValue: number;
  totalRetailValue: number;
  potentialProfit: number;
  marginPercent: number;
  lowStockCount: number;
  outOfStockCount: number;
}

type StockFilter = 'all' | 'low' | 'out';

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [valuation, setValuation] = useState<StockValuation | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Stock Adjustment Modal State
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Supplier delivery / Restock');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('10');
  const [unit, setUnit] = useState('pcs');
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      const [prodRes, valRes] = await Promise.all([
        apiGet<{ success: boolean; data: Product[] }>(
          `${API_ENDPOINTS.products}?search=${search}`
        ),
        apiGet<{ success: boolean; data: StockValuation }>(
          API_ENDPOINTS.stockValuation
        ).catch(() => null),
      ]);

      if (prodRes && prodRes.data) {
        setProducts(prodRes.data);
      }
      if (valRes && valRes.data) {
        setValuation(valRes.data);
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to fetch inventory' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setCategory('General');
    setCostPrice('');
    setSellingPrice('');
    setStockQuantity('');
    setMinStockLevel('10');
    setUnit('pcs');
    setModalVisible(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name ?? '');
    setSku(p.sku ?? '');
    const catName =
      typeof p.category === 'object' && p.category !== null
        ? (p.category as any).name || ''
        : p.category || 'General';
    setCategory(catName || '');
    setCostPrice(p.costPrice !== undefined && p.costPrice !== null ? String(p.costPrice) : '');
    setSellingPrice(p.sellingPrice !== undefined && p.sellingPrice !== null ? String(p.sellingPrice) : '');
    setStockQuantity(p.stockQuantity !== undefined && p.stockQuantity !== null ? String(p.stockQuantity) : '');
    setMinStockLevel(p.minStockLevel !== undefined && p.minStockLevel !== null ? String(p.minStockLevel) : '10');
    setUnit(p.unit ?? 'pcs');
    setModalVisible(true);
  };

  const openAdjustModal = (p: Product) => {
    setAdjustProduct(p);
    setAdjustType('add');
    setAdjustQty('');
    setAdjustReason('Supplier delivery / Restock');
    setAdjustModalVisible(true);
  };

  const handleSaveProduct = async () => {
    const trimmedName = (name ?? '').trim();
    const trimmedSku = (sku ?? '').trim();
    const trimmedSellingPrice = (sellingPrice ?? '').toString().trim();

    if (!trimmedName || !trimmedSku || !trimmedSellingPrice) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please fill name, sku and price.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        sku: trimmedSku,
        category: (category ?? '').trim() || 'General',
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(trimmedSellingPrice) || 0,
        stockQuantity: Number(stockQuantity) || 0,
        minStockLevel: Number(minStockLevel) || 10,
        unit: (unit ?? '').trim() || 'pcs',
      };

      if (editingProduct) {
        await apiPut(`${API_ENDPOINTS.products}/${editingProduct._id}`, payload);
        Toast.show({ type: 'success', text1: 'Updated', text2: 'Product updated successfully.' });
      } else {
        await apiPost(API_ENDPOINTS.products, payload);
        Toast.show({ type: 'success', text1: 'Created', text2: 'Product added successfully.' });
      }

      setModalVisible(false);
      fetchInventory();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Operation failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAdjust = async () => {
    if (!adjustProduct || !adjustQty.trim() || Number(adjustQty) <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid quantity.' });
      return;
    }

    setAdjustSubmitting(true);
    try {
      const endpoint = API_ENDPOINTS.adjustStock(adjustProduct._id);
      await apiPost(endpoint, {
        type: adjustType,
        quantity: Number(adjustQty),
        reason: adjustReason,
      });

      Toast.show({
        type: 'success',
        text1: 'Stock Adjusted',
        text2: `Stock updated for ${adjustProduct.name}`,
      });

      setAdjustModalVisible(false);
      fetchInventory();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Adjustment Error', text2: err.message || 'Failed to adjust stock' });
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleDeleteProduct = (p: Product) => {
    Alert.alert('Delete Product', `Are you sure you want to delete ${p.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`${API_ENDPOINTS.products}/${p._id}`);
            Toast.show({ type: 'success', text1: 'Deleted', text2: 'Product removed.' });
            fetchInventory();
          } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Error', text2: err.message });
          }
        },
      },
    ]);
  };

  // Filter products by selection
  const filteredProducts = products.filter((p) => {
    const qty = p.stockQuantity ?? 0;
    const min = p.minStockLevel ?? 10;
    if (filter === 'low') return qty > 0 && qty <= min;
    if (filter === 'out') return qty <= 0;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory & Stock</Text>
          <Text style={styles.subtitle}>{products.length} catalog items</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#FFF" />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Advance Stock Valuation Banner */}
        <FadeInView delay={60} style={styles.valuationBanner}>
          <View style={styles.valHeader}>
            <View style={styles.valTagPill}>
              <Ionicons name="stats-chart" size={13} color="#5F33E1" />
              <Text style={styles.valTagText}>Stock Valuation & Assets</Text>
            </View>
            <Text style={styles.marginText}>+{valuation?.marginPercent ?? 25}% Margin</Text>
          </View>

          <View style={styles.valRow}>
            <View style={styles.valCol}>
              <Text style={styles.valLabel}>Total Stock Value (Cost)</Text>
              <Text style={styles.valCostNumber}>
                ৳{(valuation?.totalCostValue ?? 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.valDivider} />
            <View style={styles.valCol}>
              <Text style={styles.valLabel}>Retail Potential Value</Text>
              <Text style={styles.valRetailNumber}>
                ৳{(valuation?.totalRetailValue ?? 0).toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.valFooterRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{valuation?.totalUnits ?? 0}</Text>
              <Text style={styles.metricLbl}>Units in Store</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#EF4444' }]}>{valuation?.lowStockCount ?? 0}</Text>
              <Text style={styles.metricLbl}>Low Stock Alert</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#059669' }]}>
                ৳{(valuation?.potentialProfit ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.metricLbl}>Est. Profit</Text>
            </View>
          </View>
        </FadeInView>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>
              All ({products.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'low' && styles.filterPillActive]}
            onPress={() => setFilter('low')}
          >
            <Text style={[styles.filterPillText, filter === 'low' && styles.filterPillTextActive]}>
              Low Stock ({valuation?.lowStockCount ?? 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'out' && styles.filterPillActive]}
            onPress={() => setFilter('out')}
          >
            <Text style={[styles.filterPillText, filter === 'out' && styles.filterPillTextActive]}>
              Out of Stock ({valuation?.outOfStockCount ?? 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search SKU, product name..."
            onClear={() => setSearch('')}
          />
        </View>

        {/* Products List */}
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="No products found"
              message={search ? 'Try another keyword.' : 'Add your first product to get started.'}
            />
          ) : (
            filteredProducts.map((item, idx) => (
              <FadeInView key={item._id} delay={idx * 30}>
                <ProductCard
                  name={item.name || 'Unnamed Product'}
                  sku={item.sku || 'N/A'}
                  price={`৳${(item.sellingPrice ?? 0).toLocaleString()}`}
                  costPrice={`৳${(item.costPrice ?? 0).toLocaleString()}`}
                  stock={item.stockQuantity ?? 0}
                  minStock={item.minStockLevel ?? 10}
                  category={item.category}
                  onAdjustStock={() => openAdjustModal(item)}
                  onEdit={() => openEditModal(item)}
                  onDelete={() => handleDeleteProduct(item)}
                />
              </FadeInView>
            ))
          )}
        </View>
      </ScrollView>

      {/* Stock Adjustment Modal */}
      <Modal visible={adjustModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Adjust Stock</Text>
                <Text style={styles.modalSubtitle}>{adjustProduct?.name} (Current: {adjustProduct?.stockQuantity ?? 0} {adjustProduct?.unit || 'pcs'})</Text>
              </View>
              <TouchableOpacity onPress={() => setAdjustModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#7A7689" />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={styles.adjustTypeRow}>
              <TouchableOpacity
                style={[styles.adjustTypeBtn, adjustType === 'add' && styles.adjustTypeBtnActive]}
                onPress={() => setAdjustType('add')}
              >
                <Ionicons name="add-circle" size={16} color={adjustType === 'add' ? '#FFF' : '#059669'} />
                <Text style={[styles.adjustTypeText, adjustType === 'add' && styles.adjustTypeTextActive]}>+ Add Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustTypeBtn, adjustType === 'subtract' && styles.adjustTypeBtnActiveSub]}
                onPress={() => setAdjustType('subtract')}
              >
                <Ionicons name="remove-circle" size={16} color={adjustType === 'subtract' ? '#FFF' : '#DC2626'} />
                <Text style={[styles.adjustTypeText, adjustType === 'subtract' && styles.adjustTypeTextActive]}>- Out / Damage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustTypeBtn, adjustType === 'set' && styles.adjustTypeBtnActiveSet]}
                onPress={() => setAdjustType('set')}
              >
                <Ionicons name="refresh-circle" size={16} color={adjustType === 'set' ? '#FFF' : '#D97706'} />
                <Text style={[styles.adjustTypeText, adjustType === 'set' && styles.adjustTypeTextActive]}>= Set Audit</Text>
              </TouchableOpacity>
            </View>

            <FormInput
              label="Quantity"
              placeholder="e.g. 10"
              keyboardType="numeric"
              value={adjustQty}
              onChangeText={setAdjustQty}
            />

            <FormInput
              label="Reason / Notes"
              placeholder="e.g. Received bonus, Damaged packaging, Physical recount"
              value={adjustReason}
              onChangeText={setAdjustReason}
            />

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleConfirmAdjust}
              disabled={adjustSubmitting}
            >
              {adjustSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Confirm Stock Adjustment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Product Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'Add New Product'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#7A7689" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <FormInput label="Product Name *" placeholder="e.g. Wireless Mouse" value={name} onChangeText={setName} />
              <FormInput label="SKU Code *" placeholder="e.g. SKU-1001" value={sku} onChangeText={setSku} />
              <FormInput label="Category" placeholder="e.g. Electronics, Clothing" value={category} onChangeText={setCategory} />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FormInput label="Cost Price (৳) *" placeholder="Buy cost" keyboardType="numeric" value={costPrice} onChangeText={setCostPrice} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput label="Selling Price (৳) *" placeholder="Sale price" keyboardType="numeric" value={sellingPrice} onChangeText={setSellingPrice} />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FormInput label="Stock Qty" placeholder="0" keyboardType="numeric" value={stockQuantity} onChangeText={setStockQuantity} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormInput label="Min Alert Level" placeholder="10" keyboardType="numeric" value={minStockLevel} onChangeText={setMinStockLevel} />
                </View>
              </View>

              <FormInput label="Unit (pcs, kg, ltr, box)" placeholder="pcs" value={unit} onChangeText={setUnit} />
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>{editingProduct ? 'Save Changes' : 'Create Product'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#5F33E1',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  valuationBanner: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
    shadowColor: '#5F33E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  valHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  valTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  valTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#5F33E1',
  },
  marginText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  valRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F0FD',
  },
  valCol: {
    flex: 1,
  },
  valLabel: {
    fontSize: 11,
    color: '#7A7689',
    fontWeight: '600',
    marginBottom: 4,
  },
  valCostNumber: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1F1B2E',
  },
  valRetailNumber: {
    fontSize: 19,
    fontWeight: '800',
    color: '#5F33E1',
  },
  valDivider: {
    width: 1,
    backgroundColor: '#F0EDFA',
    marginHorizontal: 14,
  },
  valFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1B2E',
  },
  metricLbl: {
    fontSize: 10.5,
    color: '#7A7689',
    fontWeight: '500',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
  },
  filterPillActive: {
    backgroundColor: '#5F33E1',
    borderColor: '#5F33E1',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A7689',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  loader: {
    marginTop: 32,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  adjustTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  adjustTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9F8FD',
    borderWidth: 1.2,
    borderColor: '#EFEBFB',
    gap: 4,
  },
  adjustTypeBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  adjustTypeBtnActiveSub: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  adjustTypeBtnActiveSet: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  adjustTypeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1F1B2E',
  },
  adjustTypeTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
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
});
