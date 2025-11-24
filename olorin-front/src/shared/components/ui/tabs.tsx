import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
<<<<<<< HEAD
  defaultValue: string;
=======
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
>>>>>>> 001-modify-analyzer-method
  children: ReactNode;
  className?: string;
}

<<<<<<< HEAD
export const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className = "" }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
=======
export const Tabs: React.FC<TabsProps> = ({ defaultValue, value, onValueChange, children, className = "" }) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultValue || '');
  
  // Use controlled value if provided, otherwise use internal state
  const activeTab = value !== undefined ? value : internalActiveTab;
  
  const handleTabChange = (newValue: string) => {
    if (onValueChange) {
      // Controlled mode
      onValueChange(newValue);
    } else {
      // Uncontrolled mode
      setInternalActiveTab(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
>>>>>>> 001-modify-analyzer-method
      <div className={`tabs ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = "" }) => {
  return (
<<<<<<< HEAD
    <div className={`flex border-b border-gray-200 ${className}`}>
=======
    <div className={`flex border-b border-corporate-borderPrimary ${className}`}>
>>>>>>> 001-modify-analyzer-method
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className = "" }) => {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error('TabsTrigger must be used within a Tabs component');
  }

  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
<<<<<<< HEAD
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
=======
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
        isActive
          ? 'border-corporate-accentPrimary text-corporate-accentPrimary'
          : 'border-transparent text-corporate-textSecondary hover:text-corporate-accentPrimary hover:border-corporate-accentPrimary/50'
>>>>>>> 001-modify-analyzer-method
      } ${className}`}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className = "" }) => {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component');
  }

  const { activeTab } = context;

  if (activeTab !== value) {
    return null;
  }

  return (
    <div className={`tabs-content ${className}`}>
      {children}
    </div>
  );
};