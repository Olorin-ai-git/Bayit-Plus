import { GlassButton } from './GlassButton';

interface GlassTabsProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function GlassTabs({ tabs, activeTab, onChange, className = '' }: GlassTabsProps) {
  return (
    <div className={`flex gap-2 bg-white/5 backdrop-blur-xl rounded-lg p-1 ${className}`}>
      {tabs.map((tab) => (
        <GlassButton
          key={tab.id}
          onClick={() => onChange(tab.id)}
          variant={activeTab === tab.id ? 'primary' : 'secondary'}
          className="flex-1"
        >
          {tab.label}
        </GlassButton>
      ))}
    </div>
  );
}
