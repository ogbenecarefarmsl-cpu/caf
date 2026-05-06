import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import apiClient from '../../lib/api-client';
import { AdminLayout } from '../../components/AdminLayout';
import { BranchSelector } from '../../components/BranchSelector';
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

interface PackSize {
  name: string;
  unit: string;
  quantityPerPack: number;
  sellingPrice: number;
  barcode?: string;
}

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
  packSizes?: PackSize[];
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
   packSizes: PackSize[];
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPackSizeEditor, setShowPackSizeEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
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
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return parts.length >= 2
      ? `${parts[0]}${parts[1]}${suffix}`
      : parts.length === 1
        ? `${parts[0]}${suffix}`
        : `PRD${suffix}`;
  };

  const { data: productsData, isLoading, error } = useQuery({
    queryKey: [
      'products',
      branchId,
      debouncedSearchQuery,
      pagination.state.page,
      pagination.state.limit,
    ],
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('products', undefined), {
        params: {
          branchId,
          search: debouncedSearchQuery,
          page: pagination.state.page,
          limit: pagination.state.limit,
        },
      });
      return response.data;
    },
    enabled: !!branchId,
  });

  const products = productsData?.data || [];
  const total = productsData?.pagination?.total || 0;

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('branches', undefined));
      return (response.data?.data || []) as Branch[];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', branchId],
    queryFn: async () => {
      const response = await apiClient.get(buildApiUrl('suppliers', undefined), {
        params: { branchId },
      });
      return (response.data?.data || []) as Supplier[];
    },
    enabled: !!branchId,
  });

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
      packSizes: data.packSizes || [],
      initialStock: data.initialStock,
      initialLotNumber: data.initialLotNumber,
      initialExpiryDate: data.initialExpiryDate,
      initialSupplierId: data.initialSupplierId,
      initialPurchasePrice: data.initialPurchasePrice,
      initialSellingPrice: data.initialSellingPrice,
      maxStockLevel: data.maxStockLevel,
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
      packSizes: data.packSizes || [],
    };

    updateMutation.mutate({ id: editingProduct._id, data: payload });
  };

  const onSubmit = (data: ProductFormData) => {
    const normalizedData: ProductFormData = {
      ...data,
      sku: data.sku?.trim() || generateSku(data.name),
      packSizes: data.packSizes || [],
    };

    if (editingProduct) {
      handleUpdateProduct(normalizedData);
      return;
    }

    handleCreateProduct(normalizedData);
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
        initialStock: 0,
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
        packSizes: product.packSizes || [],
        branchId: '',
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
        branchId: defaultBranchId,
        packSizes: [],
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
    if (valid) setWizardStep(2);
  };

  if (!branchId) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-white/10 bg-primary-dark/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-white">Select a Branch First</h2>
          <p className="mt-2 text-gray-400">
            Products are branch-scoped. Choose a branch before viewing or managing products.
          </p>
          <div className="mx-auto mt-6 max-w-xs">
            <BranchSelector />
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
      key: 'isActive',
      header: 'Status',
      render: (product: Product) => (
        product.isActive ? (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
            Active
          </span>
        ) : (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
            Inactive
          </span>
        )
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Products</h1>
            <p className="text-gray-400">{total} products</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <div className="sm:hidden">
              <BranchSelector />
            </div>
            <Button onClick={() => handleOpenModal()}>+ Add Product</Button>
          </div>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>

        <Table
          columns={columns}
          data={products}
          onRowClick={handleOpenModal}
          pagination={{
            page: pagination.state.page,
            limit: pagination.state.limit,
            total,
            pages: Math.ceil(total / pagination.state.limit),
            hasNext: pagination.state.page < Math.ceil(total / pagination.state.limit),
            hasPrev: pagination.state.page > 1,
          }}
          onPageChange={pagination.setPage}
          onLimitChange={pagination.setLimit}
        />

        <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-bold text-white">
              {editingProduct ? 'Edit Product' : wizardStep === 1 ? 'Add Product (Step 1 of 2)' : 'Add Product (Step 2 of 2)'}
            </h2>

            {wizardStep === 1 ? (
              <>
                <Select
                  label="Branch"
                  error={errors.branchId?.message}
                  {...register('branchId', { required: 'Branch is required' })}
                  disabled={!!editingProduct}
                >
                  <option value="" className="bg-primary-dark text-white">Choose a branch...</option>
                  {branches?.map((branch) => (
                    <option key={branch._id} value={branch._id} className="bg-primary-dark text-white">
                      {branch.name}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Product Name"
                  {...register('name', { required: 'Product name is required' })}
                  error={errors.name?.message}
                />

                <div className="flex gap-2">
                  <Input
                    label="Barcode"
                    {...register('barcode', { required: 'Barcode is required' })}
                    error={errors.barcode?.message}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleScanBarcode}
                    disabled={!cameraAvailable}
                    className="mt-8"
                  >
                    {cameraAvailable ? 'Scan' : 'No Camera'}
                  </Button>
                </div>

                <Input
                  label="SKU (auto-generated if empty)"
                  {...register('sku')}
                  placeholder="Auto-generate if empty"
                />

                <Select
                  label="Category"
                  error={errors.category?.message}
                  {...register('category', { required: 'Category is required' })}
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
                  <option value="laboratory" className="bg-primary-dark text-white">Laboratory</option>
                  <option value="surgical" className="bg-primary-dark text-white">Surgical</option>
                  <option value="dental" className="bg-primary-dark text-white">Dental</option>
                  <option value="other" className="bg-primary-dark text-white">Other</option>
                </Select>

                <Input
                  label="Brand"
                  {...register('brand', { required: 'Brand is required' })}
                  error={errors.brand?.message}
                />

                <Select
                  label="Unit"
                  error={errors.unit?.message}
                  {...register('unit', { required: 'Unit is required' })}
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
                  <option value="kit" className="bg-primary-dark text-white">Kit</option>
                  <option value="adult" className="bg-primary-dark text-white">Adult Size</option>
                  <option value="children" className="bg-primary-dark text-white">Children Size</option>
                  <option value="neonatal" className="bg-primary-dark text-white">Neonatal Size</option>
                  <option value="pediatric" className="bg-primary-dark text-white">Pediatric Size</option>
                  <option value="ml" className="bg-primary-dark text-white">Milliliter (ml)</option>
                  <option value="mg" className="bg-primary-dark text-white">Milligram (mg)</option>
                  <option value="g" className="bg-primary-dark text-white">Gram (g)</option>
                  <option value="piece" className="bg-primary-dark text-white">Piece</option>
                </Select>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Base Price (per unit)"
                    type="number"
                    step="0.01"
                    {...register('basePrice', {
                      required: 'Base price is required',
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.basePrice?.message}
                  />

                  <Input
                    label="Cost Price"
                    type="number"
                    step="0.01"
                    {...register('costPrice', {
                      required: 'Cost price is required',
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.costPrice?.message}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Suggested Retail Price"
                    type="number"
                    step="0.01"
                    {...register('suggestedRetailPrice', {
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.suggestedRetailPrice?.message}
                  />

                  <Input
                    label="Markup %"
                    type="number"
                    step="0.1"
                    {...register('markupPercentage', {
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.markupPercentage?.message}
                  />
                </div>

                <Input
                  label="Reorder Level"
                  type="number"
                  {...register('reorderLevel', {
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

            {wizardStep === 2 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Initial Stock (for new batch)"
                    type="number"
                    min="0"
                    {...register('initialStock', { min: 0 })}
                    error={errors.initialStock?.message}
                  />

                  <Input
                    label="Purchase Price"
                    type="number"
                    step="0.01"
                    {...register('initialPurchasePrice', {
                      min: { value: 0, message: 'Must be 0 or greater' },
                    })}
                    error={errors.initialPurchasePrice?.message}
                  />
                </div>

                <Input
                  label="Lot Number"
                  {...register('initialLotNumber')}
                />

                <Input
                  label="Expiry Date"
                  type="date"
                  {...register('initialExpiryDate')}
                />

                <Select
                  label="Supplier (Optional)"
                  {...register('initialSupplierId')}
                >
                  <option value="" className="bg-primary-dark text-white">Select Supplier</option>
                  {suppliers?.map((supplier) => (
                    <option key={supplier._id} value={supplier._id} className="bg-primary-dark text-white">
                      {supplier.name}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Initial Selling Price"
                  type="number"
                  step="0.01"
                  {...register('initialSellingPrice', {
                    min: { value: 0, message: 'Must be 0 or greater' },
                  })}
                  error={errors.initialSellingPrice?.message}
                  placeholder="Defaults to Suggested Retail or Base Price"
                />

                <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-white">Pack Sizes</label>
                    <button
                      type="button"
                      onClick={() => setShowPackSizeEditor(!showPackSizeEditor)}
                      className="text-accent-green text-sm hover:underline"
                    >
                      {showPackSizeEditor ? 'Done' : 'Add Pack Sizes'}
                    </button>
                  </div>

                  {!showPackSizeEditor && watch('packSizes') && watch('packSizes').length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {watch('packSizes').map((pack: PackSize, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 bg-primary-darker rounded-lg text-sm text-gray-300 border border-gray-600">
                          {pack.name} ({pack.quantityPerPack} × {watch('unit')}) - {format(pack.sellingPrice)}
                        </span>
                      ))}
                    </div>
                  )}

                  {showPackSizeEditor && (
                    <>
                      <div className="mb-4">
                        <label className="block text-gray-400 text-sm mb-2">Quick Templates</label>
                        <select
                          value={selectedTemplate}
                          onChange={(e) => {
                            setSelectedTemplate(e.target.value);
                            if (e.target.value) {
                              const templates: Record<string, PackSize[]> = {
                                'tablet_100': [
                                  { name: 'Box', unit: 'box', quantityPerPack: 100, sellingPrice: 0 },
                                  { name: 'Strip', unit: 'strip', quantityPerPack: 10, sellingPrice: 0 },
                                ],
                                'tablet_50': [
                                  { name: 'Box', unit: 'box', quantityPerPack: 50, sellingPrice: 0 },
                                  { name: 'Strip', unit: 'strip', quantityPerPack: 10, sellingPrice: 0 },
                                ],
                                'tablet_28': [
                                  { name: 'Pack', unit: 'pack', quantityPerPack: 28, sellingPrice: 0 },
                                ],
                                'syrup': [
                                  { name: 'Bottle', unit: 'bottle', quantityPerPack: 1, sellingPrice: 0 },
                                ],
                                'cream': [
                                  { name: 'Tube', unit: 'tube', quantityPerPack: 1, sellingPrice: 0 },
                                ],
                                'injection': [
                                  { name: 'Vial', unit: 'vial', quantityPerPack: 1, sellingPrice: 0 },
                                ],
                                'ampule': [
                                  { name: 'Box', unit: 'box', quantityPerPack: 50, sellingPrice: 0 },
                                  { name: 'Pack', unit: 'pack', quantityPerPack: 10, sellingPrice: 0 },
                                ],
                                'capsule': [
                                  { name: 'Box', unit: 'box', quantityPerPack: 100, sellingPrice: 0 },
                                  { name: 'Blister', unit: 'blister', quantityPerPack: 10, sellingPrice: 0 },
                                ],
                                'lab_tube': [
                                  { name: 'Pack', unit: 'pack', quantityPerPack: 50, sellingPrice: 0 },
                                  { name: 'Rack', unit: 'rack', quantityPerPack: 10, sellingPrice: 0 },
                                ],
                                'lab_reagent': [
                                  { name: 'Kit', unit: 'kit', quantityPerPack: 1, sellingPrice: 0 },
                                  { name: 'With Strips', unit: 'kit', quantityPerPack: 25, sellingPrice: 0 },
                                ],
                                'lab_testkit': [
                                  { name: 'Box', unit: 'box', quantityPerPack: 50, sellingPrice: 0 },
                                  { name: 'Pack', unit: 'pack', quantityPerPack: 10, sellingPrice: 0 },
                                  { name: 'Strip', unit: 'strip', quantityPerPack: 1, sellingPrice: 0 },
                                ],
                                'lab_slide': [
                                  { name: 'Box', unit: 'box', quantityPerPack: 50, sellingPrice: 0 },
                                  { name: 'Pack', unit: 'pack', quantityPerPack: 10, sellingPrice: 0 },
                                ],
                                'sachet': [
                                  { name: 'Box', unit: 'box', quantityPerPack: 100, sellingPrice: 0 },
                                  { name: 'Sachet', unit: 'sachet', quantityPerPack: 10, sellingPrice: 0 },
                                ],
                                'nasal': [
                                  { name: 'Adult', unit: 'adult', quantityPerPack: 1, sellingPrice: 0 },
                                  { name: 'Children', unit: 'children', quantityPerPack: 1, sellingPrice: 0 },
                                  { name: 'Neonatal', unit: 'neonatal', quantityPerPack: 1, sellingPrice: 0 },
                                ],
                                'oxygen_mask': [
                                  { name: 'Adult', unit: 'adult', quantityPerPack: 1, sellingPrice: 0 },
                                  { name: 'Children', unit: 'children', quantityPerPack: 1, sellingPrice: 0 },
                                  { name: 'Neonatal', unit: 'neonatal', quantityPerPack: 1, sellingPrice: 0 },
                                ],
                                'catheter': [
                                  { name: 'Adult', unit: 'adult', quantityPerPack: 1, sellingPrice: 0 },
                                  { name: 'Pediatric', unit: 'pediatric', quantityPerPack: 1, sellingPrice: 0 },
                                  { name: 'Neonatal', unit: 'neonatal', quantityPerPack: 1, sellingPrice: 0 },
                                ],
                                'surgical_mask': [
                                  { name: 'Adult', unit: 'adult', quantityPerPack: 1, sellingPrice: 0 },
                                  { name: 'Children', unit: 'children', quantityPerPack: 1, sellingPrice: 0 },
                                ],
                              };
                              const templateName = e.target.value;
                              const template = templates[templateName];
                              if (template) {
                                const base = Number(watch('basePrice') || 0);
                                const withPrices = template.map(t => ({
                                  ...t,
                                  sellingPrice: base * t.quantityPerPack,
                                }));
                                setValue('packSizes', withPrices as any);
                              }
                            }
                          }}
                          className="w-full px-3 py-2 bg-primary-darker border border-gray-600 rounded-lg text-white text-sm"
                        >
                          <option value="">Select a template...</option>
                          <option value="tablet_100">Tablets (Box 100, Strip 10)</option>
                          <option value="tablet_50">Tablets (Box 50, Strip 10)</option>
                          <option value="tablet_28">Tablets (Pack 28)</option>
                          <option value="capsule">Capsules (Box 100, Blister 10)</option>
                          <option value="syrup">Syrup (Bottle)</option>
                          <option value="cream">Cream (Tube)</option>
                          <option value="injection">Injection (Vial)</option>
                          <option value="ampule">Ampules (Box 50, Pack 10)</option>
                          <option value="lab_tube">Lab Tubes (Pack 50, Rack 10)</option>
                          <option value="lab_reagent">Lab Reagents (Kit, With Strips)</option>
                          <option value="lab_testkit">Lab Test Kits (Box/Pack/Strip)</option>
                          <option value="lab_slide">Lab Slides (Box 50, Pack 10)</option>
                          <option value="sachet">Sachets (Box 100, Sachet 10)</option>
                          <option value="nasal">Nasal Drops (Adult, Children, Neonatal)</option>
                          <option value="oxygen_mask">Oxygen Mask (Adult, Children, Neonatal)</option>
                          <option value="catheter">Catheter (Adult, Pediatric, Neonatal)</option>
                          <option value="surgical_mask">Surgical Mask (Adult, Children)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Select to auto-fill, then edit prices</p>
                      </div>

                      <div className="space-y-3">
                        {watch('packSizes').map((pack: PackSize, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 p-3 bg-primary-darker rounded-lg border border-gray-700">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <input
                                placeholder="Name (e.g., Box)"
                                value={pack.name}
                                onChange={(e) => {
                                  const updated = [...watch('packSizes')];
                                  updated[idx] = { ...updated[idx], name: e.target.value };
                                  setValue('packSizes', updated as any);
                                }}
                                className="px-2 py-1.5 bg-primary-dark border border-gray-600 rounded text-white text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Qty per pack"
                                value={pack.quantityPerPack}
                                onChange={(e) => {
                                  const updated = [...watch('packSizes')];
                                  updated[idx] = { ...updated[idx], quantityPerPack: Number(e.target.value) };
                                  setValue('packSizes', updated as any);
                                }}
                                className="px-2 py-1.5 bg-primary-dark border border-gray-600 rounded text-white text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Price"
                                value={pack.sellingPrice}
                                onChange={(e) => {
                                  const updated = [...watch('packSizes')];
                                  updated[idx] = { ...updated[idx], sellingPrice: Number(e.target.value) };
                                  setValue('packSizes', updated as any);
                                }}
                                className="col-span-2 px-2 py-1.5 bg-primary-dark border border-gray-600 rounded text-white text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = watch('packSizes').filter((_: any, i: number) => i !== idx);
                                setValue('packSizes', updated as any);
                              }}
                              className="p-2 text-red-400 hover:text-red-300"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const current = watch('packSizes') || [];
                            setValue('packSizes', [...current, { name: '', unit: '', quantityPerPack: 1, sellingPrice: 0 }] as any);
                          }}
                          className="w-full py-2 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
                        >
                          + Add Pack Size
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
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
