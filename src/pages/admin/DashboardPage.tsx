import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useAuthStore } from '../../stores/auth-store';
import apiClient from '../../lib/api-client';
import { useCurrency } from '../../hooks/useCurrency';
import { Error } from '../../components/ui/Error';
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

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  colorClass: string;
  subtitle?: string;
}

const StatCard = ({ title, value, icon, colorClass, subtitle }: StatCardProps) => (
  <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/5 hover:border-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-black/20 group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 sm:p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
    </div>
    <h3 className="text-gray-400 text-xs sm:text-sm font-medium mb-1">{title}</h3>
    <p className="text-white text-xl sm:text-3xl font-bold tracking-tight">{value}</p>
    {subtitle ? <p className="text-gray-500 text-xs sm:text-sm mt-2">{subtitle}</p> : null}
  </div>
);

export const DashboardPage = () => {
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

  const lowStockItems = stats?.lowStockItems ?? [];
  const lowStockProducts = stats?.lowStockProducts ?? 0;

  if (user?.role === 'super_admin') {
    return <HQDashboardPage />;
  }

  if (!branchId) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold text-white">Select a Branch First</h2>
            <p className="mt-2 text-gray-400">
              Dashboard data is branch-scoped. Choose a branch before viewing sales,
              stock alerts, and branch activity.
            </p>
            <div className="mt-6">
              <Link
                to="/branches"
                className="inline-flex rounded-xl bg-accent-green px-4 py-2 font-medium text-primary-dark transition-all duration-200 hover:bg-accent-light"
              >
                Select Branch
              </Link>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-5 md:space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-primary-dark to-primary-darker border border-white/5 p-5 sm:p-8">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 sm:w-32 sm:h-32 bg-accent-green/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome back, {user?.firstName}!</h1>
            <p className="text-sm sm:text-base text-gray-400">
              Here is what is happening in{' '}
              <span className="text-accent-green font-medium">{selectedBranch?.name || 'your pharmacy'}</span>{' '}
              today.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-primary-dark rounded-2xl p-4 sm:p-6 border border-white/5 animate-pulse">
                <div className="h-10 sm:h-12 bg-white/5 rounded-xl mb-4 w-10 sm:w-12"></div>
                <div className="h-3 sm:h-4 bg-white/5 rounded w-2/3 mb-2"></div>
                <div className="h-6 sm:h-8 bg-white/5 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-2">
              {lowStockProducts > 0 ? (
                <div className="rounded-xl border-l-4 border-rose-500/70 bg-rose-500/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-rose-200">Low Stock Alert</p>
                  <p className="text-xs text-rose-100 mt-1">{lowStockProducts} products are below threshold.</p>
                </div>
              ) : null}

              {(stats?.expiringSoon ?? 0) > 0 ? (
                <div className="rounded-xl border-l-4 border-amber-500/70 bg-amber-500/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-amber-100">Expiry Watch</p>
                  <p className="text-xs text-amber-100 mt-1">{stats?.expiringSoon ?? 0} items are close to expiry.</p>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <StatCard
                title="Today Sales"
                value={format(stats?.todaySales ?? 0)}
                subtitle={`${stats?.todaySalesCount ?? 0} transactions`}
                colorClass="bg-emerald-500/10 text-emerald-500"
                icon={
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              <StatCard
                title="Monthly Sales"
                value={format(stats?.monthlySales ?? 0)}
                subtitle={`${stats?.monthlySalesCount ?? 0} sales`}
                colorClass="bg-blue-500/10 text-blue-500"
                icon={
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17l6-6 4 4 8-8" />
                  </svg>
                }
              />

              <StatCard
                title="Products"
                value={format(stats?.totalInventoryValue ?? 0)}
                subtitle={`${stats?.totalProducts ?? 0} SKUs - ${stats?.lowStockProducts ?? 0} low stock`}
                colorClass="bg-purple-500/10 text-purple-500"
                icon={
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
              />

              <StatCard
                title="Customers"
                value={String(stats?.totalCustomers ?? 0)}
                subtitle="Active customer base"
                colorClass="bg-indigo-500/10 text-indigo-400"
                icon={
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-white/5">
                <h3 className="text-white text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                  <span className="w-1 h-6 bg-accent-green rounded-full"></span>
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link
                    to="/pos"
                    className="flex items-center space-x-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 group border border-transparent hover:border-white/5"
                  >
                    <div className="p-2 bg-accent-green/10 rounded-lg group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5" />
                      </svg>
                    </div>
                    <span className="text-gray-200 font-medium group-hover:text-white">Open POS</span>
                    <svg className="w-4 h-4 text-gray-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    to="/admin/reports"
                    className="flex items-center space-x-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 group border border-transparent hover:border-white/5"
                  >
                    <div className="p-2 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m14 0V9a2 2 0 00-2-2h-2" />
                      </svg>
                    </div>
                    <span className="text-gray-200 font-medium group-hover:text-white">View Reports</span>
                    <svg className="w-4 h-4 text-gray-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    to="/admin/inventory"
                    className="flex items-center space-x-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 group border border-transparent hover:border-white/5"
                  >
                    <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4" />
                      </svg>
                    </div>
                    <span className="text-gray-200 font-medium group-hover:text-white">Check Inventory</span>
                    <svg className="w-4 h-4 text-gray-500 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-white/5">
                <h3 className="text-white text-base sm:text-lg font-semibold mb-4 sm:mb-6 flex items-center gap-2">
                  <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                  Low Stock Alert
                </h3>
                {lowStockItems.length > 0 ? (
                  <div className="space-y-3">
                    {lowStockItems.slice(0, 4).map((item) => (
                      <div key={item._id} className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white/5 rounded-xl border border-transparent hover:border-white/5 transition-colors">
                        <span className="text-sm text-gray-200 font-medium whitespace-normal break-words min-w-0 flex-1">{item.productName}</span>
                        <span className="shrink-0 px-2 py-1 rounded-md bg-orange-500/10 text-orange-400 text-xs font-bold border border-orange-500/20">
                          {item.quantity} left
                        </span>
                      </div>
                    ))}
                  </div>
        ) : error ? (
          <Error message="Failed to load dashboard data" onRetry={() => refetch()} />
        ) : (
                  <div className="rounded-xl bg-white/5 p-4 text-sm text-gray-400">
                    All products are well stocked.
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
