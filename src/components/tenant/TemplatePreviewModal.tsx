import { useEffect, useState } from 'react';
import {
  X,
  MessageCircle,
  Link as LinkIcon,
  Phone,
  Clock,
  FileText,
  Image as ImageIcon,
  Video,
  Smartphone,
  Mail,
  Bell,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiService, MEDIA_HOST } from '../../utils/api';
import { toast } from 'sonner';

interface TemplatePreviewModalProps {
  templateId: number | string;
  onClose: () => void;
}

interface PreviewButton {
  type: string;
  text: string;
  value?: string;
}

interface PreviewCard {
  media?: { url?: string; type?: string } | null;
  content?: string;
  buttons?: PreviewButton[];
}

interface PreviewTemplate {
  id: number;
  name: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'fcm';
  category?: string;
  language?: string;
  body?: string;
  subject?: string;
  htmlBody?: string;
  plainTextBody?: string;
  templateType?: 'standard' | 'carousel';
  headerType?: 'none' | 'text' | 'image' | 'video' | 'document';
  headerContent?: string;
  footer?: string;
  buttons?: PreviewButton[];
  cards?: PreviewCard[];
}

/**
 * Read-only template preview modal — opened from the Templates list's
 * eye icon. Fetches the full template by id and renders a channel-aware
 * mock (WhatsApp / SMS / Email / FCM).
 *
 * The visual style mirrors the live preview pane in CreateTemplate.tsx,
 * so anything that renders there renders here.
 */
