import React from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart as RechartsLineChart,
  Line,
} from "recharts";

// Tipo común para datos de gráficos
interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: unknown; // Añadimos signature de índice para compatibilidad con ChartDataInput
}

// Componente para mostrar mensaje de "No hay datos"
const NoDataMessage = () => (
  <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-md border border-dashed border-gray-300">
    <div className="text-center p-4">
      <p className="text-gray-500 font-medium">No hay datos disponibles</p>
      <p className="text-gray-400 text-sm mt-1">No hay información para mostrar en este período</p>
    </div>
  </div>
);

// Gráfico circular (Donut)
interface DonutChartProps {
  data: ChartDataItem[];
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  legendPosition?: "right" | "bottom";
}

export function DonutChart({
  data,
  colors = [
    "#2563eb",
    "#3b82f6",
    "#60a5fa",
    "#93c5fd",
    "#bfdbfe",
    "#dbeafe",
  ],
  innerRadius = 60,
  outerRadius = 80,
  legendPosition = "bottom",
}: DonutChartProps) {
  if (!data || data.length === 0) {
    return <NoDataMessage />;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={1}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              strokeWidth={1}
              stroke="var(--background)"
            />
          ))}
        </Pie>
        <Legend
          layout={legendPosition === "right" ? "vertical" : "horizontal"}
          verticalAlign={legendPosition === "bottom" ? "bottom" : "middle"}
          align={legendPosition === "right" ? "right" : "center"}
          wrapperStyle={
            legendPosition === "right"
              ? { paddingLeft: "20px" }
              : { paddingTop: "20px" }
          }
        />
        <RechartsTooltip
          formatter={(value, name) => [
            `${value}`,
            name,
          ]}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

// Gráfico de barras
interface BarChartProps {
  data: ChartDataItem[];
  colors?: string[];
  showLegend?: boolean;
  height?: number;
  layout?: "vertical" | "horizontal";
}

export function BarChart({
  data,
  colors = ["#2563eb"],
  showLegend = false,
  height = 300,
  layout = "vertical",
}: BarChartProps) {
  if (!data || data.length === 0) {
    return <NoDataMessage />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        {layout === "vertical" ? (
          <>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" />
            <YAxis />
          </>
        )}
        <RechartsTooltip />
        {showLegend && <Legend />}
        <Bar dataKey="value" fill={colors[0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              strokeWidth={1}
              stroke="var(--background)"
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

// Gráfico de líneas
interface LineChartProps {
  data: ChartDataItem[];
  colors?: string[];
  height?: number;
  showLegend?: boolean;
}

export function LineChart({
  data,
  colors = ["#2563eb"],
  height = 300,
  showLegend = false,
}: LineChartProps) {
  if (!data || data.length === 0) {
    return <NoDataMessage />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="name" />
        <YAxis />
        <RechartsTooltip />
        {showLegend && <Legend />}
        <Line
          type="monotone"
          dataKey="value"
          stroke={colors[0]}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}