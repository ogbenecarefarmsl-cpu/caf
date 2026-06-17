import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { AdminStatusBadge } from '../../components/admin';
import { useToast } from '../../hooks/useToast';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../lib/query-keys';
import apiClient from '../../lib/api-client';
import { buildApiUrl } from '../../lib/api-utils';
import { getErrorMessage } from '../../lib/error-utils';
import { formatStatusLabel, toneForStatus } from '../../lib/admin-tones';
import { DollarSign, CheckCircle, Send } from 'lucide-react';

interface Salary {
  _id: string;
  employeeId: { _id: string; firstName: string; lastName: string; username: string };
  period: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentMethod: string;
  paymentDate?: string;
  status: string;
  approvedBy?: { firstName: string; lastName: string };
  notes?: string;
  createdAt: string;
}

interface Employee { _id: string; firstName: string; lastName: string; username: string; role: string; branchId?: string }

function formatMoney(amount: number) {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SalaryManagementPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', baseSalary: '', allowances: '', deductions: '', paymentMethod: 'bank_transfer', notes: '' });
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const { selectedBranch } = useBranchStore();
  const { user } = useAuth();
  const branchId = getBranchId(selectedBranch);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: salaries, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.financeManager.salaries.list({ branchId, period: selectedPeriod || undefined }),
    queryFn: async () => {
      const res = await apiClient.get(buildApiUrl('/finance-manager/salaries', { branchId, period: selectedPeriod || undefined }));
      return (res.data?.data ?? res.data) as Salary[];
    },
    enabled: !!branchId,
  });

  const { data: employees } = useQuery({
    queryKey: ['admin', 'users', { branchId }],
    queryFn: async () => {
      const res = await apiClient.get(buildApiUrl('/users', { branchId, limit: 200 }));
      return (res.data?.data ?? res.data?.data?.data ?? []) as Employee[];
    },
    enabled: !!branchId,
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.financeManager.salaries.stats(branchId, selectedPeriod || currentMonth),
    queryFn: async () => {
      const res = await apiClient.get(buildApiUrl('/finance-manager/salaries/stats/summary', { branchId, period: selectedPeriod || currentMonth }));
      return (res.data?.data ?? res.data) as { totalEmployees: number; totalBase: number; totalAllowances: number; totalDeductions: number; totalNet: number; pendingCount: number; paidCount: number };
    },
    enabled: !!branchId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/finance-manager/salaries', {
        ...form,
        branchId,
        period: selectedPeriod || currentMonth,
        baseSalary: Number(form.baseSalary),
        allowances: Number(form.allowances) || 0,
        deductions: Number(form.deductions) || 0,
      });
    },
    onSuccess: () => {
      showSuccess('Salary record created');
      queryClient.invalidateQueries({ queryKey: queryKeys.financeManager.salaries.all() });
      setIsCreateOpen(false);
      setForm({ employeeId: '', baseSalary: '', allowances: '', deductions: '', paymentMethod: 'bank_transfer', notes: '' });
    },
    onError: (err: unknown) => showError(getErrorMessage(err, 'Failed to create salary record')),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => { await apiClient.patch(`/finance-manager/salaries/${id}/approve`); },
    onSuccess: () => {
      showSuccess('Salary approved');
      queryClient.invalidateQueries({ queryKey: queryKeys.financeManager.salaries.all() });
    },
    onError: (err: unknown) => showError(getErrorMessage(err, 'Failed to approve salary')),
  });

  const payMutation = useMutation({
    mutationFn: async (id: string) => { await apiClient.patch(`/finance-manager/salaries/${id}/pay`); },
    onSuccess: () => {
      showSuccess('Salary marked as paid');
      queryClient.invalidateQueries({ queryKey: queryKeys.financeManager.salaries.all() });
    },
    onError: (err: unknown) => showError(getErrorMessage(err, 'Failed to mark salary as paid')),
  });

  const columns = [
    { key: 'employee', header: 'Employee', render: (s: Salary) => s.employeeId ? `${s.employeeId.firstName} ${s.employeeId.lastName}` : '-' },
    { key: 'period', header: 'Period' },
    { key: 'baseSalary', header: 'Base', render: (s: Salary) => formatMoney(s.baseSalary) },
    { key: 'allowances', header: 'Allow.', render: (s: Salary) => formatMoney(s.allowances) },
    { key: 'deductions', header: 'Ded.', render: (s: Salary) => formatMoney(s.deductions) },
    { key: 'netSalary', header: 'Net', render: (s: Salary) => <span className="font-semibold text-white">{formatMoney(s.netSalary)}</span> },
    { key: 'status', header: 'Status', render: (s: Salary) => (
      <AdminStatusBadge tone={toneForStatus(s.status)}>
        {formatStatusLabel(s.status)}
      </AdminStatusBadge>
    )},
    { key: 'actions', header: 'Actions', render: (s: Salary) => (
      <div className="flex gap-2">
        {(s.status === 'draft' || s.status === 'pending_approval') && user?.role === 'super_admin' && (
          <Button size="sm" variant="ghost" onClick={(e: any) => { e?.stopPropagation(); approveMutation.mutate(s._id); }}>
            <CheckCircle className="w-3 h-3 mr-1" />Approve
          </Button>
        )}
        {s.status === 'approved' && (
          <Button size="sm" variant="ghost" onClick={(e: any) => { e?.stopPropagation(); payMutation.mutate(s._id); }}>
            <Send className="w-3 h-3 mr-1" />Pay
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <AdminLayout title="Salary Management">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <input type="month" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 text-white border border-white/10 text-sm" />
          {stats && (
            <div className="flex gap-4 text-sm">
              <span className="text-gray-400">Employees: <span className="text-white font-medium">{stats.totalEmployees}</span></span>
              <span className="text-gray-400">Total Net: <span className="text-white font-medium">{formatMoney(stats.totalNet)}</span></span>
              <span className="text-gray-400">Pending: <span className="text-amber-400 font-medium">{stats.pendingCount}</span></span>
              <span className="text-gray-400">Paid: <span className="text-green-400 font-medium">{stats.paidCount}</span></span>
            </div>
          )}
        </div>
        <Button onClick={() => setIsCreateOpen(true)}><DollarSign className="w-4 h-4 mr-2" />Add Salary</Button>
      </div>

      {isLoading ? <Loading variant="centered" text="Loading..." /> : error ? <Error message="Failed to load" onRetry={refetch} /> : (
        <Table
          data={salaries || []}
          columns={columns}
          emptyMessage="No salary records"
        />
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Add Salary Record">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Employee</label>
            <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10">
              <option value="">Select employee</option>
              {(employees || []).map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.username})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Period</label>
            <input type="month" value={selectedPeriod || currentMonth} onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Base Salary</label>
              <input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Allowances</label>
              <input type="number" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Deductions</label>
              <input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Payment Method</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="mobile">Mobile Money</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} isLoading={createMutation.isPending}>Create</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
