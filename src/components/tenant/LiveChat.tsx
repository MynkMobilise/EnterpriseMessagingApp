/**
 * Live Chat — operator-facing two-pane WhatsApp conversation viewer.
 *
 * Left pane: list of customers ordered by recent activity, with unread badges.
 * Right pane: thread of messages with a composer at the bottom.
 *
 * Polling: re-fetches the conversation list and the open thread every 5s.
 * No socket.io — kept simple for v1; users can interrupt by switching threads.
 *
 * Backend contract: see src/services/chatService.js.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Send as SendIcon, Loader2, MessageCircle, FileText, X, Check, CheckCheck, RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import { apiService, MEDIA_HOST } from '../../utils/api';

const POLL_INTERVAL_MS = 5000;

interface Conversation {
  phone: string;
  name: string | null;
  contactId: number | null;
  lastSnippet: string;
  lastDirection: 'inbound' | 'outbound';
  lastAt: string;
  unreadCount: number;
}

interface CarouselCardData {
  id?: string;
  media?: { type: 'image' | 'video'; url: string } | null;
  content?: string;
  buttons?: Array<{ id?: string; type?: string; text?: string; value?: string }>;
}

interface TemplateData {
  id: number;
  name: string;
  templateType?: 'standard' | 'carousel' | 'limited_time' | null;
  headerType?: 'text' | 'image' | 'video' | 'document' | 'location' | null;
  headerContent?: string | null;
  cards?: CarouselCardData[] | null;
  buttons?: Array<{ id?: string; type?: string; text?: string; value?: string }> | null;
  footer?: string | null;
  category?: string | null;
}

interface ChatMessage {
  id: number;
  direction: 'inbound' | 'outbound';
  content: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'audio' | 'document' | null;
  deliveryStatus: 'queued' | 'processing' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  createdAt: string;
  sentAt: string | null;
  recipientName: string | null;
  templateId: number | null;
  template?: TemplateData | null;
}

interface WindowStatus {
  open: boolean;
  expiresAt: string | null;
  lastInboundAt: string | null;
}

interface ApprovedTemplate {
  id: number;
  name: string;
  body: string;
  language: string;
  variables: string[] | null;
}

// Resolve a media reference for display. Absolute URLs pass through, relative
// `/uploads/...` paths get prefixed with the API host (without the /api/v1 suffix).
const resolveMedia = (url: string | null | undefined): string => {
  if (!url) return '';
  if (/^https?:/i.test(url)) return url;
  return `${MEDIA_HOST}${url}`;
};

export function LiveChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePhone, setActivePhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [windowStatus, setWindowStatus] = useState<WindowStatus | null>(null);
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<{
    ready: boolean;
    reason: string | null;
    inboundMessageCount: number;
    recentWebhookHits?: number;
    recentInboundHits?: number;
    recentErrorHits?: number;
    lastWebhookAt?: string | null;
    lastWebhookError?: string | null;
    expectedCallbackUrl?: string | null;
    checks?: Record<string, boolean>;
  } | null>(null);

  const activePhoneRef = useRef<string | null>(null);
  activePhoneRef.current = activePhone;
  const searchRef = useRef('');
  searchRef.current = search;

  const fetchConversations = async () => {
    try {
      const r = await apiService.chat.listConversations({ search: searchRef.current });
      if (r?.success) {
        setConversations(r.data || []);
        setListError(null);
      }
    } catch (e: any) {
      // 404 typically means the backend hasn't been restarted with the new
      // /api/v1/chat routes yet. Show that to the user instead of an empty
      // state — silent failures hide real config problems.
      const status = e?.response?.status;
      const msg = e?.response?.data?.error?.message || e?.message;
      if (status === 404) {
        setListError(
          'Chat API not available — restart the backend to pick up the new routes.'
        );
      } else if (status === 401 || status === 403) {
        setListError('You don\'t have permission to view conversations.');
      } else {
        setListError(msg || 'Failed to load conversations');
      }
    } finally {
      setLoadingList(false);
    }
  };

  const fetchThread = async (phone: string) => {
    try {
      const r = await apiService.chat.getThread(phone);
      if (r?.success) {
        setMessages(r.data || []);
        setWindowStatus(r.windowStatus || null);
      }
    } catch (e: any) {
      // Ignore on polls
    } finally {
      setLoadingThread(false);
    }
  };

  // Initial load + 5s polling loop (list always; thread when one is open).
  useEffect(() => {
    fetchConversations();
    apiService.chat
      .webhookStatus()
      .then((r: any) => {
        if (r?.success) setWebhookStatus(r.data);
      })
      .catch(() => {});
    const id = setInterval(() => {
      fetchConversations();
      if (activePhoneRef.current) fetchThread(activePhoneRef.current);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Re-fetch list when the search term changes (debounced lightly via re-render).
  useEffect(() => {
    const t = setTimeout(fetchConversations, 250);
    return () => clearTimeout(t);
  }, [search]);

  // When the operator opens a different thread, fetch it + mark inbound as read.
  useEffect(() => {
    if (!activePhone) {
      setMessages([]);
      setWindowStatus(null);
      return;
    }
    setLoadingThread(true);
    fetchThread(activePhone);
    apiService.chat.markRead(activePhone).then(() => {
      // Optimistically zero out the unread badge in the list
      setConversations((prev) =>
        prev.map((c) => (c.phone === activePhone ? { ...c, unreadCount: 0 } : c))
      );
    }).catch(() => {});
  }, [activePhone]);

  // When the operator starts a chat with a contact that's not yet in the
  // conversations list (no prior messages), we keep their display info here
  // so the thread header still shows the right name. On the next poll after
  // a message is exchanged, conversations gets the row and this falls back
  // to its `find()` result naturally.
  const [pendingChat, setPendingChat] = useState<{ phone: string; name: string | null } | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  const activeConversation = useMemo(() => {
    const fromList = conversations.find((c) => c.phone === activePhone);
    if (fromList) return fromList;
    if (pendingChat && pendingChat.phone === activePhone) {
      return {
        phone: pendingChat.phone,
        name: pendingChat.name,
        contactId: null,
        lastSnippet: '',
        lastDirection: 'outbound' as const,
        lastAt: new Date().toISOString(),
        unreadCount: 0,
      } as Conversation;
    }
    return null;
  }, [conversations, activePhone, pendingChat]);

  const handleReplySent = () => {
    if (activePhone) fetchThread(activePhone);
    fetchConversations();
  };

  const handleManualRefresh = () => {
    setLoadingList(true);
    fetchConversations();
    if (activePhone) {
      setLoadingThread(true);
      fetchThread(activePhone);
    }
  };

  const handleStartNewChat = (phone: string, name: string | null) => {
    // Normalize phone to digits-only to match the canonical form the backend
    // uses for grouping. Without this, picking a contact stored as "+91..."
    // would create a separate bucket from any future Meta-side reply.
    const canonical = phone.replace(/[^\d]/g, '');
    if (!canonical) {
      toast.error('Selected contact has no valid phone number');
      return;
    }
    setPendingChat({ phone: canonical, name: name || null });
    setActivePhone(canonical);
    setShowNewChat(false);
  };

  return (
    <div
      className="h-[calc(100vh-4rem)] w-full flex overflow-hidden bg-gray-50 dark:bg-gray-950"
      style={{ display: 'flex', flexDirection: 'row' }}
    >
      <ConversationList
        conversations={conversations}
        activePhone={activePhone}
        loading={loadingList}
        error={listError}
        search={search}
        onSearchChange={setSearch}
        onSelect={setActivePhone}
        onRefresh={handleManualRefresh}
        onNewChat={() => setShowNewChat(true)}
        webhookStatus={webhookStatus}
      />

      <div
        className="flex flex-col"
        style={{ flex: '1 1 0%', minWidth: 0 }}
      >
        {activePhone ? (
          <>
            <ThreadHeader conversation={activeConversation} />
            <ChatThread messages={messages} loading={loadingThread} />
            <ChatComposer
              phone={activePhone}
              windowStatus={windowStatus}
              onSent={handleReplySent}
            />
          </>
        ) : (
          <EmptyThread />
        )}
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onSelect={handleStartNewChat}
        />
      )}
    </div>
  );
}

/* -------------------------- Conversation list ---------------------------- */

