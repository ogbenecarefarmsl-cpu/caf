import type { User } from '../stores/auth-store';

export const getDefaultRouteForRole = (role?: User['role']) => {
  switch (role) {
    case 'cashier':
      return '/pos';
    case 'marketer':
      return '/marketer/dashboard';
    case 'branch_manager':
      return '/admin/dashboard';
    case 'super_admin':
      return '/admin/hq-dashboard';
    case 'auditor':
      return '/admin/dashboard';
    case 'finance_manager':
      return '/finance';
    default:
      return '/login';
  }
};
