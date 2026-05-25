/**
 * Leadership Dashboard — org-admin/business-owner view of messaging health.
 *
 * One page, lots of widgets:
 *   • Filter bar (date range with presets, channel, operator, HRMS dimensions)
 *   • KPI cards (total sent, delivery rate, read rate, failure rate,
 *     pending approvals, active operators, total cost) with vs-prev-period deltas
 *   • Trend line chart (messages over time, split by status)
 *   • Channel pie + cost-by-channel sidecar
 *   • Top operators table (sent / delivered / failure rate)
 *   • Top templates table
 *   • HRMS breakdowns (department / region / cost-center / designation bars)
 *   • Approval funnel
 *   • Recent failures (drill-down)
 *
 * All widgets respond to the same filter set. Filters are kept in component
 * state — not the URL — to keep the page snappy and avoid churning history
 * on every slider drag. Add URL sync later if shareable links matter.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import {
  ArrowDownRight, ArrowUpRight, Calendar, MessageSquare, CheckCircle2, Eye,
  XCircle, Wallet, Clock, Filter as FilterIcon, RefreshCw,
  AlertTriangle, Smartphone, Mail, Bell, MessageCircle, ChevronDown, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import { formatINR } from '../../utils/pricing';

// ── Types ───────────────────────────────────────────────────────────────────

interface Kpis {
  totalSent: number;
  delivered: number;
  read: number;
  sent: number;
  failed: number;
  queued: number;
  pendingApproval: number;
  activeOperators: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
  totalCost: number;
  deltaPct: number | null;
  prevTotal: number;
  periodDays: number;
}

interface TrendPoint {
  day: string;
  total: number;
  delivered: number;
  failed: number;
  read: number;
}

interface ChannelStat {
  channel: 'whatsapp' | 'sms' | 'email' | 'fcm';
  count: number;
  cost: number;
}

interface OperatorRow {
  userId: number;
  name: string;
  email: string;
  role: string;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

interface TemplateRow {
  templateId: number;
  name: string;
  channel: string;
  category: string;
  sent: number;
  delivered: number;
  deliveryRate: number;
}

interface BreakdownRow {
  label: string;
  count: number;
  delivered: number;
}

interface FunnelData {
  submitted: number;
  approved: number;
  rejected: number;
  sent: number;
  delivered: number;
  read: number;
}

interface FailureRow {
  id: number;
  channel: string;
  recipient: string | null;
  phone: string | null;
  failureReason: string;
  failedAt: string;
}

interface DashboardPayload {
  filters: any;
  kpis: Kpis;
  trend: TrendPoint[];
  channelBreakdown: ChannelStat[];
  topOperators: OperatorRow[];
  topTemplates: TemplateRow[];
  breakdowns: {
    department: BreakdownRow[];
    region: BreakdownRow[];
    costCenter: BreakdownRow[];
    designation: BreakdownRow[];
  };
  approvalFunnel: FunnelData;
  recentFailures: FailureRow[];
}

interface FilterOptions {
  users: { id: number; name: string; email: string; role: string }[];
  departments: string[];
  regions: string[];
  costCenters: string[];
  designations: string[];
}

interface Filters {
  startDate: string;
  endDate: string;
  channel: '' | 'whatsapp' | 'sms' | 'email' | 'fcm';
  userId: number | '';
  department: string;
  region: string;
  costCenter: string;
  designation: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function fmtNum(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat().format(n);
}

function fmtPct(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(1)}%`;
}

function fmtCurrency(n: number) {
  return formatINR(n);
}

const DATE_PRESETS = [
  { label: 'Today', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year', days: 365 },
];

const CHANNEL_LABELS: Record<string, { label: string; icon: any }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
  sms: { label: 'SMS', icon: Smartphone },
  email: { label: 'Email', icon: Mail },
  fcm: { label: 'Push', icon: Bell },
};

const PIE_COLORS = ['#111827', '#374151', '#6b7280', '#9ca3af'];

// ── Page ────────────────────────────────────────────────────────────────────

export function LeadershipDashboard() {
  const [filters, setFilters] = useState<Filters>({
    startDate: isoDateOnly(daysAgo(30)),
    endDate: isoDateOnly(new Date()),
    channel: '',
    userId: '',
    department: '',
    region: '',
    costCenter: '',
    designation: '',
  });
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load filter options once on mount.
  useEffect(() => {
    apiService.dashboard
      .leadershipFilters()
      .then((r: any) => {
        if (r?.success) setOptions(r.data);
      })
      .catch(() => {});
  }, []);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const r = await apiService.dashboard.leadership({
        startDate: filters.startDate,
        endDate: filters.endDate,
        channel: filters.channel || undefined,
        userId: filters.userId === '' ? undefined : Number(filters.userId),
        department: filters.department || undefined,
        region: filters.region || undefined,
        costCenter: filters.costCenter || undefined,
        designation: filters.designation || undefined,
      });
      if (r?.success) setData(r.data);
    } catch (e: any) {
      toast.error('Failed to load dashboard', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch whenever filters change.
  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setPreset = (days: number) => {
    setFilters((f) => ({
      ...f,
      startDate: isoDateOnly(daysAgo(days)),
      endDate: isoDateOnly(new Date()),
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: isoDateOnly(daysAgo(30)),
      endDate: isoDateOnly(new Date()),
      channel: '',
      userId: '',
      department: '',
      region: '',
      costCenter: '',
      designation: '',
    });
  };

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.channel) n++;
    if (filters.userId !== '') n++;
    if (filters.department) n++;
    if (filters.region) n++;
    if (filters.costCenter) n++;
    if (filters.designation) n++;
    return n;
  }, [filters]);

  return (
    <div className="colorful p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white">Leadership Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Org-wide messaging health, performance, and cost.
            {data?.kpis?.periodDays && (
              <span className="ml-1.5">Showing last {data.kpis.periodDays} days.</span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        options={options}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        onPreset={setPreset}
        onReset={resetFilters}
        activeCount={activeFilterCount}
      />

      {loading && !data ? (
        <div className="text-center py-20 text-gray-500">Loading dashboard…</div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-500">No data available.</div>
      ) : (
        <>
          {/* KPI row */}
          <KpiGrid kpis={data.kpis} />

          {/* Trend + Channel donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Messages over time" subtitle="Daily volume" className="lg:col-span-2">
              <TrendChart data={data.trend} />
            </Card>
            <Card title="By channel" subtitle="Split across channels in period">
              <ChannelPie data={data.channelBreakdown} />
            </Card>
          </div>

          {/* Approval funnel + cost by channel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card title="Approval funnel" subtitle="From submission to read" className="lg:col-span-2">
              <ApprovalFunnel data={data.approvalFunnel} />
            </Card>
            <Card title="Cost by channel" subtitle="Estimated spend in period">
              <CostByChannel data={data.channelBreakdown} />
            </Card>
          </div>

          {/* Top operators + Top templates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Top operators" subtitle="By volume in period">
              <OperatorTable rows={data.topOperators} />
            </Card>
            <Card title="Top templates" subtitle="By usage in period">
              <TemplateTable rows={data.topTemplates} />
            </Card>
          </div>

          {/* HRMS breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="By Department" subtitle="Top 8 departments by message volume">
              <HrmsBars rows={data.breakdowns.department} />
            </Card>
            <Card title="By Region" subtitle="Top 8 regions by message volume">
              <HrmsBars rows={data.breakdowns.region} />
            </Card>
            <Card title="By Cost Center" subtitle="Top 8 cost centers">
              <HrmsBars rows={data.breakdowns.costCenter} />
            </Card>
            <Card title="By Designation" subtitle="Top 8 designations">
              <HrmsBars rows={data.breakdowns.designation} />
            </Card>
          </div>

          {/* Recent failures drill-down */}
          <Card
            title="Recent failures"
            subtitle="Most recent delivery failures — investigate before they pile up"
          >
            <FailuresTable rows={data.recentFailures} />
          </Card>
        </>
      )}
    </div>
  );
}

