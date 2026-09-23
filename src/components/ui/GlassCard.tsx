import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: 'primary' | 'solar' | 'secondary' | 'critical' | 'none';
  onClick?: () => void;
  hover?: boolean;
  padding?: number | string;
}

const accentBorder: Record<string, string> = {
  primary:   '1px solid rgba(99,102,241,0.25)',
  solar:     '1px solid rgba(245,158,11,0.25)',
  secondary: '1px solid rgba(59,130,246,0.25)',
  critical:  '1px solid rgba(239,68,68,0.25)',
  none:      '1px solid #E5E7EB',
};

export default function GlassCard({
  children, className = '', style = {},
  glow = 'none', onClick, hover = false, padding = 16,
}: GlassCardProps) {
  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover
        ? { y: -2, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)', transition: { duration: 0.15 } }
        : undefined}
      style={{
        background: '#FFFFFF',
        border: accentBorder[glow],
        borderRadius: 14,
        padding,
        boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
