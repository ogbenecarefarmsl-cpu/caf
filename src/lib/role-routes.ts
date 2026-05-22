import type { User } from '../stores/auth-store';

export const getDefaultRouteForRole = (role?: User['role']) => {
  switch (role) {
    case 'cashier':
    case 'pharmacist':
      return '/pos';
    case 'marketer':
      return '/marketer/dashboard';
    case 'branch_manager':
    case 'super_admin':
    case 'auditor':
      return '/admin/dashboard';
    default:
      return '/login';
  }
};
