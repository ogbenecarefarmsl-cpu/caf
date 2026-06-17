export interface Revenue {
  totalSales: number;
  totalRevenue: number;
  totalReturns: number;
  netRevenue: number;
  salesCount: number;
}

export interface Expenses {
  totalShiftExpenses: number;
  totalFinanceExpenses: number;
  totalExpenses: number;
  byCategory: { category: string; total: number; count: number }[];
}

export interface CashPosition {
  totalIncome: number;
  totalExpense: number;
  totalTransfer: number;
  totalLoan: number;
  totalSalary: number;
  totalAdvance: number;
  netCash: number;
  byCategory: { category: string; total: number; count: number }[];
  totalOpeningCash: number;
  totalClosingCash: number;
  totalExpectedCash: number;
  totalVariance: number;
  openShifts: number;
  closedShifts: number;
}

export interface CreditOutstanding {
  totalCreditSales: number;
  totalBalanceDue: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface Marketer {
  totalAssignedValue: number;
  totalSoldValue: number;
  totalOutstanding: number;
  unitsAssigned: number;
  unitsSold: number;
  unitsRemaining: number;
}

export interface Purchases {
  totalPurchaseValue: number;
  receivedValue: number;
  pendingValue: number;
}

export interface ProfitLoss {
  grossRevenue: number;
  costOfGoods: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  margin: number;
}

export interface BranchPerformance {
  branchId: string;
  branchName: string;
  revenue: number;
  expenses: number;
  profit: number;
  salesCount: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  total: number;
}

export interface ServiceReconciliation {
  submitted: boolean;
  status: string;
  submittedBy: string;
  notes: string;
  income: { cash: number; orangeMoney: number; afrimoney: number; total: number };
  expenditures: { cash: number; orangeMoney: number; afrimoney: number; total: number };
  netExpected: { cash: number; orangeMoney: number; afrimoney: number; total: number };
  actual: { cash: number; orangeMoney: number; afrimoney: number; total: number };
  variance: { cash: number; orangeMoney: number; afrimoney: number; total: number };
}

export interface ServiceFinancials {
  revenue: number;
  expenses: number;
  profit: number;
  outstanding: number;
  orders: number;
  byPaymentMethod: PaymentMethodBreakdown[];
  reconciliation: ServiceReconciliation | null;
}

export interface UnifiedDashboard {
  revenue: Revenue;
  expenses: Expenses;
  cashPosition: CashPosition;
  creditOutstanding: CreditOutstanding;
  marketer: Marketer;
  purchases: Purchases;
  profitLoss: ProfitLoss;
  byBranch: BranchPerformance[];
  byPaymentMethod: PaymentMethodBreakdown[];
  externalServices: {
    caf: ServiceFinancials;
    emr: ServiceFinancials;
    lab: ServiceFinancials;
    combined: {
      totalRevenue: number;
      totalExpenses: number;
      totalProfit: number;
      totalOutstanding: number;
    };
  };
}
