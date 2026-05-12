import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import apiClient from '../../lib/api-client';
import { useCurrency } from '../../hooks/useCurrency';
import { useAlertReplacement } from '../../hooks/useAlertReplacement';
import { useToast } from '../../hooks/useToast';
import { queryKeys } from '../../lib/query-keys';
interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Sale {
  _id: string;
  receiptNumber: string;
  branchName?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  cashierName?: string;
}

export const ReceiptPage = () => {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { format } = useCurrency();
  const { alertInfo } = useAlertReplacement();
  const { showSuccess, showError, showInfo } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  
  // Check if sale data was passed via navigation state
  const passedSale = location.state?.sale;

  const { data: sale, isLoading } = useQuery({
    queryKey: queryKeys.sales.detail(saleId),
    queryFn: async () => {
      const response = await apiClient.get(`/sales/${saleId}`);
      return response.data.data as Sale;
    },
    enabled: !!saleId && !passedSale,
    initialData: passedSale,
  });

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  const handleShare = () => {
    if (!sale) return;
    const text = `Receipt #${sale.receiptNumber}\n${sale.branchName || 'Main Pharmacy'}\n\nDate: ${formatDateTime(sale.createdAt)}\nCustomer: ${sale.customerName || 'Walk-in'}\nTotal: ${format(sale.total)}\nPayment: ${sale.paymentMethod.toUpperCase()}\n\nThank you for your business!`;
    
    if (navigator.share) {
      navigator.share({
        title: `Receipt #${sale.receiptNumber}`,
        text: text,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        showInfo('Copied', 'Receipt copied to clipboard');
      });
    }
  };

  const handleEmailReceipt = async () => {
    if (!emailAddress) {
      showError('Please enter an email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      showError('Please enter a valid email address');
      return;
    }

    setEmailSending(true);
    try {
      await apiClient.post('/email/receipt', {
        saleId: saleId || sale._id,
        email: emailAddress,
      });
      showSuccess('Receipt sent successfully');
      setShowEmailModal(false);
      setEmailAddress('');
    } catch (error: any) {
      showError(error?.response?.data?.message || 'Failed to send receipt');
    } finally {
      setEmailSending(false);
    }
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-darker flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-primary-darker flex items-center justify-center">
        <div className="text-gray-400">Receipt not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-darker flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate('/pos')} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Receipt</h1>
        <button onClick={handleShare} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Payment Successful</h2>
          <p className="text-gray-400 mt-1">Receipt #{sale.receiptNumber}</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-primary-dark rounded-2xl p-5 border border-gray-700">
          {/* Store Info */}
          <div className="text-center pb-4 border-b border-gray-700 border-dashed">
            <h3 className="text-lg font-bold text-white">{sale.branchName || 'Main Pharmacy'}</h3>
            <p className="text-gray-400 text-sm">{formatDateTime(sale.createdAt)}</p>
          </div>

          {/* Items */}
          <div className="py-4 border-b border-gray-700 border-dashed">
            {sale.items.map((item: SaleItem, index: number) => (
              <div key={index} className="flex items-start justify-between gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white leading-snug whitespace-normal break-words">{item.productName || item.productId}</p>
                  <p className="text-gray-400 text-sm">{item.quantity} x {format(item.unitPrice)}</p>
                </div>
                <p className="text-white font-medium shrink-0">{format(item.subtotal)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white">{format(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Discount</span>
                <span className="text-red-400">-{format(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
              <span className="text-white">Total</span>
              <span className="text-accent-green">{format(sale.total)}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="pt-4 border-t border-gray-700 border-dashed">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Payment Method</span>
              <span className="text-white capitalize">{sale.paymentMethod}</span>
            </div>
            {sale.cashierName && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-400">Served by</span>
                <span className="text-white">{sale.cashierName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3 border-t border-gray-800">
        <div className="flex space-x-3">
          <button onClick={() => window.print()} className="flex-1 py-3 bg-primary-dark border border-gray-600 rounded-xl text-white font-medium flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          <button onClick={() => setShowEmailModal(true)} className="flex-1 py-3 bg-primary-dark border border-gray-600 rounded-xl text-white font-medium flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </button>
        </div>
        <button
          onClick={() => navigate('/pos')}
          className="w-full py-4 bg-accent-green text-primary-dark font-semibold rounded-xl hover:bg-accent-light transition-colors"
        >
          New Sale
        </button>
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
                disabled={emailSending}
                className="w-full py-3 bg-accent-green text-primary-dark font-semibold rounded-xl hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailSending ? 'Sending...' : 'Send Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
