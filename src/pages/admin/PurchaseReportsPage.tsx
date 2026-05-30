import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { unwrapResponse } from '../../lib/unwrap-response';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useCurrency } from '../../hooks/useCurrency';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';

interface PurchaseReportData {
  totalPurchases: number;
  totalAmount: number;
  totalItems: number;
  bySupplier: Array<{
    supplierId: string;
    supplierName: string;
    purchaseCount: number;
    totalAmount: number;
  }>;
  byProduct: Array<{
    productId: string;
    productName: string;
    quantity: number;
    totalAmount: number;
  }>;
  byPeriod: Array<{
    date: string;
    purchaseCount: number;
    amount: number;
  }>;
}

export const PurchaseReportsPage = () => {
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const branchId = getBranchId(selectedBranch);
  const { format } = useCurrency();

  // Fetch purchase reports
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: queryKeys.reports.purchase({
      branchId,
      startDate: dateFrom,
      endDate: dateTo,
      groupBy,
    }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/reports/purchases', {
        from: dateFrom,
        to: dateTo,
        groupBy,
        branchId,
      }));
      return unwrapResponse(response.data, {} as PurchaseReportData);
    },
    enabled: !!dateFrom && !!dateTo && !!branchId,
  });

  const handleExport = async () => {
    try {
      const response = await apiClient.get(buildApiUrl('/reports/purchases/export', {
        from: dateFrom,
        to: dateTo,
        groupBy,
        format: 'csv',
        branchId,
      }), {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `purchase-report-${dateFrom}-${dateTo}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (!branchId) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-white/10 bg-primary-dark/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">Select a Branch First</h2>
          <p className="mt-2 text-gray-400">
            Purchase reports are branch-scoped. Choose a branch to continue.
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (error) return <AdminLayout><Error message="Failed to load purchase reports" /></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Purchase Reports</h1>
          <Button onClick={handleExport}>
            Export to CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-primary-dark/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/5">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="From Date"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="To Date"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select
              label="Group By"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
            >
              <option value="day" className="bg-primary-dark text-white">Daily</option>
              <option value="week" className="bg-primary-dark text-white">Weekly</option>
              <option value="month" className="bg-primary-dark text-white">Monthly</option>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        {reportData && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary-dark/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/5">
                <p className="text-sm text-gray-400">Total Purchases</p>
                <p className="text-3xl font-bold text-white">{reportData.totalPurchases}</p>
              </div>
              <div className="bg-primary-dark/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/5">
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="text-3xl font-bold text-blue-400">{format(reportData.totalAmount)}</p>
              </div>
              <div className="bg-primary-dark/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/5">
                <p className="text-sm text-gray-400">Total Items</p>
                <p className="text-3xl font-bold text-green-400">{reportData.totalItems}</p>
              </div>
            </div>

            {/* By Supplier */}
            <div className="bg-primary-dark/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/5">
              <h2 className="text-xl font-bold text-white mb-4">Purchases by Supplier</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purchase Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.bySupplier.map((supplier) => (
                      <tr key={supplier.supplierId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {supplier.supplierName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {supplier.purchaseCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {format(supplier.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Product */}
            <div className="bg-primary-dark/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/5">
              <h2 className="text-xl font-bold text-white mb-4">Top Products Purchased</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.byProduct.slice(0, 10).map((product) => (
                      <tr key={product.productId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {product.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {product.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {format(product.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trend Chart */}
            <div className="bg-primary-dark/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/5">
              <h2 className="text-xl font-bold text-white mb-4">Purchase Trend</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purchase Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.byPeriod.map((period, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {new Date(period.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {period.purchaseCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {format(period.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
