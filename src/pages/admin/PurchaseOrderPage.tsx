import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Error } from '../../components/ui/Error';
import { useToast } from '../../hooks/useToast';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { useAuth } from '../../contexts/AuthContext';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';
import { useCurrency } from '../../hooks/useCurrency';

interface Supplier {
  _id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  supplierId: {
    _id: string;
    name: string;
  };
  branchId: {
    _id: string;
    name: string;
  };
  items: {
    productId: {
      _id: string;
      name: string;
      sku: string;
    };
    quantity: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'partially_received' | 'completed' | 'cancelled';
  expectedDeliveryDate: string;
  receivedAt?: string;
  createdAt: string;
}

interface POFormData {
  supplierId: string;
  expectedDeliveryDate: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

interface ReceiveFormData {
  receivedItems: {
    productId: string;
    quantityReceived: number;
    lotNumber: string;
    expiryDate: string;
    sellingPrice: number;
  }[];
}

export default function PurchaseOrderPage() {
  const { symbol } = useCurrency();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const { selectedBranch } = useBranchStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { register: registerCreate, handleSubmit: handleSubmitCreate, control: controlCreate, reset: resetCreate, formState: { errors: errorsCreate } } = useForm<POFormData>({
    defaultValues: {
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: controlCreate,
    name: 'items',
  });

  const { register: registerReceive, handleSubmit: handleSubmitReceive, reset: resetReceive } = useForm<ReceiveFormData>();

  // Commented out unused field array for now - can be enabled when receive functionality is implemented
  // const { fields: receiveFields, append: appendReceive, remove: removeReceive } = useFieldArray({
  //   control: controlReceive,
  //   name: 'receivedItems',
  // });

  // Fetch suppliers
  const { data: suppliers } = useQuery({
    queryKey: queryKeys.suppliers.list(),
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('/suppliers', { isActive: true }));
      return response.data as Supplier[];
    },
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: queryKeys.products.list(),
    queryFn: async () => {
      const response = await apiClient.get('/products');
      return response.data.data as Product[];
    },
  });

  // Fetch purchase orders
  const { data: purchaseOrders, isLoading, error } = useQuery({
    queryKey: queryKeys.purchaseOrders.list({ branchId: getBranchId(selectedBranch) }),
    queryFn: async () => {
      const branchId = getBranchId(selectedBranch);
      const response = await apiClient.get(buildApiUrl('/purchase-orders', { branchId }));
      return response.data as PurchaseOrder[];
    },
    enabled: !!selectedBranch,
  });

  // Create PO mutation
  const createMutation = useMutation({
    mutationFn: async (data: POFormData) => {
      const branchId = getBranchId(selectedBranch);
      return apiClient.post('/purchase-orders', {
        ...data,
        branchId: branchId,
        createdBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all(), exact: false });
      setIsCreateModalOpen(false);
      resetCreate();
      showSuccess('Purchase order created');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to create purchase order'),
  });

  // Receive PO mutation
  const receiveMutation = useMutation({
    mutationFn: async ({ poId, data }: { poId: string; data: ReceiveFormData }) => {
      return apiClient.post(`/purchase-orders/${poId}/receive`, {
        ...data,
        receivedBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all(), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all(), exact: false });
      setIsReceiveModalOpen(false);
      setSelectedPO(null);
      resetReceive();
      showSuccess('Purchase order received');
    },
    onError: (err: any) => showError(err?.response?.data?.message ?? 'Failed to receive order'),
  });

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreate();
  };

  const handleOpenReceiveModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    resetReceive({
      receivedItems: po.items.map(item => ({
        productId: item.productId._id,
        quantityReceived: item.quantity,
        lotNumber: '',
        expiryDate: '',
        sellingPrice: 0,
      })),
    });
    setIsReceiveModalOpen(true);
  };

  const handleCloseReceiveModal = () => {
    setIsReceiveModalOpen(false);
    setSelectedPO(null);
    resetReceive();
  };

  const onSubmitCreate = (data: POFormData) => {
    createMutation.mutate(data);
  };

  const onSubmitReceive = (data: ReceiveFormData) => {
    if (selectedPO) {
      receiveMutation.mutate({ poId: selectedPO._id, data });
    }
  };

