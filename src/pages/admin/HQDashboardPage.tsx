import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../lib/api-client';
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

interface PendingTransferRaw {
  _id: string;
  sourceBranchId: string | { _id: string };
  destinationBranchId: string | { _id: string };
  productId: string | { _id: string };
  quantity: number;
  requestedBy: string | { _id: string };
  status: string;
  createdAt: string;
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

interface Branch {
  _id: string;
  name: string;
  isActive?: boolean;
}

interface Product {
  _id: string;
  name: string;
  sku?: string;
  reorderLevel?: number;
}

interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
}

interface InventoryReportResponse {
  summary: {
    totalProducts: number;
    totalQuantity: number;
    totalValue: number;
    lowStockItems: number;
  };
  items: Array<{
    productId: string;
    productName?: string;
    branchName?: string;
    totalQuantity: number;
    isLowStock: boolean;
    reorderLevel?: number;
  }>;
}

interface SalesReportResponse {
  summary: {
    totalSales: number;
    totalAmount: number;
    averageTransaction: number;
  };
}

interface ExpiryReportResponse {
  expiringBatches: Array<{
    batchId: string;
    productId: string;
    productName?: string;
    branchName?: string;
    lotNumber: string;
    expiryDate: string;
    daysUntilExpiry: number;
    quantity: number;
  }>;
}

interface HQDashboardData {
  inventory: BranchInventory[];
  sales: BranchSales[];
  pendingTransfers: PendingTransfer[];
  lowStockAlerts: LowStockAlert[];
  expiryAlerts: ExpiryAlert[];
}

