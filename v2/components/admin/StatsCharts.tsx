"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GROUP_LABELS: Record<string, string> = {
  paper: "紙類",
  plastic: "塑膠",
  glass: "玻璃",
  metal: "金屬",
  food: "廚餘",
  general: "一般垃圾",
  hazardous: "有害",
  large: "大型",
  electronics: "電子",
  clothing: "衣物",
};

interface GroupBarProps {
  data: { group: string; count: number }[];
}

interface DailyLineProps {
  data: { day: string; count: number }[];
}

const AXIS_TICK = { fill: "#737373", fontSize: 12 };

const tooltipStyle = {
  backgroundColor: "#0a0a0a",
  border: "1px solid #262626",
  borderRadius: 12,
  color: "#e5e5e5",
};

export function GroupBarChart({ data }: GroupBarProps) {
  const display = data.map((d) => ({
    label: GROUP_LABELS[d.group] ?? d.group,
    count: d.count,
  }));
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={display} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            stroke="#404040"
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={AXIS_TICK}
            stroke="#404040"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="count" fill="#ffffff" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyLineChart({ data }: DailyLineProps) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={AXIS_TICK}
            stroke="#404040"
            minTickGap={20}
          />
          <YAxis
            tick={AXIS_TICK}
            stroke="#404040"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ stroke: "#525252", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#00a96f"
            strokeWidth={2}
            dot={{ r: 2, fill: "#00a96f" }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
