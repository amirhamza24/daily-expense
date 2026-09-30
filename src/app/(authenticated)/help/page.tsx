"use client";

import React, { useState } from "react";
import GlassCard from "@/components/GlassCard";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Mail,
  LogIn,
  Wallet,
  LayoutDashboard,
  PlusCircle,
  Edit3,
  Trash2,
  Filter,
  Download,
  TrendingUp,
  History,
  BarChart3,
  User,
  Settings,
  ShieldCheck,
  Users,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Info,
  FileText,
  Camera,
  LifeBuoy,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useI18n } from "@/components/I18nProvider";
import { getHelpContent, type HelpBlock, type HelpIcon } from "@/lib/i18n/help";

// Section chrome (icon + tint) by id; titles and bodies come from getHelpContent()
const SECTION_META: Record<string, { icon: React.ReactNode; color: string }> = {
  "getting-started": { icon: <UserPlus className="h-5 w-5" />, color: "text-accent-fg" },
  "budget-setup": { icon: <Wallet className="h-5 w-5" />, color: "text-emerald-500 dark:text-emerald-400" },
  dashboard: { icon: <LayoutDashboard className="h-5 w-5" />, color: "text-accent-fg" },
  expenses: { icon: <PlusCircle className="h-5 w-5" />, color: "text-pink-500 dark:text-pink-400" },
  income: { icon: <TrendingUp className="h-5 w-5" />, color: "text-emerald-500 dark:text-emerald-400" },
  "transaction-history": { icon: <History className="h-5 w-5" />, color: "text-blue-500 dark:text-blue-400" },
  analytics: { icon: <BarChart3 className="h-5 w-5" />, color: "text-orange-500 dark:text-orange-400" },
  profile: { icon: <User className="h-5 w-5" />, color: "text-cyan-500 dark:text-cyan-400" },
  settings: { icon: <Settings className="h-5 w-5" />, color: "text-slate-500 dark:text-slate-400" },
  admin: { icon: <ShieldCheck className="h-5 w-5" />, color: "text-rose-500 dark:text-rose-400" },
  faq: { icon: <HelpCircle className="h-5 w-5" />, color: "text-amber-500 dark:text-amber-400" },
  categories: { icon: <FileText className="h-5 w-5" />, color: "text-teal-500 dark:text-teal-400" },
};

const H4_ICONS: Record<HelpIcon, React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  shield: ShieldCheck,
  login: LogIn,
  plus: PlusCircle,
  edit: Edit3,
  trash: Trash2,
  filter: Filter,
  download: Download,
  users: Users,
};

