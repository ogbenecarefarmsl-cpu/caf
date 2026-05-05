import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../lib/api-client';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useAlertReplacement } from '../../hooks/useAlertReplacement';
import { QRScannerModal } from '../../components/pos/QRScannerModal';
import { queryKeys } from '../../lib/query-keys';
import { useCurrency } from '../../hooks/useCurrency';

interface Sale {
  _id: string;
  receiptNumber: string;
  customerName?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  createdAt: string;
  status: string;
}

type SearchMode = 'receipt' | 'product';

export const ProcessReturnPage = () => {
  const navigate = useNavigate();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const { alertInfo } = useAlertReplacement();
  const { format } = useCurrency();
  const [searchMode, setSearchMode] = useState<SearchMode>('receipt');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const { data: recentSales, isLoading } = useQuery({
    queryKey: queryKeys.sales.recent({
      branchId: getBranchId(selectedBranch),
      search: searchQuery,
      limit: 20,
    }),
    queryFn: async () => {
      const branchId = getBranchId(selectedBranch);
      
      if (!branchId) {
        throw new Error('Branch ID is required');
      }
      
      const params: Record<string, string | number> = { branchId, limit: 20 };
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await apiClient.get('/sales', { params });
      return response.data.data as Sale[];
    },
    enabled: !!getBranchId(selectedBranch),
    retry: false,
  });

  const handleBarcodeScan = (barcode: string) => {
    setSearchQuery(barcode);
    setSearchMode('receipt');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-secondary-dark flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-white">Process a Return</h1>
        <button onClick={() => setShowScanner(true)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by receipt number or product name..."
            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
          />
        </div>

        {/* Toggle Tabs */}
        <div className="flex bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setSearchMode('receipt')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              searchMode === 'receipt'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            By Receipt
          </button>
          <button
            onClick={() => setSearchMode('product')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              searchMode === 'product'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            By Product
          </button>
        </div>

        {/* Recent Sales */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Recent Sales</h2>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : recentSales && recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div
                  key={sale._id}
                  onClick={() => setSelectedSale(sale)}
                  className={`flex items-center p-4 rounded-xl border transition-colors cursor-pointer ${
                    selectedSale?._id === sale._id
                      ? 'bg-cyan-500/10 border-cyan-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">Receipt #{sale.receiptNumber}</p>
                    <p className="text-gray-400 text-sm">
                      {sale.items.length} {sale.items.length === 1 ? 'Item' : 'Items'} - {format(sale.total)}
                    </p>
                    <p className="text-gray-500 text-sm">Customer: {sale.customerName || 'Walk-in'}</p>
                  </div>
                  <span className="text-gray-400 text-sm">{formatDate(sale.createdAt)}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">No recent sales found</div>
            )}
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => selectedSale && navigate(`/pos/receipt/${selectedSale._id}`)}
          disabled={!selectedSale}
          className={`w-full py-4 rounded-xl font-semibold transition-colors ${
            selectedSale
              ? 'bg-cyan-500 text-white hover:bg-cyan-600'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan Receipt Barcode"
      />
    </div>
  );
};
