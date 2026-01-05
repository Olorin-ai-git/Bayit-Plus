import { clsx } from 'clsx';

const tabVariants = {
  default: {
    container: 'glass-tabs',
    tab: 'glass-tab',
    active: 'glass-tab-active',
  },
  pills: {
    container: 'glass-tabs-pills',
    tab: 'glass-tab-pill',
    active: 'glass-tab-pill-active',
  },
  underline: {
    container: 'flex gap-4 border-b border-white/10 pb-0',
    tab: 'pb-3 text-sm font-medium text-dark-400 hover:text-dark-200 transition-colors relative',
    active: 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-500',
  },
};

export default function GlassTabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  className,
}) {
  const styles = tabVariants[variant];

  return (
    <div className={clsx(styles.container, className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            styles.tab,
            activeTab === tab.id && styles.active
          )}
          disabled={tab.disabled}
        >
          {tab.icon && <span className="ml-2">{tab.icon}</span>}
          {tab.label}
          {tab.badge && (
            <span className="mr-2 px-1.5 py-0.5 text-xs rounded-full bg-primary-500/20 text-primary-300">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
