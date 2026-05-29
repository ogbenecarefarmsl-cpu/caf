import { type ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  children: ReactNode;
}

export const Tabs = ({ tabs, activeTab, onChange, children }: TabsProps) => {
  return (
    <div>
      <div className="border-b border-white/10">
        <div role="tablist" className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.key}`}
                id={`tab-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange(tab.key)}
                onKeyDown={(e) => {
                  const currentIndex = tabs.findIndex((t) => t.key === activeTab);
                  let nextIndex = currentIndex;

                  if (e.key === 'ArrowRight') {
                    nextIndex = (currentIndex + 1) % tabs.length;
                  } else if (e.key === 'ArrowLeft') {
                    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                  } else if (e.key === 'Home') {
                    nextIndex = 0;
                  } else if (e.key === 'End') {
                    nextIndex = tabs.length - 1;
                  } else {
                    return;
                  }

                  e.preventDefault();
                  onChange(tabs[nextIndex].key);
                  document.getElementById(`tab-${tabs[nextIndex].key}`)?.focus();
                }}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-accent-green text-accent-green'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
};

interface TabPanelProps {
  value: string;
  activeTab: string;
  children: ReactNode;
}

export const TabPanel = ({ value, activeTab, children }: TabPanelProps) => {
  if (value !== activeTab) return null;
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
};
