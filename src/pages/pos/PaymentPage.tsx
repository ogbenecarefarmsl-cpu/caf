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

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
    { id: 'card', label: 'Card', icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )},
    { id: 'orange_money', label: 'Orange Money', icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'africell_money', label: 'Africell Money', icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )},
    { id: 'qmoney', label: 'QMoney', icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-2.21 0-4 1.343-4 3s1.79 3 4 3 4 1.343 4 3-1.79 3-4 3m0-12v12m0-12c1.657 0 3 .895 3 2m-6 8c0 1.105 1.343 2 3 2" />
      </svg>
    )},
    { id: 'bank_transfer', label: 'Bank Transfer', icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    )},
    { id: 'insurance', label: 'Insurance', icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5-2.5V12c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7.5L12 4l8 3.5z" />
      </svg>
    )},
    { id: 'credit', label: 'Credit Sale', icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h4m6 0h.01M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
      </svg>
    )},
  ];

  return (
    <div className="min-h-screen bg-primary-darker flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-white mr-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Payment</h1>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Total Amount */}
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">Total Amount Due</p>
          <p className="text-5xl font-bold text-white mt-2">{format(total)}</p>
        </div>

        {/* Payment Methods */}
        <div>
          <h2 className="text-white font-semibold mb-3">Select Payment Method</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                className={`p-5 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                  paymentMethod === method.id
                    ? 'border-accent-green bg-accent-green text-primary-dark'
                    : 'border-gray-700 bg-primary-dark text-white hover:border-gray-600'
                }`}
              >
                <div className={paymentMethod === method.id ? 'text-primary-dark' : 'text-accent-green'}>
                  {method.icon}
                </div>
                <span className="mt-2 font-medium">{method.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Received (for cash) */}
        {paymentMethod === 'cash' && (
          <div>
            <h2 className="text-white font-semibold mb-3">Amount Received</h2>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-green text-xl font-bold">{symbol}</span>
              <input
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full pl-14 pr-4 py-4 bg-primary-dark border border-gray-700 rounded-xl text-white text-xl font-medium focus:outline-none focus:border-accent-green"
              />
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-gray-400">Change Due: </span>
              <span className="text-accent-green font-bold ml-2">{format(changeDue)}</span>
            </div>
          </div>
        )}

        {['orange_money', 'africell_money', 'qmoney'].includes(paymentMethod) && (
          <div>
            <h2 className="text-white font-semibold mb-3">Payment Reference (Optional)</h2>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Enter transaction ID or reference number"
              className="w-full px-4 py-4 bg-primary-dark border border-gray-700 rounded-xl text-white focus:outline-none focus:border-accent-green"
            />
            <p className="text-gray-500 text-xs mt-1">Optional: Enter the mobile money transaction reference for record keeping</p>
          </div>
        )}

        {paymentMethod === 'credit' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm font-medium text-amber-200">
                Stock will be released now and the balance will stay open until the customer pays.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                placeholder="Search customer or type walk-in name..."
                helperText="Optional. Select an existing customer to track their balance, or type a name for a walk-in."
              />
              <div>
                <h2 className="text-white font-semibold mb-3">Customer Phone</h2>
                <input
                  type="text"
                  value={creditCustomerPhone}
                  onChange={(e) => setCreditCustomerPhone(e.target.value)}
                  className="w-full px-4 py-4 bg-primary-dark border border-gray-700 rounded-xl text-white focus:outline-none focus:border-accent-green"
                  placeholder="Optional"
                />
              </div>
              <div>
                <h2 className="text-white font-semibold mb-3">Due Date <span className="text-red-500">*</span></h2>
                <input
                  type="date"
                  value={creditDueDate}
                  onChange={(e) => setCreditDueDate(e.target.value)}
                  className="w-full px-4 py-4 bg-primary-dark border border-gray-700 rounded-xl text-white focus:outline-none focus:border-accent-green"
                />
              </div>
              <div>
                <h2 className="text-white font-semibold mb-3">Upfront Payment</h2>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-green text-xl font-bold">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    value={creditAmountPaid}
                    onChange={(e) => setCreditAmountPaid(e.target.value)}
                    className="w-full pl-14 pr-4 py-4 bg-primary-dark border border-gray-700 rounded-xl text-white focus:outline-none focus:border-accent-green"
                  />
                </div>
              </div>
            </div>

            {parsedCreditAmount > 0 && (
              <div>
                <h2 className="text-white font-semibold mb-3">Initial Payment Method</h2>
                <select
                  value={creditInitialMethod}
                  onChange={(e) => setCreditInitialMethod(e.target.value as CreditCollectionMethod)}
                  className="w-full px-4 py-4 bg-primary-dark border border-gray-700 rounded-xl text-white focus:outline-none focus:border-accent-green"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="africell_money">Africell Money</option>
                  <option value="qmoney">QMoney</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            )}

            <div className="flex justify-end">
              <span className="text-gray-400">Balance Due: </span>
              <span className="text-amber-300 font-bold ml-2">
                {format(Math.max(0, total - (Number.isFinite(parsedCreditAmount) ? parsedCreditAmount : 0)))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-4 space-y-3 border-t border-gray-800">
        <button
          onClick={handleHoldSale}
          disabled={items.length === 0}
          className="w-full py-3 bg-primary-dark text-accent-green border border-accent-green/30 font-semibold rounded-xl hover:bg-accent-green/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title="Park this sale to recall later"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
          Hold Sale{heldSales.length > 0 ? ` (${heldSales.length} parked)` : ''}
        </button>
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
          className="w-full py-4 bg-accent-green text-primary-dark font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checkoutMutation.isPending
            ? 'Processing...'
            : paymentMethod === 'credit'
              ? 'Create Credit Sale'
              : 'Confirm Payment'}
        </button>

        <div className="flex justify-center space-x-8">
          <button onClick={() => window.print()} className="flex items-center text-accent-green">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
          <button onClick={() => lastSaleId && setShowEmailModal(true)} disabled={!lastSaleId} className="flex items-center text-accent-green disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Receipt
          </button>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50" onClick={() => setShowEmailModal(false)}>
          <div className="bg-primary-dark rounded-2xl p-6 w-[90%] max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Email Receipt</h2>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Email Address</label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-4 py-3 bg-primary-darker border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-green"
                  autoFocus
                />
              </div>
              <button
                onClick={handleEmailReceipt}
                disabled={emailReceiptMutation.isPending}
                className="w-full py-3 bg-accent-green text-primary-dark font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
