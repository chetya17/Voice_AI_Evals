import React from 'react';
import { 
  BarChart3, 
  Settings, 
  MessageSquare, 
  Eye, 
  Gavel, 
  Download
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navigationItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'configure', icon: Settings, label: 'Configure' },
    { id: 'simulation', icon: MessageSquare, label: 'Simulate' },
    { id: 'viewer', icon: Eye, label: 'Review' },
    { id: 'scoring', icon: Gavel, label: 'Score' },
    { id: 'results', icon: Download, label: 'Results' },
  ];

  return (
    <div className="sidebar w-20 h-screen fixed left-0 top-0 flex flex-col items-center py-6 z-50">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-2xl font-bold text-primary">S</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col items-center space-y-6">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isActive 
                  ? 'bg-white text-primary shadow-lg scale-110' 
                  : 'text-white hover:bg-white/20 hover:scale-105'
              }`}
              title={item.label}
            >
              <Icon className="w-6 h-6" />
              
              {/* Tooltip */}
              <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
