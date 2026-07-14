import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import apiClient from "../../lib/api-client";
import { unwrapResponse } from "../../lib/unwrap-response";
import { AdminLayout } from "../../components/AdminLayout";
import { Button } from "../../components/ui/Button";
import { Table } from "../../components/ui/Table";
import { Loading } from "../../components/ui/Loading";
import { Error } from "../../components/ui/Error";
import { useCurrency } from "../../hooks/useCurrency";
import { queryKeys } from "../../lib/query-keys";
import {
  Building2,
  DollarSign,
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  ArrowRightLeft,
  Calendar,
} from "lucide-react";

interface BranchInventory {
  branchId: string;
  branchName: string;
  currencyCode: string;
  totalProducts: number;
  totalQuantity: number;
  totalValue: number;
  totalValueFormatted?: string;
  lowStockItems: number;
}

interface BranchSales {
  branchId: string;
  branchName: string;
  currencyCode: string;
  totalSales: number;
  totalRevenue: number;
  totalRevenueFormatted?: string;
  averageOrderValue: number;
  averageOrderValueFormatted?: string;
}

interface CurrencyTotal {
  currencyCode: string;
  totalValue?: number;
  totalQuantity?: number;
  totalRevenue?: number;
  totalSales?: number;
  totalValueFormatted?: string;
  totalRevenueFormatted?: string;
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
  inventoryTotalsByCurrency?: CurrencyTotal[];
  salesTotalsByCurrency?: CurrencyTotal[];
  pendingTransfers: PendingTransfer[];
  lowStockAlerts: LowStockAlert[];
  expiryAlerts: ExpiryAlert[];
}

type TabKey = "overview" | "inventory" | "sales" | "alerts";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
  trend?: { value: string; isPositive: boolean };
}