function ConversationList({
  conversations,
  activePhone,
  loading,
  error,
  search,
  onSearchChange,
  onSelect,
  onRefresh,
  onNewChat,
  webhookStatus,
}: {
  conversations: Conversation[];
  activePhone: string | null;
  loading: boolean;
  error: string | null;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (phone: string) => void;
  onRefresh: () => void;
  onNewChat: () => void;
  webhookStatus: {
    ready: boolean;
    reason: string | null;
    inboundMessageCount: number;
    recentWebhookHits?: number;
    recentInboundHits?: number;
    recentErrorHits?: number;
    lastWebhookAt?: string | null;
    lastWebhookError?: string | null;
    expectedCallbackUrl?: string | null;
    checks?: Record<string, boolean>;
  } | null;
}) {
  const navigate = useNavigate();
  // Surface a yellow banner when inbound messages can't arrive yet. Shown
  // either when the org config is incomplete (e.g. missing verify token —
  // the most common reason inbound messages "disappear") or when config
  // looks fine but Meta has never delivered a single inbound — usually
  // means the webhook URL isn't reachable from the public internet.
  const showSetupBanner =
    webhookStatus !== null &&
    (!webhookStatus.ready || webhookStatus.inboundMessageCount === 0);

  return (
    <div
      className="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-full"
      style={{ width: 320, flex: '0 0 320px', minWidth: 320 }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg text-gray-900 dark:text-white">Live Chat</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewChat}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Start a new chat with a contact"
            >
              <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              title="Refresh now (auto-refreshes every 5s)"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {showSetupBanner && (
        <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 flex-shrink-0">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1.5 flex-1 min-w-0">
              <p className="font-medium">Inbound messages not arriving</p>
              <p>
                {webhookStatus?.reason ||
                  'Your config looks complete but Meta hasn\'t delivered any inbound messages yet.'}
              </p>
              {webhookStatus?.expectedCallbackUrl && (
                <p className="break-all">
                  <span className="opacity-70">Callback URL: </span>
                  <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 rounded">
                    {webhookStatus.expectedCallbackUrl}
                  </code>
                </p>
              )}
              <p className="opacity-80">
                Last 24h: {webhookStatus?.recentWebhookHits ?? 0} hits ·{' '}
                {webhookStatus?.recentInboundHits ?? 0} inbound ·{' '}
                {webhookStatus?.recentErrorHits ?? 0} errors
              </p>
              {webhookStatus?.lastWebhookError && (
                <p className="text-red-700 dark:text-red-300 break-all">
                  Last error: {webhookStatus.lastWebhookError}
                </p>
              )}
              <div className="flex gap-3 pt-0.5">
                <button
                  onClick={() => navigate('/settings')}
                  className="text-xs underline text-yellow-900 dark:text-yellow-100 font-medium"
                >
                  WhatsApp Settings →
                </button>
                <button
                  onClick={() => navigate('/webhooks')}
                  className="text-xs underline text-yellow-900 dark:text-yellow-100 font-medium"
                >
                  Webhook Events →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm space-y-2">
            <p className="text-red-600 dark:text-red-400">⚠ {error}</p>
            <button
              onClick={onRefresh}
              className="mt-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 space-y-3">
            <p className="text-gray-700 dark:text-gray-300">No conversations yet.</p>
            <p>Conversations appear here when:</p>
            <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
              <li>You send a message via Send Message or a template</li>
              <li>A customer messages your WhatsApp Business number</li>
            </ul>
            <p className="text-xs pt-2">
              For inbound messages to arrive, your webhook URL must be configured
              in Meta App Dashboard with the org's Verify Token, and the WABA
              must be subscribed to the <code>messages</code> field.
            </p>
          </div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.phone}
              onClick={() => onSelect(c.phone)}
              className={`w-full px-4 py-3 flex items-start gap-3 text-left border-b border-gray-100 dark:border-gray-800 transition-colors ${
                activePhone === c.phone
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <Avatar name={c.name || c.phone} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-900 dark:text-white truncate">
                    {c.name || c.phone}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatRelative(c.lastAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 truncate">
                    {c.lastDirection === 'outbound' && (
                      <span className="text-gray-400">You: </span>
                    )}
                    {c.lastSnippet || <em>(no message body)</em>}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Thread ----------------------------------- */

function ThreadHeader({ conversation }: { conversation: Conversation | null }) {
  if (!conversation) return null;
  return (
    <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-[#f0f2f5] dark:bg-gray-900 flex items-center gap-3 flex-shrink-0">
      <Avatar name={conversation.name || conversation.phone} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-gray-900 dark:text-white truncate leading-tight">
          {conversation.name || formatPhoneDisplay(conversation.phone)}
        </p>
        <p className="text-xs text-gray-500 truncate leading-tight mt-0.5">
          {conversation.name ? formatPhoneDisplay(conversation.phone) : 'WhatsApp contact'}
        </p>
      </div>
    </div>
  );
}

// Pretty-print a digit-only phone like "918558815223" → "+91 85588 15223".
function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length <= 5) return `+${digits}`;
  // Best-effort: 2-digit country code + remainder split into 5+5 / 5+4 chunks.
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 11) {
    return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return `+${digits}`;
}

function ChatThread({
  messages,
  loading,
}: {
  messages: ChatMessage[];
  loading: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number | null>(null);

  // Auto-scroll to bottom when new messages arrive AND user was already near bottom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || messages.length === 0) return;
    const newest = messages[messages.length - 1];
    const isFirstLoad = lastIdRef.current === null;
    const hasNew = lastIdRef.current !== newest.id;
    lastIdRef.current = newest.id;
    if (isFirstLoad || hasNew) {
      // Delay one frame so layout is settled.
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#e5ddd5] dark:bg-gray-800">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      style={{
        // WhatsApp-like background. Solid color in dark mode; pale chat
        // doodle pattern at low opacity in light mode for ambient texture.
        backgroundColor: '#efeae2',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><circle cx='20' cy='20' r='1' fill='%23000' fill-opacity='0.04'/></svg>\")",
      }}
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-gray-600">
          No messages yet.
        </div>
      ) : (
        messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            showDate={shouldShowDateDivider(messages, i)}
          />
        ))
      )}
    </div>
  );
}

function MessageBubble({ message, showDate }: { message: ChatMessage; showDate: boolean }) {
  const isOut = message.direction === 'outbound';
  const tpl = message.template || null;
  const isCarousel = tpl?.templateType === 'carousel' && Array.isArray(tpl.cards) && tpl.cards.length > 0;
  const headerType = tpl?.headerType;
  const buttons = (tpl?.buttons || []) as Array<{ type?: string; text?: string; value?: string }>;

  return (
    <>
      {showDate && (
        <div className="flex justify-center my-3">
          <span className="px-3 py-1 bg-white/90 rounded-md text-[11px] uppercase tracking-wide text-gray-600 shadow-sm">
            {formatDateDivider(message.createdAt)}
          </span>
        </div>
      )}
      <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}>
        <div
          className={`max-w-[75%] px-2 py-1.5 shadow-sm relative ${
            isOut ? 'bg-[#d9fdd3] text-gray-900' : 'bg-white text-gray-900'
          }`}
          style={{
            // WhatsApp asymmetric corners — flat on the side that "points"
            // toward the timeline edge.
            borderRadius: isOut
              ? '7.5px 7.5px 0 7.5px'
              : '7.5px 7.5px 7.5px 0',
          }}
        >
          {/* Direct media on the message row (e.g. inbound image/video). */}
          {message.mediaUrl && message.mediaType === 'image' && (
            <img
              src={`${resolveMedia(message.mediaUrl)}`}
              alt=""
              className="rounded-md mb-1 max-w-full max-h-72 object-cover"
            />
          )}
          {message.mediaUrl && message.mediaType === 'video' && (
            <video
              src={`${resolveMedia(message.mediaUrl)}`}
              controls
              className="rounded-md mb-1 max-w-full max-h-72"
            />
          )}
          {message.mediaUrl && message.mediaType === 'audio' && (
            <audio src={`${resolveMedia(message.mediaUrl)}`} controls className="mb-1" />
          )}
          {message.mediaUrl && message.mediaType === 'document' && (
            <a
              href={`${resolveMedia(message.mediaUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-blue-600 underline mb-1 text-sm"
            >
              <FileText className="w-4 h-4" /> Document
            </a>
          )}

          {/* Template-attached header media (image/video header). The
              outbound message row itself has no mediaUrl for these — it's
              part of the template definition. */}
          {!message.mediaUrl && tpl?.headerContent && (headerType === 'image') && (
            <img
              src={resolveMedia(tpl.headerContent)}
              alt=""
              className="rounded-md mb-1 max-w-full max-h-72 object-cover"
            />
          )}
          {!message.mediaUrl && tpl?.headerContent && headerType === 'text' && (
            <p className="text-sm font-semibold text-gray-900 mb-1">{tpl.headerContent}</p>
          )}

          {/* Body / caption */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words pr-12">{message.content}</p>
          )}

          {/* Footer (template-defined) */}
          {tpl?.footer && (
            <p className="text-xs text-gray-500 mt-1">{tpl.footer}</p>
          )}

          {/* Carousel cards preview */}
          {isCarousel && (
            <div className="mt-2 -mx-1 flex gap-2 overflow-x-auto pb-1">
              {tpl!.cards!.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className="flex-shrink-0 w-44 bg-white rounded-md shadow border border-gray-200 overflow-hidden"
                >
                  {card.media?.url ? (
                    card.media.type === 'video' ? (
                      <video
                        src={resolveMedia(card.media.url)}
                        className="w-full h-24 object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={resolveMedia(card.media.url)}
                        alt=""
                        className="w-full h-24 object-cover"
                      />
                    )
                  ) : (
                    <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                      No image
                    </div>
                  )}
                  {card.content && (
                    <p className="px-2 py-1.5 text-xs text-gray-800 line-clamp-3">
                      {card.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick-reply / URL / phone buttons (template-defined) */}
          {buttons.length > 0 && (
            <div className="mt-2 -mx-1 space-y-0.5">
              {buttons.map((b, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1.5 text-xs text-blue-600 text-center border-t border-gray-200/70 bg-white/40 rounded-sm"
                >
                  {b.text || (b.type ? b.type.toUpperCase() : 'BUTTON')}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span className="text-[10px] text-gray-500">
              {formatTime(message.createdAt)}
            </span>
            {isOut && <StatusTicks status={message.deliveryStatus} />}
          </div>
        </div>
      </div>
    </>
  );
}

function StatusTicks({ status }: { status: ChatMessage['deliveryStatus'] }) {
  // Monochrome status indicators — differentiate by glyph + weight, not hue.
  //   queued/processing → faint ellipsis
  //   failed            → bold '!' (no red)
  //   sent              → single tick, mid-gray
  //   delivered         → double tick, mid-gray
  //   read              → double tick, solid black (or white in dark mode)
  if (status === 'queued' || status === 'processing') {
    return <span className="text-[10px] text-gray-400">…</span>;
  }
  if (status === 'failed') {
    return <span className="text-[10px] font-bold text-gray-900 dark:text-white">!</span>;
  }
  if (status === 'sent') {
    return <Check className="w-3 h-3 text-gray-500" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3 h-3 text-gray-500" />;
  }
  if (status === 'read') {
    return <CheckCheck className="w-3 h-3 text-gray-900 dark:text-white" strokeWidth={2.5} />;
  }
  return null;
}

/* ------------------------------ Composer --------------------------------- */

function ChatComposer({
  phone,
  windowStatus,
  onSent,
}: {
  phone: string;
  windowStatus: WindowStatus | null;
  onSent: () => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const open = !!windowStatus?.open;

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await apiService.chat.sendReply(phone, { text });
      setText('');
      onSent();
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error?.message || e?.message || 'Failed to send';
      if (status === 422) {
        toast.error(msg, { description: 'Use a template to reply.' });
        setShowTemplatePicker(true);
      } else {
        toast.error('Send failed', { description: msg });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-[#f0f2f5] dark:bg-gray-900">
      {/* Window banner — small status strip above the composer */}
      <div
        className={`px-4 py-1 text-[11px] ${
          open
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
        }`}
      >
        {open ? (
          <>
            Free-text replies allowed until{' '}
            {windowStatus?.expiresAt && formatTime(windowStatus.expiresAt)}.
          </>
        ) : (
          <>24-hour service window is closed — use an approved template.</>
        )}
      </div>

      <div className="px-3 py-2.5 flex items-end gap-2">
        <button
          onClick={() => setShowTemplatePicker(true)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex-shrink-0"
          title="Send a template"
          aria-label="Send a template"
        >
          <FileText className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={open ? 'Type a message' : 'Free-text disabled — use Template'}
          disabled={!open || sending}
          className="flex-1 px-4 py-2 text-sm bg-white dark:bg-gray-800 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={send}
          disabled={!open || !text.trim() || sending}
          className="w-10 h-10 flex-shrink-0 bg-[#00a884] hover:bg-[#017561] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-colors flex items-center justify-center"
          aria-label="Send"
          title="Send"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendIcon className="w-5 h-5" />}
        </button>
      </div>

      {showTemplatePicker && (
        <TemplatePicker
          phone={phone}
          onClose={() => setShowTemplatePicker(false)}
          onSent={() => {
            setShowTemplatePicker(false);
            onSent();
          }}
        />
      )}
    </div>
  );
}

function TemplatePicker({
  phone,
  onClose,
  onSent,
}: {
  phone: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApprovedTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    apiService.templates
      .list({ channel: 'whatsapp', status: 'approved', limit: 100 })
      .then((r: any) => {
        if (r?.success) setTemplates(r.data?.templates || r.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const send = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      await apiService.chat.sendReply(phone, {
        templateId: selected.id,
        variables,
      });
      toast.success('Template sent');
      onSent();
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.message || 'Failed';
      toast.error('Send failed', { description: msg });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-base text-gray-900 dark:text-white">Send Template</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No approved WhatsApp templates available. Create and submit one
              from Templates first.
            </p>
          ) : (
            <>
              <label className="block text-xs text-gray-600 dark:text-gray-400">Template</label>
              <select
                value={selected?.id || ''}
                onChange={(e) => {
                  const t = templates.find((x) => String(x.id) === e.target.value) || null;
                  setSelected(t);
                  setVariables({});
                }}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                <option value="">— Pick a template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.language})
                  </option>
                ))}
              </select>

              {selected && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selected.body}
                  </div>

                  {Array.isArray(selected.variables) && selected.variables.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs text-gray-600 dark:text-gray-400">
                        Variables
                      </label>
                      {selected.variables.map((v) => {
                        const key = String(v).replace(/[{}]/g, '');
                        return (
                          <input
                            key={key}
                            type="text"
                            value={variables[key] || ''}
                            onChange={(e) =>
                              setVariables((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder={key}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                          />
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={!selected || sending}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendIcon className="w-4 h-4" />}
            Send Template
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- New Chat (contact picker) ----------------------- */

interface ContactRow {
  id: number;
  phoneNumber: string | null;
  name: string | null;
  email?: string | null;
}

function NewChatModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (phone: string, name: string | null) => void;
}) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiService.contacts
      .list({ limit: 200, search: search || undefined })
      .then((r: any) => {
        if (r?.success) {
          const rows: ContactRow[] = (r.data?.contacts || r.data || []).map((c: any) => ({
            id: c.id,
            phoneNumber: c.phoneNumber || c.phone_number || null,
            name: c.name || null,
            email: c.email || null,
          }));
          // Drop email-only contacts — chat is phone-based.
          setContacts(rows.filter((c) => c.phoneNumber && c.phoneNumber !== 'email-only'));
        }
      })
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 className="text-base text-gray-900 dark:text-white">Start a Chat</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts by name or phone…"
              autoFocus
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              {search
                ? 'No contacts match.'
                : 'No contacts yet. Add one from the Contacts page first.'}
            </div>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.phoneNumber || '', c.name)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800"
              >
                <Avatar name={c.name || c.phoneNumber || '?'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {c.name || c.phoneNumber}
                  </p>
                  {c.name && c.phoneNumber && (
                    <p className="text-xs text-gray-500 truncate">{c.phoneNumber}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Misc helpers -------------------------------- */

function EmptyThread() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6">
      <div className="text-center max-w-sm">
        <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          Select a conversation from the left to view messages.
        </p>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
      {initial}
    </div>
  );
}

function shouldShowDateDivider(messages: ChatMessage[], i: number): boolean {
  if (i === 0) return true;
  const prev = new Date(messages[i - 1].createdAt);
  const cur = new Date(messages[i].createdAt);
  return prev.toDateString() !== cur.toDateString();
}

function formatDateDivider(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
