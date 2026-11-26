// Tree-shaken ECharts: only the chart types and components DARPAN uses.
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, GaugeChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, BarChart, PieChart, GaugeChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkAreaComponent, CanvasRenderer]);

export default echarts;
