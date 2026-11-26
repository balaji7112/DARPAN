import { memo } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import { useUI } from '../../store/uiStore';

export interface ChartTheme { text: string; muted: string; grid: string; tooltipBg: string; tooltipBorder: string; }

export function useChartTheme(): ChartTheme {
  const theme = useUI(s => s.theme);
  return theme === 'dark'
    ? { text: '#E2E8F0', muted: '#8A99B2', grid: 'rgba(138,153,178,0.14)', tooltipBg: 'rgba(12,19,33,0.96)', tooltipBorder: '#202D44' }
    : { text: '#0F172A', muted: '#5C6C84', grid: 'rgba(92,108,132,0.15)', tooltipBg: 'rgba(255,255,255,0.98)', tooltipBorder: '#DEE5EF' };
}

/** Common axis/tooltip styling so every chart matches the active theme. */
export function baseOption(t: ChartTheme) {
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: t.muted },
    tooltip: {
      trigger: 'axis' as const, backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder,
      textStyle: { color: t.text, fontSize: 12 }, confine: true,
    },
    legend: { textStyle: { color: t.muted, fontSize: 11 }, icon: 'roundRect', itemWidth: 10, itemHeight: 6, top: 0 },
    grid: { left: 8, right: 12, top: 36, bottom: 4, containLabel: true },
  };
}

export const axisStyle = (t: ChartTheme) => ({
  axisLine: { lineStyle: { color: t.grid } },
  axisTick: { show: false },
  axisLabel: { color: t.muted, fontSize: 10 },
  splitLine: { lineStyle: { color: t.grid } },
});

function EChart({ option, height = 240 }: { option: object; height?: number | string }) {
  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      style={{ height, width: '100%' }}
      lazyUpdate
      opts={{ renderer: 'canvas' }}
    />
  );
}

export default memo(EChart);
