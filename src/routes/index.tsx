import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { useAuthStore } from '../stores/auth-store';
import { getDefaultRouteForRole } from '../lib/role-routes';
import {
  LoginPage,
  DashboardPage,
  InventoryPage,
  SalesPage,
  CreditSalesPage,
  ReportsPage,
  BranchManagementPage,
  UserManagementPage,
  ProductManagementPage,
  StockAdjustmentPage,
  TransferManagementPage,
  SalesReportsPage,
  InventoryReportsPage,
  ExpiryReportsPage,
  SupplierManagementPage,
  PurchaseOrderPage,
  CustomerManagementPage,
  PromotionsManagementPage,
  EmailTemplatesPage,
  EmailLogsPage,
  JobsMonitoringPage,
  PurchaseReportsPage,
  TransferReportsPage,
  CustomerReportsPage,
  SystemSettingsPage,
  TaxConfigurationPage,
  PaymentMethodsPage,
  AuditTrailPage,
  UserActivityLogsPage,
  POSPage,
  ShiftLogsPage,
  ShiftReportPage,
  ProcessReturnPage,
  PaymentPage,
  ProductCatalogPage,
  TransactionHistoryPage,
  CustomerLookupPage,
  DiscountsPage,
  ReceiptPage,
  UnauthorizedPage,
  NotFoundPage,
  HQDashboardPage,
  MarketerDashboardPage,
  MarketerAssignmentsPage,
  CycleCountPage,
  MarketerSalesPage,
  MarketerReviewAssignmentsPage,
  PrintersPage,
  PricingManagementPage,
  ExpensesPage,
  FinanceTransactionsPage,
  ValuationReportPage,
  RequestAnalysisPage,
  CustomerOrdersPage,
  ProformaInvoicesPage,
  DeliveryNotesPage,
  AccountSecurityPage,
  FinanceManagerDashboardPage,
  ReconciliationPage,
  SalaryManagementPage,
  CashManagementPage,
  FinanceReportsPage,
} from '../pages';

const RoleAwareHomeRedirect = () => {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RoleAwareHomeRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/settings/security',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'cashier', 'auditor', 'marketer']}>
        <AccountSecurityPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <POSPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/catalog',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <ProductCatalogPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/payment',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <PaymentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/shifts',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <ShiftLogsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/shift-report/:shiftId',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <ShiftReportPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/returns',
    element: (
      <ProtectedRoute allowedRoles={['branch_manager', 'super_admin', 'auditor']}>
        <ProcessReturnPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/transactions',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <TransactionHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/transctions',
    element: <Navigate to="/pos/transactions" replace />,
  },
  {
    path: '/admin/transactions',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <TransactionHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/shifts',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <ShiftLogsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/customers',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <CustomerLookupPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/discounts',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <DiscountsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/receipt',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <ReceiptPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/receipt/:saleId',
    element: (
      <ProtectedRoute allowedRoles={['cashier', 'branch_manager', 'super_admin', 'auditor']}>
        <ReceiptPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['branch_manager', 'super_admin', 'auditor']}>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: <RoleAwareHomeRedirect />,
  },
  {
    path: '/admin/inventory',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <InventoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/sales',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'cashier', 'auditor']}>
        <SalesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <ReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/branches',
    element: (
      <ProtectedRoute allowedRoles={['super_admin']}>
        <BranchManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/branches',
    element: <Navigate to="/admin/branches" replace />,
  },
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <UserManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    element: <Navigate to="/admin/users" replace />,
  },
  {
    path: '/admin/products',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <ProductManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/products',
    element: <Navigate to="/admin/products" replace />,
  },
  {
    path: '/admin/batches',
    element: <Navigate to="/admin/stock-adjustments" replace />,
  },
  {
    path: '/batches',
    element: <Navigate to="/admin/stock-adjustments" replace />,
  },
  {
    path: '/admin/stock-adjustments',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <StockAdjustmentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/transfers',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <TransferManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/cycle-counts',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <CycleCountPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/printers',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <PrintersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/sales/credit',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <CreditSalesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/sales/request-analysis',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <RequestAnalysisPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/printers/new',
    element: <Navigate to="/admin/printers" replace />,
  },
  {
    path: '/admin/pricing',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <PricingManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/expenses',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'cashier']}>
        <ExpensesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/finance',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <FinanceTransactionsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports/valuation',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <ValuationReportPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports/sales',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <SalesReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports/inventory',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <InventoryReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports/expiry',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <ExpiryReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/hq-dashboard',
    element: (
      <ProtectedRoute allowedRoles={['super_admin']}>
        <HQDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/marketer/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['marketer']}>
        <MarketerDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/marketer/sales',
    element: (
      <ProtectedRoute allowedRoles={['marketer']}>
        <MarketerSalesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/marketer/review',
    element: (
      <ProtectedRoute allowedRoles={['marketer']}>
        <MarketerReviewAssignmentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/marketer/assignments',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <MarketerAssignmentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/marketer-dashboard',
    element: <Navigate to="/marketer/dashboard" replace />,
  },
  {
    path: '/admin/suppliers',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <SupplierManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/customer-orders',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'cashier']}>
        <CustomerOrdersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/proforma-invoices',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <ProformaInvoicesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/delivery-notes',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'cashier']}>
        <DeliveryNotesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/purchase-orders',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <PurchaseOrderPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/customers',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'cashier']}>
        <CustomerManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/promotions',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <PromotionsManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/email/templates',
    element: (
      <ProtectedRoute allowedRoles={['super_admin']}>
        <EmailTemplatesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/email/logs',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <EmailLogsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/jobs',
    element: (
      <ProtectedRoute allowedRoles={['super_admin']}>
        <JobsMonitoringPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports/purchases',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <PurchaseReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports/transfers',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <TransferReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports/customers',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <CustomerReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/settings/system',
    element: (
      <ProtectedRoute allowedRoles={['super_admin']}>
        <SystemSettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/settings/taxes',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <TaxConfigurationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/settings/payment-methods',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
        <PaymentMethodsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/audit/trail',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'auditor']}>
        <AuditTrailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/audit/user-activity',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'auditor']}>
        <UserActivityLogsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/finance-dashboard',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'finance_manager']}>
        <FinanceManagerDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reconciliations',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'finance_manager']}>
        <ReconciliationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/salaries',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'finance_manager']}>
        <SalaryManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/cash-management',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'finance_manager']}>
        <CashManagementPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/finance-reports',
    element: (
      <ProtectedRoute allowedRoles={['super_admin', 'branch_manager', 'finance_manager']}>
        <FinanceReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

