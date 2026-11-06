import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { apiGet } from '../utils/api';
import { API_ENDPOINTS } from '../constants/Api';

type ReportType = 'daily' | 'dues' | 'stock' | 'pnl' | 'bank';

interface ReportExportModalProps {
  visible: boolean;
  initialType?: ReportType;
  onClose: () => void;
}

export default function ReportExportModal({
  visible,
  initialType = 'daily',
  onClose,
}: ReportExportModalProps) {
  const [activeReport, setActiveReport] = useState<ReportType>(initialType);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [allRep, dailyRep] = await Promise.all([
        apiGet<{ success: boolean; data: any }>(API_ENDPOINTS.allReportsData).catch(() => null),
        apiGet<{ success: boolean; data: any }>(API_ENDPOINTS.dailySummary).catch(() => null),
      ]);

      if (allRep && allRep.data) {
        setReportData(allRep.data);
      }
      if (dailyRep && dailyRep.data) {
        setDailyData(dailyRep.data);
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Report Load Error', text2: err.message || 'Could not load report' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setActiveReport(initialType);
      fetchReportData();
    }
  }, [visible, initialType, fetchReportData]);

  const generateReportHtml = () => {
    const today = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let title = '';
    let bodyContent = '';

    if (activeReport === 'daily') {
      title = 'DAILY SALES & CASH COLLECTION STATEMENT';
      const orders = dailyData?.dayOrders || [];
      const orderRows = orders
        .map(
          (o: any, idx: number) => `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${o.orderNumber}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${o.customer?.name || 'Walk-in'} ${o.customer?.customerId ? `(${o.customer.customerId})` : ''}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">৳${(o.totalAmount || 0).toLocaleString()}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #059669; font-weight: 700;">৳${(o.paidAmount || 0).toLocaleString()}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #dc2626; font-weight: 700;">৳${Math.max(0, (o.totalAmount || 0) - (o.paidAmount || 0)).toLocaleString()}</td>
          </tr>
        `
        )
        .join('');

      bodyContent = `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <table style="width: 100%;">
            <tr>
              <td><strong>Today's Total Sales (মোট বিক্রি):</strong> ৳${(dailyData?.dailySalesTotal || 0).toLocaleString()}</td>
              <td style="text-align: right;"><strong>Sales Cash Inflow (বিক্রি থেকে নগদ):</strong> ৳${(dailyData?.dailySalesCashCollected || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td><strong>Due Sales (আজকের বাকি বিক্রি):</strong> ৳${(dailyData?.dailyDueSales || 0).toLocaleString()}</td>
              <td style="text-align: right;"><strong>Previous Dues Collected (বকেয়া আদায়):</strong> +৳${(dailyData?.dailyPreviousDuesCollected || 0).toLocaleString()}</td>
            </tr>
            <tr style="font-size: 14px; color: #166534; font-weight: bold; border-top: 1px solid #cbd5e1;">
              <td style="padding-top: 6px;">Total Cash Collected (মোট নগদ কালেকশন):</td>
              <td style="text-align: right; padding-top: 6px;">৳${(dailyData?.totalCashCollectedToday || 0).toLocaleString()}</td>
            </tr>
            <tr style="font-size: 14px; color: #1e40af; font-weight: bold;">
              <td>Bank Deposited (ব্যাংকে জমা):</td>
              <td style="text-align: right;">-৳${(dailyData?.totalBankDepositedToday || 0).toLocaleString()}</td>
            </tr>
            <tr style="font-size: 16px; color: #5F33E1; font-weight: 900; border-top: 2px solid #5F33E1;">
              <td style="padding-top: 6px;">Net Cash in Hand (হাতে অবশিষ্ট নগদ টাকা):</td>
              <td style="text-align: right; padding-top: 6px;">৳${(dailyData?.netCashInHandToday || 0).toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <h3 style="margin: 16px 0 8px 0; color: #0f172a;">Today's Invoice Breakdown (${orders.length} orders)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <thead>
            <tr style="background: #5F33E1; color: #FFF;">
              <th style="padding: 6px 8px; text-align: center;">#</th>
              <th style="padding: 6px 8px; text-align: left;">Invoice #</th>
              <th style="padding: 6px 8px; text-align: left;">Customer</th>
              <th style="padding: 6px 8px; text-align: right;">Total Amount</th>
              <th style="padding: 6px 8px; text-align: right;">Paid Cash</th>
              <th style="padding: 6px 8px; text-align: right;">Due</th>
            </tr>
          </thead>
          <tbody>
            ${orderRows || '<tr><td colspan="6" style="padding: 10px; text-align: center;">No orders recorded today.</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (activeReport === 'dues') {
      title = 'CUSTOMER OUTSTANDING DUES & BALANCE REPORT';
      const custs = reportData?.dues?.customers || [];
      const totalDue = reportData?.dues?.totalReceivables || 0;
      const rows = custs
        .map(
          (c: any, idx: number) => `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #4338ca;">${c.customerId || 'CUST'}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${c.name}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${c.phone || '-'}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${c.address ? `${c.address}${c.city ? `, ${c.city}` : ''}` : '-'}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 900; color: #dc2626;">৳${(c.balance || 0).toLocaleString()}</td>
          </tr>
        `
        )
        .join('');

      bodyContent = `
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <h2 style="margin: 0; color: #dc2626; font-size: 22px;">Total Market Due: ৳${totalDue.toLocaleString()}</h2>
          <p style="margin: 4px 0 0 0; color: #991b1b; font-size: 12px;">Active Due Customers: ${custs.length} accounts</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <thead>
            <tr style="background: #dc2626; color: #FFF;">
              <th style="padding: 6px 8px; text-align: center;">#</th>
              <th style="padding: 6px 8px; text-align: left;">Customer ID</th>
              <th style="padding: 6px 8px; text-align: left;">Customer Name</th>
              <th style="padding: 6px 8px; text-align: left;">Phone</th>
              <th style="padding: 6px 8px; text-align: left;">Address</th>
              <th style="padding: 6px 8px; text-align: right;">Outstanding Due (বাকি)</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6" style="padding: 10px; text-align: center;">No due customers found.</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (activeReport === 'stock') {
      title = 'INVENTORY & STOCK VALUATION REPORT';
      const stock = reportData?.stock || {};
      const prods = stock.products || [];
      const rows = prods
        .map(
          (p: any, idx: number) => `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${p.name}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${p.sku || '-'}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${p.stockQuantity}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">৳${(p.costPrice || 0).toLocaleString()}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">৳${(p.sellingPrice || 0).toLocaleString()}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">৳${(p.totalCostValue || 0).toLocaleString()}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #059669;">৳${(p.totalRetailValue || 0).toLocaleString()}</td>
          </tr>
        `
        )
        .join('');

      bodyContent = `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <table style="width: 100%;">
            <tr>
              <td><strong>Total Stock Investment (কেনা মূল্য):</strong> ৳${(stock.totalCostValue || 0).toLocaleString()}</td>
              <td style="text-align: right;"><strong>Total Retail Value (বিক্রি মূল্য):</strong> ৳${(stock.totalRetailValue || 0).toLocaleString()}</td>
            </tr>
            <tr style="font-size: 14px; color: #166534; font-weight: bold; border-top: 1px solid #bbf7d0;">
              <td style="padding-top: 4px;">Projected Gross Profit (সম্ভাব্য মোট লাভ):</td>
              <td style="text-align: right; padding-top: 4px;">৳${(stock.projectedGrossProfit || 0).toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <thead>
            <tr style="background: #059669; color: #FFF;">
              <th style="padding: 6px 8px; text-align: center;">#</th>
              <th style="padding: 6px 8px; text-align: left;">Product</th>
              <th style="padding: 6px 8px; text-align: left;">SKU</th>
              <th style="padding: 6px 8px; text-align: center;">Qty</th>
              <th style="padding: 6px 8px; text-align: right;">Cost</th>
              <th style="padding: 6px 8px; text-align: right;">Retail</th>
              <th style="padding: 6px 8px; text-align: right;">Total Cost</th>
              <th style="padding: 6px 8px; text-align: right;">Total Retail</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" style="padding: 10px; text-align: center;">No stock records found.</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (activeReport === 'pnl') {
      title = 'INCOME STATEMENT / PROFIT & LOSS';
      const pnl = reportData?.pnl || {};
      const expRows = (pnl.expenseCategories || [])
        .map(
          (e: any) => `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${e.category}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">৳${(e.amount || 0).toLocaleString()}</td>
          </tr>
        `
        )
        .join('');

      bodyContent = `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <table style="width: 100%; font-size: 13px;">
            <tr style="font-weight: bold; font-size: 15px;">
              <td>Gross Revenue (মোট বিক্রয়):</td>
              <td style="text-align: right; color: #059669;">৳${(pnl.totalRevenue || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Less: Cost of Goods Sold / Purchases (পণ্য ক্রয়ের খরচ):</td>
              <td style="text-align: right; color: #dc2626;">-৳${(pnl.cogs || 0).toLocaleString()}</td>
            </tr>
            <tr style="font-weight: bold; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
              <td style="padding: 6px 0;">Gross Profit (মোট মুনাফা):</td>
              <td style="text-align: right; padding: 6px 0; color: #2563eb;">৳${(pnl.grossProfit || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Less: Operating Expenses (দোকান/অফিস পরিচালন ব্যয়):</td>
              <td style="text-align: right; color: #dc2626;">-৳${(pnl.operatingExpenses || 0).toLocaleString()}</td>
            </tr>
            <tr style="font-size: 18px; font-weight: 900; border-top: 2px solid #5F33E1; color: ${pnl.netProfit >= 0 ? '#059669' : '#dc2626'};">
              <td style="padding-top: 8px;">Net Business Profit (প্রকৃত নিট লাভ):</td>
              <td style="text-align: right; padding-top: 8px;">৳${(pnl.netProfit || 0).toLocaleString()} (${pnl.operatingMarginPercent || 0}%)</td>
            </tr>
          </table>
        </div>

        <h3 style="margin: 16px 0 8px 0; color: #0f172a;">Operating Expenses Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <thead>
            <tr style="background: #475569; color: #FFF;">
              <th style="padding: 6px 8px; text-align: left;">Expense Category</th>
              <th style="padding: 6px 8px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expRows || '<tr><td colspan="2" style="padding: 10px; text-align: center;">No expenses recorded.</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (activeReport === 'bank') {
      title = 'DAY-WISE BANK DEPOSIT STATEMENT';
      const deposits = reportData?.bank?.deposits || [];
      const totalDep = reportData?.bank?.totalDeposited || 0;
      const rows = deposits
        .map(
          (d: any, idx: number) => `
          <tr>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${new Date(d.date).toLocaleDateString()}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #1e40af;">${d.bankName || 'Bank'}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${d.accountNumber || '-'}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;">${d.depositSlip || d.reference || '-'}</td>
            <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 800;">৳${(d.amount || 0).toLocaleString()}</td>
          </tr>
        `
        )
        .join('');

      bodyContent = `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <h2 style="margin: 0; color: #1e40af; font-size: 22px;">Total Bank Deposited: ৳${totalDep.toLocaleString()}</h2>
          <p style="margin: 4px 0 0 0; color: #1e3a8a; font-size: 12px;">Total Deposit Entries: ${deposits.length} transactions</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <thead>
            <tr style="background: #2563EB; color: #FFF;">
              <th style="padding: 6px 8px; text-align: center;">#</th>
              <th style="padding: 6px 8px; text-align: left;">Date</th>
              <th style="padding: 6px 8px; text-align: left;">Bank Name</th>
              <th style="padding: 6px 8px; text-align: left;">Account #</th>
              <th style="padding: 6px 8px; text-align: left;">Deposit Slip</th>
              <th style="padding: 6px 8px; text-align: right;">Amount Deposited</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6" style="padding: 10px; text-align: center;">No bank deposits recorded.</td></tr>'}
          </tbody>
        </table>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 12px; }
            .report-box { max-width: 900px; margin: auto; }
            .header-table { width: 100%; border-bottom: 2px solid #5F33E1; padding-bottom: 12px; margin-bottom: 16px; }
            .brand { font-size: 20px; font-weight: 900; color: #5F33E1; }
            .sub { font-size: 10.5px; color: #64748b; margin-top: 2px; }
            .rep-title { font-size: 16px; font-weight: 800; text-align: right; color: #0f172a; margin: 0; }
            .rep-date { font-size: 10.5px; color: #64748b; text-align: right; margin-top: 4px; }
            .footer { margin-top: 36px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
            .sign { border-top: 1px solid #94a3b8; padding-top: 4px; width: 140px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="report-box">
            <table class="header-table">
              <tr>
                <td>
                  <div class="brand">ERP ENTERPRISE</div>
                  <div class="sub">Complete Management Information System</div>
                </td>
                <td>
                  <h2 class="rep-title">${title}</h2>
                  <div class="rep-date">Generated on: ${today} at ${time}</div>
                </td>
              </tr>
            </table>

            ${bodyContent}

            <div class="footer">
              <div>* System generated report. Confidential.</div>
              <div class="sign">Prepared / Authorized By</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const html = generateReportHtml();
      await Print.printAsync({ html });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Print Error', text2: err.message || 'Could not print report' });
    } finally {
      setPrinting(false);
    }
  };

  const handleSharePdf = async () => {
    setSharing(true);
    try {
      const html = generateReportHtml();
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${activeReport.toUpperCase()} Report`,
        });
      } else {
        Toast.show({ type: 'info', text1: 'PDF Saved', text2: `Report saved at ${uri}` });
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Export Error', text2: err.message || 'Could not generate PDF' });
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
                <Ionicons name="document-text" size={20} color="#5F33E1" />
                <Text style={styles.title}>All Reports & PDF Download</Text>
              </View>
              <Text style={styles.subtitle}>সকল ব্যবসায়িক রিপোর্ট প্রিন্ট ও পিডিএফ ডাউনলোড করুন</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#1F1B2E" />
            </TouchableOpacity>
          </View>

          {/* Action Row */}
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
                  <Ionicons name="print-outline" size={17} color="#FFF" />
                  <Text style={styles.printBtnText}>Print Report (প্রিন্ট)</Text>
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
                  <Ionicons name="share-social-outline" size={17} color="#5F33E1" />
                  <Text style={styles.shareBtnText}>Download PDF (শেয়ার)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 5 Report Type Selector Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.repPillsScroll}>
            {[
              { id: 'daily', label: 'Daily Sales & Cash (দৈনিক)', icon: 'wallet' },
              { id: 'dues', label: 'Customer Dues (বকেয়া খতিয়ান)', icon: 'people' },
              { id: 'stock', label: 'Stock Valuation (স্টক ভ্যালু)', icon: 'cube' },
              { id: 'pnl', label: 'Profit & Loss (লাভ-ক্ষতি)', icon: 'trending-up' },
              { id: 'bank', label: 'Bank Deposits (ব্যাংক ডিপোজিট)', icon: 'business' },
            ].map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[styles.repPill, activeReport === r.id && styles.repPillActive]}
                onPress={() => setActiveReport(r.id as ReportType)}
              >
                <Ionicons
                  name={r.icon as any}
                  size={14}
                  color={activeReport === r.id ? '#FFF' : '#64748B'}
                />
                <Text style={[styles.repPillText, activeReport === r.id && styles.repPillTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Body Content */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#5F33E1" />
              <Text style={styles.loadingText}>Generating report data...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reportContent}>
              {activeReport === 'daily' && (
                <View style={styles.cardSection}>
                  <View style={styles.statGrid}>
                    <View style={[styles.statBox, { borderLeftColor: '#059669' }]}>
                      <Text style={styles.statLabel}>Today's Sales</Text>
                      <Text style={[styles.statVal, { color: '#0F172A' }]}>
                        ৳{(dailyData?.dailySalesTotal ?? 0).toLocaleString()}
                      </Text>
                      <Text style={styles.statSub}>{dailyData?.dailyOrdersCount ?? 0} invoices</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftColor: '#2563EB' }]}>
                      <Text style={styles.statLabel}>Total Cash Collected</Text>
                      <Text style={[styles.statVal, { color: '#059669' }]}>
                        ৳{(dailyData?.totalCashCollectedToday ?? 0).toLocaleString()}
                      </Text>
                      <Text style={styles.statSub}>Sales + Dues</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftColor: '#DC2626' }]}>
                      <Text style={styles.statLabel}>Bank Deposited</Text>
                      <Text style={[styles.statVal, { color: '#2563EB' }]}>
                        -৳{(dailyData?.totalBankDepositedToday ?? 0).toLocaleString()}
                      </Text>
                      <Text style={styles.statSub}>Transferred</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftColor: '#5F33E1' }]}>
                      <Text style={styles.statLabel}>Net Cash in Hand</Text>
                      <Text style={[styles.statVal, { color: '#5F33E1' }]}>
                        ৳{(dailyData?.netCashInHandToday ?? 0).toLocaleString()}
                      </Text>
                      <Text style={styles.statSub}>Drawer Balance</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeReport === 'dues' && (
                <View style={styles.cardSection}>
                  <View style={styles.dueSummaryHero}>
                    <Text style={styles.dueHeroLabel}>Total Market Receivables (সর্বমোট বকেয়া)</Text>
                    <Text style={styles.dueHeroVal}>
                      ৳{(reportData?.dues?.totalReceivables ?? 0).toLocaleString()}
                    </Text>
                    <Text style={styles.dueHeroSub}>
                      {reportData?.dues?.count ?? 0} customers with active due balance
                    </Text>
                  </View>
                </View>
              )}

              {activeReport === 'stock' && (
                <View style={styles.cardSection}>
                  <View style={styles.statGrid}>
                    <View style={[styles.statBox, { borderLeftColor: '#2563EB' }]}>
                      <Text style={styles.statLabel}>Stock Cost Value (কেনা)</Text>
                      <Text style={[styles.statVal, { color: '#2563EB' }]}>
                        ৳{(reportData?.stock?.totalCostValue ?? 0).toLocaleString()}
                      </Text>
                      <Text style={styles.statSub}>{reportData?.stock?.totalStockUnits ?? 0} units</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftColor: '#059669' }]}>
                      <Text style={styles.statLabel}>Stock Retail Value (বিক্রি)</Text>
                      <Text style={[styles.statVal, { color: '#059669' }]}>
                        ৳{(reportData?.stock?.totalRetailValue ?? 0).toLocaleString()}
                      </Text>
                      <Text style={styles.statSub}>Potential Revenue</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeReport === 'pnl' && (
                <View style={styles.cardSection}>
                  <View style={styles.pnlHero}>
                    <Text style={styles.pnlHeroLabel}>Net Business Profit (প্রকৃত লাভ)</Text>
                    <Text
                      style={[
                        styles.pnlHeroVal,
                        { color: (reportData?.pnl?.netProfit ?? 0) >= 0 ? '#059669' : '#DC2626' },
                      ]}
                    >
                      ৳{(reportData?.pnl?.netProfit ?? 0).toLocaleString()}
                    </Text>
                    <Text style={styles.pnlHeroSub}>
                      Operating Margin: {reportData?.pnl?.operatingMarginPercent ?? 0}%
                    </Text>
                  </View>
                </View>
              )}

              {activeReport === 'bank' && (
                <View style={styles.cardSection}>
                  <View style={styles.bankHero}>
                    <Text style={styles.bankHeroLabel}>Total Bank Deposited (ব্যাংকে মোট জমা)</Text>
                    <Text style={styles.bankHeroVal}>
                      ৳{(reportData?.bank?.totalDeposited ?? 0).toLocaleString()}
                    </Text>
                    <Text style={styles.bankHeroSub}>
                      {reportData?.bank?.count ?? 0} deposit transactions recorded
                    </Text>
                  </View>
                </View>
              )}

              {/* Ready to Print Notice */}
              <View style={styles.readyBox}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.readyText}>
                  রিপোর্ট প্রস্তুত আছে। উপরে 'Print Report' বা 'Download PDF' বাটনে চাপুন।
                </Text>
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
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11.5,
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
    paddingVertical: 10,
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
  repPillsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  repPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  repPillActive: {
    backgroundColor: '#5F33E1',
  },
  repPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  repPillTextActive: {
    color: '#FFFFFF',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  reportContent: {
    padding: 16,
    paddingBottom: 36,
  },
  cardSection: {
    marginBottom: 14,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  statSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  dueSummaryHero: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#FECACA',
  },
  dueHeroLabel: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '700',
  },
  dueHeroVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#DC2626',
    marginTop: 4,
  },
  dueHeroSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  pnlHero: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#A7F3D0',
  },
  pnlHeroLabel: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '700',
  },
  pnlHeroVal: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  pnlHeroSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  bankHero: {
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
  },
  bankHeroLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '700',
  },
  bankHeroVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2563EB',
    marginTop: 4,
  },
  bankHeroSub: {
    fontSize: 11,
    color: '#1D4ED8',
    marginTop: 2,
  },
  readyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 6,
  },
  readyText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
    flex: 1,
  },
});
