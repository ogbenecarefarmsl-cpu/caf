import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '../../stores/cart-store';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useAlertReplacement } from '../../hooks/useAlertReplacement';
import { useToast } from '../../hooks/useToast';
import { useCurrency } from '../../hooks/useCurrency';
import apiClient from '../../lib/api-client';
import { getErrorMessage } from '../../lib/error-utils';
import { useAuthStore } from '../../stores/auth-store';
import { queryKeys } from '../../lib/query-keys';
import { CustomerTypeahead, type CustomerOption } from '../../components/ui/CustomerTypeahead';
import { useHeldSalesStore } from '../../stores/held-sales-store';

type PaymentMethod =
  | 'cash'
  | 'card'
  | 'orange_money'
  | 'africell_money'
  | 'qmoney'
  | 'bank_transfer'
  | 'insurance'
  | 'credit';
type CreditCollectionMethod =
  | 'cash'
  | 'card'
  | 'orange_money'
  | 'africell_money'
  | 'qmoney'
  | 'bank_transfer';

interface Shift {
  _id: string;
  status: 'open' | 'closed';
}

interface RecentSale {
  _id: string;
  total: number;
  createdAt: string;
  paymentMethod?: string;
  items?: Array<unknown>;
}

interface PaymentMethodDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

export const PaymentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items, total, discount, subtotal, prescriptionUrl, clearCart } = useCartStore();
  const holdSale = useHeldSalesStore((s) => s.holdSale);
  const heldSales = useHeldSalesStore((s) => s.heldSales);
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const branchId = getBranchId(selectedBranch);
  const user = useAuthStore((state) => state.user);
  const { alertInfo } = useAlertReplacement();
  const { showSuccess, showError } = useToast();
  const { format, symbol } = useCurrency();

  const currencyCode = selectedBranch?.currencyCode ?? 'SLE';
  const isUSD = currencyCode === 'USD';

  const terminalId = 'TERMINAL-01';
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState(total.toFixed(2));
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [creditCustomerPhone, setCreditCustomerPhone] = useState('');
  const [creditDueDate, setCreditDueDate] = useState('');
  const [creditCustomerId, setCreditCustomerId] = useState<string | undefined>(undefined);
  const [linkedCustomer, setLinkedCustomer] = useState<CustomerOption | null>(null);
  const [creditAmountPaid, setCreditAmountPaid] = useState('0');
  const [creditInitialMethod, setCreditInitialMethod] =
    useState<CreditCollectionMethod>('cash');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');

  const { data: currentShift } = useQuery({
    queryKey: queryKeys.shifts.current({
      branchId: getBranchId(selectedBranch),
      cashierId: user?.id,
      terminalId,
    }),
    queryFn: async () => {
      const branchId = getBranchId(selectedBranch);
      const cashierId = user?.id;

      if (!branchId || !cashierId) {
        throw new Error('Missing required parameters: branchId and cashierId');
      }

      const response = await apiClient.get('/shifts/current', {
        params: { branchId, cashierId, terminalId },
      });
      return (response.data?.data ?? response.data) as Shift;
    },
    enabled: !!getBranchId(selectedBranch) && !!user?.id,
    retry: false,
  });

  const changeDue = Math.max(0, parseFloat(amountReceived || '0') - total);
  const parsedCreditAmount = parseFloat(creditAmountPaid || '0');

  // Email receipt mutation
  const emailReceiptMutation = useMutation({
    mutationFn: async (data: { saleId: string; email: string }) => {
      const response = await apiClient.post('/email/receipt', {
        saleId: data.saleId,
        email: data.email,
      });
      return response.data;
    },
    onSuccess: () => {
      showSuccess('Receipt sent successfully');
      setShowEmailModal(false);
      setEmailAddress('');
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Failed to send receipt'));
    },
  });

  const handleHoldSale = () => {
    if (items.length === 0) {
      showError('Cart is empty');
      return;
    }
    if (!user?.id || !branchId) {
      showError('Cannot hold sale: missing user or branch');
      return;
    }
    const customerName = paymentMethod === 'credit' ? creditCustomerName.trim() : undefined;
    const customerPhone = paymentMethod === 'credit' ? creditCustomerPhone.trim() : undefined;
    const heldCount = heldSales.length + 1;
    const defaultLabel = customerName
      ? `Sale for ${customerName}`
      : `Sale ${heldCount}`;
    const held = holdSale({
      label: defaultLabel,
      items: items.map((i) => ({ ...i })),
      discount,
      prescriptionUrl,
      customerId: paymentMethod === 'credit' ? creditCustomerId : undefined,
      customerName,
      customerPhone,
      heldBy: user.id,
      branchId,
      subtotal,
      total,
    });
    clearCart();
    showSuccess(`Held "${held.label}" - ${heldSales.length + 1} sale(s) parked`);
  };

  const handleEmailReceipt = () => {
    if (!emailAddress) {
      showError('Please enter an email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      showError('Please enter a valid email address');
      return;
    }
    if (!lastSaleId) {
      showError('No sale to email');
      return;
    }

    emailReceiptMutation.mutate({ saleId: lastSaleId, email: emailAddress });
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const branchId = getBranchId(selectedBranch);
      const parsedAmount = parseFloat(amountReceived);
      
      if (!branchId) {
        throw new Error('Branch ID is required');
      }
      
      if (items.length === 0) {
        throw new Error('No items in cart');
      }

      if (!currentShift || currentShift.status !== 'open') {
        throw new Error('No open shift found for this terminal');
      }
      
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        throw new Error('Invalid amount received');
      }

      if (paymentMethod === 'credit') {
        if (!creditDueDate) {
          throw new Error('Due date is required for credit sales');
        }

        if (isNaN(parsedCreditAmount) || parsedCreditAmount < 0 || parsedCreditAmount > total) {
          throw new Error('Invalid upfront payment amount');
        }
      }

      const paymentMethodMap: Record<PaymentMethod, string> = {
        cash: 'cash',
        card: 'card',
        orange_money: 'orange_money',
        africell_money: 'africell_money',
        qmoney: 'qmoney',
        bank_transfer: 'bank_transfer',
        insurance: 'insurance',
        credit: 'credit',
      };

      const creditInitialMethodMap: Record<CreditCollectionMethod, string> = {
        cash: 'cash',
        card: 'card',
        orange_money: 'orange_money',
        africell_money: 'africell_money',
        qmoney: 'qmoney',
        bank_transfer: 'bank_transfer',
      };

      const payload = {
        branchId,
        shiftId: currentShift._id,
        terminalId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          packSize: item.packSize ? {
            code: item.packSize.code,
            name: item.packSize.name,
            unit: item.packSize.unit,
            quantityPerPack: item.packSize.quantityPerPack,
            barcode: item.packSize.barcode,
          } : null,
          quantityInBaseUnits: item.quantityInBaseUnits,
        })),
        discount,
        paymentMethod: paymentMethodMap[paymentMethod],
        paymentReference: ['orange_money', 'africell_money', 'qmoney'].includes(paymentMethod) && paymentReference.trim()
          ? paymentReference.trim()
          : undefined,
        saleType: paymentMethod === 'credit' ? 'credit' : 'cash',
        amountPaid: paymentMethod === 'credit' ? parsedCreditAmount : total,
        dueDate: paymentMethod === 'credit' ? creditDueDate : undefined,
        customerName: paymentMethod === 'credit' && creditCustomerName.trim() ? creditCustomerName.trim() : undefined,
        customerPhone: paymentMethod === 'credit' ? creditCustomerPhone.trim() || undefined : undefined,
        customerId: paymentMethod === 'credit' ? creditCustomerId : undefined,
        initialPaymentMethod:
          paymentMethod === 'credit' && parsedCreditAmount > 0
            ? creditInitialMethodMap[creditInitialMethod]
            : undefined,
      };

      try {
        const response = await apiClient.post('/sales/checkout', payload);
        return response.data;
      } catch (error) {
        // Temporary resilience: if backend throws 500 after commit, recover by
        // scanning most recent sales and redirecting to the created receipt.
        const axiosError = error as {
          response?: { status?: number };
        };
        if (axiosError?.response?.status === 500) {
          const recentResponse = await apiClient.get('/sales', {
            params: { branchId, limit: 10 },
          });

          const sales = (recentResponse.data?.data || []) as RecentSale[];
          const now = Date.now();
          const targetPaymentMethod = paymentMethodMap[paymentMethod];
          const candidate = sales.find((sale) => {
            const createdAtMs = new Date(sale.createdAt).getTime();
            const isFresh = Number.isFinite(createdAtMs) && now - createdAtMs < 2 * 60 * 1000;
            const sameTotal = Math.abs((sale.total || 0) - total) < 0.01;
            const sameItemCount = (sale.items?.length || 0) === items.length;
            const samePaymentMethod = sale.paymentMethod === targetPaymentMethod;
            return isFresh && sameTotal && sameItemCount && samePaymentMethod;
          });

          if (candidate?._id) {
            return {
              success: true,
              message: 'Checkout recovered from server error',
              data: {
                saleId: candidate._id,
              },
            };
          }
        }

        throw error;
      }
    },
    onSuccess: (data) => {
      const saleId = data?.data?.saleId;
      if (!saleId) {
        showError('Checkout completed but sale ID is missing from response');
        return;
      }

      setLastSaleId(saleId);
      clearCart();
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all(), exact: false });
      navigate(`/pos/receipt/${saleId}`);
    },
    onError: (error) => {
      showError(getErrorMessage(error, 'Failed to process checkout'));
    },
  });

  const allPaymentMethods: PaymentMethodDef[] = [
    { id: 'cash', label: 'Cash', shortLabel: 'Cash', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'bank_transfer', label: 'Bank Transfer', shortLabel: 'Transfer', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    )},
    { id: 'credit', label: 'Credit Sale', shortLabel: 'Credit', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    )},
  ];

  const slePaymentMethods: PaymentMethodDef[] = [
    ...allPaymentMethods,
    { id: 'card', label: 'Debit Card', shortLabel: 'Card', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    )},
    { id: 'orange_money', label: 'Orange Money', shortLabel: 'Orange', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    )},
    { id: 'africell_money', label: 'Africell Money', shortLabel: 'Africell', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    )},
    { id: 'qmoney', label: 'QMoney', shortLabel: 'QMoney', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'insurance', label: 'Insurance', shortLabel: 'Insurance', icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    )},
  ];

  const paymentMethods = isUSD ? allPaymentMethods : slePaymentMethods;

  const quickAmounts = isUSD
    ? [5, 10, 20, 50, 100]
    : [10000, 20000, 50000, 100000, 200000];

  const creditInitialMethods = isUSD
    ? ([
        { value: 'cash', label: 'Cash' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
      ] as const)
    : ([
        { value: 'cash', label: 'Cash' },
        { value: 'card', label: 'Card' },
        { value: 'orange_money', label: 'Orange Money' },
        { value: 'africell_money', label: 'Africell Money' },
        { value: 'qmoney', label: 'QMoney' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
      ] as const);

  return (
    <div className="min-h-screen bg-primary-darker flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-800/80 pt-safe-top bg-primary-dark/50 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white mr-3 min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-white/5 -ml-2 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-white">Checkout</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Total Amount Card */}
        <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-br from-accent-green/20 via-accent-green/10 to-transparent border border-accent-green/20 p-6 text-center">
          <p className="text-accent-green/80 text-sm font-medium uppercase tracking-wider">Amount Due</p>
          <p className="text-4xl sm:text-5xl font-bold text-white mt-2 tracking-tight">{format(total)}</p>
          {discount > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Subtotal {format(subtotal)} <span className="text-red-400">-{format(discount)}</span>
            </p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="px-4 mt-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment Method</p>
          <div className={`grid gap-2 ${paymentMethods.length <= 3 ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'}`}>
            {paymentMethods.map((method) => {
              const active = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id as PaymentMethod);
                    if (method.id !== 'orange_money' && method.id !== 'africell_money' && method.id !== 'qmoney') {
                      setPaymentReference('');
                    }
                  }}
                  className={`relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border transition-all min-h-[80px] ${
                    active
                      ? 'border-accent-green bg-accent-green/10 shadow-lg shadow-accent-green/10'
                      : 'border-gray-800 bg-primary-dark hover:border-gray-700'
                  }`}
                >
                  {active && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent-green" />
                  )}
                  <div className={`transition-colors ${active ? 'text-accent-green' : 'text-gray-400'}`}>
                    {method.icon}
                  </div>
                  <span className={`text-xs font-semibold text-center leading-tight ${
                    active ? 'text-accent-green' : 'text-gray-300'
                  }`}>
                    {method.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Input */}
        {paymentMethod === 'cash' && (
          <div className="px-4 mt-6 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount Received</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-green text-lg font-bold">{symbol}</span>
              <input
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-primary-dark border border-gray-800 rounded-xl text-white text-2xl font-bold focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-all"
              />
            </div>
            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountReceived(amt.toString())}
                  className="flex-1 py-2.5 rounded-lg bg-primary-dark border border-gray-800 text-sm font-semibold text-gray-300 hover:border-accent-green/50 hover:text-accent-green transition-all"
                >
                  {symbol}{amt.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountReceived(total.toFixed(2))}
                className="flex-1 py-2.5 rounded-lg bg-accent-green/10 border border-accent-green/30 text-sm font-semibold text-accent-green hover:bg-accent-green/20 transition-all"
              >
                Exact
              </button>
            </div>
            {/* Change Due */}
            {changeDue > 0 && (
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <span className="text-sm text-green-400 font-medium">Change Due</span>
                <span className="text-lg font-bold text-green-400">{format(changeDue)}</span>
              </div>
            )}
            {parseFloat(amountReceived || '0') < total && (
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-sm text-red-400 font-medium">Insufficient Amount</span>
                <span className="text-sm font-bold text-red-400">{format(total - parseFloat(amountReceived || '0'))} short</span>
              </div>
            )}
          </div>
        )}

        {/* Mobile Money Reference */}
        {['orange_money', 'africell_money', 'qmoney'].includes(paymentMethod) && (
          <div className="px-4 mt-6 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction Reference</p>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Enter transaction ID or reference"
              className="w-full px-4 py-3.5 bg-primary-dark border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-all"
            />
            <p className="text-gray-500 text-xs">Optional: for record keeping</p>
          </div>
        )}

        {/* Bank Transfer Reference */}
        {paymentMethod === 'bank_transfer' && (
          <div className="px-4 mt-6 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transfer Reference</p>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Enter bank reference or confirmation number"
              className="w-full px-4 py-3.5 bg-primary-dark border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/30 transition-all"
            />
            <p className="text-gray-500 text-xs">Optional: for reconciliation</p>
          </div>
        )}

        {/* Credit Sale Form */}
        {paymentMethod === 'credit' && (
          <div className="px-4 mt-6 space-y-4">
            {/* Credit Notice */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-amber-200/80">
                  Stock will be released now. The balance stays open until the customer pays.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <CustomerTypeahead
                label="Customer Name"
                value={creditCustomerName}
                onChange={setCreditCustomerName}
                onSelectCustomer={(c) => {
                  setCreditCustomerId(c._id);
                  setLinkedCustomer(c);
                  if (!creditCustomerPhone.trim() && c.phone) {
                    setCreditCustomerPhone(c.phone);
                  }
                }}
                onClearCustomer={() => {
                  setCreditCustomerId(undefined);
                  setLinkedCustomer(null);
                }}
                selectedCustomerId={creditCustomerId}
                placeholder="Search or type walk-in name..."
                helperText="Optional: track balance for existing customers"
              />
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Phone</label>
                <input
                  type="text"
                  value={creditCustomerPhone}
                  onChange={(e) => setCreditCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3.5 bg-primary-dark border border-gray-800 rounded-xl text-white focus:outline-none focus:border-accent-green transition-all"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Due Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={creditDueDate}
                  onChange={(e) => setCreditDueDate(e.target.value)}
                  className="w-full px-4 py-3.5 bg-primary-dark border border-gray-800 rounded-xl text-white focus:outline-none focus:border-accent-green transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Upfront Payment</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-green font-bold">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    value={creditAmountPaid}
                    onChange={(e) => setCreditAmountPaid(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-primary-dark border border-gray-800 rounded-xl text-white font-semibold focus:outline-none focus:border-accent-green transition-all"
                  />
                </div>
              </div>
            </div>

            {parsedCreditAmount > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Initial Payment Via</label>
                <select
                  value={creditInitialMethod}
                  onChange={(e) => setCreditInitialMethod(e.target.value as CreditCollectionMethod)}
                  className="w-full px-4 py-3.5 bg-primary-dark border border-gray-800 rounded-xl text-white focus:outline-none focus:border-accent-green transition-all"
                >
                  {creditInitialMethods.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Balance Due */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm text-amber-300 font-medium">Balance Due</span>
              <span className="text-lg font-bold text-amber-300">
                {format(Math.max(0, total - (Number.isFinite(parsedCreditAmount) ? parsedCreditAmount : 0)))}
              </span>
            </div>
          </div>
        )}

        {/* Spacer for bottom actions */}
        <div className="h-4" />
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-gray-800/80 bg-primary-dark/80 backdrop-blur-md px-4 py-3 pb-safe-bottom space-y-2">
        <button
          onClick={() => checkoutMutation.mutate()}
          disabled={
            checkoutMutation.isPending ||
            (paymentMethod === 'cash' && parseFloat(amountReceived) < total) ||
            (paymentMethod === 'credit' &&
              (!creditDueDate ||
                parsedCreditAmount < 0 ||
                parsedCreditAmount > total)) ||
            !currentShift ||
            currentShift.status !== 'open'
          }
          className="w-full py-4 bg-accent-green text-primary-dark font-bold rounded-xl hover:bg-accent-light active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 text-base"
        >
          {checkoutMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Processing...
            </span>
          ) : paymentMethod === 'credit' ? 'Create Credit Sale' : 'Complete Sale'}
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleHoldSale}
            disabled={items.length === 0}
            className="flex-1 py-3 bg-primary-dark text-gray-300 border border-gray-800 font-semibold rounded-xl hover:border-gray-700 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            Hold{heldSales.length > 0 ? ` (${heldSales.length})` : ''}
          </button>
          <button
            onClick={() => lastSaleId && setShowEmailModal(true)}
            disabled={!lastSaleId}
            className="flex-1 py-3 bg-primary-dark text-gray-300 border border-gray-800 font-semibold rounded-xl hover:border-gray-700 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Email
          </button>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/75 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setShowEmailModal(false)}>
          <div className="bg-primary-dark rounded-t-2xl sm:rounded-2xl p-6 pb-safe-bottom w-full max-w-md border border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Email Receipt</h2>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-white p-2 -mr-2 rounded-lg hover:bg-white/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-4 py-3.5 bg-primary-darker border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-green transition-all"
                  autoFocus
                />
              </div>
              <button
                onClick={handleEmailReceipt}
                disabled={emailReceiptMutation.isPending}
                className="w-full py-3 bg-accent-green text-primary-dark font-bold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {emailReceiptMutation.isPending ? 'Sending...' : 'Send Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
