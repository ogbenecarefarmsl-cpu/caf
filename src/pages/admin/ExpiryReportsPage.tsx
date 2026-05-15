import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useCurrency } from '../../hooks/useCurrency';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';

interface Branch {
  _id: string;
  name: string;
}

interface ExpiryReportFilters {
  branchId?: string;
  daysUntilExpiry: number;
  [key: string]: string | number | boolean | undefined;
}

interface ExpiryReportItem {
  productId: string;
  productName: string;
  branchId: string;
  branchName: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  potentialLoss: number;
  daysUntilExpiry: number;
}

export const ExpiryReportsPage = () => {
  const { format } = useCurrency();
  const [filters, setFilters] = useState<ExpiryReportFilters>({
    daysUntilExpiry: 90,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<ExpiryReportFilters>({
    defaultValues: filters,
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: queryKeys.branches.list(),
    queryFn: async () => {
      const response = await apiClient.get('/branches');
      return response.data as Branch[];
    },
  });

  // Fetch report data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.reports.expiry(filters),
    queryFn: async () => {
      const response = await apiClient.get(
        buildApiUrl('/reports/expiry', {
          branchId: filters.branchId,
          daysUntilExpiry: filters.daysUntilExpiry,
        }),
      );
      // Backend returns { expiringBatches: [], summary: {}, byTimeframe: {} }
      return response.data?.expiringBatches || [] as ExpiryReportItem[];
    },
    enabled: false,
  });

  const onSubmit = (data: ExpiryReportFilters) => {
    setFilters({
      ...data,
      daysUntilExpiry: Number(data.daysUntilExpiry),
    });
    refetch();
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await apiClient.get(buildApiUrl('/reports/expiry', {
        branchId: filters.branchId,
        daysUntilExpiry: filters.daysUntilExpiry,
        export: format,
      }), {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expiry-report-${new Date().toISOString()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getExpiryStatus = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 0) {
      return { label: 'EXPIRED', color: 'bg-red-100 text-red-800' };
    } else if (daysUntilExpiry <= 30) {
      return { label: 'CRITICAL', color: 'bg-red-100 text-red-800' };
    } else if (daysUntilExpiry <= 60) {
      return { label: 'WARNING', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { label: 'ATTENTION', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  const columns = [
    { key: 'productName', header: 'Product' },
    { key: 'productId', header: 'Product ID' },
    { key: 'branchName', header: 'Branch' },
    { 
      key: 'expiryDate', 
      header: 'Expiry Date',
      render: (item: ExpiryReportItem) => new Date(item.expiryDate).toLocaleDateString()
    },
    { 
      key: 'daysUntilExpiry', 
      header: 'Days Until Expiry',
      render: (item: ExpiryReportItem) => {
        const status = getExpiryStatus(item.daysUntilExpiry);
        return (
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
              {status.label}
            </span>
            <span>{item.daysUntilExpiry} days</span>
          </div>
        );
      }
    },
    { key: 'quantity', header: 'Quantity' },
    { 
      key: 'potentialLoss', 
      header: 'Potential Loss',
      render: (item: ExpiryReportItem) => (
        <span className="text-red-600 font-semibold">
          {format(item.potentialLoss)}
        </span>
      )
    },
  ];

  // Calculate totals
  const totals = data?.reduce(
    (acc: { totalQuantity: number; totalPotentialLoss: number; expiredCount: number; criticalCount: number }, item: ExpiryReportItem) => ({
      totalQuantity: acc.totalQuantity + item.quantity,
      totalPotentialLoss: acc.totalPotentialLoss + item.potentialLoss,
      expiredCount: acc.expiredCount + (item.daysUntilExpiry <= 0 ? 1 : 0),
      criticalCount: acc.criticalCount + (item.daysUntilExpiry > 0 && item.daysUntilExpiry <= 30 ? 1 : 0),
    }),
    { totalQuantity: 0, totalPotentialLoss: 0, expiredCount: 0, criticalCount: 0 }
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Expiry Reports</h1>
        </div>

        {/* Filters */}
        <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Report Filters</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Branch"
                {...register('branchId')}
              >
                <option value="">All Branches</option>
                {branches?.map(branch => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </Select>

              <Input
                label="Days Until Expiry"
                type="number"
                min="0"
                placeholder="Enter days (e.g., 30, 60, 90)"
                {...register('daysUntilExpiry', { 
                  required: 'Days until expiry is required',
                  min: { value: 0, message: 'Must be 0 or greater' }
                })}
                error={errors.daysUntilExpiry?.message}
              />

              <div className="flex items-end">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilters({ ...filters, daysUntilExpiry: 30 });
                  refetch();
                }}
              >
                30 Days
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilters({ ...filters, daysUntilExpiry: 60 });
                  refetch();
                }}
              >
                60 Days
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilters({ ...filters, daysUntilExpiry: 90 });
                  refetch();
                }}
              >
                90 Days
              </Button>
            </div>
          </form>
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

        {data && data.length > 0 && (
          <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Report Results</h2>
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

            {/* Summary Cards */}
            {totals && (
              <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-white/5">
                <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                  <p className="text-sm text-blue-200">Total Products</p>
                  <p className="text-2xl font-bold text-blue-400">{data.length}</p>
                </div>
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                  <p className="text-sm text-red-200">Expired</p>
                  <p className="text-2xl font-bold text-red-400">{totals.expiredCount}</p>
                </div>
                <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                  <p className="text-sm text-orange-200">Critical (≤30 days)</p>
                  <p className="text-2xl font-bold text-orange-400">{totals.criticalCount}</p>
                </div>
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                  <p className="text-sm text-red-200">Potential Loss</p>
                  <p className="text-2xl font-bold text-red-400">{format(totals.totalPotentialLoss)}</p>
                </div>
              </div>
            )}

            <Table
              data={data}
              columns={columns}
            />
          </div>
        )}

        {data && data.length === 0 && (
          <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl shadow-xl border border-white/5 p-6 text-center">
            <p className="text-gray-400">No products expiring within the selected timeframe.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}


