import { useMemo, useState } from 'react';
import { Printer, Download, RefreshCw, FileText } from 'lucide-react';
import { useGrid } from '../../store/gridStore';
import { useAuth } from '../../auth/AuthContext';
import { useForecast } from '../../lib/useForecast';
import { buildReport } from '../../lib/report';
import { Card, PageHeader, Pill } from '../../components/ui/kit';

export default function ReportsPage() {
  const { session } = useAuth();
  const { solar, demand, source } = useForecast();
  const [version, setVersion] = useState(0);

  // Snapshot the store when the report is (re)generated, not on every tick.
  const html = useMemo(() => {
    const { snap, alerts } = useGrid.getState();
    return buildReport({
      snap, alerts, solar, demand,
      forecastSource: source === 'ml' ? 'ML service (RandomForest / HistGradientBoosting)' : 'Client-side model',
      author: session ? `${session.name} (${session.role})` : 'DARPAN',
    });
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

  const download = () => {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url; a.download = `darpan-grid-report-${stamp}.html`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) { download(); return; } // popup blocked: fall back to download
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="fade-up">
      <PageHeader
        title="Reports"
        subtitle="Automated grid status report: generation, storage, transmission, forecast and alerts"
        actions={<>
          <button onClick={() => setVersion(v => v + 1)} className="btn-ghost"><RefreshCw size={14} /> Regenerate</button>
          <button onClick={download} className="btn-ghost"><Download size={14} /> Download HTML</button>
          <button onClick={print} className="btn-primary"><Printer size={14} /> Print / Save PDF</button>
        </>}
      />
      <Card title={<span className="flex items-center gap-2"><FileText size={15} /> Report preview</span>} action={<Pill tone="warn">Snapshot · regenerate for latest data</Pill>} bodyClass="p-0">
        <iframe title="Report preview" srcDoc={html} className="w-full h-[75vh] rounded-b-xl bg-white" sandbox="allow-same-origin" />
      </Card>
    </div>
  );
}