const StatCard = ({
  icon,
  label,
  value,
  subtitle,
  color,
  trend,
}: StatCardProps) => (
  <div
    className={`rounded-xl border p-5 ${color} transition-all hover:scale-[1.02]`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="p-2 rounded-lg bg-white/10">{icon}</div>
      {trend && (
        <span
          className={`text-xs font-semibold ${trend.isPositive ? "text-green-400" : "text-red-400"}`}
        >
          {trend.value}
        </span>
      )}
    </div>
    <p className="text-sm text-gray-400 mb-1">{label}</p>
    <p className="text-2xl font-bold text-white mb-1">{value}</p>
    {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
  </div>
);

export default function HQDashboardPage() {
  const { format } = useCurrency();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const {
    data: dashboard,
    isLoading,
    error,
  } = useQuery<HQDashboardData>({
    queryKey: queryKeys.dashboard.hq(),
    queryFn: async () => {
      const response = await apiClient.get("/reports/hq-summary");
      return unwrapResponse(response.data, {} as HQDashboardData);
    },
  });

  const inventory = dashboard?.inventory || [];
  const sales = dashboard?.sales || [];
  const pendingTransfers = dashboard?.pendingTransfers || [];
  const lowStockAlerts = dashboard?.lowStockAlerts || [];
  const expiryAlerts = dashboard?.expiryAlerts || [];
  const inventoryTotalsByCurrency = dashboard?.inventoryTotalsByCurrency || [];
  const salesTotalsByCurrency = dashboard?.salesTotalsByCurrency || [];

  // Calculate totals
  const inventoryTotals = inventory?.reduce(
    (acc, item) => ({
      totalQuantity: acc.totalQuantity + item.totalQuantity,
      lowStockItems: acc.lowStockItems + item.lowStockItems,
    }),
    { totalQuantity: 0, lowStockItems: 0 },
  );

  const salesTotals = sales?.reduce(
    (acc, item) => ({
      totalSales: acc.totalSales + item.totalSales,
      totalRevenue: acc.totalRevenue + item.totalRevenue,
    }),
    { totalSales: 0, totalRevenue: 0 },
  );

  // Table columns
  const inventoryColumns = [
    { key: "branchName", header: "Branch", mobilePrimary: true },
    { key: "totalProducts", header: "Products", mobileVisible: true },
    { key: "totalQuantity", header: "Total Stock", mobileVisible: true },
    {
      key: "totalValue",
      header: "Total Value",
      mobileVisible: false,
      render: (item: BranchInventory) =>
        item.totalValueFormatted || format(item.totalValue),
    },
    {
      key: "lowStockItems",
      header: "Low Stock",
      mobileVisible: true,
      render: (item: BranchInventory) => (
        <span
          className={
            item.lowStockItems > 0
              ? "text-red-400 font-semibold"
              : "text-green-400"
          }
        >
          {item.lowStockItems}
        </span>
      ),
    },
  ];

  const salesColumns = [
    { key: "branchName", header: "Branch", mobilePrimary: true },
    { key: "totalSales", header: "Sales Count", mobileVisible: true },
    {
      key: "totalRevenue",
      header: "Revenue",
      mobileVisible: true,
      render: (item: BranchSales) => (
        <span className="font-semibold text-accent-green">
          {item.totalRevenueFormatted || format(item.totalRevenue)}
        </span>
      ),
    },
    {
      key: "averageOrderValue",
      header: "Avg Order",
      mobileVisible: false,
      render: (item: BranchSales) =>
        item.averageOrderValueFormatted || format(item.averageOrderValue),
    },
  ];

  const transferColumns = [
    {
      key: "createdAt",
      header: "Date",
      mobileVisible: false,
      render: (transfer: PendingTransfer) =>
        new Date(transfer.createdAt).toLocaleDateString(),
    },
    { key: "sourceBranchName", header: "From", mobilePrimary: true },
    { key: "destinationBranchName", header: "To", mobileVisible: true },
    { key: "productName", header: "Product", mobileVisible: true },
    {
      key: "quantity",
      header: "Qty",
      mobileVisible: true,
      render: (transfer: PendingTransfer) => (
        <span className="font-semibold text-blue-400">{transfer.quantity}</span>
      ),
    },
    {
      key: "requestedByName",
      header: "Requested By",
      mobileVisible: false,
      render: (transfer: PendingTransfer) =>
        transfer.requestedByName || "Unknown",
    },
  ];

  const lowStockColumns = [
    { key: "branchName", header: "Branch", mobilePrimary: true },
    { key: "productName", header: "Product", mobileVisible: true },
    { key: "sku", header: "SKU", mobileVisible: false },
    {
      key: "currentStock",
      header: "Current",
      mobileVisible: true,
      render: (item: LowStockAlert) => (
        <span className="text-red-400 font-semibold">{item.currentStock}</span>
      ),
    },
    {
      key: "reorderLevel",
      header: "Reorder At",
      mobileVisible: true,
      render: (item: LowStockAlert) => (
        <span className="text-amber-400">{item.reorderLevel}</span>
      ),
    },
  ];

  const expiryColumns = [
    { key: "branchName", header: "Branch", mobileVisible: true },
    { key: "productName", header: "Product", mobilePrimary: true },
    { key: "lotNumber", header: "Lot", mobileVisible: false },
    {
      key: "expiryDate",
      header: "Expires",
      mobileVisible: true,
      render: (item: ExpiryAlert) =>
        new Date(item.expiryDate).toLocaleDateString(),
    },
    {
      key: "daysUntilExpiry",
      header: "Days Left",
      mobileVisible: true,
      render: (item: ExpiryAlert) => (
        <span
          className={
            item.daysUntilExpiry <= 7
              ? "text-red-400 font-bold"
              : "text-orange-400 font-semibold"
          }
        >
          {item.daysUntilExpiry}
        </span>
      ),
    },
    {
      key: "quantityAvailable",
      header: "Qty",
      mobileVisible: true,
      render: (item: ExpiryAlert) => (
        <span className="font-medium">{item.quantityAvailable}</span>
      ),
    },
  ];

  const tabs = [
    {
      key: "overview" as TabKey,
      label: "Overview",
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      key: "inventory" as TabKey,
      label: "Inventory",
      icon: <Package className="w-4 h-4" />,
    },
    {
      key: "sales" as TabKey,
      label: "Sales",
      icon: <ShoppingCart className="w-4 h-4" />,
    },
    {
      key: "alerts" as TabKey,
      label: "Alerts",
      icon: <AlertTriangle className="w-4 h-4" />,
      badge:
        lowStockAlerts.length + expiryAlerts.length + pendingTransfers.length ||
        undefined,
    },
  ];

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="heading-2">Company Overview</h1>
            <p className="body-sm mt-1">Multi-branch performance at a glance</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Last 30 days</span>
          </div>
        </div>

        {/* Key Metrics - Always visible */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Building2 className="w-5 h-5 text-blue-400" />}
            label="Total Branches"
            value={inventory?.length || 0}
            subtitle="Active locations"
            color="bg-blue-500/10 border-blue-500/20"
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-accent-green" />}
            label="Total Inventory Value"
            value={
              inventoryTotalsByCurrency.length > 0
                ? inventoryTotalsByCurrency[0].totalValueFormatted ||
                  format(inventoryTotalsByCurrency[0].totalValue || 0)
                : format(0)
            }
            subtitle={
              inventoryTotalsByCurrency.length > 1
                ? `+${inventoryTotalsByCurrency.length - 1} currencies`
                : undefined
            }
            color="bg-green-500/10 border-green-500/20"
          />
          <StatCard
            icon={<ShoppingCart className="w-5 h-5 text-purple-400" />}
            label="Sales (30 days)"
            value={salesTotals?.totalSales || 0}
            subtitle="Total transactions"
            color="bg-purple-500/10 border-purple-500/20"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-indigo-400" />}
            label="Revenue (30 days)"
            value={
              salesTotalsByCurrency.length > 0
                ? salesTotalsByCurrency[0].totalRevenueFormatted ||
                  format(salesTotalsByCurrency[0].totalRevenue || 0)
                : format(0)
            }
            subtitle={
              salesTotalsByCurrency.length > 1
                ? `+${salesTotalsByCurrency.length - 1} currencies`
                : undefined
            }
            color="bg-indigo-500/10 border-indigo-500/20"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap
                border-b-2 transition-colors relative
                ${
                  activeTab === tab.key
                    ? "border-accent-green text-white"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-300">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="card-compact space-y-4">
              <h3 className="heading-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="body-sm mb-1">Total Products</p>
                  <p className="text-xl font-bold text-blue-400">
                    {inventory.reduce((sum, b) => sum + b.totalProducts, 0)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="body-sm mb-1">Total Stock Units</p>
                  <p className="text-xl font-bold text-cyan-400">
                    {inventoryTotals?.totalQuantity.toLocaleString() || 0}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="body-sm mb-1">Low Stock Items</p>
                  <p className="text-xl font-bold text-amber-400">
                    {inventoryTotals?.lowStockItems || 0}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="body-sm mb-1">Avg Order Value</p>
                  <p className="text-xl font-bold text-green-400">
                    {salesTotals?.totalSales > 0
                      ? format(
                          salesTotals.totalRevenue / salesTotals.totalSales,
                        )
                      : format(0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Multi-Currency Summary */}
            <div className="card-compact space-y-4">
              <h3 className="heading-4">Multi-Currency Summary</h3>
              <div className="space-y-3">
                {inventoryTotalsByCurrency.length > 0 && (
                  <div>
                    <p className="body-sm mb-2">Inventory by Currency</p>
                    {inventoryTotalsByCurrency.map((total) => (
                      <div
                        key={total.currencyCode}
                        className="flex justify-between items-center bg-white/5 rounded-lg p-2 mb-2"
                      >
                        <span className="text-sm font-semibold text-gray-300">
                          {total.currencyCode}
                        </span>
                        <span className="text-sm font-bold text-accent-green">
                          {total.totalValueFormatted ||
                            format(total.totalValue || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {salesTotalsByCurrency.length > 0 && (
                  <div>
                    <p className="body-sm mb-2">Revenue by Currency</p>
                    {salesTotalsByCurrency.map((total) => (
                      <div
                        key={total.currencyCode}
                        className="flex justify-between items-center bg-white/5 rounded-lg p-2 mb-2"
                      >
                        <span className="text-sm font-semibold text-gray-300">
                          {total.currencyCode}
                        </span>
                        <span className="text-sm font-bold text-indigo-400">
                          {total.totalRevenueFormatted ||
                            format(total.totalRevenue || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="card-compact">
              <div className="flex justify-between items-center mb-4">
                <h3 className="heading-4">Inventory by Branch</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/admin/inventory")}
                >
                  Manage Inventory
                </Button>
              </div>
              <Table
                data={inventory}
                columns={inventoryColumns}
                rowKey={(item) => item.branchId}
                emptyMessage="No inventory data available"
              />
            </div>
          </div>
        )}

        {activeTab === "sales" && (
          <div className="space-y-6">
            <div className="card-compact">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="heading-4">Sales by Branch</h3>
                  <p className="body-sm mt-1">Last 30 days performance</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/admin/reports")}
                >
                  View Reports
                </Button>
              </div>
              <Table
                data={sales}
                columns={salesColumns}
                rowKey={(item) => item.branchId}
                emptyMessage="No sales data available"
              />
            </div>
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="space-y-6">
            {/* Pending Transfers */}
            <div className="card-compact">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h3 className="heading-4">Pending Transfer Approvals</h3>
                    <p className="body-sm mt-1">Requires HQ approval</p>
                  </div>
                  {pendingTransfers.length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs font-bold rounded-full bg-yellow-500/20 text-yellow-300">
                      {pendingTransfers.length}
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/admin/transfers")}
                >
                  Review All
                </Button>
              </div>
              <Table
                data={pendingTransfers}
                columns={transferColumns}
                rowKey={(item) => item._id}
                emptyMessage="No pending transfers"
              />
            </div>

            {/* Low Stock Alerts */}
            <div className="card-compact">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <h3 className="heading-4">Low Stock Alerts</h3>
                    <p className="body-sm mt-1">Products below reorder level</p>
                  </div>
                  {lowStockAlerts.length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs font-bold rounded-full bg-red-500/20 text-red-300">
                      {lowStockAlerts.length}
                    </span>
                  )}
                </div>
              </div>
              <Table
                data={lowStockAlerts.slice(0, 10)}
                columns={lowStockColumns}
                rowKey={(item) => item.id}
                emptyMessage="No low stock alerts"
              />
            </div>

            {/* Expiry Warnings */}
            <div className="card-compact">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  <div>
                    <h3 className="heading-4">Expiry Warnings</h3>
                    <p className="body-sm mt-1">
                      Products expiring within 30 days
                    </p>
                  </div>
                  {expiryAlerts.length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs font-bold rounded-full bg-orange-500/20 text-orange-300">
                      {expiryAlerts.length}
                    </span>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/admin/reports/expiry")}
                >
                  View All
                </Button>
              </div>
              <Table
                data={expiryAlerts.slice(0, 10)}
                columns={expiryColumns}
                rowKey={(item) => item.batchId}
                emptyMessage="No expiry warnings"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
