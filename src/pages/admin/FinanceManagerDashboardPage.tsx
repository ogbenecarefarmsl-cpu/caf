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
  externalServices: {
    caf: { revenue: number; expenses: number; profit: number; outstanding: number; orders: number; byPaymentMethod: { method: string; count: number; total: number }[] };
    emr: { revenue: number; expenses: number; profit: number; outstanding: number; orders: number; byPaymentMethod: { method: string; count: number; total: number }[] };
    lab: { revenue: number; expenses: number; profit: number; outstanding: number; orders: number; byPaymentMethod: { method: string; count: number; total: number }[] };
    combined: { totalRevenue: number; totalExpenses: number; totalProfit: number; totalOutstanding: number };
  };
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

      {/* ═══ SECTION 0: CAF / EMR / LAB Breakdown ═══ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent-green" /> Revenue by Source (CAF / EMR / LAB)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'CAF (Pharmacy)', revenue: d.externalServices.caf.revenue, expenses: d.externalServices.caf.expenses, profit: d.externalServices.caf.profit, color: 'border-blue-500/30 bg-blue-500/5', accent: 'text-blue-400' },
            { label: 'EMR (Medical)', revenue: d.externalServices.emr.revenue, expenses: d.externalServices.emr.expenses, profit: d.externalServices.emr.profit, color: 'border-purple-500/30 bg-purple-500/5', accent: 'text-purple-400' },
            { label: 'LAB (Laboratory)', revenue: d.externalServices.lab.revenue, expenses: d.externalServices.lab.expenses, profit: d.externalServices.lab.profit, color: 'border-cyan-500/30 bg-cyan-500/5', accent: 'text-cyan-400' },
            { label: 'Combined Total', revenue: d.externalServices.combined.totalRevenue, expenses: d.externalServices.combined.totalExpenses, profit: d.externalServices.combined.totalProfit, color: 'border-green-500/30 bg-green-500/5', accent: 'text-green-400' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
              <p className={`text-sm font-semibold mb-3 ${s.accent}`}>{s.label}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Revenue</span>
                  <span className="text-white font-medium">{fmt(s.revenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Expenses</span>
                  <span className="text-red-400 font-medium">{fmt(s.expenses)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                  <span className="text-gray-400">Profit</span>
                  <span className={`font-bold ${s.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(s.profit)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Per-source order counts and outstanding */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'CAF', orders: d.externalServices.caf.orders, outstanding: d.externalServices.caf.outstanding, methods: d.externalServices.caf.byPaymentMethod },
            { label: 'EMR', orders: d.externalServices.emr.orders, outstanding: d.externalServices.emr.outstanding, methods: d.externalServices.emr.byPaymentMethod },
            { label: 'LAB', orders: d.externalServices.lab.orders, outstanding: d.externalServices.lab.outstanding, methods: d.externalServices.lab.byPaymentMethod },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 rounded-xl border border-white/10 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-400">{s.label}</span>
                <span className="text-xs text-gray-500">{s.orders} orders</span>
              </div>
              {s.outstanding > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Outstanding</span>
                  <span className="text-amber-400">{fmt(s.outstanding)}</span>
                </div>
              )}
              {s.methods.length > 0 && (
                <div className="space-y-1">
                  {s.methods.map((m) => (
                    <div key={m.method} className="flex justify-between text-xs">
                      <span className="text-gray-500">{paymentMethodLabels[m.method] || m.method}</span>
                      <span className="text-gray-300">{fmt(m.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.methods.length === 0 && s.orders === 0 && (
                <p className="text-xs text-gray-500 italic">No data available</p>
              )}
            </div>
          ))}
        </div>
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
