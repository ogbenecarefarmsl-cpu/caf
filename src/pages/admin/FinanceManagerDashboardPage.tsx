import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/AdminLayout';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { queryKeys } from '../../lib/query-keys';
import apiClient from '../../lib/api-client';
import { buildApiUrl } from '../../lib/api-utils';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  CreditCard, Users, ShoppingCart, Package, Wallet, ArrowRightLeft,
  BarChart3, Activity,
} from 'lucide-react';

interface UnifiedDashboard {
  revenue: {
    totalSales: number;
    totalRevenue: number;
    totalReturns: number;
    netRevenue: number;
    salesCount: number;
  };
  expenses: {
    totalShiftExpenses: number;
    totalFinanceExpenses: number;
    totalExpenses: number;
    byCategory: { category: string; total: number; count: number }[];
  };
  cashPosition: {
    totalOpeningCash: number;
    totalClosingCash: number;
    totalExpectedCash: number;
    totalVariance: number;
    openShifts: number;
    closedShifts: number;
  };
  creditOutstanding: {
    totalCreditSales: number;
    totalBalanceDue: number;
    overdueCount: number;
    overdueAmount: number;
  };
  marketer: {
    totalAssignedValue: number;
    totalSoldValue: number;
    totalOutstanding: number;
    unitsAssigned: number;
    unitsSold: number;
    unitsRemaining: number;
  };
  purchases: {
    totalPurchaseValue: number;
    receivedValue: number;
    pendingValue: number;
  };
  profitLoss: {
    grossRevenue: number;
    costOfGoods: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    margin: number;
  };
  byBranch: {
    branchId: string;
    branchName: string;
    revenue: number;
    expenses: number;
    profit: number;
    salesCount: number;
  }[];
  byPaymentMethod: {
    method: string;
    count: number;
    total: number;
  }[];
}

