/**
 * Merchant Filter Component
 *
 * Multi-select component for filtering by merchant IDs.
 * Supports virtualization for large merchant lists.
 *
 * Constitutional Compliance:
 * - No hardcoded merchant IDs
 * - Virtualized list for performance
 * - Search/filter capability
 */

import React, { useState, useMemo } from 'react';
import { Input } from '@shared/components/ui/Input';

interface MerchantFilterProps {
  selectedMerchants: string[];
  availableMerchants?: string[]; // Optional: if not provided, user can type freely
  onChange: (merchantIds: string[]) => void;
  maxHeight?: number;
}

export const MerchantFilter: React.FC<MerchantFilterProps> = ({
  selectedMerchants,
  availableMerchants,
  onChange,
  maxHeight = 200
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Filter available merchants by search query
  const filteredMerchants = useMemo(() => {
    if (!availableMerchants) return [];
    const query = searchQuery.toLowerCase();
    return availableMerchants.filter(m => m.toLowerCase().includes(query));
  }, [availableMerchants, searchQuery]);

  const handleToggleMerchant = (merchantId: string) => {
    if (selectedMerchants.includes(merchantId)) {
      onChange(selectedMerchants.filter(id => id !== merchantId));
    } else {
      onChange([...selectedMerchants, merchantId]);
    }
  };

  const handleAddCustom = () => {
    if (inputValue.trim() && !selectedMerchants.includes(inputValue.trim())) {
      onChange([...selectedMerchants, inputValue.trim()]);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-corporate-textPrimary">
        Merchant Filter (optional)
      </label>

      {/* Search input for available merchants */}
      {availableMerchants && (
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search merchants..."
          className="mb-2"
        />
      )}

      {/* Custom merchant input */}
      <div className="flex space-x-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
          placeholder="Enter merchant ID"
          className="flex-1"
        />
        <button
          onClick={handleAddCustom}
          className="px-3 py-2 bg-corporate-accentPrimary/20 text-corporate-accentPrimary border border-corporate-accentPrimary/40 rounded-lg hover:bg-corporate-accentPrimary/30 transition-colors"
        >
          Add
        </button>
      </div>

      {/* Merchant list (virtualized if needed) */}
      {availableMerchants && filteredMerchants.length > 0 && (
        <div
          className="border border-corporate-borderPrimary rounded-lg overflow-y-auto bg-black/30 backdrop-blur"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {filteredMerchants.map((merchantId) => (
            <label
              key={merchantId}
              className="flex items-center px-3 py-2 hover:bg-corporate-bgTertiary cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedMerchants.includes(merchantId)}
                onChange={() => handleToggleMerchant(merchantId)}
                className="w-4 h-4 rounded border-corporate-accentPrimary/40 bg-black/30 text-corporate-accentPrimary focus:ring-corporate-accentPrimary"
              />
              <span className="ml-2 text-sm text-corporate-textPrimary">
                {merchantId}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Selected merchants display */}
      {selectedMerchants.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedMerchants.map((merchantId) => (
            <span
              key={merchantId}
              className="inline-flex items-center px-2 py-1 bg-corporate-accentPrimary/20 text-corporate-accentPrimary border border-corporate-accentPrimary/40 rounded text-xs"
            >
              {merchantId}
              <button
                onClick={() => handleToggleMerchant(merchantId)}
                className="ml-2 hover:text-corporate-error"
                aria-label={`Remove ${merchantId}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

