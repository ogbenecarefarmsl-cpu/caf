import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../lib/api-client';
import { unwrapResponse } from '../../lib/unwrap-response';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useCurrency } from '../../hooks/useCurrency';
import { queryKeys } from '../../lib/query-keys';

interface BranchInventory {
  branchId: string;
  branchName: string;
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  lowStockItems: number;
}

interface BranchSales {
  branchId: string;
  branchName: string;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface PendingTransfer {
  _id: string;
  sourceBranchName: string;
  destinationBranchName: string;
  productName: string;
  quantity: number;
  requestedByName: string;
  createdAt: string;
}

interface LowStockAlert {
  id: string;
  branchName: string;
  productName: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
}

interface ExpiryAlert {
  batchId: string;
  branchName: string;
  productName: string;
  lotNumber: string;
  expiryDate: string;
  daysUntilExpiry: number;
  quantityAvailable: number;
}

interface HQDashboardData {
  inventory: BranchInventory[];
  sales: BranchSales[];
  pendingTransfers: PendingTransfer[];
  lowStockAlerts: LowStockAlert[];
  expiryAlerts: ExpiryAlert[];
}

export default function HQDashboardPage() {
  const { format } = useCurrency();
  const navigate = useNavigate();

  const {
    data: dashboard,
    isLoading,
    error,
  } = useQuery<HQDashboardData>({
    queryKey: queryKeys.dashboard.hq(),
    queryFn: async () => {
      const response = await apiClient.get('/reports/hq-summary');
      return unwrapResponse(response.data, {} as HQDashboardData);
    },
  });

  const inventoryColumns = [
    { key: 'branchName', header: 'Branch' },
    { key: 'totalProducts', header: 'Products' },
    { key: 'totalQuantity', header: 'Total Stock' },
    { 
      key: 'totalValue', 
      header: 'Total Value',
      render: (item: BranchInventory) => format(item.totalValue)
    },
    { 
      key: 'lowStockItems', 
      header: 'Low Stock Items',
      render: (item: BranchInventory) => (
        <span className={item.lowStockItems > 0 ? 'text-red-400 font-semibold' : ''}>
          {item.lowStockItems}
        </span>
      )
    },
  ];

  const salesColumns = [
    { key: 'branchName', header: 'Branch' },
    { key: 'totalSales', header: 'Total Sales' },
    { 
      key: 'totalRevenue', 
      header: 'Revenue',
      render: (item: BranchSales) => format(item.totalRevenue)
    },
    { 
      key: 'averageOrderValue', 
      header: 'Avg Order Value',
      render: (item: BranchSales) => format(item.averageOrderValue)
    },
  ];

  const transferColumns = [
    { 
      key: 'createdAt', 
      header: 'Date',
      render: (transfer: PendingTransfer) => new Date(transfer.createdAt).toLocaleDateString()
    },
    { key: 'sourceBranchName', header: 'From' },
    { key: 'destinationBranchName', header: 'To' },
    { key: 'productName', header: 'Product' },
    { key: 'quantity', header: 'Quantity' },
    { 
      key: 'requestedByName', 
      header: 'Requested By',
      render: (transfer: PendingTransfer) => transfer.requestedByName || 'Unknown'
    },
  ];

  const lowStockColumns = [
    { key: 'branchName', header: 'Branch' },
    { key: 'productName', header: 'Product' },
    { key: 'sku', header: 'SKU' },
    { 
      key: 'currentStock', 
      header: 'Current Stock',
      render: (item: LowStockAlert) => (
        <span className="text-red-400 font-semibold">{item.currentStock}</span>
      )
    },
    { key: 'reorderLevel', header: 'Reorder Level' },
  ];

  const expiryColumns = [
    { key: 'branchName', header: 'Branch' },
    { key: 'productName', header: 'Product' },
    { key: 'lotNumber', header: 'Lot Number' },
    { 
      key: 'expiryDate', 
      header: 'Expiry Date',
      render: (item: ExpiryAlert) => new Date(item.expiryDate).toLocaleDateString()
    },
    { 
      key: 'daysUntilExpiry', 
      header: 'Days Left',
      render: (item: ExpiryAlert) => (
        <span className={item.daysUntilExpiry <= 7 ? 'text-red-400 font-semibold' : 'text-orange-400'}>
          {item.daysUntilExpiry} days
        </span>
      )
    },
    { key: 'quantityAvailable', header: 'Quantity' },
  ];

  const inventory = dashboard?.inventory || [];
  const sales = dashboard?.sales || [];
  const pendingTransfers = dashboard?.pendingTransfers || [];
  const lowStockAlerts = dashboard?.lowStockAlerts || [];
  const expiryAlerts = dashboard?.expiryAlerts || [];

  // Calculate totals
  const inventoryTotals = inventory?.reduce((acc, item) => ({
    totalValue: acc.totalValue + item.totalValue,
    totalQuantity: acc.totalQuantity + item.totalQuantity,
    lowStockItems: acc.lowStockItems + item.lowStockItems,
  }), { totalValue: 0, totalQuantity: 0, lowStockItems: 0 });

  const salesTotals = sales?.reduce((acc, item) => ({
    totalSales: acc.totalSales + item.totalSales,
    totalRevenue: acc.totalRevenue + item.totalRevenue,
  }), { totalSales: 0, totalRevenue: 0 });

  if (isLoading) {
    return (
      <AdminLayout>
        <Loading />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Error message="Failed to load HQ dashboard data. Please try again." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white">HQ Dashboard</h1>
          <div className="text-xs sm:text-sm text-gray-400">
            Company-wide Overview
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-primary-dark rounded-xl border border-gray-700 p-4 sm:p-6">
            <p className="text-sm text-gray-400">Total Branches</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-400">{inventory?.length || 0}</p>
          </div>
          <div className="bg-primary-dark rounded-xl border border-gray-700 p-4 sm:p-6">
            <p className="text-sm text-gray-400">Total Inventory Value</p>
            <p className="text-2xl sm:text-3xl font-bold text-accent-green wrap-break-word">
              {format(inventoryTotals?.totalValue || 0)}
            </p>
          </div>
          <div className="bg-primary-dark rounded-xl border border-gray-700 p-4 sm:p-6">
            <p className="text-sm text-gray-400">Sales (30 days)</p>
            <p className="text-2xl sm:text-3xl font-bold text-purple-400">{salesTotals?.totalSales || 0}</p>
          </div>
          <div className="bg-primary-dark rounded-xl border border-gray-700 p-4 sm:p-6">
            <p className="text-sm text-gray-400">Revenue (30 days)</p>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-400 wrap-break-word">
              {format(salesTotals?.totalRevenue || 0)}
            </p>
          </div>
        </div>

        {/* Inventory by Branch */}
        <div className="bg-primary-dark rounded-xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Inventory by Branch</h2>
          </div>
          {Array.isArray(inventory) && inventory.length > 0 ? (
            <Table
              data={inventory}
              columns={inventoryColumns}
              rowKey={(item) => item.branchId}
            />
          ) : (
            <div className="p-6 text-center text-gray-400">No inventory data available</div>
          )}
        </div>

        {/* Sales by Branch */}
        <div className="bg-primary-dark rounded-xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Sales by Branch (Last 30 Days)</h2>
          </div>
          {sales && sales.length > 0 ? (
            <Table
              data={Array.isArray(sales) ? sales : []}
              columns={salesColumns}
              rowKey={(item) => item.branchId}
            />
          ) : (
            <div className="p-6 text-center text-gray-400">No sales data available</div>
          )}
        </div>

        {/* Pending Transfer Approvals */}
        <div className="bg-primary-dark rounded-xl border border-gray-700">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-700 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Pending Transfer Approvals
              {pendingTransfers && pendingTransfers.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">
                  {pendingTransfers.length}
                </span>
              )}
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/transfers')}
              className="w-full sm:w-auto"
            >
              View All
            </Button>
          </div>
          {pendingTransfers && pendingTransfers.length > 0 ? (
            <Table
              data={Array.isArray(pendingTransfers) ? pendingTransfers : []}
              columns={transferColumns}
              rowKey={(item) => item._id}
            />
          ) : (
            <div className="p-6 text-center text-gray-400">No pending transfers</div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-primary-dark rounded-xl border border-gray-700">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-700 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Low Stock Alerts
              {lowStockAlerts && lowStockAlerts.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-300">
                  {lowStockAlerts.length}
                </span>
              )}
            </h2>
          </div>
          {lowStockAlerts && lowStockAlerts.length > 0 ? (
            <Table
              data={Array.isArray(lowStockAlerts) ? lowStockAlerts.slice(0, 10) : []}
              columns={lowStockColumns}
              rowKey={(item) => item.id}
            />
          ) : (
            <div className="p-6 text-center text-gray-400">No low stock alerts</div>
          )}
        </div>

        {/* Expiry Warnings */}
        <div className="bg-primary-dark rounded-xl border border-gray-700">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-700 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              Expiry Warnings (Next 30 Days)
              {expiryAlerts && expiryAlerts.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-orange-500/20 text-orange-300">
                  {expiryAlerts.length}
                </span>
              )}
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/reports/expiry')}
              className="w-full sm:w-auto"
            >
              View All
            </Button>
          </div>
          {expiryAlerts && expiryAlerts.length > 0 ? (
            <Table
              data={Array.isArray(expiryAlerts) ? expiryAlerts.slice(0, 10) : []}
              columns={expiryColumns}
              rowKey={(item) => item.batchId}
            />
          ) : (
            <div className="p-6 text-center text-gray-400">No expiry warnings</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}


