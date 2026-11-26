import type { ReactNode } from 'react';
import type { Severity, AlertStatus } from '../../sim/alerts';

export const cx = (...c: (string | number | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Card({ title, subtitle, action, children, className, bodyClass }: {
  title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={cx('card flex flex-col min-w-0', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-3.5">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-fg truncate">{title}</h3>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cx('p-4 flex-1 min-h-0', title && 'pt-3', bodyClass)}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, unit, hint, tone = 'fg', icon }: {
  label: string; value: ReactNode; unit?: string; hint?: ReactNode;
  tone?: 'fg' | 'ok' | 'warn' | 'crit' | 'primary'; icon?: ReactNode;
}) {
  const toneCls = { fg: 'text-fg', ok: 'text-ok', warn: 'text-warn', crit: 'text-crit', primary: 'text-primary' }[tone];
  return (
    <div className="card px-3.5 py-3 min-w-0">
      <div className="flex items-center gap-1.5 text-muted">
        {icon && <span className="opacity-80">{icon}</span>}
        <span className="text-[11px] font-medium uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cx('font-display text-xl sm:text-2xl font-semibold num leading-none', toneCls)}>{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-muted truncate">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const SEV_CLS: Record<Severity, string> = {
  low: 'bg-info/15 text-info border-info/30',
  medium: 'bg-warn/15 text-warn border-warn/30',
  high: 'bg-crit/15 text-crit border-crit/30',
  critical: 'bg-crit text-white border-crit',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={cx('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', SEV_CLS[severity])}>{severity}</span>;
}

export function StatusBadge({ status }: { status: AlertStatus }) {
  const cls = status === 'active' ? 'text-crit' : status === 'acknowledged' ? 'text-warn' : 'text-ok';
  return (
    <span className={cx('inline-flex items-center gap-1 text-[11px] font-medium capitalize', cls)}>
      <span className={cx('h-1.5 w-1.5 rounded-full bg-current', status === 'active' && 'pulse-dot')} />
      {status}
    </span>
  );
}

export function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'warn' | 'crit' | 'primary' }) {
  const cls = {
    muted: 'bg-surface2 text-muted border-line',
    ok: 'bg-ok/10 text-ok border-ok/30',
    warn: 'bg-warn/10 text-warn border-warn/30',
    crit: 'bg-crit/10 text-crit border-crit/30',
    primary: 'bg-primary/10 text-primary border-primary/30',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', cls)}>{children}</span>;
}

export function Bar({ value, color, className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface2', className)}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? 'rgb(var(--primary))' }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-[96px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted p-4 text-center">{children}</div>;
}

export const fmt = (v: number, d = 0) => v.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
