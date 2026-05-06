import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loading } from '../../components/ui/Loading';
import { Error as ErrorDisplay } from '../../components/ui/Error';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useCurrency } from '../../hooks/useCurrency';
import { useBranchStore, getBranchId } from '../../stores/branch-store';
import { queryKeys } from '../../lib/query-keys';
import { buildApiUrl } from '../../lib/api-utils';
import { useSearchWithDebounce } from '../../hooks/useSearchWithDebounce';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { usePagination } from '../../hooks/usePagination';
import { useBranchAwareCRUDMutations } from '../../hooks/useCRUDMutations';
import { saveProductImage, getProductImage } from '../../services/background-sync.service';

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  unit: string;
  reorderLevel: number;
  basePrice: number;
  costPrice: number;
  suggestedRetailPrice: number;
  markupPercentage: number;
  requiresPrescription: boolean;
  isControlled: boolean;
  isActive: boolean;
  maxStockLevel?: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductFormData {
   name: string;
   sku: string;
   barcode: string;
   category: string;
   brand: string;
   unit: string;
   initialStock: number;
   initialLotNumber?: string;
   initialExpiryDate?: string;
   initialSupplierId?: string;
   initialPurchasePrice?: number;
   initialSellingPrice?: number;
   basePrice: number;
   costPrice: number;
   suggestedRetailPrice: number;
   markupPercentage: number;
   requiresPrescription: boolean;
   isControlled: boolean;
   branchId: string;
   reorderLevel: number;
   maxStockLevel?: number;
 }

interface Branch {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Supplier {
  _id: string;
  name: string;
}

export const ProductManagementPage = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useState<HTMLInputElement | null>(null);
  const {
    value: searchQuery,
    setValue: setSearchQuery,
    debouncedValue: debouncedSearchQuery,
  } = useSearchWithDebounce('');

  const pagination = usePagination({ initialLimit: 20 });
  const queryClient = useQueryClient();
  const { format } = useCurrency();
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const branchId = getBranchId(selectedBranch);

  const { createMutation, updateMutation } = useBranchAwareCRUDMutations<Product>(
    'products',
    queryKeys.products.all(),
    branchId || '',
    {
      resourceLabel: 'Product',
      onCreateSuccess: () => {
        setIsModalOpen(false);
      },
      onUpdateSuccess: () => {
        setIsModalOpen(false);
        setEditingProduct(null);
      },
    }
  );