/** Renders **bold**, _italic_ and `code` inline markup. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`"))
          return (
            <code key={i} className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono">
              {part.slice(1, -1)}
            </code>
          );
        if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function ScreenshotPlaceholder({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="my-4 rounded-xl border-2 border-dashed border-slate-300/40 dark:border-white/10 bg-slate-100/40 dark:bg-white/3 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200/40 dark:border-white/5 bg-slate-200/30 dark:bg-white/5">
        <span className="h-3 w-3 rounded-full bg-rose-400/70" />
        <span className="h-3 w-3 rounded-full bg-amber-400/70" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          expensify.app
        </span>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
        <Camera className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <span className="text-[10px] text-slate-300 dark:text-slate-600">
          {hint}
        </span>
      </div>
    </div>
  );
}

function Step({
  num,
  children,
}: {
  num: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-start">
      <span className="shrink-0 h-6 w-6 rounded-full bg-accent-soft border border-accent/30 flex items-center justify-center text-[11px] font-bold text-accent-fg">
        {num}
      </span>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
        {children}
      </p>
    </div>
  );
}

function InfoBox({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-500/8 border-blue-500/20 text-blue-600 dark:text-blue-400",
    warning:
      "bg-amber-500/8 border-amber-500/20 text-amber-600 dark:text-amber-400",
    success:
      "bg-emerald-500/8 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  };
  const icons = {
    info: <Info className="h-4 w-4 shrink-0 mt-0.5" />,
    warning: <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />,
    success: <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />,
  };
  return (
    <div
      className={`flex gap-2.5 p-3 rounded-xl border text-xs leading-relaxed my-3 ${styles[type]}`}
    >
      {icons[type]}
      <span>{children}</span>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200/40 dark:border-white/5">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-100/60 dark:bg-white/3">
            {headers.map((h) => (
              <th
                key={h}
                className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-200/40 dark:border-white/5 last:border-0">
              {row.map((c, j) => (
                <td
                  key={j}
                  className={`py-2.5 px-3 text-xs ${j === 0 ? "font-semibold text-slate-700 dark:text-slate-300 w-40" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HelpPage() {
  const { locale, fmt } = useI18n();
  const help = getHelpContent(locale);
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["getting-started"])
  );

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderBlock = (block: HelpBlock, key: number) => {
    switch (block.type) {
      case "p":
        return (
          <p key={key} className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            <Rich text={block.text} />
          </p>
        );
      case "h4": {
        const Icon = H4_ICONS[block.icon];
        return (
          <h4 key={key} className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2 flex items-center gap-2">
            <Icon className={`h-4 w-4 ${block.tone}`} />
            {block.text}
          </h4>
        );
      }
      case "sub":
        return (
          <p key={key} className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
            {block.text}
          </p>
        );
      case "steps":
        return (
          <div key={key} className="flex flex-col gap-2.5">
            {block.items.map((item, i) => (
              <Step key={i} num={fmt.digits(i + 1)}>
                <Rich text={item} />
              </Step>
            ))}
          </div>
        );
      case "info":
      case "warning":
      case "success":
        return (
          <InfoBox key={key} type={block.type}>
            <Rich text={block.text} />
          </InfoBox>
        );
      case "table":
        return <SimpleTable key={key} headers={block.headers} rows={block.rows} />;
      case "shot":
        return <ScreenshotPlaceholder key={key} label={block.label} hint={help.screenshotHint} />;
      case "faq":
        return (
          <div key={key} className="flex flex-col gap-4">
            {block.items.map(({ q, a }) => (
              <div
                key={q}
                className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/2 border border-slate-200/40 dark:border-white/5"
              >
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  {help.question} {q}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {a}
                </p>
              </div>
            ))}
          </div>
        );
    }
  };

  const sections = help.sections;

  return (
    <>
      {/* Header */}
      <PageHeader icon={LifeBuoy} title={help.title} description={help.description} />

      {/* Download Manual Button */}
      <GlassCard className="border-accent/10 bg-accent/3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-soft border border-accent/20">
              <BookOpen className="h-5 w-5 text-accent-fg" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {help.manualTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {help.manualHint}
              </p>
            </div>
          </div>
          <a
            href="/USER_MANUAL.md"
            download="Expensify_User_Manual.md"
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-xl transition-colors duration-200 shadow-md shadow-accent/20"
          >
            <Download className="h-4 w-4" />
            {help.manualButton}
          </a>
        </div>
      </GlassCard>

      {/* Expand/Collapse All Controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          {help.sectionsHint(sections.length)}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setOpenSections(new Set(sections.map((s) => s.id)))
            }
            className="text-[11px] font-semibold text-accent-fg hover:text-accent-hover px-3 py-1.5 rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
          >
            {help.expandAll}
          </button>
          <button
            onClick={() => setOpenSections(new Set())}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-500/5 transition-colors cursor-pointer"
          >
            {help.collapseAll}
          </button>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="flex flex-col gap-3">
        {sections.map((section) => {
          const isOpen = openSections.has(section.id);
          const meta = SECTION_META[section.id];
          return (
            <GlassCard key={section.id} className="p-0 overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors duration-200 hover:bg-slate-100/50 dark:hover:bg-white/3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className={meta?.color}>{meta?.icon}</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {section.title}
                  </span>
                </div>
                <span className="text-slate-400 dark:text-slate-500 shrink-0">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {/* Section Content */}
              {isOpen && (
                <div className="px-6 pb-6 border-t border-slate-200/40 dark:border-white/5 pt-5 flex flex-col gap-4">
                  {section.blocks.map(renderBlock)}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-center gap-2 py-2">
        <Info className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          {help.footer}
        </p>
      </div>
    </>
  );
}
