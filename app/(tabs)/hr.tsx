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
import EmployeeCard from '../../components/EmployeeCard';
import FormInput from '../../components/FormInput';
import EmptyState from '../../components/EmptyState';
import FadeInView from '../../components/FadeInView';
import { apiGet, apiPost, apiPut } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/Api';

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  salary: number;
  isActive: boolean;
}

interface AttendanceRecord {
  _id: string;
  employee?: { name: string; designation: string };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
}

interface LeaveRecord {
  _id: string;
  employee?: { name: string; department: string };
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
}

interface PayrollRecord {
  _id: string;
  employee?: { name: string; designation: string };
  month: number;
  year: number;
  basicSalary: number;
  netSalary: number;
  status: string;
}

export default function HRScreen() {
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'leaves' | 'payroll'>('employees');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Lists
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);

  // Modals
  const [addEmpModal, setAddEmpModal] = useState(false);
  const [applyLeaveModal, setApplyLeaveModal] = useState(false);

  // Add Employee Form State
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDept, setEmpDept] = useState('Sales');
  const [empDesig, setEmpDesig] = useState('Executive');
  const [empSalary, setEmpSalary] = useState('');

  // Leave Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('sick');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (activeTab === 'employees') {
        const res = await apiGet<{ success: boolean; data: Employee[] }>(API_ENDPOINTS.employees);
        if (res && res.data) setEmployees(res.data);
      } else if (activeTab === 'attendance') {
        const res = await apiGet<{ success: boolean; data: AttendanceRecord[] }>(`${API_ENDPOINTS.attendance}/today`);
        if (res && res.data) setAttendance(res.data);
      } else if (activeTab === 'leaves') {
        const res = await apiGet<{ success: boolean; data: LeaveRecord[] }>(API_ENDPOINTS.leaves);
        if (res && res.data) setLeaves(res.data);
      } else if (activeTab === 'payroll') {
        const res = await apiGet<{ success: boolean; data: PayrollRecord[] }>(API_ENDPOINTS.payroll);
        if (res && res.data) setPayrolls(res.data);
      }
    } catch (err: any) {
      console.warn('HR Data load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCreateEmployee = async () => {
    const trimmedName = (empName || '').trim();
    const trimmedEmail = (empEmail || '').trim();
    const numSalary = Number(empSalary);

    if (!trimmedName || !trimmedEmail || isNaN(numSalary) || numSalary < 0) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Name, email and valid salary required.' });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost(API_ENDPOINTS.employees, {
        name: trimmedName,
        email: trimmedEmail,
        phone: (empPhone || '').trim() || '01700000000',
        department: (empDept || '').trim() || 'General',
        designation: (empDesig || '').trim() || 'Staff',
        salary: numSalary,
        joinDate: new Date(),
      });

      Toast.show({ type: 'success', text1: 'Success', text2: 'Employee added successfully.' });
      setAddEmpModal(false);
      fetchData();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAttendance = async (empId: string, action: 'checkin' | 'checkout') => {
    try {
      await apiPost(`${API_ENDPOINTS.attendance}/mark`, {
        employee: empId,
        action,
      });
      Toast.show({ type: 'success', text1: 'Attendance', text2: `Employee ${action} recorded.` });
      fetchData();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Notice', text2: err.message });
    }
  };

  const handleApplyLeave = async () => {
    if (!selectedEmpId || !startDate || !endDate) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please fill employee and dates.' });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost(`${API_ENDPOINTS.leaves}/apply`, {
        employee: selectedEmpId,
        leaveType,
        startDate,
        endDate,
        reason,
      });

      Toast.show({ type: 'success', text1: 'Success', text2: 'Leave application submitted.' });
      setApplyLeaveModal(false);
      fetchData();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    try {
      await apiPut(`${API_ENDPOINTS.leaves}/${leaveId}/approve`, {});
      Toast.show({ type: 'success', text1: 'Leave Approved', text2: 'Status updated.' });
      fetchData();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Human Resources</Text>
          <Text style={styles.subtitle}>Team & Payroll Management</Text>
        </View>
        {activeTab === 'employees' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddEmpModal(true)}>
            <Ionicons name="person-add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'leaves' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setApplyLeaveModal(true)}>
            <Ionicons name="calendar" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>Apply</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sub Tabs Navigation */}
      <View style={styles.subTabContainer}>
        {(['employees', 'attendance', 'leaves', 'payroll'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.subTabButton, activeTab === tab && styles.subTabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.subTabText, activeTab === tab && styles.subTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Tab Content */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : activeTab === 'employees' ? (
        <FlatList
          data={employees}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              title="No Employees Found"
              message="Add staff members to manage attendance, designation and payroll."
              icon="people-outline"
            />
          }
          renderItem={({ item, index }) => (
            <FadeInView delay={Math.min(index * 35, 300)}>
              <EmployeeCard
                name={item.name}
                designation={item.designation}
                department={item.department}
                email={item.email}
                phone={item.phone}
                salary={item.salary}
                isActive={item.isActive}
              />
            </FadeInView>
          )}
        />
      ) : activeTab === 'attendance' ? (
        <FlatList
          data={attendance}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              title="No Attendance Today"
              message="Check in employees or review automated daily logs."
              icon="time-outline"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <View style={styles.recordLeft}>
                <Text style={styles.recordName}>{item.employee?.name || 'Staff'}</Text>
                <Text style={styles.recordSub}>
                  {item.checkIn ? `In: ${new Date(item.checkIn).toLocaleTimeString()}` : 'Not checked in'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'present' ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={[styles.statusBadgeText, { color: item.status === 'present' ? Colors.success : Colors.warning }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        />
      ) : activeTab === 'leaves' ? (
        <FlatList
          data={leaves}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              title="No Leave Requests"
              message="All employee leave applications will show up here."
              icon="calendar-outline"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <View style={styles.recordLeft}>
                <Text style={styles.recordName}>{item.employee?.name || 'Employee'}</Text>
                <Text style={styles.recordSub}>{item.leaveType.toUpperCase()} • Reason: {item.reason || 'N/A'}</Text>
              </View>
              {item.status === 'pending' ? (
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApproveLeave(item._id)}
                >
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'approved' ? '#E8F5E9' : '#FFEBEE' }]}>
                  <Text style={[styles.statusBadgeText, { color: item.status === 'approved' ? Colors.success : Colors.error }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={payrolls}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              title="No Payroll Records"
              message="Monthly employee payroll and salary disbursements."
              icon="cash-outline"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <View style={styles.recordLeft}>
                <Text style={styles.recordName}>{item.employee?.name || 'Staff'}</Text>
                <Text style={styles.recordSub}>Month: {item.month}/{item.year}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.salaryAmount}>৳{(item.netSalary ?? 0).toLocaleString()}</Text>
                <Text style={[styles.payStatus, { color: item.status === 'paid' ? Colors.success : Colors.warning }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Employee Modal */}
      <Modal visible={addEmpModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Employee</Text>
              <TouchableOpacity onPress={() => setAddEmpModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <FormInput label="Full Name *" value={empName} onChangeText={setEmpName} placeholder="Karim Hossain" />
              <FormInput label="Email Address *" value={empEmail} onChangeText={setEmpEmail} keyboardType="email-address" placeholder="karim@company.com" />
              <FormInput label="Phone Number" value={empPhone} onChangeText={setEmpPhone} keyboardType="phone-pad" placeholder="01712345678" />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <FormInput label="Department" value={empDept} onChangeText={setEmpDept} placeholder="Sales, Tech, HR" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <FormInput label="Designation" value={empDesig} onChangeText={setEmpDesig} placeholder="Manager, Executive" />
                </View>
              </View>

              <FormInput label="Monthly Salary (৳) *" value={empSalary} onChangeText={setEmpSalary} keyboardType="numeric" placeholder="35000" />

              <TouchableOpacity
                style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                onPress={handleCreateEmployee}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Save Employee</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Apply Leave Modal */}
      <Modal visible={applyLeaveModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Leave</Text>
              <TouchableOpacity onPress={() => setApplyLeaveModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Select Employee</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillList}>
                {employees.map((e) => (
                  <TouchableOpacity
                    key={e._id}
                    style={[styles.pill, selectedEmpId === e._id && styles.pillActive]}
                    onPress={() => setSelectedEmpId(e._id)}
                  >
                    <Text style={[styles.pillText, selectedEmpId === e._id && styles.pillTextActive]}>
                      {e.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <FormInput label="Start Date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-11-05" />
              <FormInput label="End Date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2026-11-08" />
              <FormInput label="Reason for Leave" value={reason} onChangeText={setReason} placeholder="Medical, Family emergency, etc." />

              <TouchableOpacity
                style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                onPress={handleApplyLeave}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Submit Leave Request</Text>
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
  subTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 6,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  subTabButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  subTabTextActive: {
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
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recordLeft: {
    flex: 1,
  },
  recordName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  recordSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  approveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  salaryAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  payStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
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
  formRow: {
    flexDirection: 'row',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  pillList: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F3F5',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: Colors.primary,
  },
  pillText: {
    fontSize: 12,
    color: Colors.text,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