  if (!selectedBranch) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Please select a branch to manage purchase orders</p>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (error) return <AdminLayout><Error message="Failed to load purchase orders" /></AdminLayout>;

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      partially_received: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status as keyof typeof colors]}`}>
        {status.toUpperCase().replace('_', ' ')}
      </span>
    );
  };

  const columns = [
    { key: 'orderNumber', header: 'PO Number' },
    { 
      key: 'createdAt', 
      header: 'Date',
      render: (po: PurchaseOrder) => new Date(po.createdAt).toLocaleDateString()
    },
    { key: 'supplierId.name', header: 'Supplier' },
    { 
      key: 'items', 
      header: 'Items',
      render: (po: PurchaseOrder) => po.items.length
    },
    { 
      key: 'totalAmount', 
      header: 'Total Amount',
      render: (po: PurchaseOrder) => `$${po.totalAmount.toFixed(2)}`
    },
    { 
      key: 'expectedDeliveryDate', 
      header: 'Expected Delivery',
      render: (po: PurchaseOrder) => new Date(po.expectedDeliveryDate).toLocaleDateString()
    },
    {
      key: 'status',
      header: 'Status',
      render: (po: PurchaseOrder) => getStatusBadge(po.status)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (po: PurchaseOrder) => (
        po.status === 'pending' || po.status === 'partially_received' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenReceiveModal(po)}
          >
            Receive
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <Button onClick={handleOpenCreateModal}>
            Create Purchase Order
          </Button>
        </div>

        {/* Purchase Orders Table */}
        <div className="bg-white rounded-lg shadow">
          <Table
            data={purchaseOrders || []}
            columns={columns}
          />
        </div>

        {/* Create PO Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          title="Create Purchase Order"
        >
          <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-4">
            <Select
              label="Supplier"
              {...registerCreate('supplierId', { required: 'Supplier is required' })}
              error={errorsCreate.supplierId?.message}
            >
              <option value="" className="bg-primary-dark text-white">Select supplier</option>
              {suppliers?.map(supplier => (
                <option key={supplier._id} value={supplier._id} className="bg-primary-dark text-white">
                  {supplier.name}
                </option>
              ))}
            </Select>

            <Input
              label="Expected Delivery Date"
              type="date"
              {...registerCreate('expectedDeliveryDate', { required: 'Expected delivery date is required' })}
              error={errorsCreate.expectedDeliveryDate?.message}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items
              </label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex space-x-2 mb-2">
                  <Select
                    {...registerCreate(`items.${index}.productId`, { required: 'Product is required' })}
                    className="flex-1"
                  >
                    <option value="" className="bg-primary-dark text-white">Select product</option>
                    {products?.map(product => (
                      <option key={product._id} value={product._id} className="bg-primary-dark text-white">
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter quantity"
                    {...registerCreate(`items.${index}.quantity`, { 
                      required: 'Quantity is required',
                      min: { value: 1, message: 'Min 1' }
                    })}
                    className="w-24"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`${symbol} 0.00`}
                    {...registerCreate(`items.${index}.unitPrice`, { 
                      required: 'Price is required',
                      min: { value: 0, message: 'Min 0' }
                    })}
                    className="w-32"
                  />
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}
              >
                Add Item
              </Button>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseCreateModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create PO'}
              </Button>
            </div>

            {createMutation.isError && (
              <Error message="Failed to create purchase order. Please try again." />
            )}
          </form>
        </Modal>

        {/* Receive PO Modal */}
        <Modal
          isOpen={isReceiveModalOpen}
          onClose={handleCloseReceiveModal}
          title="Receive Purchase Order"
        >
          {selectedPO && (
            <form onSubmit={handleSubmitReceive(onSubmitReceive)} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md space-y-2">
                <p className="text-sm"><span className="font-semibold">PO Number:</span> {selectedPO.orderNumber}</p>
                <p className="text-sm"><span className="font-semibold">Supplier:</span> {selectedPO.supplierId.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received Items
                </label>
                {selectedPO.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                    <p className="font-semibold mb-2">{item.productId.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Quantity Received"
                        type="number"
                        min="0"
                        max={item.quantity}
                        {...registerReceive(`receivedItems.${index}.quantityReceived`, {
                          required: 'Quantity is required',
                          max: { value: item.quantity, message: `Max ${item.quantity}` }
                        })}
                      />
                      <Input
                        label="Lot Number"
                        {...registerReceive(`receivedItems.${index}.lotNumber`, { required: 'Lot number is required' })}
                      />
                      <Input
                        label="Expiry Date"
                        type="date"
                        {...registerReceive(`receivedItems.${index}.expiryDate`, { required: 'Expiry date is required' })}
                      />
                      <Input
                        label="Selling Price"
                        type="number"
                        step="0.01"
                        min="0"
                        {...registerReceive(`receivedItems.${index}.sellingPrice`, { required: 'Selling price is required' })}
                      />
                    </div>
                    <input
                      type="hidden"
                      {...registerReceive(`receivedItems.${index}.productId`)}
                      value={item.productId._id}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseReceiveModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={receiveMutation.isPending}
                >
                  {receiveMutation.isPending ? 'Receiving...' : 'Receive Items'}
                </Button>
              </div>

              {receiveMutation.isError && (
                <Error message="Failed to receive purchase order. Please try again." />
              )}
            </form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}


