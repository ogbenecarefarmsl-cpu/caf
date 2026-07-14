import { createContext } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export type ConfirmRequest = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmRequest | null>(null);
