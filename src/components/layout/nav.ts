import { LayoutDashboard, Sun, BatteryCharging, Cable, TrendingUp, ShieldAlert, FileText, Layers, type LucideIcon } from 'lucide-react';

export const NAV: { to: string; label: string; icon: LucideIcon; desc: string }[] = [
  { to: '/dashboard', label: 'Command Center', icon: LayoutDashboard, desc: 'Live grid overview and energy flow' },
  { to: '/generation', label: 'Generation', icon: Sun, desc: 'Output by energy source' },
  { to: '/storage', label: 'Hybrid Storage', icon: BatteryCharging, desc: 'State of charge per technology' },
  { to: '/grid', label: 'Grid & Transmission', icon: Cable, desc: 'Frequency, voltage, HVAC / HVDC' },
  { to: '/forecast', label: 'Forecasting', icon: TrendingUp, desc: 'Solar and demand forecasts' },
  { to: '/early-warning', label: 'Early Warning', icon: ShieldAlert, desc: 'Anomalies and alerts' },
  { to: '/reports', label: 'Reports', icon: FileText, desc: 'Generate grid status report' },
  { to: '/architecture', label: 'Architecture', icon: Layers, desc: 'System design and roadmap' },
];
