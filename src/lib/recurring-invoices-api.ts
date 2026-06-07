import apiClient from './api-client';

export type RecurringCadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export interface RecurringItem {
  productId?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface RecurringInvoice {
  _id: string;
  createdBy: string;
  branchId: string;
  customerId: string;
  customerName?: string;
  description: string;
  items: RecurringItem[];
  total: number;
  discount: number;
  cadence: RecurringCadence;
  nextRunAt: string;
  lastRunAt?: string;
  runCount: number;
  active: boolean;
  maxRuns: number;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringInvoiceInput {
  branchId: string;
  customerId: string;
  customerName?: string;
  description: string;
  items: RecurringItem[];
  total: number;
  discount?: number;
  cadence: RecurringCadence;
  nextRunAt: string;
  maxRuns?: number;
  endDate?: string;
}

export const recurringInvoicesApi = {
  async list(opts: { branchId?: string; activeOnly?: boolean } = {}): Promise<RecurringInvoice[]> {
    const params: Record<string, string> = {};
    if (opts.branchId) params.branchId = opts.branchId;
    if (opts.activeOnly) params.activeOnly = 'true';
    const res = await apiClient.get<RecurringInvoice[]>('/recurring-invoices', { params });
    return res.data;
  },
  async get(id: string): Promise<RecurringInvoice> {
    const res = await apiClient.get<RecurringInvoice>(`/recurring-invoices/${id}`);
    return res.data;
  },
  async create(input: CreateRecurringInvoiceInput): Promise<RecurringInvoice> {
    const res = await apiClient.post<RecurringInvoice>('/recurring-invoices', input);
    return res.data;
  },
  async update(id: string, patch: Partial<CreateRecurringInvoiceInput> & { active?: boolean }): Promise<RecurringInvoice> {
    const res = await apiClient.patch<RecurringInvoice>(`/recurring-invoices/${id}`, patch);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await apiClient.delete(`/recurring-invoices/${id}`);
  },
  async runNow(id: string): Promise<{ ok: boolean; nextRunAt: string; runCount: number; shouldDeactivate: boolean }> {
    const res = await apiClient.post<{ ok: boolean; nextRunAt: string; runCount: number; shouldDeactivate: boolean }>(`/recurring-invoices/${id}/run-now`);
    return res.data;
  },
  async getTemplate(id: string): Promise<{
    branchId: string;
    customerId: string;
    customerName?: string;
    items: RecurringItem[];
    total: number;
    discount: number;
    notes: string;
  }> {
    const res = await apiClient.get(`/recurring-invoices/${id}/template`);
    return res.data;
  },
};
