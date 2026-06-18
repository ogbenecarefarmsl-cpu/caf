import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useAuthStore } from '../../stores/auth-store';
import { queryKeys } from '../../lib/query-keys';
import apiClient from '../../lib/api-client';
import { buildApiUrl } from '../../lib/api-utils';
import { Download, DollarSign, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useCurrency } from '../../hooks/useCurrency';

export function FinanceReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('cash');
  const { selectedBranch } = useBranchStore();
  const user = useAuthStore((state) => state.user);
  const branchId = getBranchId(selectedBranch);
  const effectiveBranchId = user?.role === 'super_admin' ? undefined : branchId;
  const canLoadReports = user?.role === 'super_admin' || !!effectiveBranchId;
  const { format: formatMoney } = useCurrency();

  const { data: cashSummary, isLoading: loadingCash } = useQuery({
    queryKey: queryKeys.financeManager.cashEntries.summary(effectiveBranchId, startDate, endDate),
    queryFn: async () => {
      const res = await apiClient.get(buildApiUrl('/finance-manager/cash-entries/stats/summary', { branchId: effectiveBranchId, startDate: startDate || undefined, endDate: endDate || undefined }));
      return (res.data?.data ?? res.data) as { totalIncome: number; totalExpense: number; totalTransfer: number; totalLoan: number; totalSalary: number; netCash: number; byCategory: { category: string; total: number; count: number }[] };
    },
    enabled: canLoadReports,
  });

  const { data: reconStats, isLoading: loadingRecon } = useQuery({
    queryKey: queryKeys.financeManager.reconciliations.stats(effectiveBranchId),
    queryFn: async () => {
      const res = await apiClient.get(buildApiUrl('/finance-manager/reconciliations/stats/summary', { branchId: effectiveBranchId }));
      return (res.data?.data ?? res.data) as { pending: number; approved: number; rejected: number; totalDiscrepancy: number };
    },
    enabled: canLoadReports,
  });

  const { data: salaryStats, isLoading: loadingSalary } = useQuery({
    queryKey: queryKeys.financeManager.salaries.stats(effectiveBranchId),
    queryFn: async () => {
      const res = await apiClient.get(buildApiUrl('/finance-manager/salaries/stats/summary', { branchId: effectiveBranchId }));
      return (res.data?.data ?? res.data) as { totalEmployees: number; totalBase: number; totalAllowances: number; totalDeductions: number; totalNet: number; pendingCount: number; paidCount: number };
    },
    enabled: canLoadReports,
  });

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCashReport = () => {
    if (!cashSummary?.byCategory) return;
    exportCSV(cashSummary.byCategory.map((c) => ({ Category: c.category, Total: c.total, Count: c.count })), 'cash-report.csv');
  };

  return (
    <AdminLayout title="Finance Reports">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 text-white border border-white/10 text-sm">
            <option value="cash">Cash Flow</option>
            <option value="reconciliation">Reconciliation</option>
            <option value="salary">Payroll</option>
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 text-white border border-white/10 text-sm" />
          <span className="text-gray-400">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 text-white border border-white/10 text-sm" />
        </div>
        <Button onClick={exportCashReport} variant="secondary"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>

      {reportType === 'cash' && cashSummary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Income', value: cashSummary.totalIncome, icon: <TrendingUp className="w-4 h-4 text-green-400" />, color: 'bg-green-500/10 border-green-500/20' },
              { label: 'Total Expenses', value: cashSummary.totalExpense, icon: <TrendingDown className="w-4 h-4 text-red-400" />, color: 'bg-red-500/10 border-red-500/20' },
              { label: 'Transfers', value: cashSummary.totalTransfer, icon: <DollarSign className="w-4 h-4 text-blue-400" />, color: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Loans', value: cashSummary.totalLoan, icon: <DollarSign className="w-4 h-4 text-amber-400" />, color: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Salaries', value: cashSummary.totalSalary, icon: <DollarSign className="w-4 h-4 text-purple-400" />, color: 'bg-purple-500/10 border-purple-500/20' },
              { label: 'Net Cash', value: cashSummary.netCash, icon: <DollarSign className="w-4 h-4 text-cyan-400" />, color: 'bg-cyan-500/10 border-cyan-500/20' },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
                <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-400">{c.label}</span>{c.icon}</div>
                <p className="text-lg font-bold text-white">{formatMoney(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Expenses by Category</h3>
            {cashSummary.byCategory.length === 0 ? (
              <p className="text-gray-400 text-sm">No data</p>
            ) : (
              <div className="space-y-2">
                {cashSummary.byCategory.map((c) => (
                  <div key={c.category} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                    <div>
                      <p className="text-white text-sm font-medium capitalize">{c.category.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-400">{c.count} entries</p>
                    </div>
                    <span className="text-red-400 font-semibold">{formatMoney(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {reportType === 'reconciliation' && reconStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Pending', value: reconStats.pending, color: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Approved', value: reconStats.approved, color: 'bg-green-500/10 border-green-500/20' },
              { label: 'Rejected', value: reconStats.rejected, color: 'bg-red-500/10 border-red-500/20' },
              { label: 'Total Discrepancy', value: formatMoney(reconStats.totalDiscrepancy), color: 'bg-orange-500/10 border-orange-500/20' },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
                <span className="text-xs text-gray-400">{c.label}</span>
                <p className="text-2xl font-bold text-white mt-1">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportType === 'salary' && salaryStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Employees', value: salaryStats.totalEmployees, color: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Total Base', value: formatMoney(salaryStats.totalBase), color: 'bg-green-500/10 border-green-500/20' },
              { label: 'Total Allowances', value: formatMoney(salaryStats.totalAllowances), color: 'bg-cyan-500/10 border-cyan-500/20' },
              { label: 'Total Deductions', value: formatMoney(salaryStats.totalDeductions), color: 'bg-red-500/10 border-red-500/20' },
              { label: 'Total Net Pay', value: formatMoney(salaryStats.totalNet), color: 'bg-purple-500/10 border-purple-500/20' },
              { label: 'Pending Approval', value: salaryStats.pendingCount, color: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Paid', value: salaryStats.paidCount, color: 'bg-green-500/10 border-green-500/20' },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
                <span className="text-xs text-gray-400">{c.label}</span>
                <p className="text-2xl font-bold text-white mt-1">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(loadingCash || loadingRecon || loadingSalary) && <Loading variant="centered" text="Loading report data..." />}
    </AdminLayout>
  );
}
