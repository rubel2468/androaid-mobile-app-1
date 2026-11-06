import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/Colors';

interface InvoicePrintModalProps {
  visible: boolean;
  order: any;
  onClose: () => void;
}

export default function InvoicePrintModal({ visible, order, onClose }: InvoicePrintModalProps) {
  const [printing, setPrinting] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);

  if (!order) return null;

  const items = order.items || [];
  const customer = order.customer || {};
  const orderNumber = order.orderNumber || 'SO-0000';
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString();
  const orderTime = new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const subtotal = order.subtotal || order.totalAmount || 0;
  const discount = order.discount || 0;
  const grandTotal = order.totalAmount || 0;
  const paidAmount = order.paidAmount || 0;
  const dueAmount = Math.max(0, grandTotal - paidAmount);
  const paymentMethod = (order.paymentMethod || 'cash').toUpperCase();
  const paymentStatus = (order.paymentStatus || 'pending').toUpperCase();

  const generateInvoiceHtml = () => {
    const rowsHtml = items
      .map(
        (it: any, idx: number) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${it.productName || it.product?.name || 'Item'}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.qty || it.quantity || 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">৳${(it.price || it.unitPrice || 0).toLocaleString()}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">৳${(it.total || (it.price * (it.qty || 1))).toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 24px;
              font-size: 13px;
              line-height: 1.5;
            }
            .invoice-box {
              max-width: 800px;
              margin: auto;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 24px;
            }
            .header-table {
              width: 100%;
              margin-bottom: 24px;
              border-bottom: 2px solid #5F33E1;
              padding-bottom: 16px;
            }
            .brand-name {
              font-size: 24px;
              font-weight: 900;
              color: #5F33E1;
              margin: 0;
            }
            .company-sub {
              font-size: 11px;
              color: #64748b;
              margin: 3px 0 0 0;
            }
            .invoice-title {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              text-align: right;
              margin: 0;
            }
            .inv-meta {
              text-align: right;
              font-size: 12px;
              color: #475569;
              margin-top: 4px;
            }
            .info-grid {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              gap: 20px;
            }
            .info-card {
              flex: 1;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px;
            }
            .info-card h4 {
              margin: 0 0 6px 0;
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .cust-name {
              font-size: 15px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 4px 0;
            }
            .cust-id-pill {
              display: inline-block;
              background-color: #e0e7ff;
              color: #4338ca;
              font-weight: 800;
              font-size: 11px;
              padding: 2px 6px;
              border-radius: 4px;
              margin-bottom: 6px;
            }
            .table-items {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .table-items th {
              background-color: #5F33E1;
              color: #ffffff;
              padding: 10px;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .calc-table {
              width: 280px;
              margin-left: auto;
              margin-bottom: 24px;
              border-collapse: collapse;
            }
            .calc-table td {
              padding: 6px 8px;
            }
            .grand-row {
              border-top: 2px solid #5F33E1;
              border-bottom: 2px solid #5F33E1;
              font-size: 15px;
              font-weight: 900;
              color: #5F33E1;
            }
            .paid-text {
              color: #059669;
              font-weight: 800;
            }
            .due-text {
              color: #dc2626;
              font-weight: 900;
            }
            .footer {
              margin-top: 40px;
              padding-top: 16px;
              border-top: 1px dashed #cbd5e1;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 11px;
              color: #64748b;
            }
            .sign-box {
              text-align: center;
              border-top: 1px solid #94a3b8;
              padding-top: 4px;
              width: 160px;
            }
            .discount-tag {
              color: #059669;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <table class="header-table">
              <tr>
                <td>
                  <h1 class="brand-name">ERP ENTERPRISE</h1>
                  <p class="company-sub">Complete Business & Stock Management System</p>
                  <p class="company-sub">Hotline: 01700-000000 | Dhaka, Bangladesh</p>
                </td>
                <td>
                  <h2 class="invoice-title">SALES INVOICE</h2>
                  <div class="inv-meta"><strong>Invoice #:</strong> ${orderNumber}</div>
                  <div class="inv-meta"><strong>Date:</strong> ${orderDate} ${orderTime}</div>
                  <div class="inv-meta"><strong>Payment Status:</strong> <span style="font-weight: bold;">${paymentStatus}</span></div>
                </td>
              </tr>
            </table>

            <div class="info-grid">
              <div class="info-card">
                <h4>Customer Details (গ্রাহকের তথ্য)</h4>
                ${customer.customerId ? `<div class="cust-id-pill">ID: ${customer.customerId}</div>` : ''}
                <div class="cust-name">${customer.name || 'Walk-in Customer'}</div>
                <div><strong>Phone:</strong> ${customer.phone || 'N/A'}</div>
                <div><strong>Address:</strong> ${customer.address ? `${customer.address}${customer.city ? `, ${customer.city}` : ''}` : 'Counter Sale'}</div>
              </div>

              <div class="info-card">
                <h4>Payment & Delivery Info</h4>
                <div><strong>Payment Mode:</strong> ${paymentMethod}</div>
                <div><strong>Order Status:</strong> ${(order.status || 'pending').toUpperCase()}</div>
                ${customer.balance ? `<div style="margin-top: 6px; color: #dc2626; font-weight: bold;">Total Outstanding Due: ৳${customer.balance.toLocaleString()}</div>` : ''}
              </div>
            </div>

            <table class="table-items">
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">#</th>
                  <th style="text-align: left;">Product / Item Description</th>
                  <th style="width: 70px; text-align: center;">Qty</th>
                  <th style="width: 100px; text-align: right;">Unit Price</th>
                  <th style="width: 110px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <table class="calc-table">
              <tr>
                <td>Subtotal:</td>
                <td style="text-align: right; font-weight: 600;">৳${subtotal.toLocaleString()}</td>
              </tr>
              ${
                discount > 0
                  ? `
                <tr>
                  <td class="discount-tag">Special Discount (2%):</td>
                  <td style="text-align: right;" class="discount-tag">-৳${discount.toLocaleString()}</td>
                </tr>
              `
                  : ''
              }
              <tr class="grand-row">
                <td>Grand Total:</td>
                <td style="text-align: right;">৳${grandTotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Paid Amount:</td>
                <td style="text-align: right;" class="paid-text">৳${paidAmount.toLocaleString()}</td>
              </tr>
              ${
                dueAmount > 0
                  ? `
                <tr>
                  <td class="due-text">Due (বাকি):</td>
                  <td style="text-align: right;" class="due-text">৳${dueAmount.toLocaleString()}</td>
                </tr>
              `
                  : ''
              }
            </table>

            <div class="footer">
              <div>
                <p style="margin: 0;"><strong>Terms & Notes:</strong></p>
                <p style="margin: 2px 0 0 0;">Thank you for your business! Goods once sold can be exchanged within 7 days.</p>
              </div>
              <div class="sign-box">
                Authorized Signature
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const html = generateInvoiceHtml();
      await Print.printAsync({ html });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Print Error', text2: err.message || 'Could not print invoice' });
    } finally {
      setPrinting(false);
    }
  };

  const handleSharePdf = async () => {
    setSharing(true);
    try {
      const html = generateInvoiceHtml();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `Invoice ${orderNumber}`,
        });
      } else {
        Toast.show({ type: 'info', text1: 'PDF Saved', text2: `Invoice saved at ${uri}` });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Share Error', text2: err.message || 'Could not generate PDF' });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="print" size={20} color="#5F33E1" />
                <Text style={styles.title}>Invoice Print & PDF</Text>
              </View>
              <Text style={styles.subtitle}>{orderNumber} • {customer.name || 'Walk-in'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#1F1B2E" />
            </TouchableOpacity>
          </View>

          {/* Action Bar (Print & Share Buttons) */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.printBtn]}
              onPress={handlePrint}
              disabled={printing}
              activeOpacity={0.85}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="print-outline" size={18} color="#FFF" />
                  <Text style={styles.printBtnText}>Print Invoice (প্রিন্ট)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.shareBtn]}
              onPress={handleSharePdf}
              disabled={sharing}
              activeOpacity={0.85}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#5F33E1" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={18} color="#5F33E1" />
                  <Text style={styles.shareBtnText}>Share / PDF (শেয়ার)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Printable Invoice Preview View */}
          <ScrollView contentContainerStyle={styles.previewScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.previewPaper}>
              {/* Paper Header */}
              <View style={styles.paperHeader}>
                <View>
                  <Text style={styles.paperBrand}>ERP ENTERPRISE</Text>
                  <Text style={styles.paperBrandSub}>Complete Business Management</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.paperInvTitle}>INVOICE</Text>
                  <Text style={styles.paperInvNumber}>{orderNumber}</Text>
                  <Text style={styles.paperDate}>{orderDate} {orderTime}</Text>
                </View>
              </View>

              <View style={styles.paperDivider} />

              {/* Customer Box */}
              <View style={styles.paperCustomerBox}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paperSectionTitle}>Bill To (ক্রেতার তথ্য):</Text>
                  {customer.customerId && (
                    <View style={styles.previewCustIdPill}>
                      <Text style={styles.previewCustIdText}>ID: {customer.customerId}</Text>
                    </View>
                  )}
                  <Text style={styles.previewCustName}>{customer.name || 'Walk-in Customer'}</Text>
                  {!!customer.phone && <Text style={styles.previewCustSub}>{customer.phone}</Text>}
                  {!!customer.address && (
                    <Text style={styles.previewCustSub}>
                      {customer.address}{customer.city ? `, ${customer.city}` : ''}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.paperSectionTitle}>Payment Mode:</Text>
                  <Text style={styles.previewMethodText}>{paymentMethod}</Text>
                  <View style={[styles.previewStatusBadge, { backgroundColor: paymentStatus === 'PAID' ? '#ECFDF5' : '#FEF2F2' }]}>
                    <Text style={[styles.previewStatusText, { color: paymentStatus === 'PAID' ? '#059669' : '#DC2626' }]}>
                      {paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items Table */}
              <View style={styles.itemsTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeadCell, { flex: 2 }]}>Item</Text>
                  <Text style={[styles.tableHeadCell, { flex: 0.8, textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'right' }]}>Rate</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
                </View>
                {items.map((it: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2, fontWeight: '700' }]}>
                      {it.productName || it.product?.name || 'Item'}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center' }]}>
                      {it.qty || it.quantity || 1}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                      ৳{(it.price || it.unitPrice || 0).toLocaleString()}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right', fontWeight: '800' }]}>
                      ৳{(it.total || (it.price * (it.qty || 1))).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Financial Totals */}
              <View style={styles.calcContainer}>
                <View style={styles.calcLine}>
                  <Text style={styles.calcLabel}>Subtotal:</Text>
                  <Text style={styles.calcVal}>৳{subtotal.toLocaleString()}</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.calcLine}>
                    <Text style={[styles.calcLabel, { color: '#059669', fontWeight: '700' }]}>
                      Special Discount (2%):
                    </Text>
                    <Text style={[styles.calcVal, { color: '#059669', fontWeight: '800' }]}>
                      -৳{discount.toLocaleString()}
                    </Text>
                  </View>
                )}
                <View style={[styles.calcLine, styles.grandLine]}>
                  <Text style={styles.grandLabel}>Grand Total:</Text>
                  <Text style={styles.grandVal}>৳{grandTotal.toLocaleString()}</Text>
                </View>
                <View style={styles.calcLine}>
                  <Text style={styles.calcLabel}>Paid Amount:</Text>
                  <Text style={[styles.calcVal, { color: '#059669', fontWeight: '800' }]}>
                    ৳{paidAmount.toLocaleString()}
                  </Text>
                </View>
                {dueAmount > 0 && (
                  <View style={styles.calcLine}>
                    <Text style={[styles.calcLabel, { color: '#DC2626', fontWeight: '700' }]}>Customer Due (বাকি):</Text>
                    <Text style={[styles.calcVal, { color: '#DC2626', fontWeight: '900' }]}>
                      ৳{dueAmount.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Terms & Footer */}
              <View style={styles.paperFooter}>
                <Text style={styles.footerNote}>
                  * Thank you for your business. Terms apply.
                </Text>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureText}>Authorized Signature</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '94%',
    minHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
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
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  printBtn: {
    backgroundColor: '#5F33E1',
  },
  printBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  shareBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#5F33E1',
  },
  shareBtnText: {
    color: '#5F33E1',
    fontWeight: '800',
    fontSize: 13,
  },
  previewScroll: {
    padding: 16,
    paddingBottom: 36,
  },
  previewPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paperBrand: {
    fontSize: 18,
    fontWeight: '900',
    color: '#5F33E1',
  },
  paperBrandSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  paperInvTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  paperInvNumber: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#475569',
    marginTop: 1,
  },
  paperDate: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  paperDivider: {
    height: 1.5,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  paperCustomerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  paperSectionTitle: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewCustIdPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  previewCustIdText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338CA',
  },
  previewCustName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewCustSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  previewMethodText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  previewStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  previewStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemsTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#5F33E1',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeadCell: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableCell: {
    fontSize: 11.5,
    color: '#1E293B',
  },
  calcContainer: {
    alignSelf: 'flex-end',
    width: 220,
    gap: 4,
    marginBottom: 16,
  },
  calcLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  calcLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  calcVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  grandLine: {
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#5F33E1',
    paddingVertical: 6,
    marginVertical: 2,
  },
  grandLabel: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#5F33E1',
  },
  grandVal: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#5F33E1',
  },
  paperFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  footerNote: {
    fontSize: 10,
    color: '#94A3B8',
    flex: 1,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    paddingTop: 4,
    width: 120,
    alignItems: 'center',
  },
  signatureText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
  },
});