  // WebSocket integration for real-time inventory updates
  useWebSocket({
    onInventoryUpdate: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all(), exact: false });
    },
  });

  const { register, handleSubmit, reset, watch, trigger, setValue, formState: { errors } } = useForm<ProductFormData>();
  const initialStock = Number(watch('initialStock') || 0);

  const { isAvailable: cameraAvailable, scanOnce } = useBarcodeScanner();

  const handleScanBarcode = async () => {
    const value = await scanOnce();
    if (value) setValue('barcode', value, { shouldValidate: true });
  };

  const generateSku = (name: string): string => {
    const parts = name
      .trim()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3))
      .filter(Boolean);
    const suffix = Date.now().toString(36).toUpperCase().slice(-4);
    return parts.slice(0, 3).join('-') + '-' + suffix;
  };

  // Fetch all branches for the branch selector
  const { data: branches } = useQuery({
    queryKey: queryKeys.branches.list(),
    queryFn: async () => {
      const response = await apiClient.get('/branches');
      return response.data as Branch[];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: queryKeys.suppliers.list(),
    queryFn: async () => {
      const response = await apiClient.get('/suppliers?active=true');
      return response.data as Supplier[];
    },
  });

  // Fetch products for selected branch
  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: queryKeys.products.list({
      branchId: branchId,
      search: debouncedSearchQuery,
      ...pagination.state,
    }),
    queryFn: async () => {
      if (!branchId) return null;

      const url = buildApiUrl('/products', {
        branchId,
        search: debouncedSearchQuery,
        ...pagination.state,
      });
      const response = await apiClient.get(url);
      return response.data;
    },
    enabled: !!branchId,
  });

  const products = productsResponse?.data || [];
  const paginationMeta = productsResponse?.pagination;

  // Create product mutation
  const handleCreateProduct = async (data: ProductFormData) => {
    const payload = {
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      category: data.category,
      brand: data.brand,
      unit: data.unit,
      reorderLevel: data.reorderLevel,
      basePrice: data.basePrice,
      costPrice: data.costPrice,
      suggestedRetailPrice: data.suggestedRetailPrice,
      markupPercentage: data.markupPercentage,
      requiresPrescription: data.requiresPrescription,
      isControlled: data.isControlled,
      branchId: data.branchId,
      // Initial stock fields are optional in DTO, always include them if provided
      initialStock: data.initialStock,
      initialLotNumber: data.initialLotNumber,
      initialExpiryDate: data.initialExpiryDate,
      initialSupplierId: data.initialSupplierId,
      initialPurchasePrice: data.initialPurchasePrice,
      initialSellingPrice: data.initialSellingPrice,
      // maxStockLevel is optional in DTO
      maxStockLevel: data.maxStockLevel,
      // Server-generated fields - provide defaults for create
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    createMutation.mutate(payload, {
      onSuccess: async (response: any) => {
        const productId = response?.data?._id || response?._id;
        if (productId && productImage) {
          await saveProductImage(productId, productImage);
        }
        setProductImage(null);
        setImagePreview(null);
      },
    });
  };

    createMutation.mutate(payload);
  };

  // Update product mutation
  const handleUpdateProduct = (data: ProductFormData) => {
    if (!editingProduct) return;

    const payload = {
      name: data.name,
      category: data.category,
      brand: data.brand,
      unit: data.unit,
      basePrice: data.basePrice,
      costPrice: data.costPrice,
      suggestedRetailPrice: data.suggestedRetailPrice,
      markupPercentage: data.markupPercentage,
      requiresPrescription: data.requiresPrescription,
      isControlled: data.isControlled,
    };

    updateMutation.mutate({ id: editingProduct._id, data: payload });
  };

  const handleOpenModal = (product?: Product) => {
    setWizardStep(1);
    if (product) {
      setEditingProduct(product);
      reset({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        category: product.category,
        brand: product.brand,
        unit: product.unit,
        initialStock: 0, // Don't show existing stock when editing
        initialLotNumber: '',
        initialExpiryDate: '',
        initialSupplierId: '',
        initialPurchasePrice: product.costPrice || 0,
        initialSellingPrice: product.suggestedRetailPrice || product.basePrice || 0,
        basePrice: product.basePrice || 0,
        costPrice: product.costPrice || 0,
        suggestedRetailPrice: product.suggestedRetailPrice || 0,
        markupPercentage: product.markupPercentage || 0,
        requiresPrescription: product.requiresPrescription,
        isControlled: product.isControlled,
        reorderLevel: product.reorderLevel || 0,
        maxStockLevel: product.maxStockLevel || undefined,
        branchId: '', // Branch can't be changed when editing
      });
    } else {
      setEditingProduct(null);
      const defaultBranchId = getBranchId(selectedBranch) || '';
      reset({
        name: '',
        sku: '',
        barcode: '',
        category: '',
        brand: '',
        unit: 'piece',
        initialStock: 0,
        initialLotNumber: '',
        initialExpiryDate: '',
        initialSupplierId: '',
        initialPurchasePrice: 0,
        initialSellingPrice: 0,
        basePrice: 0,
        costPrice: 0,
        suggestedRetailPrice: 0,
        markupPercentage: 0,
        requiresPrescription: false,
        isControlled: false,
        branchId: defaultBranchId, // Default to currently selected branch
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setWizardStep(1);
    setProductImage(null);
    setImagePreview(null);
    reset();
  };

  const handleNextStep = async () => {
    const valid = await trigger([
      'branchId',
      'name',
      'barcode',
      'category',
      'brand',
      'unit',
      'basePrice',
      'costPrice',
      'suggestedRetailPrice',
      'markupPercentage',
    ]);

    if (valid) {
      setWizardStep(2);
    }
  };

  const onSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      handleUpdateProduct(data);
    } else {
      handleCreateProduct(data);
    }
  };

  if (!branchId) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-white/10 bg-primary-dark/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">Select a Branch First</h2>
          <p className="mt-2 text-gray-400">
            Products are branch-scoped. Choose a branch before viewing or managing products.
          </p>
          <div className="mt-6">
            <Button onClick={() => navigate('/branches')}>Select Branch</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) return <AdminLayout><Loading /></AdminLayout>;
  if (error) return <AdminLayout><ErrorDisplay message="Failed to load products" /></AdminLayout>;

  const columns = [
    { key: 'name', header: 'Product Name' },
    { key: 'sku', header: 'SKU' },
    { key: 'category', header: 'Category' },
    { key: 'brand', header: 'Brand' },
    { 
      key: 'basePrice', 
      header: 'Base Price',
      render: (product: Product) => format(product.basePrice || 0)
    },
    { 
      key: 'costPrice', 
      header: 'Cost Price',
      render: (product: Product) => format(product.costPrice || 0)
    },
    { 
      key: 'markupPercentage', 
      header: 'Markup',
      render: (product: Product) => 
        product.markupPercentage ? `${product.markupPercentage}%` : '-'
    },
    { key: 'unit', header: 'Unit' },
    {
      key: 'requiresPrescription',
      header: 'Prescription',
      render: (product: Product) => (
        product.requiresPrescription ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
            Required
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
            Not Required
          </span>
        )
      ),
    },
    {
      key: 'isControlled',
      header: 'Controlled',
      render: (product: Product) => (
        product.isControlled ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
            Yes
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
            No
          </span>
        )
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product: Product) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleOpenModal(product)}
          className="py-1!"
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Products</h2>
            <p className="text-gray-400 mt-1">Manage product catalog and inventory</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="shadow-lg shadow-accent-green/20">
            Add Product
          </Button>
        </div>

        {/* Search Bar */}
        <div className="bg-primary-dark/50 backdrop-blur-sm p-4 rounded-2xl border border-white/5">
          <Input
            placeholder="Search by name, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Products Table */}
        <div className="rounded-2xl overflow-hidden border border-white/5 shadow-xl">
          <Table
            data={products}
            columns={columns}
            isLoading={isLoading}
            pagination={paginationMeta}
            onPageChange={pagination.setPage}
            onLimitChange={pagination.setLimit}
            onSort={(key) => {
              if (pagination.state.sortBy === key) {
                pagination.toggleSortOrder();
              } else {
                pagination.setSort(key, 'asc');
              }
            }}
            currentSort={{
              key: pagination.state.sortBy || '',
              order: pagination.state.sortOrder || 'asc',
            }}
            emptyMessage="No products found"
          />
        </div>

        {/* Product Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingProduct ? 'Edit Product' : 'Add Product'}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {!editingProduct ? (
              <div className="rounded-xl border border-white/10 p-3 bg-white/5">
                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-300">
                  <span className={wizardStep === 1 ? 'text-accent-green font-semibold' : ''}>Step 1: Product Details</span>
                  <span className={wizardStep === 2 ? 'text-accent-green font-semibold' : ''}>Step 2: Opening Stock</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full bg-accent-green transition-all duration-300 ${wizardStep === 1 ? 'w-1/2' : 'w-full'}`}
                  ></div>
                </div>
              </div>
            ) : null}

            {/* Branch Selector - Only show when creating new product */}
            {!editingProduct && wizardStep === 1 && (
              <div className="p-4 bg-accent-green/5 border border-accent-green/20 rounded-xl">
                <Select
                  label="Select Branch"
                  {...register('branchId', { required: 'Branch is required' })}
                  error={errors.branchId?.message}
                >
                  <option value="" className="bg-primary-dark text-white">Choose a branch...</option>
                  {branches?.filter(b => b.isActive).map((branch) => (
                    <option key={branch._id} value={branch._id} className="bg-primary-dark text-white">
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </Select>
                <p className="mt-2 text-xs text-gray-400">
                  Select which branch this product will be added to
                </p>
              </div>
            )}

            {(editingProduct || wizardStep === 1) ? (
              <>
                <Input
                  label="Product Name"
                  {...register('name', { required: 'Product name is required' })}
                  error={errors.name?.message}
                  onChange={(e) => {
                    const el = e.target;
                    register('name').onChange(e);
                    if (!editingProduct) {
                      setValue('sku', generateSku(el.value), { shouldValidate: false });
                    }
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <Input
                    label="SKU"
                    {...register('sku')}
                    error={errors.sku?.message}
                    disabled={!!editingProduct}
                    placeholder="Auto-generated from name"
                  />
                  <div className="flex flex-col gap-1">
                    <label className="block text-sm font-medium text-gray-300">Barcode</label>
                    <div className="flex gap-2">
                      <input
                        {...register('barcode', { required: 'Barcode is required' })}
                        disabled={!!editingProduct}
                        className="flex-1 px-4 py-2.5 bg-primary-darker border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent-green focus:ring-1 focus:ring-accent-green/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        placeholder="Scan or type barcode"
                      />
                      {cameraAvailable && !editingProduct && (
                        <button
                          type="button"
                          onClick={handleScanBarcode}
                          className="px-3 py-2.5 bg-accent-green/10 border border-accent-green/30 rounded-xl text-accent-green hover:bg-accent-green/20 transition-colors"
                          title="Scan barcode with camera"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9V6a1 1 0 011-1h3M3 15v3a1 1 0 001 1h3m11-4v3a1 1 0 01-1 1h-3m4-12h-3a1 1 0 00-1 1v3" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {errors.barcode && <p className="text-sm text-red-400">{errors.barcode.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <Select
                    label="Category"
                    {...register('category', { required: 'Category is required' })}
                    error={errors.category?.message}
                  >
                    <option value="" className="bg-primary-dark text-white">Select Category</option>
                    <option value="prescription" className="bg-primary-dark text-white">Prescription Drugs</option>
                    <option value="otc" className="bg-primary-dark text-white">Over-the-Counter (OTC)</option>
                    <option value="vitamins" className="bg-primary-dark text-white">Vitamins & Supplements</option>
                    <option value="medical-devices" className="bg-primary-dark text-white">Medical Devices</option>
                    <option value="personal-care" className="bg-primary-dark text-white">Personal Care</option>
                    <option value="baby-care" className="bg-primary-dark text-white">Baby & Child Care</option>
                    <option value="first-aid" className="bg-primary-dark text-white">First Aid</option>
                    <option value="diabetic-care" className="bg-primary-dark text-white">Diabetic Care</option>
                    <option value="cosmetics" className="bg-primary-dark text-white">Cosmetics</option>
                    <option value="other" className="bg-primary-dark text-white">Other</option>
                  </Select>
                  <Input
                    label="Brand"
                    {...register('brand', { required: 'Brand is required' })}
                    error={errors.brand?.message}
                  />
                </div>

                <Select
                  label="Unit of Measurement"
                  {...register('unit', { required: 'Unit is required' })}
                  error={errors.unit?.message}
                >
                  <option value="" className="bg-primary-dark text-white">Select Unit</option>
                  <option value="tablet" className="bg-primary-dark text-white">Tablet</option>
                  <option value="capsule" className="bg-primary-dark text-white">Capsule</option>
                  <option value="bottle" className="bg-primary-dark text-white">Bottle</option>
                  <option value="vial" className="bg-primary-dark text-white">Vial</option>
                  <option value="ampule" className="bg-primary-dark text-white">Ampule</option>
                  <option value="syringe" className="bg-primary-dark text-white">Syringe</option>
                  <option value="tube" className="bg-primary-dark text-white">Tube</option>
                  <option value="jar" className="bg-primary-dark text-white">Jar</option>
                  <option value="pack" className="bg-primary-dark text-white">Pack</option>
                  <option value="box" className="bg-primary-dark text-white">Box</option>
                  <option value="strip" className="bg-primary-dark text-white">Strip/Blister</option>
                  <option value="sachet" className="bg-primary-dark text-white">Sachet</option>
                  <option value="ml" className="bg-primary-dark text-white">Milliliter (ml)</option>
                  <option value="mg" className="bg-primary-dark text-white">Milligram (mg)</option>
                  <option value="g" className="bg-primary-dark text-white">Gram (g)</option>
                  <option value="piece" className="bg-primary-dark text-white">Piece</option>
                </Select>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Base Price (Le)"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('basePrice', {
                      required: 'Base price is required',
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.basePrice?.message}
                  />

                  <Input
                    label="Cost Price (Le)"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('costPrice', {
                      required: 'Cost price is required',
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.costPrice?.message}
                  />

                  <Input
                    label="Suggested Retail Price (Le)"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('suggestedRetailPrice', {
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.suggestedRetailPrice?.message}
                  />

                  <Input
                    label="Markup Percentage (%)"
                    type="number"
                    min="0"
                    max="1000"
                    step="0.1"
                    {...register('markupPercentage', {
                      min: { value: 0, message: 'Must be 0 or greater' },
                      max: { value: 1000, message: 'Maximum 1000%' },
                    })}
                    error={errors.markupPercentage?.message}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Reorder Level"
                    type="number"
                    min="0"
                    {...register('reorderLevel', {
                      required: 'Reorder level is required',
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.reorderLevel?.message}
                  />

                  <Input
                    label="Maximum Stock Level (Optional)"
                    type="number"
                    min="0"
                    {...register('maxStockLevel', {
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.maxStockLevel?.message}
                  />
                </div>

                <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requiresPrescription"
                      {...register('requiresPrescription')}
                      className="h-5 w-5 rounded border-gray-600 bg-primary-darker text-accent-green focus:ring-accent-green transition-colors"
                    />
                    <label htmlFor="requiresPrescription" className="ml-3 block text-sm font-medium text-white">
                      Requires Prescription
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isControlled"
                      {...register('isControlled')}
                      className="h-5 w-5 rounded border-gray-600 bg-primary-darker text-accent-green focus:ring-accent-green transition-colors"
                    />
                    <label htmlFor="isControlled" className="ml-3 block text-sm font-medium text-white">
                      Controlled Substance
                    </label>
                  </div>
                </div>

                {/* Product Image Capture */}
                <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5">
                  <label className="block text-sm font-medium text-white">Product Image</label>
                  <div className="flex items-start gap-4">
                    {imagePreview ? (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-600">
                        <img src={imagePreview} alt="Product" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setProductImage(null); setImagePreview(null); }}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        id="product-image-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const dataUrl = reader.result as string;
                              setProductImage(dataUrl);
                              setImagePreview(dataUrl);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="product-image-input"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent-green/10 border border-accent-green/30 rounded-xl text-accent-green hover:bg-accent-green/20 transition-colors cursor-pointer text-sm font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {imagePreview ? 'Change Photo' : 'Take Photo / Upload'}
                      </label>
                      <p className="text-xs text-gray-400">Camera or gallery, stored locally</p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {!editingProduct && wizardStep === 2 ? (
              <div>
                <Input
                  label="Initial Stock Quantity"
                  type="number"
                  min="0"
                  {...register('initialStock', {
                    required: 'Initial stock quantity is required',
                    min: { value: 0, message: 'Must be 0 or greater' },
                  })}
                  error={errors.initialStock?.message}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Starting inventory quantity for this product when first added to the system.
                </p>
              </div>
            ) : null}

            {!editingProduct && wizardStep === 2 && initialStock > 0 ? (
              <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/5">
                <h3 className="text-sm font-semibold text-white">Opening Stock Batch Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Supplier"
                    {...register('initialSupplierId', {
                      required: 'Supplier is required when opening stock is provided',
                    })}
                    error={errors.initialSupplierId?.message}
                  >
                    <option value="" className="bg-primary-dark text-white">Select Supplier</option>
                    {suppliers?.map((supplier) => (
                      <option key={supplier._id} value={supplier._id} className="bg-primary-dark text-white">
                        {supplier.name}
                      </option>
                    ))}
                  </Select>

                  <Input
                    label="Expiry Date"
                    type="date"
                    {...register('initialExpiryDate', {
                      required: 'Expiry date is required when opening stock is provided',
                    })}
                    error={errors.initialExpiryDate?.message}
                  />

                  <Input
                    label="Lot Number (Optional)"
                    {...register('initialLotNumber')}
                    placeholder="Auto-generated if left empty"
                    error={errors.initialLotNumber?.message}
                  />

                  <Input
                    label="Opening Purchase Price (Optional)"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('initialPurchasePrice', {
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.initialPurchasePrice?.message}
                    placeholder="Defaults to Cost Price"
                  />

                  <Input
                    label="Opening Selling Price (Optional)"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('initialSellingPrice', {
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.initialSellingPrice?.message}
                    placeholder="Defaults to Suggested Retail or Base Price"
                  />
                </div>
              </div>
            ) : null}

            <div className="flex justify-end space-x-3 pt-6 border-t border-white/10">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseModal}
              >
                Cancel
              </Button>

              {!editingProduct && wizardStep === 1 ? (
                <Button type="button" onClick={handleNextStep}>
                  Next
                </Button>
              ) : null}

              {!editingProduct && wizardStep === 2 ? (
                <>
                  <Button type="button" variant="secondary" onClick={() => setWizardStep(1)}>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Saving...' : 'Create Product'}
                  </Button>
                </>
              ) : null}

              {editingProduct ? (
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Update Product'}
                </Button>
              ) : null}
            </div>

            {(createMutation.isError || updateMutation.isError) && (
              <ErrorDisplay message="Failed to save product. Please try again." />
            )}
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};


