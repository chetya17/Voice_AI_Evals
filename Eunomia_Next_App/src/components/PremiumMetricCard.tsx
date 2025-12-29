import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TimeFilter {
  label: string;
  value: string;
  active: boolean;
}

interface PremiumMetricCardProps {
  title: string;
  subtitle: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  timeFilters?: TimeFilter[];
  onTimeFilterChange?: (value: string) => void;
  chart?: React.ReactNode;
  className?: string;
}

const PremiumMetricCard: React.FC<PremiumMetricCardProps> = ({
  title,
  subtitle,
  value,
  change,
  changeType,
  timeFilters,
  onTimeFilterChange,
  chart,
  className = ''
}) => {
  return (
    <Card className={`metric-card ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Chart Section */}
          {chart && (
            <div className="flex-shrink-0 mr-4">
              {chart}
            </div>
          )}
          
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                {subtitle}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {value}
                </span>
                {change && (
                  <span className={`text-sm font-medium ${
                    changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change}
                  </span>
                )}
              </div>
            </div>
            
            {/* Time Filters */}
            {timeFilters && timeFilters.length > 0 && (
              <div className="flex gap-2">
                {timeFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => onTimeFilterChange?.(filter.value)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                      filter.active
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumMetricCard;
