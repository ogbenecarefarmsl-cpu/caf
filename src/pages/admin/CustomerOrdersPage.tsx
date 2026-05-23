import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useToast } from '../../hooks/useToast';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';
import { FileText, Upload, CheckCircle, XCircle, Eye } from 'lucide-react';

interface CustomerOrderItem {
  extractedName: string;
  extractedQuantity: number;
  extractedUnitPrice?: number;
  matchedProductId?: string;
  status: string;
}

interface CustomerOrder {
  _id: string;
  orderNumber: string;
  branchId: string;
  sourceFile: { originalName: string; url: string };
  items: CustomerOrderItem[];
  unmatchedItems: { name: string; quantity: number }[];
  status: string;
  createdAt: string;
}

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    received: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    reviewed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    converted: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return styles[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

export function CustomerOrdersPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [uploading, setUploading] = useState(false);
  const { selectedBranch } = useBranchStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const branchId = getBranchId(selectedBranch);

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.customerOrders.list({ branchId }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/customer-orders', { branchId }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as CustomerOrder[];
    },
    enabled: !!branchId,
  });

  const handleFileUpload = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file || !branchId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiClient.post(`/customer-orders/upload?branchId=${branchId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showSuccess('Purchase order uploaded and processed');
      setIsUploadModalOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.customerOrders.lists() });
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [branchId, queryClient, showSuccess, showError]);

  const columns = [
    { key: 'orderNumber', header: 'Order #' },
    { key: 'sourceFile', header: 'File',
      render: (item: CustomerOrder) => item.sourceFile?.originalName || '-' },
    {
      key: 'items', header: 'Items',
      render: (item: CustomerOrder) => `${item.items.length} matched` },
    {
      key: 'unmatchedItems', header: 'Unmatched',
      render: (item: CustomerOrder) => item.unmatchedItems?.length
        ? <span className="text-amber-400">{item.unmatchedItems.length}</span>
        : '0',
    },
    {
      key: 'status', header: 'Status',
      render: (item: CustomerOrder) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusBadge(item.status)}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'createdAt', header: 'Date',
      render: (item: CustomerOrder) => new Date(item.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <AdminLayout title="Customer Orders">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-400">Upload and manage customer purchase orders</p>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload PO
        </Button>
      </div>

      {isLoading ? (
        <Loading variant="centered" text="Loading orders..." />
      ) : error ? (
        <Error message="Failed to load customer orders" onRetry={refetch} />
      ) : (
        <Table
          data={orders || []}
          columns={columns}
          emptyMessage="No purchase orders yet. Upload one to get started."
          onRowClick={(item) => setSelectedOrder(item)}
        />
      )}

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Purchase Order">
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">File (PDF, Excel, Word, Image)</label>
            <input
              type="file"
              name="file"
              accept=".pdf,.xlsx,.xls,.docx,.png,.jpg,.jpeg"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-white border border-white/10 focus:border-accent-green/50 focus:outline-none focus:ring-2 focus:ring-accent-green/20"
            />
          </div>
          <p className="text-sm text-gray-400">The file will be uploaded to cloud storage and processed with AI to extract items.</p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={uploading}>Upload & Process</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={selectedOrder?.orderNumber || 'Order Detail'} size="lg">
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">File: {selectedOrder.sourceFile?.originalName}</p>
                <p className="text-sm text-gray-400">Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusBadge(selectedOrder.status)}`}>
                {selectedOrder.status}
              </span>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Matched Items</h4>
              {selectedOrder.items.length === 0 ? (
                <p className="text-gray-400 text-sm">No items matched yet</p>
              ) : (
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                      <div>
                        <p className="text-white font-medium">{item.extractedName}</p>
                        <p className="text-sm text-gray-400">Qty: {item.extractedQuantity}{item.extractedUnitPrice ? ` @ $${item.extractedUnitPrice}` : ''}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        item.status === 'matched' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        item.status === 'new_product_added' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedOrder.unmatchedItems?.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Unmatched Items</h4>
                <div className="space-y-2">
                  {selectedOrder.unmatchedItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-amber-500/5 rounded-xl p-3 border border-amber-500/10">
                      <p className="text-white">{item.name} - Qty: {item.quantity}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {selectedOrder.sourceFile?.url && (
                <a href={selectedOrder.sourceFile.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary"><Eye className="w-4 h-4 mr-2" />View Original File</Button>
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
