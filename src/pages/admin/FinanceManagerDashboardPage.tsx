import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { queryKeys } from '../../lib/query-keys';
import apiClient from '../../lib/api-client';
import { buildApiUrl } from '../../lib/api-utils';
import { DollarSign, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, Users, FileText } from 'lucide-react';

interface DashboardData {
  reconciliation: { pending: number; approved: number; rejected: number; totalDiscrepancy: number };
  salary: { totalEmployees: number; totalNet: number; pendingCount: number; paidCount: number };
  cash: { totalIncome: number; totalExpense: number; netCash: number };
  recentReconciliations: any[];
  recentCashEntries: any[];
}

function formatMoney(amount: number) {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FinanceManagerDashboardPage() {
  const { selectedBranch } = useBranchStore();
  const branchId = getBranchId(selectedBranch);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.financeManager.dashboard(branchId),
    queryFn: async () => {
      const res = await apiClient.get(buildApiUrl('/finance-manager/dashboard', { branchId }));
      return (res.data?.data ?? res.data) as DashboardData;
    },
    enabled: !!branchId,
  });

  if (isLoading) return <AdminLayout title="Finance Dashboard"><Loading variant="centered" text="Loading dashboard..." /></AdminLayout>;
  if (error) return <AdminLayout title="Finance Dashboard"><Error message="Failed to load dashboard" /></AdminLayout>;

  const d = data!;
  const statCards = [
    { label: 'Total Income', value: formatMoney(d.cash.totalIncome), icon: <TrendingUp className="w-5 h-5 text-green-400" />, color: 'bg-green-500/10 border-green-500/20' },
    { label: 'Total Expenses', value: formatMoney(d.cash.totalExpense), icon: <TrendingDown className="w-5 h-5 text-red-400" />, color: 'bg-red-500/10 border-red-500/20' },
    { label: 'Net Cash', value: formatMoney(d.cash.netCash), icon: <DollarSign className="w-5 h-5 text-blue-400" />, color: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Pending Reconciliations', value: String(d.reconciliation.pending), icon: <Clock className="w-5 h-5 text-amber-400" />, color: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Reconciliation Discrepancy', value: formatMoney(d.reconciliation.totalDiscrepancy), icon: <AlertTriangle className="w-5 h-5 text-orange-400" />, color: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Approved Reconciliations', value: String(d.reconciliation.approved), icon: <CheckCircle className="w-5 h-5 text-green-400" />, color: 'bg-green-500/10 border-green-500/20' },
    { label: 'Employees on Payroll', value: String(d.salary.totalEmployees), icon: <Users className="w-5 h-5 text-purple-400" />, color: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Total Salaries', value: formatMoney(d.salary.totalNet), icon: <FileText className="w-5 h-5 text-cyan-400" />, color: 'bg-cyan-500/10 border-cyan-500/20' },
  ];

  return (
    <AdminLayout title="Finance Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{card.label}</span>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Reconciliations</h3>
          {d.recentReconciliations.length === 0 ? (
            <p className="text-gray-400 text-sm">No reconciliations yet</p>
          ) : (
            <div className="space-y-2">
              {d.recentReconciliations.map((r: any) => (
                <div key={r._id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <p className="text-white text-sm font-medium">{r.source.toUpperCase()} — {r.period}</p>
                    <p className="text-xs text-gray-400">Expected: {formatMoney(r.expectedCash)} | Actual: {formatMoney(r.actualCash)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    r.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    r.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Cash Entries</h3>
          {d.recentCashEntries.length === 0 ? (
            <p className="text-gray-400 text-sm">No cash entries yet</p>
          ) : (
            <div className="space-y-2">
              {d.recentCashEntries.map((e: any) => (
                <div key={e._id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <p className="text-white text-sm font-medium">{e.description}</p>
                    <p className="text-xs text-gray-400">{e.type} — {e.category} — {new Date(e.entryDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-semibold ${e.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {e.type === 'income' ? '+' : '-'}{formatMoney(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
