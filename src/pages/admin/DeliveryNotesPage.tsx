import { useState } from 'react';
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
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';
import { Truck, CheckCircle, Download, Eye } from 'lucide-react';

interface DeliveryNoteItem {
  productId: string;
  productName: string;
  quantity: number;
}

interface DeliveryNote {
  _id: string;
  deliveryNumber: string;
  proformaInvoiceId: string;
  customerId: { _id: string; firstName: string; lastName: string; phone?: string } | string;
  items: DeliveryNoteItem[];
  status: string;
  deliveredAt?: string;
  deliveredBy?: string;
  notes?: string;
  createdAt: string;
}

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    delivered: 'bg-green-500/10 text-green-400 border-green-500/20',
  };
  return styles[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

export function DeliveryNotesPage() {
  const [selectedDn, setSelectedDn] = useState<DeliveryNote | null>(null);
  const { selectedBranch } = useBranchStore();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const branchId = getBranchId(selectedBranch);

  const { data: notes, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.deliveryNotes.list({ branchId }),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/delivery-notes', { branchId }));
      const payload = response.data?.data ?? response.data;
      return (Array.isArray(payload) ? payload : []) as DeliveryNote[];
    },
    enabled: !!branchId,
  });

  const markDeliveredMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/delivery-notes/${id}/deliver`),
    onSuccess: () => { showSuccess('Marked as delivered'); queryClient.invalidateQueries({ queryKey: queryKeys.deliveryNotes.all() }); },
    onError: (err: any) => showError(err?.response?.data?.message || 'Failed to mark delivered'),
  });

  const handleDownloadPdf = async (id: string) => {
    try {
      const response = await apiClient.get(`/delivery-notes/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery-note-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showError('Failed to download PDF');
    }
  };

  const getCustomerName = (dn: DeliveryNote) => {
    if (typeof dn.customerId === 'object' && dn.customerId) {
      return `${dn.customerId.firstName} ${dn.customerId.lastName}`;
    }
    return 'Customer';
  };

  const columns = [
    { key: 'deliveryNumber', header: 'Delivery #' },
    {
      key: 'customerId', header: 'Customer',
      render: (dn: DeliveryNote) => getCustomerName(dn),
    },
    {
      key: 'items', header: 'Items',
      render: (dn: DeliveryNote) => `${dn.items.length} items`,
    },
    {
      key: 'status', header: 'Status',
      render: (dn: DeliveryNote) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusBadge(dn.status)}`}>
          {dn.status}
        </span>
      ),
    },
    {
      key: 'createdAt', header: 'Date',
      render: (dn: DeliveryNote) => new Date(dn.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <AdminLayout title="Delivery Notes">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-400">Track deliveries for proforma invoices</p>
      </div>

      {isLoading ? (
        <Loading variant="centered" text="Loading delivery notes..." />
      ) : error ? (
        <Error message="Failed to load delivery notes" onRetry={refetch} />
      ) : (
        <Table
          data={notes || []}
          columns={columns}
          emptyMessage="No delivery notes yet."
          onRowClick={(item) => setSelectedDn(item)}
        />
      )}

      <Modal isOpen={!!selectedDn} onClose={() => setSelectedDn(null)} title={selectedDn?.deliveryNumber || 'Delivery Note'} size="lg">
        {selectedDn && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Customer: {getCustomerName(selectedDn)}</p>
                <p className="text-sm text-gray-400">Date: {new Date(selectedDn.createdAt).toLocaleDateString()}</p>
                {selectedDn.deliveredAt && (
                  <p className="text-sm text-gray-400">Delivered: {new Date(selectedDn.deliveredAt).toLocaleDateString()}</p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusBadge(selectedDn.status)}`}>
                {selectedDn.status}
              </span>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Items</h4>
              <div className="space-y-2">
                {selectedDn.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                    <p className="text-white font-medium">{item.productName}</p>
                    <p className="text-gray-400">Qty: {item.quantity}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedDn.notes && <p className="text-gray-400 text-sm">Notes: {selectedDn.notes}</p>}

            <div className="flex flex-wrap gap-3">
              {selectedDn.status === 'pending' && (
                <Button onClick={() => markDeliveredMutation.mutate(selectedDn._id)}>
                  <CheckCircle className="w-4 h-4 mr-2" />Mark as Delivered
                </Button>
              )}
              <Button onClick={() => handleDownloadPdf(selectedDn._id)} variant="secondary">
                <Download className="w-4 h-4 mr-2" />Download PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
