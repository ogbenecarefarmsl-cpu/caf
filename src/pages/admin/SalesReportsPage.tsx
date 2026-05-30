import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useCurrency } from '../../hooks/useCurrency';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';

interface Branch {
  _id: string;
  name: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface SalesReportFilters {
  branchId?: string;
  cashierId?: string;
  productId?: string;
  startDate: string;
  endDate: string;
  groupBy?: 'branch' | 'cashier' | 'product';
  [key: string]: string | number | boolean | undefined;
}

interface SalesReportData {
  groupKey: string;
  groupLabel: string;
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  averageOrderValue: number;
}

interface PaymentMethodBreakdown {
  paymentMethod: string;
  label: string;
  count: number;
  totalAmount: number;
  totalAmountFormatted: string;
}

interface SalesReportResponse {
  summary: {
    totalSales: number;
    totalAmount: number;
    totalDiscount: number;
    totalReturns: number;
    netAmount: number;
    averageTransaction: number;
    transactionCount: number;
    totalAmountFormatted: string;
    totalDiscountFormatted: string;
    totalReturnsFormatted: string;
    netAmountFormatted: string;
    averageTransactionFormatted: string;
  };
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  breakdown?: unknown[];
  topProducts?: unknown[];
}

const defaultFilters: SalesReportFilters = {
  startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
};

export default function SalesReportsPage() {
  const { format } = useCurrency();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const selectedBranchId = getBranchId(selectedBranch);
  
  const [filters, setFilters] = useState<SalesReportFilters>(defaultFilters);

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: queryKeys.branches.list(),
    queryFn: async () => {
      const response = await apiClient.get('/branches');
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as Branch[];
    },
  });

  // Fetch cashiers
  const { data: cashiers } = useQuery({
    queryKey: queryKeys.users.list({ role: 'cashier' }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/users', { role: 'cashier' }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as User[];
    },
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: async () => {
      const response = await apiClient.get('/products');
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as Product[];
    },
  });

  // Fetch report data
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.reports.sales(filters),
    queryFn: async () => {
      const response = await apiClient.get(
        buildApiUrl('/reports/sales', {
          branchId: filters.branchId,
          cashierId: filters.cashierId,
          productId: filters.productId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          groupBy: filters.groupBy,
        }),
      );
      return response.data as SalesReportResponse;
    },
  });

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await apiClient.get(buildApiUrl('/reports/sales', {
        branchId: filters.branchId,
        cashierId: filters.cashierId,
        productId: filters.productId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: filters.groupBy,
        export: format,
      }), {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales-report-${new Date().toISOString()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const columns = [
    { key: 'groupLabel', header: 'Group' },
    { key: 'totalSales', header: 'Total Sales' },
    { 
      key: 'totalRevenue', 
      header: 'Total Revenue',
      render: (row: SalesReportData) => format(row.totalRevenue)
    },
    { 
      key: 'totalDiscount', 
      header: 'Total Discount',
      render: (row: SalesReportData) => format(row.totalDiscount)
    },
    { 
      key: 'averageOrderValue', 
      header: 'Avg Order Value',
      render: (row: SalesReportData) => format(row.averageOrderValue)
    },
  ];

  const paymentMethodColumns = [
    { 
      key: 'label', 
      header: 'Payment Method',
      render: (row: PaymentMethodBreakdown) => (
        <span className="font-medium">{row.label}</span>
      )
    },
    { 
      key: 'count', 
      header: 'Transactions',
      render: (row: PaymentMethodBreakdown) => (
        <span className={row.count > 0 ? 'text-white' : 'text-gray-500'}>
          {row.count}
        </span>
      )
    },
    { 
      key: 'totalAmount', 
      header: 'Total Amount',
      render: (row: PaymentMethodBreakdown) => (
        <span className={row.count > 0 ? 'text-white font-semibold' : 'text-gray-500'}>
          {row.totalAmountFormatted}
        </span>
      )
    },
  ];

  if (!selectedBranchId) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-white/10 bg-primary-dark/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">Select a Branch First</h2>
          <p className="mt-2 text-gray-400">
            Sales reports are branch-scoped. Choose a branch to continue.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
        </div>

        {/* Filters */}
        <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Report Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Branch"
              value={filters.branchId ?? ''}
              onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value || undefined }))}
            >
              <option value="" className="bg-primary-dark text-white">All Branches</option>
              {branches?.map(branch => (
                <option key={branch._id} value={branch._id} className="bg-primary-dark text-white">
                  {branch.name}
                </option>
              ))}
            </Select>

            <Select
              label="Cashier"
              value={filters.cashierId ?? ''}
              onChange={(e) => setFilters(prev => ({ ...prev, cashierId: e.target.value || undefined }))}
            >
              <option value="" className="bg-primary-dark text-white">All Cashiers</option>
              {cashiers?.map(cashier => (
                <option key={cashier._id} value={cashier._id} className="bg-primary-dark text-white">
                  {cashier.firstName} {cashier.lastName}
                </option>
              ))}
            </Select>

            <Select
              label="Product"
              value={filters.productId ?? ''}
              onChange={(e) => setFilters(prev => ({ ...prev, productId: e.target.value || undefined }))}
            >
              <option value="" className="bg-primary-dark text-white">All Products</option>
              {products?.map(product => (
                <option key={product._id} value={product._id} className="bg-primary-dark text-white">
                  {product.name} ({product.sku})
                </option>
              ))}
            </Select>

            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />

            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />

            <Select
              label="Group By"
              value={filters.groupBy ?? ''}
              onChange={(e) => setFilters(prev => ({ ...prev, groupBy: (e.target.value || undefined) as SalesReportFilters['groupBy'] }))}
            >
              <option value="" className="bg-primary-dark text-white">No Grouping</option>
              <option value="branch" className="bg-primary-dark text-white">Branch</option>
              <option value="cashier" className="bg-primary-dark text-white">Cashier</option>
              <option value="product" className="bg-primary-dark text-white">Product</option>
            </Select>
          </div>
        </div>

        {/* Report Results */}
        {isLoading && (
          <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5 p-6">
            <Loading />
          </div>
        )}

        {error && (
          <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5 p-6">
            <Error message="Failed to generate report. Please try again." />
          </div>
        )}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5">
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Sales Summary</h2>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExport('pdf')}
                  >
                    Export PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleExport('excel')}
                  >
                    Export Excel
                  </Button>
                </div>
              </div>

              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                  <p className="text-sm text-blue-200">Total Transactions</p>
                  <p className="text-2xl font-bold text-blue-400">{data.summary.transactionCount}</p>
                </div>
                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                  <p className="text-sm text-green-200">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-400">{data.summary.totalAmountFormatted}</p>
                </div>
                <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                  <p className="text-sm text-orange-200">Total Discount</p>
                  <p className="text-2xl font-bold text-orange-400">{data.summary.totalDiscountFormatted}</p>
                </div>
                <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
                  <p className="text-sm text-purple-200">Avg Transaction</p>
                  <p className="text-2xl font-bold text-purple-400">{data.summary.averageTransactionFormatted}</p>
                </div>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5">
              <div className="px-6 py-4 border-b border-white/5">
                <h2 className="text-lg font-semibold text-white">Payment Method Breakdown</h2>
                <p className="text-sm text-gray-400 mt-1">All payment methods are shown, including those with zero transactions</p>
              </div>
              <Table
                data={data.paymentMethodBreakdown}
                columns={paymentMethodColumns}
              />
            </div>

            {/* Breakdown by Group */}
            {data.breakdown && data.breakdown.length > 0 && (
              <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5">
                <div className="px-6 py-4 border-b border-white/5">
                  <h2 className="text-lg font-semibold text-white">Breakdown by {filters.groupBy}</h2>
                </div>
                <Table
                  data={data.breakdown as SalesReportData[]}
                  columns={columns}
                />
              </div>
            )}
          </>
        )}

        {data && data.summary.transactionCount === 0 && (
          <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5 p-6 text-center">
            <p className="text-gray-400">No sales data found for the selected filters.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
