import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:5000/api`;
    }
    return 'http://localhost:5000/api';
  }

  // If running in Expo Go or dev client, Constants.expoConfig?.hostUri has '192.168.0.xxx:8081'
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }

  // Fallback for Android emulator / physical device
  return 'http://192.168.0.103:5000/api';
};

export const BASE_URL = getBaseUrl();

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    profile: '/auth/profile',
    changePassword: '/auth/change-password',
    forgotPassword: '/auth/forgot-password',
  },
  dashboard: '/dashboard/stats',
  products: '/products',
  categories: '/categories',
  customers: '/customers',
  suppliers: '/suppliers',
  sales: '/sales',
  purchases: '/purchases',
  employees: '/employees',
  attendance: '/attendance',
  leaves: '/leaves',
  payroll: '/payroll',
  accounts: '/accounts',
  payment: '/payment',
  stockValuation: '/products/stock-valuation',
  financialReport: '/accounts/financial-report',
  customerPayDue: (id: string) => `/customers/${id}/pay-due`,
  customerLedger: (id: string) => `/customers/${id}/ledger`,
  dailySummary: '/accounts/daily-summary',
  bankDeposit: '/accounts/bank-deposit',
  bankDeposits: '/accounts/bank-deposits',
  allReportsData: '/accounts/reports/data',
  adjustStock: (id: string) => `/products/${id}/adjust-stock`,
};
