import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/AdminLayout';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw,
  ArrowLeftRight,
  Truck
} from 'lucide-react';

export function InventoryPage() {
  const inventoryModules = [
    {
      title: 'Products',
      description: 'Manage product catalog, categories, and pricing',
      icon: Package,
      path: '/admin/products',
      color: 'bg-blue-500'
    },
    {
      title: 'Stock Adjustments',
      description: 'Adjust total product stock with supplier and expiry context',
      icon: TrendingUp,
      path: '/admin/stock-adjustments',
      color: 'bg-purple-500'
    },
    {
      title: 'Purchase Orders',
      description: 'Receive incoming stock from suppliers and update product inventory',
      icon: Truck,
      path: '/admin/purchase-orders',
      color: 'bg-green-500'
    },
    {
      title: 'Stock Transfers',
      description: 'Manage inter-branch stock transfers',
      icon: ArrowLeftRight,
      path: '/admin/transfers',
      color: 'bg-orange-500'
    },
    {
      title: 'Expiry Reports',
      description: 'Monitor expiring and expired products',
      icon: AlertTriangle,
      path: '/admin/reports/expiry',
      color: 'bg-red-500'
    },
    {
      title: 'Inventory Reports',
      description: 'View inventory levels and stock movements',
      icon: RefreshCw,
      path: '/admin/reports/inventory',
      color: 'bg-teal-500'
    }
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
          <p className="mt-2 text-gray-400">
            Manage products, total stock levels, suppliers, and inventory movements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventoryModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.path}
                to={module.path}
                className="block group"
              >
                <div className="bg-primary-dark/50 backdrop-blur-sm rounded-2xl border border-white/5 p-6 hover:border-accent-green/50 hover:shadow-[0_0_20px_rgba(0,255,136,0.1)] transition-all duration-300 h-full">
                  <div className="flex items-start space-x-4">
                    <div className={`${module.color} bg-opacity-10 rounded-xl p-3 text-white group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-accent-green transition-colors">
                        {module.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                        {module.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="bg-blue-500/10 rounded-2xl p-6 border border-blue-500/20 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
            Quick Tips
          </h3>
          <ul className="space-y-3 text-sm text-blue-200/80">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Regular stock counts help maintain accurate inventory records
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Monitor expiry dates to minimize waste and expired stock
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Use stock adjustments to correct discrepancies found during audits
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Plan transfers in advance to ensure optimal stock distribution
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