function getEntityId(value: string | { _id: string } | undefined): string {
  if (!value) {
    return '';
  }
  return typeof value === 'string' ? value : value._id;
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
      const [branchesResponse, productsResponse, transfersResponse] =
        await Promise.all([
          apiClient.get('/branches'),
          apiClient.get('/products'),
          apiClient.get('/transfers', { params: { status: 'pending' } }),
        ]);

      const branchesRaw = branchesResponse.data?.data ?? branchesResponse.data;
      const branches = (Array.isArray(branchesRaw) ? branchesRaw : []).filter(
        (branch) => branch.isActive !== false,
      );
      const productsRaw = productsResponse.data?.data ?? productsResponse.data;
      const products = Array.isArray(productsRaw) ? productsRaw : [];
      const pendingTransfersRaw = transfersResponse.data?.data ?? transfersResponse.data;
      const pendingTransferRows: PendingTransferRaw[] = Array.isArray(pendingTransfersRaw)
        ? pendingTransfersRaw
        : [];

      let users: User[] = [];
      try {
        const usersResponse = await apiClient.get('/users');
        const usersData = (usersResponse.data as any)?.data ?? usersResponse.data;
        users = Array.isArray(usersData) ? usersData : [];
      } catch {
        users = [];
      }

      const branchNameMap = new Map(branches.map((branch) => [branch._id, branch.name]));
      const productMap = new Map(products.map((product) => [product._id, product]));
      const userMap = new Map(users.map((user) => [user._id, user]));

      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [inventoryReportEntries, salesReportEntries, expiryReportEntries] =
        await Promise.all([
          Promise.all(
            branches.map(async (branch) => {
              try {
                const response = await apiClient.get('/reports/inventory', {
                  params: {
                    branchId: branch._id,
                    includeExpired: false,
                    lowStockOnly: false,
                    valuationMethod: 'fifo',
                  },
                });
                return [
                  branch._id,
                  response.data as InventoryReportResponse,
                ] as const;
              } catch {
                return [branch._id, null] as const;
              }
            }),
          ),
          Promise.all(
            branches.map(async (branch) => {
              try {
                const response = await apiClient.get('/reports/sales', {
                  params: {
                    branchId: branch._id,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                  },
                });
                return [branch._id, response.data as SalesReportResponse] as const;
              } catch {
                return [branch._id, null] as const;
              }
            }),
          ),
          Promise.all(
            branches.map(async (branch) => {
              try {
                const response = await apiClient.get('/reports/expiry', {
                  params: {
                    branchId: branch._id,
                    daysUntilExpiry: 30,
                  },
                });
                return [branch._id, response.data as ExpiryReportResponse] as const;
              } catch {
                return [branch._id, null] as const;
              }
            }),
          ),
        ]);

      const inventoryReportMap = new Map(inventoryReportEntries);
      const salesReportMap = new Map(salesReportEntries);
      const expiryReportMap = new Map(expiryReportEntries);

      const inventory = branches
        .map((branch) => {
          const report = inventoryReportMap.get(branch._id);
          return {
            branchId: branch._id,
            branchName: branch.name,
            totalProducts: report?.summary?.totalProducts ?? 0,
            totalQuantity: report?.summary?.totalQuantity ?? 0,
            totalValue: report?.summary?.totalValue ?? 0,
            lowStockItems: report?.summary?.lowStockItems ?? 0,
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue);

      const sales = branches
        .map((branch) => {
          const report = salesReportMap.get(branch._id);
          const totalSales = report?.summary?.totalSales ?? 0;
          const totalRevenue = report?.summary?.totalAmount ?? 0;
          const averageOrderValue =
            report?.summary?.averageTransaction ??
            (totalSales > 0 ? totalRevenue / totalSales : 0);

          return {
            branchId: branch._id,
            branchName: branch.name,
            totalSales,
            totalRevenue,
            averageOrderValue,
          };
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      const lowStockAlerts = branches
        .flatMap((branch) => {
          const report = inventoryReportMap.get(branch._id);
          if (!report?.items?.length) {
            return [] as LowStockAlert[];
          }

          return report.items
            .filter((item) => item.isLowStock)
            .map((item) => {
              const product = productMap.get(item.productId);
              return {
                id: `${branch._id}-${item.productId}`,
                branchName: item.branchName || branch.name,
                productName: item.productName || product?.name || item.productId,
                sku: product?.sku || 'N/A',
                currentStock: item.totalQuantity,
                reorderLevel: item.reorderLevel ?? product?.reorderLevel ?? 0,
              };
            });
        })
        .sort((a, b) => a.currentStock - b.currentStock);

      const expiryAlerts = branches
        .flatMap((branch) => {
          const report = expiryReportMap.get(branch._id);
          if (!report?.expiringBatches?.length) {
            return [] as ExpiryAlert[];
          }

          return report.expiringBatches.map((batch) => ({
            batchId: batch.batchId,
            branchName: batch.branchName || branch.name,
            productName:
              batch.productName ||
              productMap.get(batch.productId)?.name ||
              batch.productId,
            lotNumber: batch.lotNumber,
            expiryDate: batch.expiryDate,
            daysUntilExpiry: batch.daysUntilExpiry,
            quantityAvailable: batch.quantity,
          }));
        })
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      const pendingTransfers = pendingTransferRows
        .filter((transfer: PendingTransferRaw) => transfer.status === 'pending')
        .map((transfer: PendingTransferRaw) => {
          const sourceBranchId = getEntityId(transfer.sourceBranchId);
          const destinationBranchId = getEntityId(transfer.destinationBranchId);
          const productId = getEntityId(transfer.productId);
          const requestedById = getEntityId(transfer.requestedBy);
          const requestedBy = userMap.get(requestedById);
          const requestedByName = [requestedBy?.firstName, requestedBy?.lastName]
            .filter(Boolean)
            .join(' ');

          return {
            _id: transfer._id,
            sourceBranchName: branchNameMap.get(sourceBranchId) || sourceBranchId,
            destinationBranchName:
              branchNameMap.get(destinationBranchId) || destinationBranchId,
            productName: productMap.get(productId)?.name || productId,
            quantity: transfer.quantity,
            requestedByName: requestedByName || requestedById,
            createdAt: transfer.createdAt,
          };
        })
        .sort(
          (a: PendingTransfer, b: PendingTransfer) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      return {
        inventory,
        sales,
        pendingTransfers,
        lowStockAlerts,
        expiryAlerts,
      };
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
        <span className={item.lowStockItems > 0 ? 'text-red-600 font-semibold' : ''}>
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
        <span className="text-red-600 font-semibold">{item.currentStock}</span>
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
        <span className={item.daysUntilExpiry <= 7 ? 'text-red-600 font-semibold' : 'text-orange-600'}>
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">HQ Dashboard</h1>
          <div className="text-xs sm:text-sm text-gray-500">
            Company-wide Overview
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <p className="text-sm text-gray-600">Total Branches</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{inventory?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <p className="text-sm text-gray-600">Total Inventory Value</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 wrap-break-word">
              {format(inventoryTotals?.totalValue || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <p className="text-sm text-gray-600">Sales (30 days)</p>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600">{salesTotals?.totalSales || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <p className="text-sm text-gray-600">Revenue (30 days)</p>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-600 wrap-break-word">
              {format(salesTotals?.totalRevenue || 0)}
            </p>
          </div>
        </div>

        {/* Inventory by Branch */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Inventory by Branch</h2>
          </div>
          {Array.isArray(inventory) && inventory.length > 0 ? (
            <Table
              data={inventory}
              columns={inventoryColumns}
              rowKey={(item) => item.branchId}
            />
          ) : (
            <div className="p-6 text-center text-gray-500">No inventory data available</div>
          )}
        </div>

        {/* Sales by Branch */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Sales by Branch (Last 30 Days)</h2>
          </div>
          {sales && sales.length > 0 ? (
            <Table
              data={Array.isArray(sales) ? sales : []}
              columns={salesColumns}
              rowKey={(item) => item.branchId}
            />
          ) : (
            <div className="p-6 text-center text-gray-500">No sales data available</div>
          )}
        </div>

        {/* Pending Transfer Approvals */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Pending Transfer Approvals
              {pendingTransfers && pendingTransfers.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
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
            <div className="p-6 text-center text-gray-500">No pending transfers</div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Low Stock Alerts
              {lowStockAlerts && lowStockAlerts.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
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
            <div className="p-6 text-center text-gray-500">No low stock alerts</div>
          )}
        </div>

        {/* Expiry Warnings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Expiry Warnings (Next 30 Days)
              {expiryAlerts && expiryAlerts.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
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
            <div className="p-6 text-center text-gray-500">No expiry warnings</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}


