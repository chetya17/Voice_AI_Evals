import React from 'react';

interface SimpleChartProps {
  type: 'donut' | 'pie';
  size?: number;
  className?: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ type, size = 60, className = '' }) => {
  const radius = size / 2 - 4;
  const centerX = size / 2;
  const centerY = size / 2;
  
  if (type === 'donut') {
    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="url(#donutGradient)"
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * radius * 0.75} ${2 * Math.PI * radius}`}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Gradient definition */}
        <svg width="0" height="0">
          <defs>
            <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }
  
  if (type === 'pie') {
    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Pie chart segments */}
          <path
            d={`M ${centerX} ${centerY} L ${centerX + radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius * Math.cos(Math.PI * 0.6)} ${centerY + radius * Math.sin(Math.PI * 0.6)} Z`}
            fill="#8b5cf6"
          />
          <path
            d={`M ${centerX} ${centerY} L ${centerX + radius * Math.cos(Math.PI * 0.6)} ${centerY + radius * Math.sin(Math.PI * 0.6)} A ${radius} ${radius} 0 0 1 ${centerX + radius * Math.cos(Math.PI * 1.2)} ${centerY + radius * Math.sin(Math.PI * 1.2)} Z`}
            fill="#a855f7"
          />
          <path
            d={`M ${centerX} ${centerY} L ${centerX + radius * Math.cos(Math.PI * 1.2)} ${centerY + radius * Math.sin(Math.PI * 1.2)} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY} Z`}
            fill="#c084fc"
          />
        </svg>
      </div>
    );
  }
  
  return null;
};

export default SimpleChart;