export function TemplatePreviewModal({ templateId, onClose }: TemplatePreviewModalProps) {
  const [template, setTemplate] = useState<PreviewTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const r = await apiService.templates.getById(String(templateId));
        if (cancelled) return;
        if (r?.success && r.data) {
          setTemplate(r.data as PreviewTemplate);
        } else {
          toast.error('Failed to load template', {
            description: r?.error?.message || 'Template not found',
          });
          onClose();
        }
      } catch (e: any) {
        if (cancelled) return;
        toast.error('Failed to load template', {
          description: e?.response?.data?.error?.message || e?.message,
        });
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchTemplate();
    return () => {
      cancelled = true;
    };
  }, [templateId, onClose]);

  const resolveMedia = (url?: string) => {
    if (!url) return '';
    if (/^https?:/i.test(url)) return url;
    return `${MEDIA_HOST}${url}`;
  };

  const activeCard = template?.cards?.[activeCardIndex];
  const buttons = template?.buttons || [];

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {template?.channel === 'whatsapp' && <MessageCircle className="w-4 h-4 text-green-600" />}
              {template?.channel === 'sms' && <Smartphone className="w-4 h-4 text-gray-600" />}
              {template?.channel === 'email' && <Mail className="w-4 h-4 text-blue-600" />}
              {template?.channel === 'fcm' && <Bell className="w-4 h-4 text-purple-600" />}
              {!template?.channel && <FileText className="w-4 h-4 text-gray-400" />}
            </div>
            <div>
              <h3 className="text-sm text-gray-900 dark:text-white">
                {template?.name || 'Template Preview'}
              </h3>
              <p className="text-xs text-gray-500 capitalize">
                {template?.channel || ''} {template?.category ? `· ${template.category}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="colorful flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !template ? (
            <p className="text-center text-gray-500 py-20">Template not available</p>
          ) : template.channel === 'whatsapp' ? (
            <div className="bg-gradient-to-b from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-4 shadow-lg border border-green-200 dark:border-green-800">
              {/* Phone Header */}
              <div className="bg-white dark:bg-gray-800 rounded-t-xl p-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{template.name}</p>
                  <p className="text-xs text-gray-500">WhatsApp Business</p>
                </div>
              </div>

              {/* Message Bubble */}
              <div className="bg-[#e5ddd5] dark:bg-gray-800 p-4 min-h-[400px]">
                <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm max-w-[90%] space-y-2">
                  {/* Header */}
                  {template.headerType === 'text' && template.headerContent && (
                    <div className="pb-2 border-b border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-900 dark:text-white">{template.headerContent}</p>
                    </div>
                  )}
                  {(template.headerType === 'image' ||
                    template.headerType === 'video' ||
                    template.headerType === 'document') && (
                    <div className="w-full h-36 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                      {template.headerContent && /^(https?:|\/uploads\/)/i.test(template.headerContent) ? (
                        template.headerType === 'image' ? (
                          <img
                            src={resolveMedia(template.headerContent)}
                            alt="Header"
                            className="w-full h-full object-cover"
                          />
                        ) : template.headerType === 'video' ? (
                          <video
                            src={resolveMedia(template.headerContent)}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <a
                            href={resolveMedia(template.headerContent)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex flex-col items-center text-gray-600 hover:text-blue-600"
                          >
                            <FileText className="w-10 h-10" />
                            <span className="text-[10px] mt-1 truncate max-w-[180px]">
                              {template.headerContent.split('/').pop()}
                            </span>
                          </a>
                        )
                      ) : template.headerType === 'image' ? (
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                      ) : template.headerType === 'video' ? (
                        <Video className="w-10 h-10 text-gray-400" />
                      ) : (
                        <FileText className="w-10 h-10 text-gray-400" />
                      )}
                    </div>
                  )}

                  {/* Body */}
                  {template.templateType === 'carousel' && template.cards && template.cards.length > 0 ? (
                    <div className="space-y-2">
                      <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                        {activeCard?.media?.url ? (
                          activeCard.media.type === 'video' ? (
                            <video
                              src={resolveMedia(activeCard.media.url)}
                              controls
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={resolveMedia(activeCard.media.url)}
                              alt="Card"
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : activeCard?.media?.type === 'video' ? (
                          <Video className="w-8 h-8 text-gray-400" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">
                        {activeCard?.content || 'Card content...'}
                      </p>

                      {/* Card buttons */}
                      {activeCard?.buttons && activeCard.buttons.length > 0 && (
                        <div className="pt-1 space-y-1">
                          {activeCard.buttons.map((btn, i) => (
                            <div
                              key={i}
                              className="w-full py-1.5 text-xs text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-gray-600 text-center flex items-center justify-center gap-1"
                            >
                              {btn.type === 'url' && <LinkIcon className="w-3 h-3" />}
                              {btn.type === 'phone' && <Phone className="w-3 h-3" />}
                              {btn.text || 'Button'}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Carousel pager */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => setActiveCardIndex((i) => Math.max(0, i - 1))}
                          disabled={activeCardIndex === 0}
                          className="p-1 disabled:opacity-30 text-gray-600 dark:text-gray-300"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-gray-500">
                          {activeCardIndex + 1} of {template.cards.length}
                        </span>
                        <button
                          onClick={() =>
                            setActiveCardIndex((i) =>
                              Math.min((template.cards?.length ?? 1) - 1, i + 1)
                            )
                          }
                          disabled={activeCardIndex >= (template.cards.length - 1)}
                          className="p-1 disabled:opacity-30 text-gray-600 dark:text-gray-300"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {template.body || 'No body content'}
                    </p>
                  )}

                  {/* Footer */}
                  {template.footer && (
                    <p className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-600">
                      {template.footer}
                    </p>
                  )}

                  {/* Buttons (standard) */}
                  {template.templateType !== 'carousel' && buttons.length > 0 && (
                    <div className="pt-2 space-y-1">
                      {buttons.map((btn, idx) => (
                        <div
                          key={idx}
                          className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-gray-600 text-center flex items-center justify-center gap-2"
                        >
                          {btn.type === 'url' && <LinkIcon className="w-3 h-3" />}
                          {btn.type === 'phone' && <Phone className="w-3 h-3" />}
                          {btn.text || 'Button'}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-right mt-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Now
                  </p>
                </div>
              </div>
            </div>
          ) : template.channel === 'sms' ? (
            <div className="bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 shadow-lg border border-gray-300 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 max-w-[85%]">
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {template.body || 'No SMS content'}
                </p>
                <p className="text-[10px] text-gray-500 mt-2 text-right">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Now
                </p>
              </div>
            </div>
          ) : template.channel === 'email' ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500">Subject</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {template.subject || '(no subject)'}
                </p>
              </div>
              <div className="p-4">
                {template.htmlBody ? (
                  <div
                    className="text-sm text-gray-900 dark:text-white prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: template.htmlBody }}
                  />
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {template.plainTextBody || template.body || 'No email content'}
                  </p>
                )}
              </div>
            </div>
          ) : template.channel === 'fcm' ? (
            <div className="bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 shadow-lg border border-purple-200 dark:border-purple-800">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {template.subject || template.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                      {template.body || 'No notification body'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-2">Now</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-20">
              Unsupported channel: {template.channel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