// ── Filter Bar ──────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  options,
  onChange,
  onPreset,
  onReset,
  activeCount,
}: {
  filters: Filters;
  options: FilterOptions | null;
  onChange: (patch: Partial<Filters>) => void;
  onPreset: (days: number) => void;
  onReset: () => void;
  activeCount: number;
}) {
  const [showMore, setShowMore] = useState(false);
  const hasAdvanced =
    filters.userId !== '' ||
    filters.department ||
    filters.region ||
    filters.costCenter ||
    filters.designation;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      {/* Row 1: date range + presets + channel */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="px-2.5 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            className="px-2.5 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => onPreset(p.days)}
              className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <FilterSelect
          icon={<MessageSquare className="w-3.5 h-3.5" />}
          label="Channel"
          value={filters.channel}
          onChange={(v) => onChange({ channel: v as Filters['channel'] })}
          options={[
            { value: '', label: 'All channels' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'sms', label: 'SMS' },
            { value: 'email', label: 'Email' },
            { value: 'fcm', label: 'Push' },
          ]}
        />

        <button
          onClick={() => setShowMore((v) => !v)}
          className={`px-3 py-1.5 text-xs rounded-md border flex items-center gap-1.5 ${
            hasAdvanced || showMore
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <FilterIcon className="w-3.5 h-3.5" />
          More filters
          {activeCount > 1 && <span className="ml-0.5">({activeCount - (filters.channel ? 1 : 0)})</span>}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>

        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Row 2: advanced filters — collapsible */}
      {showMore && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterSelect
            label="Operator"
            value={String(filters.userId)}
            onChange={(v) => onChange({ userId: v === '' ? '' : Number(v) })}
            options={[
              { value: '', label: 'All operators' },
              ...(options?.users || []).map((u) => ({
                value: String(u.id),
                label: `${u.name} (${u.role})`,
              })),
            ]}
          />
          <FilterSelect
            label="Department"
            value={filters.department}
            onChange={(v) => onChange({ department: v })}
            options={[
              { value: '', label: 'All departments' },
              ...(options?.departments || []).map((d) => ({ value: d, label: d })),
            ]}
          />
          <FilterSelect
            label="Region"
            value={filters.region}
            onChange={(v) => onChange({ region: v })}
            options={[
              { value: '', label: 'All regions' },
              ...(options?.regions || []).map((r) => ({ value: r, label: r })),
            ]}
          />
          <FilterSelect
            label="Cost Center"
            value={filters.costCenter}
            onChange={(v) => onChange({ costCenter: v })}
            options={[
              { value: '', label: 'All cost centers' },
              ...(options?.costCenters || []).map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            label="Designation"
            value={filters.designation}
            onChange={(v) => onChange({ designation: v })}
            options={[
              { value: '', label: 'All designations' },
              ...(options?.designations || []).map((d) => ({ value: d, label: d })),
            ]}
          />
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2.5 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 text-gray-900 dark:text-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── KPI Grid ────────────────────────────────────────────────────────────────

function KpiGrid({ kpis }: { kpis: Kpis }) {
  const items: Array<{
    label: string;
    value: string;
    sub?: string;
    icon: any;
    delta?: number | null;
  }> = [
    {
      label: 'Messages Sent',
      value: fmtNum(kpis.totalSent),
      sub: `${kpis.activeOperators} active operators`,
      icon: MessageSquare,
      delta: kpis.deltaPct,
    },
    {
      label: 'Delivery Rate',
      value: fmtPct(kpis.deliveryRate),
      sub: `${fmtNum(kpis.delivered)} delivered`,
      icon: CheckCircle2,
    },
    {
      label: 'Read Rate',
      value: fmtPct(kpis.readRate),
      sub: `${fmtNum(kpis.read)} read`,
      icon: Eye,
    },
    {
      label: 'Failure Rate',
      value: fmtPct(kpis.failureRate),
      sub: `${fmtNum(kpis.failed)} failed`,
      icon: XCircle,
    },
    {
      label: 'Pending Approval',
      value: fmtNum(kpis.pendingApproval),
      sub: kpis.queued ? `${fmtNum(kpis.queued)} in queue` : 'In approval queue',
      icon: Clock,
    },
    {
      label: 'Total Cost',
      value: fmtCurrency(kpis.totalCost),
      sub: 'Estimated spend',
      icon: Wallet,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        const delta = it.delta;
        return (
          <div
            key={it.label}
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                {it.label}
              </span>
              <Icon className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl text-gray-900 dark:text-white leading-tight">{it.value}</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-gray-500">{it.sub}</span>
              {delta !== undefined && delta !== null && (
                <span
                  className={`text-[11px] flex items-center gap-0.5 font-medium ${
                    delta >= 0 ? 'text-gray-900 dark:text-white' : 'text-gray-500'
                  }`}
                >
                  {delta >= 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(delta).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Card wrapper ────────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm text-gray-900 dark:text-white font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Charts & tables ─────────────────────────────────────────────────────────

function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return <EmptyState text="No messages in this period." />;
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="total" stroke="#111827" strokeWidth={2} dot={false} name="Total" />
          <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={1.5} dot={false} name="Delivered" />
          <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Failed" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChannelPie({ data }: { data: ChannelStat[] }) {
  if (data.length === 0) return <EmptyState text="No data." />;
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="channel" innerRadius={45} outerRadius={75}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 mt-2">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0;
          const info = CHANNEL_LABELS[d.channel];
          const Icon = info?.icon || MessageSquare;
          return (
            <li key={d.channel} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <Icon className="w-3 h-3" />
                {info?.label || d.channel}
              </span>
              <span className="text-gray-500">
                <span className="text-gray-900 dark:text-white font-medium">{fmtNum(d.count)}</span>
                <span className="ml-1.5">{pct.toFixed(1)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CostByChannel({ data }: { data: ChannelStat[] }) {
  const rows = data.filter((d) => d.cost > 0);
  if (rows.length === 0) return <EmptyState text="No cost data." />;
  const total = rows.reduce((s, d) => s + d.cost, 0);
  return (
    <div>
      <p className="text-2xl text-gray-900 dark:text-white mb-3">{fmtCurrency(total)}</p>
      <ul className="space-y-3">
        {rows.map((d) => {
          const pct = total > 0 ? (d.cost / total) * 100 : 0;
          const info = CHANNEL_LABELS[d.channel];
          const Icon = info?.icon || MessageSquare;
          return (
            <li key={d.channel}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <Icon className="w-3.5 h-3.5" />
                  {info?.label || d.channel}
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {fmtCurrency(d.cost)}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-900 dark:bg-white"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ApprovalFunnel({ data }: { data: FunnelData }) {
  if (data.submitted === 0) return <EmptyState text="No messages in this period." />;
  const steps = [
    { label: 'Submitted', value: data.submitted },
    { label: 'Approved', value: data.approved },
    { label: 'Sent', value: data.sent },
    { label: 'Delivered', value: data.delivered },
    { label: 'Read', value: data.read },
  ];
  const max = steps[0].value || 1;
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100;
        const dropPct =
          i > 0 && steps[i - 1].value > 0
            ? Math.round(((steps[i - 1].value - s.value) / steps[i - 1].value) * 100)
            : 0;
        return (
          <div key={s.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="text-gray-400 tabular-nums w-3">{i + 1}</span>
                {s.label}
              </span>
              <span className="text-gray-500">
                <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                  {fmtNum(s.value)}
                </span>
                {i > 0 && dropPct > 0 && (
                  <span className="ml-2 text-[10px] text-gray-400">↓ {dropPct}%</span>
                )}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gray-900 dark:bg-white" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      {data.rejected > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            {fmtNum(data.rejected)} rejected in approval
          </p>
        </div>
      )}
    </div>
  );
}

function OperatorTable({ rows }: { rows: OperatorRow[] }) {
  if (rows.length === 0) return <EmptyState text="No operator activity." />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-500">
            <th className="text-left px-2 py-1.5 font-medium">Operator</th>
            <th className="text-right px-2 py-1.5 font-medium">Sent</th>
            <th className="text-right px-2 py-1.5 font-medium">Delivered</th>
            <th className="text-right px-2 py-1.5 font-medium">Failed</th>
            <th className="text-right px-2 py-1.5 font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-t border-gray-100 dark:border-gray-800">
              <td className="px-2 py-2.5">
                <p className="text-gray-900 dark:text-white truncate">{r.name}</p>
                <p className="text-[10px] text-gray-500 truncate">{r.role}</p>
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-gray-900 dark:text-white">
                {fmtNum(r.sent)}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                {fmtNum(r.delivered)}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-gray-500">
                {fmtNum(r.failed)}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-gray-900 dark:text-white font-medium">
                {fmtPct(r.deliveryRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TemplateTable({ rows }: { rows: TemplateRow[] }) {
  if (rows.length === 0) return <EmptyState text="No templates used in this period." />;
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-500">
            <th className="text-left px-2 py-1.5 font-medium">Template</th>
            <th className="text-left px-2 py-1.5 font-medium">Channel</th>
            <th className="text-right px-2 py-1.5 font-medium">Sent</th>
            <th className="text-right px-2 py-1.5 font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.templateId} className="border-t border-gray-100 dark:border-gray-800">
              <td className="px-2 py-2.5">
                <p className="text-gray-900 dark:text-white truncate">{r.name}</p>
                {r.category && <p className="text-[10px] text-gray-500 truncate">{r.category}</p>}
              </td>
              <td className="px-2 py-2.5 capitalize text-gray-700 dark:text-gray-300">
                {r.channel}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-gray-900 dark:text-white">
                {fmtNum(r.sent)}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums text-gray-900 dark:text-white font-medium">
                {fmtPct(r.deliveryRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HrmsBars({ rows }: { rows: BreakdownRow[] }) {
  if (rows.length === 0) return <EmptyState text="No data — likely no HRMS fields set on contacts." />;
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10 }}
            stroke="#9ca3af"
            width={100}
          />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" fill="#111827" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FailuresTable({ rows }: { rows: FailureRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No failures in this period. Nice.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-500">
            <th className="text-left px-2 py-1.5 font-medium">Recipient</th>
            <th className="text-left px-2 py-1.5 font-medium">Channel</th>
            <th className="text-left px-2 py-1.5 font-medium">Reason</th>
            <th className="text-right px-2 py-1.5 font-medium">Failed at</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="px-2 py-2.5">
                <p className="text-gray-900 dark:text-white truncate">
                  {r.recipient || r.phone || '—'}
                </p>
                {r.phone && r.recipient !== r.phone && (
                  <p className="text-[10px] text-gray-500 truncate">{r.phone}</p>
                )}
              </td>
              <td className="px-2 py-2.5 capitalize text-gray-700 dark:text-gray-300">
                {r.channel}
              </td>
              <td className="px-2 py-2.5 text-gray-500 max-w-md">
                <p className="truncate flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  {r.failureReason}
                </p>
              </td>
              <td className="px-2 py-2.5 text-right text-gray-500 whitespace-nowrap text-xs">
                {new Date(r.failedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10">
      <p className="text-xs text-gray-500">{text}</p>
    </div>
  );
}
