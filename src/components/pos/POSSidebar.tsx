import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth-store';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { queryKeys } from '../../lib/query-keys';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface Shift {
  _id: string;
  status: 'open' | 'closed';
  openedAt: string;
  openingCash: number;
  totalSales?: number;
}

export const POSSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dashboardPath =
    user?.role === 'branch_manager' || user?.role === 'super_admin' || user?.role === 'auditor'
      ? '/admin/dashboard'
      : '/pos';

  // Get current shift
  const { data: currentShift } = useQuery({
    queryKey: queryKeys.shifts.current({
      branchId: getBranchId(selectedBranch),
      cashierId: user?.id,
    }),
    queryFn: async () => {
      const response = await apiClient.get('/shifts/current', {
        params: { branchId: getBranchId(selectedBranch), cashierId: user?.id },
      });
      return response.data as Shift;
    },
    enabled: !!getBranchId(selectedBranch) && !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const menuItems = [
    {
      id: 'pos',
      label: 'Point of Sale',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      path: '/pos',
    },
    {
      id: 'shifts',
      label: 'Shift Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      path: '/pos/shifts',
      badge: currentShift?.status === 'open' ? 'Active' : null,
      badgeColor: 'bg-green-500',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      path: '/pos/transactions',
    },
    {
      id: 'returns',
      label: 'Returns',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      path: '/pos/returns',
      roles: ['branch_manager', 'super_admin', 'auditor'],
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      path: '/pos/customers',
    },
    {
      id: 'catalog',
      label: 'Product Catalog',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      path: '/pos/catalog',
    },
    {
      id: 'settings',
      label: 'Security Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4 9 5.567 9 7.5 10.343 11 12 11zm0 2c-3.314 0-6 1.79-6 4v1a2 2 0 002 2h8a2 2 0 002-2v-1c0-2.21-2.686-4-6-4z" />
        </svg>
      ),
      path: '/settings/security',
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const hasAccess = (item: typeof menuItems[0]) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-primary-dark border border-gray-700 rounded-xl flex items-center justify-center text-white hover:bg-gray-800 transition-colors shadow-lg"
      >
        {isExpanded ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Overlay for mobile */}
      {isExpanded && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-primary-dark border-r border-gray-700
          transform transition-transform duration-300 ease-in-out
          ${isExpanded ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-accent-green to-emerald-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-base truncate">CAREFARM POS</h2>
              <p className="text-xs text-gray-400 truncate">{selectedBranch?.name}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            if (!hasAccess(item)) return null;

            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setIsExpanded(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                  transition-all duration-200 group
                  ${
                    isActive(item.path)
                      ? 'bg-accent-green text-primary-dark shadow-lg shadow-accent-green/20'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className={isActive(item.path) ? 'text-primary-dark' : 'text-gray-400 group-hover:text-white'}>
                    {item.icon}
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${item.badgeColor} text-white`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-gray-800/50">
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-accent-green to-emerald-600 flex items-center justify-center text-primary-dark font-bold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate(dashboardPath)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-3 py-2 bg-gray-800 hover:bg-red-600 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={async () => {
          try {
            await apiClient.post('/auth/logout');
          } catch (error) {
            console.error('Logout error:', error);
          } finally {
            useAuthStore.getState().clearAuth();
            navigate('/login');
          }
        }}
        title="Logout"
        message="Are you sure you want to logout? You will need to sign in again."
        confirmLabel="Logout"
        variant="danger"
      />
    </>
  );
};

