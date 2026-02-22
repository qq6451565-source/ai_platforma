import React from 'react';
import './styles.css';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface ChartProps {
  data: ChartData[];
  type?: 'bar' | 'line' | 'donut';
  title?: string;
  height?: number;
}

export const Chart: React.FC<ChartProps> = ({ 
  data, 
  type = 'bar', 
  title,
  height = 200 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  
  if (type === 'bar') {
    return (
      <div className="chart-container">
        {title && <h4 className="chart-title">{title}</h4>}
        <div className="chart-bar" style={{ height }}>
          {data.map((item, index) => (
            <div key={index} className="chart-bar-item">
              <div 
                className="chart-bar-fill animate-slide-up"
                style={{ 
                  height: `${(item.value / maxValue) * 100}%`,
                  background: item.color || 'var(--accent)',
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <span className="chart-bar-value">{item.value}</span>
              </div>
              <span className="chart-bar-label">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'donut') {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    return (
      <div className="chart-container">
        {title && <h4 className="chart-title">{title}</h4>}
        <div className="chart-donut" style={{ width: height, height }}>
          <svg viewBox="0 0 100 100" className="chart-donut-svg">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              currentAngle += angle;

              const startX = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
              const startY = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
              const endX = 50 + 40 * Math.cos((currentAngle - 90) * Math.PI / 180);
              const endY = 50 + 40 * Math.sin((currentAngle - 90) * Math.PI / 180);
              const largeArc = angle > 180 ? 1 : 0;

              return (
                <path
                  key={index}
                  d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`}
                  fill={item.color || `hsl(${index * 60}, 70%, 50%)`}
                  className="chart-donut-segment"
                />
              );
            })}
            <circle cx="50" cy="50" r="25" fill="var(--color-background)" />
          </svg>
          <div className="chart-donut-center">
            <div className="chart-donut-total">{total}</div>
            <div className="chart-donut-label">Total</div>
          </div>
        </div>
        <div className="chart-legend">
          {data.map((item, index) => (
            <div key={index} className="chart-legend-item">
              <div 
                className="chart-legend-color" 
                style={{ background: item.color || `hsl(${index * 60}, 70%, 50%)` }}
              />
              <span className="chart-legend-label">{item.label}</span>
              <span className="chart-legend-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
