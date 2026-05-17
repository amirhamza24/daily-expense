"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Award,
  CircleDollarSign,
  Briefcase,
  PieChart as PieIcon,
  BarChart3 as BarIcon,
  AreaChart as AreaIcon,
  Compass,
} from "lucide-react";
import GlassCard from "./GlassCard";

interface AnalyticsClientProps {
  categoryDistribution: Array<{ name: string; value: number }>;
  monthlyTrend: Array<{ name: string; spent: number }>;
  weeklyPattern: Array<{ name: string; spent: number }>;
  aggregates: {
    highest: { title: string; amount: number } | null;
    lowest: { title: string; amount: number } | null;
    average: number;
    topCategory: string;
  };
}

const COLORS = [
  "#a78bfa", // Purple
  "#f472b6", // Pink
  "#60a5fa", // Blue
  "#34d399", // Emerald
  "#fbbf24", // Amber
  "#f87171", // Rose
  "#38bdf8", // Sky
  "#94a3b8", // Slate
];

export default function AnalyticsClient({
  categoryDistribution,
  monthlyTrend,
  weeklyPattern,
  aggregates,
}: AnalyticsClientProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Prevent server hydration mismatches by mounting on client first
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-center">
        <div className="h-10 w-10 border-4 border-t-violet-500 border-white/10 rounded-full animate-spin"></div>
        <span className="ml-3 text-xs text-slate-400 font-semibold">
          Preparing Analytics Ledger...
        </span>
      </div>
    );
  }

  // Custom tooltips matching the premium dark glass theme
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-xl shadow-xl text-xs font-semibold text-slate-100">
          <p className="text-slate-400 mb-1">{payload[0].name}</p>
          <p className="text-sm font-bold text-violet-400">
            $
            {payload[0].value.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Title Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent">
          Budget Analytics & Trends
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detailed visualizations of monthly spent indexes, category weights,
          and transaction costs.
        </p>
      </div>

      {/* Aggregate Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Average Cost */}
        <GlassCard className="border-violet-500/10 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/20">
            <CircleDollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Average / Cost
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              $
              {aggregates.average.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </h3>
          </div>
        </GlassCard>

        {/* Card 2: Top Category */}
        <GlassCard className="border-pink-500/10 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400 border border-pink-500/20">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Top Category
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 capitalize">
              {aggregates.topCategory || "N/A"}
            </h3>
          </div>
        </GlassCard>

        {/* Card 3: Highest Single Spent */}
        <GlassCard className="border-rose-500/10 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
            <Award className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Highest Spent
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
              $
              {aggregates.highest
                ? aggregates.highest.amount.toLocaleString()
                : "0.00"}
            </h3>
            <p
              className="text-[9px] text-slate-500 truncate mt-0.5"
              title={aggregates.highest?.title}
            >
              {aggregates.highest ? aggregates.highest.title : "No record"}
            </p>
          </div>
        </GlassCard>

        {/* Card 4: Lowest Single Spent */}
        <GlassCard className="border-emerald-500/10 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Lowest Spent
            </p>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
              $
              {aggregates.lowest
                ? aggregates.lowest.amount.toLocaleString()
                : "0.00"}
            </h3>
            <p
              className="text-[9px] text-slate-500 truncate mt-0.5"
              title={aggregates.lowest?.title}
            >
              {aggregates.lowest ? aggregates.lowest.title : "No record"}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Main Charts Sub Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Expenses Trend Bar Chart */}
        <GlassCard className="border-white/5 shadow-xl flex flex-col min-h-[380px]">
          <div className="flex items-center gap-2 mb-6">
            <BarIcon className="h-5 w-5 text-violet-500 dark:text-violet-400" />
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Monthly Expenses Trend
              </h3>
              <p className="text-[10px] text-slate-500">
                Six-month comparison index overview
              </p>
            </div>
          </div>

          <div className="flex-1 w-full text-xs">
            {monthlyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                No monthly data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={monthlyTrend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar
                    dataKey="spent"
                    fill="url(#violetGradient)"
                    radius={[6, 6, 0, 0]}
                  >
                    <defs>
                      <linearGradient
                        id="violetGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.85}
                        />
                        <stop
                          offset="100%"
                          stopColor="#6366f1"
                          stopOpacity={0.25}
                        />
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        {/* Chart 2: Category Wise Pie Chart */}
        <GlassCard className="border-white/5 shadow-xl flex flex-col min-h-[380px]">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="h-5 w-5 text-pink-500 dark:text-pink-400" />
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Category Wise Weights
              </h3>
              <p className="text-[10px] text-slate-500">
                Percentage distribution based on tags
              </p>
            </div>
          </div>

          <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-6">
            {categoryDistribution.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                No category data available
              </div>
            ) : (
              <>
                {/* Pie Chart Visual */}
                <div className="flex-1 w-full relative min-h-[200px]">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart Legend */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 shrink-0 pr-4 w-full md:w-44 text-[11px] font-semibold text-slate-400">
                  {categoryDistribution.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></span>
                      <span
                        className="truncate flex-1 max-w-[80px]"
                        title={entry.name}
                      >
                        {entry.name}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">
                        $
                        {entry.value.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Chart 3: Weekly Spend Area Chart */}
      <GlassCard className="border-white/5 shadow-xl flex flex-col min-h-[350px]">
        <div className="flex items-center gap-2 mb-6">
          <AreaIcon className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Weekly Spend Pattern
            </h3>
            <p className="text-[10px] text-slate-500">
              Daily expenses sum in the last 7 calendar days
            </p>
          </div>
        </div>

        <div className="flex-1 w-full text-xs">
          {weeklyPattern.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              No weekly data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={weeklyPattern}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="spent"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#emeraldGradient)"
                >
                  <defs>
                    <linearGradient
                      id="emeraldGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10b981"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="#10b981"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </GlassCard>
    </>
  );
}
