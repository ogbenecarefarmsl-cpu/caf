import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MarketerLayout } from '../../components/MarketerLayout';
import apiClient from '../../lib/api-client';
import { unwrapResponse } from '../../lib/unwrap-response';
import { useCurrency } from '../../hooks/useCurrency';
import { queryKeys } from '../../lib/query-keys';

interface MarketerSummary {
  assignedStockValue: number;
  unitsAssigned: number;
  unitsRemaining: number;
  pendingStockValue: number;
  pendingUnits: number;
  soldValue: number;
  unitsSold: number;
  saleCount: number;
}

interface MarketerSalesResponse {
  data: Array<{
    _id: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    soldAt: string;
    productId?: { name?: string; sku?: string };
    customerName?: string;
  }>;
  count: number;
}

export const MarketerDashboardPage = () => {
  const { format } = useCurrency();

  const { data: summary, isLoading: summaryLoading } = useQuery<MarketerSummary>({
    queryKey: queryKeys.marketer.summary(),
    queryFn: async () => {
      const response = await apiClient.get('/marketer/summary');
      return unwrapResponse(response.data, {} as MarketerSummary);
    },
  });

  const { data: recentSales, isLoading: salesLoading } = useQuery<MarketerSalesResponse>({
    queryKey: queryKeys.marketer.sales({ limit: 10 }),
    queryFn: async () => {
      const response = await apiClient.get('/marketer/sales', { params: { limit: 10 } });
      return unwrapResponse(response.data, {} as MarketerSalesResponse);
    },
  });

  const cards = [
    {
      title: 'Assigned Stock Value',
      value: format(summary?.assignedStockValue ?? 0),
      subtitle: `${summary?.unitsAssigned ?? 0} total units`,
      tone: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Sales Value',
      value: format(summary?.soldValue ?? 0),
      subtitle: `${summary?.saleCount ?? 0} completed sales`,
      tone: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Units Sold',
      value: `${summary?.unitsSold ?? 0}`,
      subtitle: 'Units sold from assignments',
      tone: 'text-indigo-700',
      bg: 'bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Units Remaining',
      value: `${summary?.unitsRemaining ?? 0}`,
      subtitle: 'Available for next sales',
      tone: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    },
    {
      title: 'Pending Assignment Value',
      value: format(summary?.pendingStockValue ?? 0),
      subtitle: `${summary?.pendingUnits ?? 0} units awaiting acceptance`,
      tone: 'text-purple-700',
      bg: 'bg-purple-50 border-purple-200',
    },
  ];

  return (
    <MarketerLayout title="My Sales Dashboard">
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((card) => (
            <div key={card.title} className={`rounded-2xl border p-5 ${card.bg}`}>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{card.title}</p>
              <p className={`mt-2 text-2xl font-bold ${card.tone}`}>
                {summaryLoading ? '...' : card.value}
              </p>
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-primary-dark/50">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Sales</h3>
            <Link to="/marketer/sales" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Open Sell Screen
            </Link>
          </div>
          <div className="px-5 pt-3">
            <Link to="/marketer/review" className="text-xs font-medium text-purple-600 hover:text-purple-700">
              Review pending assignments
            </Link>
          </div>
          <div className="p-4">
            {salesLoading ? (
              <p className="text-sm text-gray-500">Loading recent sales...</p>
            ) : (recentSales?.data || []).length === 0 ? (
              <p className="text-sm text-gray-500">No sales yet. Start by creating a sale from your assigned products.</p>
            ) : (
              <div className="space-y-2">
                {(recentSales?.data || []).map((sale) => (
                  <div key={sale._id} className="rounded-xl border border-white/10 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{sale.productId?.name || 'Assigned Product'}</p>
                      <p className="text-xs text-white/50">
                        Qty {sale.quantity} · {new Date(sale.soldAt).toLocaleString()}
                      </p>
                    </div>
                      <p className="text-sm font-semibold text-emerald-400 sm:pl-4">{format(sale.totalAmount)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MarketerLayout>
  );
};
