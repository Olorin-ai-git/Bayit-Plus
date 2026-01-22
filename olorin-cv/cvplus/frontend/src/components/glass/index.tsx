// Temporary Glass UI components while @olorin/glass-ui/web is being built
// These will be replaced with actual @olorin/glass-ui components

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  as?: any;
}

export function GlassButton({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  size = 'md',
  as: Component = 'button',
}: GlassButtonProps) {
  const baseStyles = 'rounded-lg font-semibold transition-all duration-200 backdrop-blur-xl';

  // iOS HIG compliant touch targets (44x44pt minimum)
  const sizeStyles = {
    sm: 'px-4 py-3 text-sm min-h-[44px]',      // 44px minimum
    md: 'px-6 py-3.5 min-h-[44px]',            // 44px minimum
    lg: 'px-8 py-4 text-lg min-h-[56px]',      // Larger for prominence
  };

  const variantStyles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    outline: 'bg-transparent hover:bg-white/5 text-white border border-white/30',
  };

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <Component
      onClick={disabled ? undefined : onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabledStyles} ${className}`}
      disabled={disabled}
    >
      {children}
    </Component>
  );
}

interface GlassTabsProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function GlassTabs({ tabs, activeTab, onChange, className = '' }: GlassTabsProps) {
  return (
    <div className={`flex space-x-2 bg-white/5 backdrop-blur-xl rounded-lg p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
