import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';

interface HeaderProps {
  title: string;
  showNav?: boolean;
}

export const Header = ({ title, showNav = false }: HeaderProps) => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      setIsLoggingOut(true);
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
        setIsLoggingOut(false);
      }
    }
  };

  const getRoleDisplay = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const navLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', roles: ['super_admin', 'branch_manager', 'auditor'] },
    { path: '/pos', label: 'POS', roles: ['cashier', 'pharmacist', 'branch_manager', 'super_admin', 'auditor'] },
    { path: '/branches', label: 'Branches', roles: ['super_admin'] },
    { path: '/users', label: 'Users', roles: ['super_admin', 'branch_manager'] },
    { path: '/products', label: 'Products', roles: ['super_admin', 'branch_manager', 'pharmacist'] },
  ];

  const filteredNavLinks = navLinks.filter(link => 
    link.roles.includes(user?.role || '')
  );

  return (
    <header className="bg-primary-dark/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            {user && (
              <div className="text-right hidden sm:block">
                <p className="text-white font-medium text-sm">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-accent-green font-medium tracking-wide uppercase">
                  {getRoleDisplay(user.role)}
                </p>
              </div>
            )}
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              disabled={isLoggingOut}
              className="!border-white/10 hover:!border-white/20 hover:!bg-white/5 !text-gray-300 hover:!text-white"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {showNav && filteredNavLinks.length > 0 && (
        <nav className="px-6 py-2 border-t border-white/5 bg-black/20">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {filteredNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  location.pathname === link.path
                    ? 'bg-accent-green text-primary-dark shadow-lg shadow-accent-green/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};
