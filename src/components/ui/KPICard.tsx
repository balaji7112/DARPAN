import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  color?: string;
  icon?: React.ReactNode;
  status?: 'normal' | 'warning' | 'critical' | 'good';
  onClick?: () => void;
  small?: boolean;
}

function AnimatedNumber({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const [displayed, setDisplayed] = useState(value);
  useEffect(() => {
    const steps = 10;
    const diff = value - displayed;
    let step = 0;
    const id = setInterval(() => {
      step++;
      setDisplayed(prev => prev + diff / steps);
      if (step >= steps) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{displayed.toFixed(decimals)}</>;
}

const statusColors: Record<string, string> = {
  normal:   '#111827',
  warning:  '#F59E0B',
  critical: '#EF4444',
  good:     '#10B981',
};

export default function KPICard({
  label, value, unit = '', trend, trendLabel, color, icon,
  status = 'normal', onClick, small = false,
}: KPICardProps) {
  const valueColor = color || statusColors[status];

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      whileHover={onClick ? { y: -2, transition: { duration: 0.15 } } : undefined}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: small ? '10px 14px' : '14px 18px',
        cursor: onClick ? 'pointer' : 'default',
        minWidth: small ? 118 : 148,
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.18s, border-color 0.18s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.08)';
        (e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
      }}
    >
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        {icon && <div style={{ color: valueColor, opacity: 0.75, flexShrink: 0 }}>{icon}</div>}
        <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#6B7280', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: small ? '1.3rem' : '1.65rem', fontWeight: 700, fontFamily: 'Space Grotesk', color: valueColor, lineHeight: 1 }}>
          {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
        </span>
        {unit && <span style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 500 }}>{unit}</span>}
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          {trend > 0 ? <TrendingUp size={11} color="#10B981" />
            : trend < 0 ? <TrendingDown size={11} color="#EF4444" />
            : <Minus size={11} color="#9CA3AF" />}
          <span style={{ fontSize: '0.68rem', fontWeight: 500, color: trend > 0 ? '#10B981' : trend < 0 ? '#EF4444' : '#9CA3AF' }}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
          {trendLabel && <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
