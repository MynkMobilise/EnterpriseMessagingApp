import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, RefreshCw, MessageSquare, Phone, Mail, Bell,
  CheckCircle, AlertCircle, Clock, Loader2, ChevronRight, Megaphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../utils/api';
import { Pagination } from '../shared/Pagination';

// "Campaigns" page — read-only view of every bulk_message_batches row for the
// current org, enriched with live rollup metrics computed by the backend.
// Drill-down lives at /campaigns/:id (CampaignDetail.tsx) and reuses the same
// service; no shared component state — the URL is the source of truth.

interface CampaignRollup {
  total: number;
  queued: number; processing: number;
  sent: number; delivered: number; read: number;
  failed: number; cancelled: number;
  deliveryRate: number; readRate: number; failureRate: number;
}

interface Campaign {
  id: number;
  name: string | null;
  totalRecipients: number | null;
  status: string;
  derivedStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  template?: { id: number; name: string; channel: string; category: string } | null;
  creator?: { id: number; firstName: string; lastName: string; email: string } | null;
  rollup: CampaignRollup;
}

const CHANNEL_ICONS: Record<string, any> = {
  whatsapp: MessageSquare,
  sms: Phone,
  email: Mail,
  fcm: Bell,
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusBadge(status: Campaign['derivedStatus']) {
  switch (status) {
    case 'completed':
      return { label: 'Completed', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', Icon: CheckCircle };
    case 'failed':
      return { label: 'All failed', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', Icon: AlertCircle };
    case 'processing':
      return { label: 'In progress', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', Icon: Loader2 };
    default:
      return { label: 'Pending', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', Icon: Clock };
  }
}

export function Campaigns() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<'all' | 'whatsapp' | 'sms' | 'email' | 'fcm'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 20;

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await apiService.campaigns.list({
        search: search || undefined,
        channel: channel === 'all' ? undefined : channel,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: recordsPerPage,
      });
      if (r?.success) {
        setRows(r.data || []);
        setTotalPages(r.pagination?.totalPages || 1);
        setTotalRecords(r.pagination?.total || 0);
      }
    } catch (e: any) {
      toast.error('Failed to load campaigns', {
        description: e?.response?.data?.error?.message || e?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [page, channel, dateFrom, dateTo]);

  // Debounce search so we don't fire one request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchData();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-600" />
            Campaign Reports
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Every bulk send your team has run, with live delivery metrics. Click a row to drill into per-recipient results.
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={loading}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by campaign name…"
              className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={channel}
            onChange={(e) => { setChannel(e.target.value as any); setPage(1); }}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
          >
            <option value="all">All channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
            <option value="fcm">FCM</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
            placeholder="To"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Template</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Recipients</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Delivered</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Read</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Failed</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Delivery rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 text-gray-400 mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <Megaphone className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No campaigns yet. They show up here automatically once you run a bulk send.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((c) => {
                  const Icon = CHANNEL_ICONS[c.template?.channel || ''] || MessageSquare;
                  const badge = statusBadge(c.derivedStatus);
                  const StatusIcon = badge.Icon;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/campaigns/${c.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white truncate max-w-[260px]">
                              {c.name || `Campaign #${c.id}`}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {c.template?.channel || '—'}
                              {c.creator && ` · by ${c.creator.firstName} ${c.creator.lastName}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-white truncate max-w-[200px]">
                          {c.template?.name || '—'}
                        </div>
                        {c.template?.category && (
                          <div className="text-xs text-gray-500 capitalize">{c.template.category}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                        {(c.totalRecipients ?? c.rollup.total).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                        {(c.rollup.delivered + c.rollup.read).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                        {c.rollup.read.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-red-600 dark:text-red-400">
                        {c.rollup.failed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm ${
                          c.rollup.deliveryRate >= 90 ? 'text-green-600 dark:text-green-400'
                          : c.rollup.deliveryRate >= 70 ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                        }`}>
                          {c.rollup.deliveryRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${badge.cls}`}>
                          <StatusIcon className={`w-3 h-3 ${c.derivedStatus === 'processing' ? 'animate-spin' : ''}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(c.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        <ChevronRight className="w-4 h-4 inline-block" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {rows.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={setPage}
          recordsPerPage={recordsPerPage}
        />
      )}
    </div>
  );
}
