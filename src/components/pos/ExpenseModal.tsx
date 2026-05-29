import { useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { useCurrency } from '../../hooks/useCurrency';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { amount: number; category: string; description: string }) => void;
  isLoading?: boolean;
}

const expenseCategories = [
  { value: 'supplies', label: 'Supplies' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'other', label: 'Other' },
];

export const ExpenseModal = ({ isOpen, onClose, onSubmit, isLoading }: ExpenseModalProps) => {
  const { symbol } = useCurrency();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('supplies');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !description.trim()) return;
    onSubmit({ amount: parsedAmount, category, description: description.trim() });
    setAmount('');
    setCategory('supplies');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className="relative bg-primary-dark rounded-2xl p-6 w-full max-w-md mx-4 border border-gray-700">
        <h2 id="expense-modal-title" className="text-xl font-bold text-white mb-4">Log Expense</h2>
        <p className="text-gray-400 mb-4">Record a cash expense for this active shift.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-green font-bold">{symbol}</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${symbol} 0.00`}
                className="w-full pl-10 pr-4 py-3 bg-primary-darker border border-gray-600 rounded-xl text-white focus:outline-none focus:border-accent-green"
              />
            </div>
          </div>

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={expenseCategories}
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this expense for?"
            rows={3}
          />
        </div>

        <div className="flex space-x-3 mt-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !amount.trim() || !description.trim()}
            className="flex-1"
          >
            {isLoading ? 'Logging...' : 'Log Expense'}
          </Button>
        </div>
      </div>
    </div>
  );
};
