import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in' | 'not_in';
  value: any;
  label?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number' | 'boolean';
  options?: FilterOption[];
  placeholder?: string;
  min?: number;
  max?: number;
}

interface SearchAndFilterProps {
  placeholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: SearchFilter[];
  onFiltersChange: (filters: SearchFilter[]) => void;
  filterGroups: FilterGroup[];
  showFilterCount?: boolean;
  className?: string;
}

interface FilterDropdownProps {
  filterGroup: FilterGroup;
  currentFilter?: SearchFilter;
  onFilterChange: (filter: SearchFilter | null) => void;
  onClose: () => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  filterGroup,
  currentFilter,
  onFilterChange,
  onClose
}) => {
  const [tempValue, setTempValue] = useState<any>(currentFilter?.value || '');
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    currentFilter?.value || []
  );

  const handleApply = () => {
    if (filterGroup.type === 'multiselect') {
      if (selectedOptions.length > 0) {
        onFilterChange({
          field: filterGroup.id,
          operator: 'in',
          value: selectedOptions,
          label: filterGroup.label,
        });
      } else {
        onFilterChange(null);
      }
    } else if (tempValue) {
      onFilterChange({
        field: filterGroup.id,
        operator: getDefaultOperator(filterGroup.type),
        value: tempValue,
        label: filterGroup.label,
      });
    } else {
      onFilterChange(null);
    }
    onClose();
  };

  const getDefaultOperator = (type: string) => {
    switch (type) {
      case 'text':
        return 'contains';
      case 'number':
      case 'date':
        return 'equals';
      case 'select':
        return 'equals';
      default:
        return 'equals';
    }
  };

  const handleOptionToggle = (value: string) => {
    setSelectedOptions(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  return (
    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 min-w-64">
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">{filterGroup.label}</h4>

        {filterGroup.type === 'text' && (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            placeholder={filterGroup.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}

        {filterGroup.type === 'number' && (
          <input
            type="number"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            placeholder={filterGroup.placeholder}
            min={filterGroup.min}
            max={filterGroup.max}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}

        {filterGroup.type === 'date' && (
          <input
            type="date"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        )}

        {filterGroup.type === 'select' && filterGroup.options && (
          <select
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select option</option>
            {filterGroup.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.count !== undefined && ` (${option.count})`}
              </option>
            ))}
          </select>
        )}

        {filterGroup.type === 'multiselect' && filterGroup.options && (
          <div className="max-h-48 overflow-y-auto">
            {filterGroup.options.map((option) => (
              <div key={option.value} className="flex items-center py-2">
                <input
                  type="checkbox"
                  id={`filter-${filterGroup.id}-${option.value}`}
                  checked={selectedOptions.includes(option.value)}
                  onChange={() => handleOptionToggle(option.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor={`filter-${filterGroup.id}-${option.value}`}
                  className="ml-2 text-sm text-gray-700 cursor-pointer"
                >
                  {option.label}
                  {option.count !== undefined && (
                    <span className="text-gray-500 ml-1">({option.count})</span>
                  )}
                </label>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  placeholder = 'Search...',
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
  filterGroups,
  showFilterCount = true,
  className = '',
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [activeFilterGroup, setActiveFilterGroup] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
        setActiveFilterGroup(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFiltersCount = filters.length;

  const getFilterDisplayValue = (filter: SearchFilter): string => {
    if (Array.isArray(filter.value)) {
      return filter.value.length > 1
        ? `${filter.value.length} items`
        : filter.value[0] || '';
    }
    return filter.value?.toString() || '';
  };

  const removeFilter = (filterField: string) => {
    onFiltersChange(filters.filter(f => f.field !== filterField));
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  const handleFilterGroupClick = (groupId: string) => {
    if (activeFilterGroup === groupId) {
      setActiveFilterGroup(null);
      setIsFilterDropdownOpen(false);
    } else {
      setActiveFilterGroup(groupId);
      setIsFilterDropdownOpen(true);
    }
  };

  const handleFilterChange = (filter: SearchFilter | null) => {
    if (filter) {
      const existingFilterIndex = filters.findIndex(f => f.field === filter.field);
      if (existingFilterIndex >= 0) {
        const newFilters = [...filters];
        newFilters[existingFilterIndex] = filter;
        onFiltersChange(newFilters);
      } else {
        onFiltersChange([...filters, filter]);
      }
    } else {
      removeFilter(activeFilterGroup!);
    }
    setIsFilterDropdownOpen(false);
    setActiveFilterGroup(null);
  };

  const quickFilters = useMemo(() => {
    // Predefined quick filters for common use cases
    return [
      { label: 'Today', field: 'createdAt', operator: 'equals' as const, value: new Date().toISOString().split('T')[0] },
      { label: 'This Week', field: 'createdAt', operator: 'greaterThan' as const, value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { label: 'Active', field: 'status', operator: 'equals' as const, value: 'active' },
      { label: 'Completed', field: 'status', operator: 'equals' as const, value: 'completed' },
    ];
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            className={`
              inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}
            `}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
            {showFilterCount && activeFiltersCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDownIcon className="h-4 w-4 ml-1" />
          </button>

          {/* Filter Dropdown */}
          {isFilterDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 min-w-48">
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Filter by:
                </div>
                {filterGroups.map((group) => (
                  <div key={group.id} className="relative">
                    <button
                      onClick={() => handleFilterGroupClick(group.id)}
                      className={`
                        w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 flex items-center justify-between
                        ${filters.some(f => f.field === group.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                      `}
                    >
                      {group.label}
                      {filters.some(f => f.field === group.id) && (
                        <CheckIcon className="h-4 w-4" />
                      )}
                    </button>

                    {activeFilterGroup === group.id && (
                      <FilterDropdown
                        filterGroup={group}
                        {...(filters.find(f => f.field === group.id) !== undefined && {
                          currentFilter: filters.find(f => f.field === group.id)
                        })}
                        onFilterChange={handleFilterChange}
                        onClose={() => {
                          setIsFilterDropdownOpen(false);
                          setActiveFilterGroup(null);
                        }}
                      />
                    )}
                  </div>
                ))}

                {activeFiltersCount > 0 && (
                  <div className="border-t border-gray-200 mt-2 pt-2">
                    <button
                      onClick={clearAllFilters}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((quickFilter, index) => {
            const isActive = filters.some(f =>
              f.field === quickFilter.field &&
              f.operator === quickFilter.operator &&
              f.value === quickFilter.value
            );

            return (
              <button
                key={index}
                onClick={() => {
                  if (isActive) {
                    removeFilter(quickFilter.field);
                  } else {
                    const newFilter: SearchFilter = {
                      field: quickFilter.field,
                      operator: quickFilter.operator,
                      value: quickFilter.value,
                      label: quickFilter.label,
                    };
                    handleFilterChange(newFilter);
                  }
                }}
                className={`
                  inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-150
                  ${isActive
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }
                `}
              >
                {quickFilter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Active filters:</span>
          {filters.map((filter) => (
            <div
              key={filter.field}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
            >
              <span className="font-medium">{filter.label || filter.field}:</span>
              <span className="ml-1">{getFilterDisplayValue(filter)}</span>
              <button
                onClick={() => removeFilter(filter.field)}
                className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 focus:outline-none"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
          {activeFiltersCount > 1 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};