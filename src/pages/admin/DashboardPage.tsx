import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, ChevronRight, ClipboardList, PackageSearch, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { AdminPageHeader, AdminStatCard, AdminStatusBadge } from '../../components/admin';
import { EmptyState } from '../../components/ui/EmptyState';
import { Error } from '../../components/ui/Error';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useAuthStore } from '../../stores/auth-store';
import apiClient from '../../lib/api-client';
import { useCurrency } from '../../hooks/useCurrency';
import { queryKeys } from '../../lib/query-keys';
import HQDashboardPage from './HQDashboardPage';

interface DashboardStats {
  todaySales: number;
  todaySalesCount: number;
  monthlySales: number;
  monthlySalesCount: number;
  totalProducts: number;
  totalInventoryValue: number;
  totalCustomers: number;
  lowStockProducts: number;
  expiringSoon: number;
  lowStockItems: Array<{ _id: string; productName: string; quantity: number }>;
}

const quickActions = [
  {
    to: '/pos',
    label: 'Open POS',
    description: 'Start selling from the active branch.',
    icon: ShoppingCart,
    tone: 'text-accent-green bg-accent-green/10 border-accent-green/20',
  },
  {
    to: '/admin/products',
    label: 'Manage Products',
    description: 'Update prices, packs, barcodes, and stock rules.',
    icon: PackageSearch,
    tone: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  },
  {
    to: '/admin/reports',
    label: 'View Reports',
    description: 'Review sales, inventory, expiry, and transfers.',
    icon: ClipboardList,
    tone: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  },
];

const LoadingStatGrid = () => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {[1, 2, 3, 4].map((item) => (
      <div key={item} className="rounded-xl border border-white/10 bg-primary-dark/60 p-4">
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="mt-3 h-7 w-28 rounded bg-white/10" />
        <div className="mt-2 h-3 w-24 rounded bg-white/10" />
      </div>
    ))}
  </div>
);

const QuickActionLink = ({ action }: { action: (typeof quickActions)[number] }) => {
  const Icon = action.icon;

  return (
    <Link
      to={action.to}
      className="group flex min-h-20 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-accent-green/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:ring-offset-2 focus:ring-offset-primary-darker"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${action.tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-white">{action.label}</span>
        <span className="mt-0.5 block text-sm text-gray-400">{action.description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-green" aria-hidden="true" />
    </Link>
  );
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { selectedBranch } = useBranchStore();
  const { user } = useAuthStore();
  const { format } = useCurrency();
  const branchId = getBranchId(selectedBranch);

  const { data: stats, isLoading, error, refetch } = useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.branch(branchId),
    queryFn: async () => {
      const response = await apiClient.get('/reports/dashboard-stats', {
        params: branchId ? { branchId } : {},
      });

      const raw = response.data;
      return {
        todaySales: raw?.todaysSales?.amount ?? raw?.todaySales ?? 0,
        todaySalesCount: raw?.todaysSales?.count ?? raw?.todaySalesCount ?? 0,
        monthlySales: raw?.monthlySales?.amount ?? 0,
        monthlySalesCount: raw?.monthlySales?.count ?? 0,
        totalProducts: raw?.totalProducts ?? 0,
        totalInventoryValue: raw?.totalInventoryValue ?? 0,
        totalCustomers: raw?.totalCustomers ?? 0,
        lowStockProducts: raw?.lowStockProducts ?? raw?.lowStockCount ?? 0,
        expiringSoon: raw?.expiringSoon ?? 0,
        lowStockItems: Array.isArray(raw?.lowStockItems) ? raw.lowStockItems : [],
      };
    },
    enabled: user?.role !== 'super_admin' && !!branchId,
  });

  if (user?.role === 'super_admin') {
    return <HQDashboardPage />;
  }

  const lowStockItems = stats?.lowStockItems ?? [];
  const lowStockProducts = stats?.lowStockProducts ?? 0;
  const expiringSoon = stats?.expiringSoon ?? 0;

  if (!branchId) {
    return (
      <AdminLayout title="Dashboard">
        <div className="space-y-5">
          <AdminPageHeader
            title="Dashboard"
            subtitle="Branch dashboards need an active branch so sales, stock, and alerts stay scoped."
          />
          <div className="rounded-xl border border-white/10 bg-primary-dark/60">
            <EmptyState
              icon={<Boxes className="h-12 w-12" aria-hidden="true" />}
              title="Select a branch to continue"
              message="Use the branch selector above, or manage branch access from administration."
              action={{
                label: 'Manage branches',
                onClick: () => navigate('/admin/branches'),
              }}
            />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-5">
        <AdminPageHeader
          title={`Today at ${selectedBranch?.name ?? 'this branch'}`}
          subtitle={`Welcome back, ${user?.firstName ?? 'there'}. Track sales, stock risk, and daily branch work from one place.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <AdminStatusBadge tone={lowStockProducts > 0 ? 'warning' : 'success'}>
                {lowStockProducts > 0 ? `${lowStockProducts} low stock` : 'Stock stable'}
              </AdminStatusBadge>
              <AdminStatusBadge tone={expiringSoon > 0 ? 'warning' : 'success'}>
                {expiringSoon > 0 ? `${expiringSoon} expiring soon` : 'Expiry stable'}
              </AdminStatusBadge>
            </div>
          }
        />

        {error ? (
          <Error message="Failed to load dashboard data" onRetry={() => refetch()} />
        ) : isLoading ? (
          <LoadingStatGrid />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <AdminStatCard
                label="Today sales"
                value={format(stats?.todaySales ?? 0)}
                helper={`${stats?.todaySalesCount ?? 0} transactions`}
                tone="accent"
                icon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />}
              />
              <AdminStatCard
                label="Month sales"
                value={format(stats?.monthlySales ?? 0)}
                helper={`${stats?.monthlySalesCount ?? 0} sales`}
                tone="info"
                icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
              />
              <AdminStatCard
                label="Inventory value"
                value={format(stats?.totalInventoryValue ?? 0)}
                helper={`${stats?.totalProducts ?? 0} SKUs`}
                tone={lowStockProducts > 0 ? 'warning' : 'neutral'}
                icon={<Boxes className="h-5 w-5" aria-hidden="true" />}
              />
              <AdminStatCard
                label="Customers"
                value={stats?.totalCustomers ?? 0}
                helper="Active customer base"
                tone="neutral"
                icon={<Users className="h-5 w-5" aria-hidden="true" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
              <section className="rounded-xl border border-white/10 bg-primary-dark/60 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">Priority actions</h2>
                    <p className="mt-1 text-sm text-gray-400">Fast routes for branch work that happens every day.</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                  {quickActions.map((action) => (
                    <QuickActionLink key={action.to} action={action} />
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-primary-dark/60 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">Stock attention</h2>
                    <p className="mt-1 text-sm text-gray-400">Products most likely to block sales today.</p>
                  </div>
                  {lowStockProducts > 0 ? (
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
                  ) : null}
                </div>

                {lowStockItems.length > 0 ? (
                  <div className="space-y-2">
                    {lowStockItems.slice(0, 5).map((item) => (
                      <Link
                        key={item._id}
                        to="/admin/inventory"
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition-colors hover:border-amber-400/30 hover:bg-white/10"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-100">
                          {item.productName}
                        </span>
                        <span className="shrink-0 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-300">
                          {item.quantity} left
                        </span>
                      </Link>
                    ))}
                    <Link
                      to="/admin/inventory"
                      className="inline-flex min-h-10 items-center text-sm font-semibold text-accent-green hover:text-accent-light"
                    >
                      Review inventory
                      <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                    All tracked products are above their low-stock threshold.
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
