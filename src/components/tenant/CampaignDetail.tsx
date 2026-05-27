import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, RefreshCw, Loader2, AlertCircle, CheckCircle,
  Clock, Mail, Phone, MessageSquare, Bell, Send, IndianRupee,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import { Pagination } from '../shared/Pagination';

interface Rollup {
  total: number;
  queued: number; processing: number;
  sent: number; delivered: number; read: number;
  failed: number; cancelled: number;
  deliveryRate: number; readRate: number; failureRate: number;
}

interface Failure { reason: string; count: number }

interface CampaignDetail {
  id: number;
  name: string | null;
  totalRecipients: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  derivedStatus: 'pending' | 'processing' | 'completed' | 'failed';
  template?: { id: number; name: string; channel: string; category: string; body?: string } | null;
  creator?: { id: number; firstName: string; lastName: string; email: string } | null;
  rollup: Rollup;
  cost: { estimated: number; actual: number };
  failureBreakdown: Failure[];
}

interface CampaignMessage {
  id: number;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  deliveryStatus: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  retries: number;
  estimatedCost: string | number | null;
  actualCost: string | number | null;
}

const CHANNEL_ICONS: Record<string, any> = {
  whatsapp: MessageSquare,
  sms: Phone,
  email: Mail,
  fcm: Bell,
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function inr(n: number) {
  try { return `₹${Number(n).toFixed(2)}`; } catch { return `₹${n}`; }
}

const STATUS_STYLE: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sent: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  read: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [exporting, setExporting] = useState(false);
  const recordsPerPage = 50;

  const fetchSummary = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await apiService.campaigns.getById(id);
      if (r?.success) setData(r.data);
    } catch (e: any) {
      toast.error('Failed to load campaign', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!id) return;
    setLoadingMessages(true);
    try {
      const r = await apiService.campaigns.listMessages(id, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: recordsPerPage,
      });
      if (r?.success) {
        setMessages(r.data || []);
        setTotalPages(r.pagination?.totalPages || 1);
        setTotalRecords(r.pagination?.total || 0);
      }
    } catch (e: any) {
      toast.error('Failed to load recipient list', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => { fetchSummary(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => { fetchMessages(); /* eslint-disable-next-line */ }, [id, statusFilter, page]);

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const blob = await apiService.campaigns.exportCsv(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign_${id}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch (e: any) {
      toast.error('Export failed', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading campaign…
      </div>
    );
  }
  if (!data) {
    return <div className="p-8 text-gray-500">Campaign not found.</div>;
  }

  const ChannelIcon = CHANNEL_ICONS[data.template?.channel || ''] || MessageSquare;
  const reached = data.rollup.delivered + data.rollup.read;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/campaigns')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Back to campaigns"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ChannelIcon className="w-5 h-5 text-gray-500" />
              <h1 className="text-2xl text-gray-900 dark:text-white">
                {data.name || `Campaign #${data.id}`}
              </h1>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Template <strong>{data.template?.name || '—'}</strong>
              {data.template?.category && <> · {data.template.category}</>}
              {data.creator && <> · sent by {data.creator.firstName} {data.creator.lastName}</>}
              <> · created {fmt(data.createdAt)}</>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchSummary(); fetchMessages(); }}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || data.rollup.total === 0}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiTile label="Total" value={data.rollup.total} icon={Send} />
        <KpiTile label="Sent" value={data.rollup.sent} icon={Send} />
        <KpiTile label="Delivered" value={reached} icon={CheckCircle} accent="text-green-600 dark:text-green-400" />
        <KpiTile label="Read" value={data.rollup.read} icon={CheckCircle} accent="text-emerald-600 dark:text-emerald-400" />
        <KpiTile label="Failed" value={data.rollup.failed} icon={AlertCircle} accent="text-red-600 dark:text-red-400" />
        <KpiTile label="Queued" value={data.rollup.queued + data.rollup.processing} icon={Clock} />
      </div>

      {/* Rates + cost */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Delivery rate</div>
          <div className="text-2xl text-gray-900 dark:text-white">{data.rollup.deliveryRate}%</div>
          <div className="text-xs text-gray-500 mt-1">{reached} delivered / {reached + data.rollup.failed} reached</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Read rate</div>
          <div className="text-2xl text-gray-900 dark:text-white">{data.rollup.readRate}%</div>
          <div className="text-xs text-gray-500 mt-1">{data.rollup.read} read / {reached} delivered</div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1">
            <IndianRupee className="w-3 h-3" />
            Cost
          </div>
          <div className="text-2xl text-gray-900 dark:text-white">{inr(data.cost.actual || data.cost.estimated)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.cost.actual > 0 ? 'Actual' : 'Estimated'}
            {data.cost.estimated > 0 && data.cost.actual > 0 && ` · est ${inr(data.cost.estimated)}`}
          </div>
        </div>
      </div>

      {/* Failure breakdown */}
      {data.failureBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Failure breakdown
          </h3>
          <div className="space-y-2">
            {data.failureBreakdown.map((f, i) => {
              const pct = data.rollup.failed > 0 ? Math.round((f.count * 100) / data.rollup.failed) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{f.reason}</span>
                      <span className="text-gray-500">{f.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-recipient table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recipients</h3>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-900 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Delivered</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Read</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Failure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loadingMessages ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : messages.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No recipients match.</td></tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {m.recipientName || '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {m.recipientPhone || m.recipientEmail || '—'}
                        {m.retries > 0 && <span className="ml-2 text-amber-600">↻ {m.retries}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STATUS_STYLE[m.deliveryStatus] || STATUS_STYLE.queued}`}>
                        {m.deliveryStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{fmt(m.sentAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{fmt(m.deliveredAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{fmt(m.readAt)}</td>
                    <td className="px-4 py-3 text-xs text-red-600 dark:text-red-400 max-w-[260px] truncate" title={m.failureReason || ''}>
                      {m.failureReason || ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalRecords > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-2">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalRecords={totalRecords}
              onPageChange={setPage}
              recordsPerPage={recordsPerPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function KpiTile({ label, value, icon: Icon, accent }: {
  label: string;
  value: number;
  icon: any;
  accent?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className={`text-2xl ${accent || 'text-gray-900 dark:text-white'}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