function fmt(amount: number) {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(value: number, total: number) {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash', card: 'Card', credit: 'Credit', orange_money: 'Orange Money',
  africell_money: 'Africell Money', qmoney: 'QMoney', bank_transfer: 'Bank Transfer',
  mobile: 'Mobile Money', insurance: 'Insurance', split: 'Split',
};

export function FinanceManagerDashboardPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { selectedBranch } = useBranchStore();
  const branchId = getBranchId(selectedBranch);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.financeManager.dashboard(branchId),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (branchId) params.branchId = branchId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get(buildApiUrl('/finance-manager/unified-dashboard', params));
      return (res.data?.data ?? res.data) as UnifiedDashboard;
    },
    enabled: !!branchId,
  });

  if (isLoading) return <AdminLayout title="Finance Dashboard"><Loading variant="centered" text="Loading financial data..." /></AdminLayout>;
  if (error) return <AdminLayout title="Finance Dashboard"><Error message="Failed to load financial data" /></AdminLayout>;

  const d = data!;
  const pl = d.profitLoss;

  return (
    <AdminLayout title="Finance Dashboard">
      {/* Date Range Filter */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 text-white border border-white/10 text-sm" />
        <span className="text-gray-400">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/5 text-white border border-white/10 text-sm" />
      </div>

      {/* ═══ SECTION 1: Profit & Loss ═══ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent-green" /> Profit & Loss
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Gross Revenue', value: pl.grossRevenue, icon: <TrendingUp className="w-4 h-4 text-green-400" />, color: 'bg-green-500/10 border-green-500/20' },
            { label: 'Cost of Goods', value: pl.costOfGoods, icon: <Package className="w-4 h-4 text-red-400" />, color: 'bg-red-500/10 border-red-500/20' },
            { label: 'Gross Profit', value: pl.grossProfit, icon: <DollarSign className="w-4 h-4 text-blue-400" />, color: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Operating Expenses', value: pl.operatingExpenses, icon: <TrendingDown className="w-4 h-4 text-orange-400" />, color: 'bg-orange-500/10 border-orange-500/20' },
            { label: 'Net Profit', value: pl.netProfit, icon: <Wallet className="w-4 h-4 text-cyan-400" />, color: pl.netProfit >= 0 ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-red-500/10 border-red-500/20' },
            { label: 'Margin', value: null, display: `${pl.margin}%`, icon: <Activity className="w-4 h-4 text-purple-400" />, color: 'bg-purple-500/10 border-purple-500/20' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{c.label}</span>
                {c.icon}
              </div>
              <p className="text-xl font-bold text-white">{c.display ?? fmt(c.value!)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ SECTION 2: Revenue & Sales ═══ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" /> Revenue & Sales
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: d.revenue.totalRevenue, color: 'bg-green-500/10 border-green-500/20' },
            { label: 'Returns', value: d.revenue.totalReturns, color: 'bg-red-500/10 border-red-500/20' },
            { label: 'Net Revenue', value: d.revenue.netRevenue, color: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Transactions', value: null, display: d.revenue.salesCount.toLocaleString(), color: 'bg-purple-500/10 border-purple-500/20' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
              <span className="text-xs text-gray-400">{c.label}</span>
              <p className="text-xl font-bold text-white mt-1">{c.display ?? fmt(c.value!)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ SECTION 3: Cash Position & Shifts ═══ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-cyan-400" /> Cash Position
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Opening Cash', value: d.cashPosition.totalOpeningCash, color: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Expected Cash', value: d.cashPosition.totalExpectedCash, color: 'bg-green-500/10 border-green-500/20' },
            { label: 'Actual Closing', value: d.cashPosition.totalClosingCash, color: 'bg-cyan-500/10 border-cyan-500/20' },
            { label: 'Variance', value: d.cashPosition.totalVariance, color: d.cashPosition.totalVariance === 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Open Shifts', value: null, display: String(d.cashPosition.openShifts), color: 'bg-amber-500/10 border-amber-500/20' },
            { label: 'Closed Shifts', value: null, display: String(d.cashPosition.closedShifts), color: 'bg-gray-500/10 border-gray-500/20' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
              <span className="text-xs text-gray-400">{c.label}</span>
              <p className="text-xl font-bold text-white mt-1">{c.display ?? fmt(c.value!)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ SECTION 4: Credit & Marketer ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Credit Outstanding */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" /> Credit Outstanding
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-gray-400">Total Credit Sales</span>
              <p className="text-lg font-bold text-white">{fmt(d.creditOutstanding.totalCreditSales)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-gray-400">Balance Due</span>
              <p className="text-lg font-bold text-amber-400">{fmt(d.creditOutstanding.totalBalanceDue)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-gray-400">Overdue Accounts</span>
              <p className="text-lg font-bold text-red-400">{d.creditOutstanding.overdueCount}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-gray-400">Overdue Amount</span>
              <p className="text-lg font-bold text-red-400">{fmt(d.creditOutstanding.overdueAmount)}</p>
            </div>
          </div>
        </div>

        {/* Marketer */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" /> Marketer Activity
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-gray-400">Assigned Value</span>
              <p className="text-lg font-bold text-white">{fmt(d.marketer.totalAssignedValue)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-gray-400">Sold Value</span>
              <p className="text-lg font-bold text-green-400">{fmt(d.marketer.totalSoldValue)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-gray-400">Outstanding</span>
              <p className="text-lg font-bold text-amber-400">{fmt(d.marketer.totalOutstanding)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-xs text-gray-400">Units Remaining</span>
              <p className="text-lg font-bold text-white">{d.marketer.unitsRemaining.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 5: Purchases ═══ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-400" /> Purchases
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <span className="text-xs text-gray-400">Total PO Value</span>
            <p className="text-xl font-bold text-white mt-1">{fmt(d.purchases.totalPurchaseValue)}</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <span className="text-xs text-gray-400">Received Value</span>
            <p className="text-xl font-bold text-white mt-1">{fmt(d.purchases.receivedValue)}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <span className="text-xs text-gray-400">Pending Delivery</span>
            <p className="text-xl font-bold text-white mt-1">{fmt(d.purchases.pendingValue)}</p>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 6: Expense Breakdown + Payment Methods ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Expenses by Category */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-400" /> Expenses by Category
          </h3>
          <div className="mb-3 bg-white/5 rounded-lg p-3">
            <span className="text-xs text-gray-400">Total Expenses</span>
            <p className="text-xl font-bold text-red-400">{fmt(d.expenses.totalExpenses)}</p>
          </div>
          {d.expenses.byCategory.length === 0 ? (
            <p className="text-gray-400 text-sm">No expenses recorded</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {d.expenses.byCategory.map((c) => (
                <div key={c.category} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                  <div>
                    <p className="text-white text-sm capitalize">{c.category.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400">{c.count} entries</p>
                  </div>
                  <span className="text-red-400 font-semibold text-sm">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-cyan-400" /> Payment Methods
          </h3>
          {d.byPaymentMethod.length === 0 ? (
            <p className="text-gray-400 text-sm">No sales recorded</p>
          ) : (
            <div className="space-y-2">
              {d.byPaymentMethod.map((pm) => (
                <div key={pm.method} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div>
                    <p className="text-white text-sm font-medium">{paymentMethodLabels[pm.method] || pm.method}</p>
                    <p className="text-xs text-gray-400">{pm.count} transactions ({pct(pm.total, d.revenue.totalRevenue)})</p>
                  </div>
                  <span className="text-white font-semibold">{fmt(pm.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTION 7: Per-Branch Breakdown ═══ */}
      {d.byBranch.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-400" /> Performance by Branch
          </h2>
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 px-4 py-3 font-medium">Branch</th>
                  <th className="text-right text-gray-400 px-4 py-3 font-medium">Revenue</th>
                  <th className="text-right text-gray-400 px-4 py-3 font-medium">Expenses</th>
                  <th className="text-right text-gray-400 px-4 py-3 font-medium">Profit</th>
                  <th className="text-right text-gray-400 px-4 py-3 font-medium">Sales</th>
                </tr>
              </thead>
              <tbody>
                {d.byBranch.map((b) => (
                  <tr key={b.branchId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{b.branchName}</td>
                    <td className="px-4 py-3 text-right text-green-400">{fmt(b.revenue)}</td>
                    <td className="px-4 py-3 text-right text-red-400">{fmt(b.expenses)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${b.profit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{fmt(b.profit)}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{b.salesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
