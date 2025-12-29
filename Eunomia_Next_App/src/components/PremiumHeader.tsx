import React from 'react';
import { Search, MoreHorizontal, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumHeaderProps {
  title: string;
  subtitle?: string;
}

const PremiumHeader: React.FC<PremiumHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-lg">{subtitle}</p>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 w-64"
          />
        </div>
        
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
        </Button>
        
        {/* User Menu */}
        <Button variant="ghost" size="sm" className="p-2">
          <User className="w-5 h-5" />
        </Button>
        
        {/* More Options */}
        <Button variant="ghost" size="sm" className="p-2">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default PremiumHeader;
