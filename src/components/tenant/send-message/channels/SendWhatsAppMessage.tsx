import { useState } from 'react';
import { Send, Clock, IndianRupee, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../../../../utils/api';
import { SendModeSelector } from '../SendModeSelector';
import { RecipientSelector } from '../shared/RecipientSelector';
import { MessageComposer, WhatsAppTemplatePreview, uploadHeaderMediaFile } from '../shared/MessageComposer';
import { resolveContactBindings } from '../shared/variableBindings';
import type { Channel, SendMode, MessageType, Recipient, MessageData, Template } from '../types';
import { estimateCost, formatINR, rateBreakdown } from '../../../../utils/pricing';
import { Paperclip, RefreshCw } from 'lucide-react';

export function SendWhatsAppMessage() {
  const [sendMode, setSendMode] = useState<SendMode>('single');
  const [messageType, setMessageType] = useState<MessageType>('template');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [placeholders, setPlaceholders] = useState<{ [key: string]: string }>({});
  const [textMessage, setTextMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedTemplateData, setSelectedTemplateData] = useState<Template | null>(null);
  // Dynamic media header — single-send override (operator clicks Replace below
  // the template picker) AND batch-wide default (set in the right panel when
  // sendMode === 'bulk'). Both are stored here so the preview, the panel, and
  // handleSend all read from one source. Per-recipient overrides live on each
  // Recipient row (managed by RecipientSelector).
  const [headerMediaUrl, setHeaderMediaUrl] = useState<string | null>(null);
  const [bulkHeaderUploading, setBulkHeaderUploading] = useState(false);

  const headerMediaType = (selectedTemplateData?.headerType
    && ['image', 'video', 'document'].includes(selectedTemplateData.headerType))
    ? (selectedTemplateData.headerType as 'image' | 'video' | 'document')
    : null;

  // WhatsApp pricing: per-template-category for template sends; free-text
  // replies inside the 24-hr customer-service window are "service" tier (free).
  const recipientCount = sendMode === 'single' ? 1 : recipients.length;
  const category =
    messageType === 'template'
      ? selectedTemplateData?.category || 'marketing'
      : 'service';
  const cost = estimateCost({ channel: 'whatsapp', category, recipientCount });

  /**
   * `skipApproval=true` is the "Approve & Send" path — message goes straight
   * to queued without manager review (requires canApproveMessages on the
   * server). `false` is the standard "Send for Approval" path.
   */
  const handleSend = async (skipApproval: boolean) => {
    if (sendMode === 'single') {
      if (!phoneNumber) {
        toast.error('Please enter a phone number');
        return;
      }
    } else {
      if (recipients.length === 0) {
        toast.error('Please add at least one recipient');
        return;
      }
    }

    if (messageType === 'template' && !selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    if (messageType === 'text' && !textMessage) {
      toast.error('Please enter a message');
      return;
    }

    try {
      if (sendMode === 'bulk') {
        const bulkRecipients = recipients.map((r) => ({
          phone: r.phone,
          name: r.name,
          // Each recipient's variables resolved independently — binding tokens
          // like {{contact.name}} expand to that recipient's name, blank if
          // the contact has no value saved for that field.
          variables: resolveContactBindings(placeholders, r),
          // Per-recipient header media override (uploaded via the paperclip
          // icon on the row in RecipientSelector). When unset, backend falls
          // back to the batch-wide headerMediaUrl below, then the template's
          // saved sample.
          ...(r.headerMediaUrl ? { headerMediaUrl: r.headerMediaUrl } : {}),
        }));

        const response = await apiService.messages.sendBulk({
          name: `Bulk WhatsApp send ${new Date().toISOString()}`,
          channel: 'whatsapp',
          templateId: selectedTemplate,
          recipients: bulkRecipients,
          priority: 'normal',
          skipApproval,
          // Batch-wide default for the dynamic media header (set in the right
          // panel — applies to every recipient that didn't set their own).
          ...(headerMediaUrl ? { headerMediaUrl } : {}),
        });

        if (response.success) {
          toast.success(
            skipApproval
              ? `Bulk send initiated! ${bulkRecipients.length} messages queued`
              : `Bulk send submitted for approval (${bulkRecipients.length} messages)`
          );
        }
      } else {
        toast.loading(skipApproval ? 'Sending message...' : 'Submitting for approval...', {
          id: 'send-message',
        });

        const messageData: MessageData = {
          channel: 'whatsapp',
          messageType: messageType === 'template' ? 'template' : 'text',
          recipientPhone: phoneNumber,
          priority: 'normal',
          skipApproval,
        };

        if (messageType === 'template') {
          messageData.templateId = selectedTemplate;
          messageData.variables = placeholders;
          // Operator clicked Replace under the template picker — pass the
          // uploaded /uploads/... URL through so the backend uses it instead
          // of the template's stored sample media.
          if (headerMediaUrl) {
            messageData.headerMediaUrl = headerMediaUrl;
          }
        } else {
          messageData.content = textMessage;
        }

        const response = await apiService.messages.send(messageData);

        if (response.success) {
          toast.success(
            skipApproval ? 'Message sent successfully!' : 'Submitted for approval',
            { id: 'send-message' }
          );
          setPhoneNumber('');
          setTextMessage('');
          setSelectedTemplate('');
          setPlaceholders({});
          setHeaderMediaUrl(null);
        } else {
          toast.error('Failed to send message', { id: 'send-message' });
        }
      }
    } catch (error: any) {
      toast.error('Failed to send message', {
        description: error.response?.data?.error?.message || error.message,
        id: sendMode === 'bulk' ? undefined : 'send-message',
      });
    }
  };

  return (
    <div className="space-y-6">
      <SendModeSelector sendMode={sendMode} onModeChange={setSendMode} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recipients */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg text-gray-900 dark:text-white mb-4">
              {sendMode === 'single' ? 'Recipient' : 'Recipients'}
            </h3>
            <RecipientSelector
              channel="whatsapp"
              sendMode={sendMode}
              recipients={recipients}
              onRecipientsChange={setRecipients}
              selectedContactId={selectedContactId}
              onContactSelect={setSelectedContactId}
              phoneNumber={phoneNumber}
              onPhoneNumberChange={setPhoneNumber}
              // Per-recipient header uploader only renders when the selected
              // template actually has a media header. In single mode this is
              // ignored — the single-send uploader lives in MessageComposer.
              headerMediaType={sendMode === 'bulk' ? headerMediaType : null}
            />
          </div>

          {/* Message Composer */}
          <MessageComposer
            channel="whatsapp"
            messageType={messageType}
            onMessageTypeChange={setMessageType}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={setSelectedTemplate}
            placeholders={placeholders}
            onPlaceholderChange={setPlaceholders}
            textMessage={textMessage}
            onTextMessageChange={setTextMessage}
            attachment={attachment}
            onAttachmentChange={setAttachment}
            onSelectedTemplateChange={setSelectedTemplateData}
            sendMode={sendMode}
            // Single-mode dynamic-media override flows through here. In bulk
            // mode the equivalent panel lives in the right rail (below).
            headerMediaUrl={sendMode === 'single' ? headerMediaUrl : null}
            onHeaderMediaUrlChange={setHeaderMediaUrl}
          />

          {/* Advanced Options */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg text-gray-900 dark:text-white mb-4">Advanced Options</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={scheduleMessage}
                onChange={(e) => setScheduleMessage(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Schedule for later</span>
              </div>
            </label>
            {scheduleMessage && (
              <div className="grid grid-cols-2 gap-4 mt-4 ml-7">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {/* Bulk batch-wide header media — only rendered when the selected
              template has a media header AND we're in bulk mode. Each
              recipient can still override this via their row's paperclip. */}
          {sendMode === 'bulk' && headerMediaType && (
            <BulkHeaderMediaPanel
              headerType={headerMediaType}
              templateSavedUrl={selectedTemplateData?.headerContent || ''}
              batchUrl={headerMediaUrl}
              uploading={bulkHeaderUploading}
              onUploadingChange={setBulkHeaderUploading}
              onBatchUrlChange={setHeaderMediaUrl}
            />
          )}

          {/* Cost Estimate */}
          <div className="colorful bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800 p-6">
            <div className="flex items-start gap-3 mb-4">
              <IndianRupee className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="text-green-900 dark:text-green-100 mb-1">Estimated Cost</h3>
                <p className="text-3xl text-green-600 dark:text-green-400">{formatINR(cost)}</p>
              </div>
            </div>
            <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <p>Recipients: {recipientCount}</p>
              <p className="capitalize">Category: {category}</p>
              <p className="text-xs opacity-80 pt-1">{rateBreakdown({ channel: 'whatsapp', category, recipientCount })}</p>
            </div>
          </div>

          {/* Send Buttons — two parallel actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSend(false)}
              className="px-3 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md text-sm"
              title="Submit this message for review by a manager"
            >
              <Send className="w-4 h-4" />
              Send for Approval
            </button>
            <button
              onClick={() => handleSend(true)}
              className="px-3 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md text-sm"
              title="Approve and send immediately (requires approval permission)"
            >
              <CheckCircle className="w-4 h-4" />
              Approve &amp; Send
            </button>
          </div>

          {/* Live WhatsApp Preview — sits below the cost + send actions so the
              primary CTAs stay above the fold. Only shown for template sends;
              text/media types don't need a chat-bubble preview. */}
          {messageType === 'template' && selectedTemplateData && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <WhatsAppTemplatePreview
                template={selectedTemplateData}
                placeholders={placeholders}
                // Preview reflects whatever bytes the customer will actually
                // see: single-mode override, batch-wide default in bulk, or
                // the template's saved sample. Per-recipient overrides aren't
                // previewed (the bubble shows one message at a time).
                headerMediaOverride={headerMediaUrl}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Bulk batch-wide header media panel ------------------------------ */

interface BulkHeaderMediaPanelProps {
  headerType: 'image' | 'video' | 'document';
  templateSavedUrl: string;
  batchUrl: string | null;
  uploading: boolean;
  onUploadingChange: (v: boolean) => void;
  onBatchUrlChange: (url: string | null) => void;
}

function BulkHeaderMediaPanel({
  headerType, templateSavedUrl, batchUrl, uploading, onUploadingChange, onBatchUrlChange,
}: BulkHeaderMediaPanelProps) {
  const ACCEPT: Record<'image' | 'video' | 'document', string> = {
    image: 'image/jpeg,image/png',
    video: 'video/mp4,video/3gpp',
    document: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain',
  };
  const MAX_MB: Record<'image' | 'video' | 'document', number> = { image: 5, video: 16, document: 100 };

  const onPick = async (e: any) => {
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;
    try {
      onUploadingChange(true);
      const { url } = await uploadHeaderMediaFile(file, headerType);
      onBatchUrlChange(url);
      toast.success('Batch header media set');
    } catch (err: any) {
      toast.error('Could not upload file', { description: err.message || String(err) });
    } finally {
      onUploadingChange(false);
      if (e.target) e.target.value = '';
    }
  };

  const isSet = !!batchUrl;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Header media — for everyone
        </p>
        <span className="text-xs text-gray-500">
          {headerType} · max {MAX_MB[headerType]} MB
        </span>
      </div>
      <p className="text-xs text-gray-500">
        {isSet
          ? 'All recipients get this file unless their row has its own upload.'
          : (templateSavedUrl
              ? 'Falls back to the template’s saved sample. Upload here to override for the whole batch.'
              : 'Template has no saved sample — upload a default for everyone.')}
      </p>
      <div className="flex items-center gap-2">
        <label className="flex-1 cursor-pointer text-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-center hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1">
          <Paperclip className="w-3 h-3" />
          {uploading ? 'Uploading…' : (isSet ? 'Change file' : 'Upload one for everyone')}
          <input type="file" accept={ACCEPT[headerType]} onChange={onPick} className="hidden" disabled={uploading} />
        </label>
        {isSet && (
          <button
            type="button"
            onClick={() => onBatchUrlChange(null)}
            className="text-xs px-2 py-2 text-gray-600 hover:text-red-600 flex items-center gap-1"
            title="Clear batch-wide header — fall back to the template’s saved sample"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

