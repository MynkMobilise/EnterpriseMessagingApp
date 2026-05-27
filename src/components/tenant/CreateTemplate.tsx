import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X,
  MessageSquare,
  Image as ImageIcon,
  Video,
  FileText,
  Plus,
  Trash2,
  Bold,
  Italic,
  Strikethrough,
  Upload,
  Eye,
  Copy,
  Link as LinkIcon,
  Clock,
  Sparkles,
  Send,
  MessageCircle,
  Smartphone,
  ChevronRight,
  Info,
  Save,
  AlertCircle,
  Mail,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService, MEDIA_HOST } from '../../utils/api';
import { validateEmail, validatePhone } from '../../utils/security';

interface CreateTemplateProps {
  // Optional callback overrides — kept for callers that don't go through React Router.
  // When unset, the component uses useParams() / useNavigate() directly.
  onClose?: () => void;
  onSave?: (template: any) => void;
  templateId?: string | number;
}

type Channel = 'whatsapp' | 'sms' | 'email' | 'fcm';
type TemplateType = 'standard' | 'carousel' | 'limited_time';
type HeaderType = 'none' | 'text' | 'image' | 'video' | 'document';
type ButtonType = 'url' | 'phone' | 'quick_reply';

interface CarouselCard {
  id: string;
  media: { type: 'image' | 'video'; url: string } | null;
  content: string;
  buttons: Button[];
}

interface Button {
  id: string;
  type: ButtonType;
  text: string;
  value: string;
}

// Unique-enough handle for client-state list items (cards, buttons). Plain
// `Date.now().toString()` collides when two are added inside the same ms,
// which then breaks React `key` lookups and submit-time card ordering.
function makeId(prefix = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Substitute {{n}} placeholders in body text with the user's sample values
 * so the live preview shows a realistic message. Falls back to "Sample N"
 * — matching what the backend sends to Meta as `example.body_text` when no
 * user-provided sample exists — so the preview never shows raw
 * placeholders.
 *
 *   - For standard templates, samples are keyed "1", "2", …
 *   - For carousel per-card bodies, pass prefix "card1.", "card2.", …
 *     and samples are keyed "card1.1", "card2.1", etc.
 */
function applySamples(
  text: string,
  samples: Record<string, string>,
  prefix: string = '',
): string {
  if (!text) return text;
  // Walk the matches in order so we can give each placeholder a stable
  // "Sample N" index for the fallback (N corresponds to 1-based occurrence).
  const seen: Record<string, number> = {};
  let order = 0;
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, varName) => {
    if (!(varName in seen)) seen[varName] = ++order;
    const v = samples?.[prefix + varName];
    if (typeof v === 'string' && v.length > 0) return v;
    return `Sample ${seen[varName]}`;
  });
}

export function CreateTemplate({ onClose, onSave, templateId: templateIdProp }: CreateTemplateProps) {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  // Prefer route param when present (deep-linked /templates/:id/edit), fall back to prop.
  const templateId = templateIdProp ?? params.id;
  const closeForm = onClose || (() => navigate('/templates'));
  const [loading, setLoading] = useState(!!templateId); // Load data if editing
  const isEditMode = !!templateId;
  
  // Channel Selection
  const [channel, setChannel] = useState<Channel>('whatsapp');

  // Basic Info
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('Marketing');
  const [language, setLanguage] = useState('en');
  const [templateType, setTemplateType] = useState<TemplateType>('standard');

  // Header (WhatsApp only)
  const [headerType, setHeaderType] = useState<HeaderType>('none');
  const [headerText, setHeaderText] = useState('');
  const [headerMedia, setHeaderMedia] = useState<File | null>(null);

  // Body
  const [bodyText, setBodyText] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  // Sample values for each {{n}} placeholder — sent to Meta as
  // `example.body_text` so reviewers can see what real content will look
  // like. Keyed by the variable name (e.g. "1", "2" — or "card1.1" for
  // carousel per-card variables). Empty values fall back to "Sample N"
  // at submission time so Meta always has something to display.
  const [variableSamples, setVariableSamples] = useState({} as Record<string, string>);

  // Email/FCM specific fields
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [plainTextBody, setPlainTextBody] = useState('');

  // SMS specific fields
  const [smsTemplateId, setSmsTemplateId] = useState('');

  // Test fields
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [selectedEmailConfig, setSelectedEmailConfig] = useState<string>('');
  const [emailConfigurations, setEmailConfigurations] = useState<any[]>([]);

  // Footer (WhatsApp only)
  const [footerText, setFooterText] = useState('');

  // Buttons (WhatsApp only)
  const [buttons, setButtons] = useState<Button[]>([]);

  // Carousel (WhatsApp only)
  const [carouselCards, setCarouselCards] = useState<CarouselCard[]>([
    { id: '1', media: null, content: '', buttons: [] },
  ]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Limited Time Offer
  const [offerCode, setOfferCode] = useState('');
  const [expirationDate, setExpirationDate] = useState('');

  // Preview
  const [showPreview, setShowPreview] = useState(true);

  const categories = ['Marketing', 'Transactional', 'Utility', 'Authentication'];
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'hi', name: 'Hindi' },
  ];

  // Load template data if editing
  useEffect(() => {
    if (templateId) {
      loadTemplateData();
    }
  }, [templateId]);

  const loadTemplateData = async () => {
    if (!templateId) return;
    
    try {
      setLoading(true);
      const response = await apiService.templates.getById(templateId.toString());
      
      if (response.success && response.data) {
        const template = response.data;
        
        // Set channel
        if (template.channel) {
          setChannel(template.channel as Channel);
        }
        
        // Set basic info
        setTemplateName(template.name || '');
        setCategory(template.category || 'Marketing');
        setLanguage(template.language || 'en');
        
        // Set channel-specific fields
        if (template.channel === 'email') {
          setSubject(template.subject || '');
          setHtmlBody(template.htmlBody || '');
          setPlainTextBody(template.plainTextBody || '');
          setBodyText(template.htmlBody || template.plainTextBody || template.body || '');
        } else if (template.channel === 'fcm') {
          setSubject(template.subject || '');
          setBodyText(template.body || '');
        } else if (template.channel === 'sms') {
          setBodyText(template.body || '');
          setSmsTemplateId(template.smsTemplateId || '');
        } else {
          setBodyText(template.body || '');
        }
        
        // Set variables
        if (Array.isArray(template.variables)) {
          setVariables(template.variables);
        }
        // Hydrate user-provided sample values for each placeholder so they
        // show in the input fields and Meta sees the same examples on
        // re-submission. Stored as a JSON object keyed by variable name.
        if (template.variableSamples && typeof template.variableSamples === 'object') {
          setVariableSamples(template.variableSamples);
        }
        
        // WhatsApp-specific fields
        if (template.channel === 'whatsapp') {
          setTemplateType((template.templateType as TemplateType) || 'standard');
          if (template.headerType) setHeaderType(template.headerType as HeaderType);
          if (template.headerContent) setHeaderText(template.headerContent);
          if (template.footer) setFooterText(template.footer);
          if (Array.isArray(template.buttons)) {
            setButtons(
              template.buttons.map((b: any, i: number) => ({
                id: b.id || String(i + 1),
                type: (b.type || 'url') as any,
                text: b.text || '',
                value: b.value || b.url || b.phone_number || '',
              }))
            );
          }
          if (Array.isArray(template.cards) && template.cards.length > 0) {
            setCarouselCards(
              template.cards.map((c: any, i: number) => ({
                id: c.id || String(i + 1),
                media: c.media || null,
                content: c.content || '',
                buttons: Array.isArray(c.buttons)
                  ? c.buttons.map((b: any, bi: number) => ({
                      id: b.id || String(bi + 1),
                      type: (b.type || 'url') as any,
                      text: b.text || '',
                      value: b.value || b.url || b.phone_number || '',
                    }))
                  : [],
              }))
            );
          }
        }
      } else {
        toast.error('Failed to load template', {
          description: response.error?.message || 'Template not found',
        });
        closeForm();
      }
    } catch (error: any) {
      toast.error('Failed to load template', {
        description: error.response?.data?.error?.message || error.message,
      });
      closeForm();
    } finally {
      setLoading(false);
    }
  };

  const addVariable = () => {
    const varNumber = variables.length + 1;
    const newVar = `{{${varNumber}}}`;
    setBodyText(bodyText + ' ' + newVar);
    setVariables([...variables, newVar]);
  };

  const addButton = () => {
    if (buttons.length >= 3) {
      toast.error('Maximum 3 buttons allowed');
      return;
    }
    setButtons([
      ...buttons,
      { id: makeId(), type: 'url', text: '', value: '' },
    ]);
  };

  const updateButton = (id: string, field: keyof Button, value: any) => {
    setButtons(buttons.map((btn) => (btn.id === id ? { ...btn, [field]: value } : btn)));
  };

  const removeButton = (id: string) => {
    setButtons(buttons.filter((btn) => btn.id !== id));
  };

  const addCarouselCard = () => {
    if (carouselCards.length >= 10) {
      toast.error('Maximum 10 cards allowed');
      return;
    }
    setCarouselCards([
      ...carouselCards,
      { id: makeId(), media: null, content: '', buttons: [] },
    ]);
    setActiveCardIndex(carouselCards.length);
  };

  const removeCarouselCard = (index: number) => {
    if (carouselCards.length === 1) {
      toast.error('At least one card is required');
      return;
    }
    const newCards = carouselCards.filter((_, i) => i !== index);
    setCarouselCards(newCards);
    setActiveCardIndex(Math.max(0, activeCardIndex - 1));
  };

  const updateCarouselCard = (index: number, updates: Partial<CarouselCard>) => {
    const newCards = [...carouselCards];
    newCards[index] = { ...newCards[index], ...updates };
    setCarouselCards(newCards);
  };

  const addCardButton = (cardIndex: number) => {
    const card = carouselCards[cardIndex];
    if (card.buttons.length >= 2) {
      toast.error('Maximum 2 buttons per card');
      return;
    }
    const newCards = [...carouselCards];
    newCards[cardIndex].buttons.push({
      id: makeId(),
      type: 'url',
      text: '',
      value: '',
    });
    setCarouselCards(newCards);
  };

  const updateCardButton = (
    cardIndex: number,
    buttonId: string,
    field: keyof Button,
    value: any
  ) => {
    const newCards = [...carouselCards];
    newCards[cardIndex].buttons = newCards[cardIndex].buttons.map((btn) =>
      btn.id === buttonId ? { ...btn, [field]: value } : btn
    );
    setCarouselCards(newCards);
  };

  const removeCardButton = (cardIndex: number, buttonId: string) => {
    const newCards = [...carouselCards];
    newCards[cardIndex].buttons = newCards[cardIndex].buttons.filter(
      (btn) => btn.id !== buttonId
    );
    setCarouselCards(newCards);
  };

  const getSMSSegmentCount = (text: string) => {
    const length = text.length;
    if (length === 0) return 0;
    if (length <= 160) return 1;
    return Math.ceil(length / 153);
  };

  const handleSave = async () => {
    if (!templateName) {
      toast.error('Template name is required');
      return;
    }

    // Validate based on channel
    if (channel === 'email') {
      if (!subject) {
        toast.error('Email subject is required');
        return;
      }
      if (!htmlBody && !plainTextBody) {
        toast.error('Email body (HTML or plain text) is required');
        return;
      }
    } else if (channel === 'fcm') {
      if (!subject) {
        toast.error('Notification title is required');
        return;
      }
      if (!bodyText) {
        toast.error('Notification message is required');
        return;
      }
    } else {
      if (!bodyText) {
        toast.error(
          channel === 'whatsapp' && templateType === 'carousel'
            ? 'Lede message (shown above carousel cards) is required'
            : 'Message content is required'
        );
        return;
      }
    }

    // ---- WhatsApp-specific pre-save validation ------------------------
    // These checks surface up-front so the user doesn't get a generic 400
    // from the backend or a confusing Meta-side rejection later.
    if (channel === 'whatsapp') {
      // 1) Media headers must have an uploaded file. headerText holds the
      //    uploaded media URL for media-typed headers; if it's empty, the
      //    user picked the type but never uploaded.
      if (templateType === 'standard' && ['image', 'video', 'document'].includes(headerType)) {
        if (!headerText) {
          toast.error(`Upload the ${headerType} file for the header`, {
            description: `Or change header type to "None" or "Text" if you don't need media.`,
          });
          return;
        }
      }

      // 2) Carousel: each card must have content AND media. Cards with
      //    null media can be saved locally (as draft) but never accepted
      //    by Meta — flag it now so the user knows.
      if (templateType === 'carousel') {
        for (let i = 0; i < carouselCards.length; i++) {
          const c = carouselCards[i];
          if (!c.content) {
            toast.error(`Card ${i + 1} is missing content`, {
              description: 'Each card needs body text.',
            });
            return;
          }
          if (!c.media || !c.media.url) {
            toast.error(`Card ${i + 1} is missing an image/video`, {
              description: 'Click the upload icon on the card to add media.',
            });
            return;
          }
        }
      }
    }

    try {
      const templateData: any = {
        channel,
        name: templateName,
        category: category.toLowerCase(),
        language,
        body: bodyText,
        variables: variables,
        // Only send keys that map to placeholders actually present in the
        // body (or a per-card body, prefixed `card{N}.`). Stale samples
        // from deleted vars would otherwise bloat the payload.
        variableSamples: (() => {
          if (!variableSamples || Object.keys(variableSamples).length === 0) return undefined;
          const validKeys = new Set<string>();
          const bodyMatches = [...(bodyText || '').matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)];
          bodyMatches.forEach((m) => validKeys.add(m[1]));
          carouselCards.forEach((c: any, idx: number) => {
            const m = [...((c.content || '').matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g))];
            m.forEach((mm: any) => validKeys.add(`card${idx + 1}.${mm[1]}`));
          });
          const out: Record<string, string> = {};
          Object.keys(variableSamples).forEach((k) => {
            if (validKeys.has(k)) out[k] = variableSamples[k];
          });
          return Object.keys(out).length > 0 ? out : undefined;
        })(),
      };

      // Channel-specific fields
      if (channel === 'whatsapp') {
        // When the operator picked "None" we need to actively CLEAR the
        // saved header — sending `undefined` drops the field from the PUT
        // body (axios omits undefined keys), so the backend leaves the
        // previous header_type / header_content in place and the change
        // silently doesn't apply. Send `null` to explicitly null out the
        // columns. Same applies to footer when emptied.
        templateData.headerType = headerType !== 'none' ? headerType : null;
        templateData.headerContent = headerType !== 'none' ? (headerText || null) : null;
        templateData.footer = footerText || null;
        templateData.buttons = buttons.length > 0 ? buttons : undefined;

        // Carousel: persist template type + per-card definitions. The body
        // field is still required as the carousel's "lede" message shown
        // above the cards.
        templateData.templateType = templateType; // 'standard' | 'carousel' | 'limited_time'
        if (templateType === 'carousel') {
          templateData.cards = carouselCards.map((c) => ({
            id: c.id,
            // Backend schema rejects empty media.url. If the URL is missing
            // (e.g. a Meta-imported card not yet re-uploaded, or a freshly
            // added card), normalize to null so save isn't blocked.
            media: c.media && c.media.url ? c.media : null,
            content: c.content,
            buttons: c.buttons || [],
          }));
        }
      } else if (channel === 'sms') {
        templateData.smsTemplateId = smsTemplateId || undefined;
      } else if (channel === 'email') {
        templateData.subject = subject;
        templateData.htmlBody = htmlBody || undefined;
        templateData.plainTextBody = plainTextBody || undefined;
        // For email, body can be HTML or plain text
        if (htmlBody) {
          templateData.body = htmlBody;
        } else if (plainTextBody) {
          templateData.body = plainTextBody;
        }
      } else if (channel === 'fcm') {
        templateData.subject = subject;
        templateData.body = bodyText;
      }

      if (isEditMode && templateId) {
        // Update existing template
        toast.loading('Updating template...', { id: 'update-template' });
        const response = await apiService.templates.update(templateId.toString(), templateData);

        if (response.success) {
          const channelLabel =
            channel === 'whatsapp' ? 'WhatsApp' :
            channel === 'sms' ? 'SMS' :
            channel === 'email' ? 'Email' : 'FCM';
          // Backend resets status to 'draft' when content changes — surface
          // that so the operator knows they need to re-submit for approval.
          const resetToDraft = response.data?.status === 'draft';
          toast.success(`${channelLabel} template updated`, {
            description: resetToDraft
              ? 'Approval status was reset — submit for approval again to enable sending.'
              : undefined,
            id: 'update-template',
          });
          if (onSave) onSave(response.data);
          closeForm();
        } else {
          toast.error('Failed to update template', {
            description: response.error?.message || 'An unknown error occurred',
            id: 'update-template',
          });
        }
      } else {
        // Create new template
        toast.loading('Creating template...', { id: 'create-template' });
        const response = await apiService.templates.create(templateData);
        
        if (response.success) {
          toast.success(`${channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'SMS' : channel === 'email' ? 'Email' : 'FCM'} template created successfully`, { id: 'create-template' });
          if (onSave) onSave(response.data);
          closeForm();
        } else {
          toast.error('Failed to create template', {
            description: response.error?.message || 'An unknown error occurred',
            id: 'create-template',
          });
        }
      }
    } catch (error: any) {
      // Surface backend field-level validation errors (Joi returns
      // { details: { 'cards.0.media.url': '"url" is not allowed to be empty' } })
      // so the user sees exactly which field rejected the payload.
      const errObj = error?.response?.data?.error;
      let detail = error.response?.data?.error?.message || error.message;
      if (errObj?.details && typeof errObj.details === 'object') {
        const lines = Object.entries(errObj.details).map(([k, v]) => `• ${k}: ${v}`);
        if (lines.length > 0) detail = lines.join('\n');
      }
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} template`, {
        description: detail,
        id: isEditMode ? 'update-template' : 'create-template',
        duration: 8000,
      });
    }
  };

  const handleChannelChange = (newChannel: Channel) => {
    setChannel(newChannel);
    // Reset WhatsApp-specific fields when switching away from WhatsApp
    if (newChannel !== 'whatsapp') {
      setTemplateType('standard');
      setHeaderType('none');
      setHeaderText('');
      setHeaderMedia(null);
      setFooterText('');
      setButtons([]);
      setCarouselCards([{ id: '1', media: null, content: '', buttons: [] }]);
    }
    // Reset Email/FCM fields when switching away from them
    if (newChannel !== 'email' && newChannel !== 'fcm') {
      setSubject('');
      setHtmlBody('');
      setPlainTextBody('');
    }
    // Reset test fields when switching channels
    setTestEmail('');
    setTestPhone('');
  };

  const isTemplateValidForTest = (): boolean => {
    if (channel === 'email') {
      return !!(subject && (htmlBody || plainTextBody) && testEmail && validateEmail(testEmail));
    } else if (channel === 'fcm') {
      return !!(subject && bodyText && testPhone);
    } else if (channel === 'sms') {
      return !!(bodyText && testPhone && validatePhone(testPhone));
    } else if (channel === 'whatsapp') {
      return !!(bodyText && testPhone && validatePhone(testPhone));
    }
    return false;
  };

  const getTestButtonTooltip = (): string => {
    if (channel === 'email' && !testEmail) {
      return 'Enter an email address to test';
    } else if ((channel === 'sms' || channel === 'whatsapp' || channel === 'fcm') && !testPhone) {
      return 'Enter a phone number to test';
    } else if (channel === 'email' && !validateEmail(testEmail)) {
      return 'Enter a valid email address';
    } else if ((channel === 'sms' || channel === 'whatsapp') && !validatePhone(testPhone)) {
      return 'Enter a valid phone number';
    }
    return 'Send a test message';
  };

  const handleSendTest = async () => {
    if (!isTemplateValidForTest()) {
      toast.error('Please fill in all required fields and test recipient');
      return;
    }

    try {
      setSendingTest(true);
      
      let testData: any = {
        channel,
        messageType: channel === 'email' ? 'html' : 'text', // Use 'html' for email, 'text' for others
        skipApproval: true, // Test messages should be auto-approved
      };

      if (channel === 'email') {
        testData.recipientEmail = testEmail;
        testData.subject = subject;
        // Use content instead of body, and prefer HTML if available
        if (htmlBody) {
          testData.content = htmlBody;
          testData.messageType = 'html';
        } else if (plainTextBody) {
          testData.content = plainTextBody;
          testData.messageType = 'text';
        }
        // Add email configuration ID if selected
        if (selectedEmailConfig) {
          testData.emailConfigurationId = selectedEmailConfig;
        }
      } else if (channel === 'fcm') {
        // FCM can use either phone number (for testing) or FCM token
        testData.recipientFcmToken = testPhone;
        testData.subject = subject;
        testData.content = bodyText;
      } else if (channel === 'sms') {
        testData.recipientPhone = testPhone;
        testData.content = bodyText;
        if (selectedSmsProvider) {
          testData.smsProvider = selectedSmsProvider;
        }
      } else if (channel === 'whatsapp') {
        testData.recipientPhone = testPhone;
        testData.content = bodyText;
        if (footerText) {
          testData.footer = footerText;
        }
      }

      const response = await apiService.messages.send(testData);
      
      if (response.success) {
        toast.success(`Test ${channel === 'email' ? 'email' : channel === 'fcm' ? 'notification' : 'message'} sent successfully!`);
        // Clear test fields after successful send
        setTestEmail('');
        setTestPhone('');
      } else {
        toast.error('Failed to send test message', {
          description: response.error?.message || 'An unknown error occurred',
        });
      }
    } catch (error: any) {
      toast.error('Failed to send test message', {
        description: error.response?.data?.error?.message || error.message,
      });
    } finally {
      setSendingTest(false);
    }
  };

  const activeCard = carouselCards[activeCardIndex];
  const smsSegments = getSMSSegmentCount(bodyText);
  const smsCharLimit = smsSegments <= 1 ? 160 : 153 * smsSegments;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="h-full flex flex-col max-w-[1920px] mx-auto">
        {/* SAP/Dynamics-style Header Bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          {/* Top Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <button
                onClick={() => closeForm()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl text-gray-900 dark:text-white flex items-center gap-2">
                  {isEditMode ? 'Edit Message Template' : 'Create Message Template'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {isEditMode ? 'Update your messaging template' : 'Design and configure your messaging template'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !isTemplateValidForTest()}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={getTestButtonTooltip()}
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Test
                  </>
                )}
              </button>
              <button
                onClick={() => closeForm()}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                {isEditMode ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </div>

          {/* Channel Selector - SAP/Dynamics style segmented control */}
          <div className="px-6 py-4">
            <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-md p-1 gap-1">
              <button
                onClick={() => handleChannelChange('whatsapp')}
                className={`px-4 py-2 text-sm rounded transition-all flex items-center gap-2 ${
                  channel === 'whatsapp'
                    ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={() => handleChannelChange('sms')}
                className={`px-4 py-2 text-sm rounded transition-all flex items-center gap-2 ${
                  channel === 'sms'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                SMS
              </button>
              <button
                onClick={() => handleChannelChange('email')}
                className={`px-4 py-2 text-sm rounded transition-all flex items-center gap-2 ${
                  channel === 'email'
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                onClick={() => handleChannelChange('fcm')}
                className={`px-4 py-2 text-sm rounded transition-all flex items-center gap-2 ${
                  channel === 'fcm'
                    ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Bell className="w-4 h-4" />
                FCM
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Basic Information
                  </h2>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Template Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., welcome_message"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Category <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Language <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Type Selection - WhatsApp Only */}
              {channel === 'whatsapp' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-base text-gray-900 dark:text-white">Template Type</h2>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setTemplateType('standard')}
                        className={`p-5 border-2 rounded-lg transition-all text-center ${
                          templateType === 'standard'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <MessageSquare className={`w-10 h-10 mx-auto mb-3 ${
                          templateType === 'standard' ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <p className="text-sm text-gray-900 dark:text-white mb-1">Standard</p>
                        <p className="text-xs text-gray-500">Basic message template</p>
                      </button>

                      <button
                        onClick={() => setTemplateType('carousel')}
                        className={`p-5 border-2 rounded-lg transition-all text-center ${
                          templateType === 'carousel'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Copy className={`w-10 h-10 mx-auto mb-3 ${
                          templateType === 'carousel' ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <p className="text-sm text-gray-900 dark:text-white mb-1">Carousel</p>
                        <p className="text-xs text-gray-500">Multiple card display</p>
                      </button>

                      <button
                        onClick={() => setTemplateType('limited_time')}
                        className={`p-5 border-2 rounded-lg transition-all text-center ${
                          templateType === 'limited_time'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Clock className={`w-10 h-10 mx-auto mb-3 ${
                          templateType === 'limited_time' ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <p className="text-sm text-gray-900 dark:text-white mb-1">Limited Time</p>
                        <p className="text-xs text-gray-500">Time-sensitive offers</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp Standard Template */}
              {channel === 'whatsapp' && templateType === 'standard' && (
                <>
                  {/* Header Section */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-base text-gray-900 dark:text-white">Header (Optional)</h2>
                      <p className="text-xs text-gray-500 mt-1">Add a title or media to your message</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex gap-2 flex-wrap">
                        {(['none', 'text', 'image', 'video', 'document'] as HeaderType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => setHeaderType(type)}
                            className={`px-4 py-2 text-sm rounded-md transition-all capitalize ${
                              headerType === type
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {type === 'none' ? 'None' : type}
                          </button>
                        ))}
                      </div>

                      {headerType === 'text' && (
                        <input
                          type="text"
                          value={headerText}
                          onChange={(e) => setHeaderText(e.target.value)}
                          placeholder="Enter header text (max 60 characters)"
                          maxLength={60}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        />
                      )}

                      {(headerType === 'image' || headerType === 'video' || headerType === 'document') && (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-800/50">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <label className="cursor-pointer">
                            <span className="text-sm text-blue-600 hover:text-blue-700">
                              {headerText ? `Replace ${headerType}` : `Upload ${headerType}`}
                            </span>
                            <input
                              type="file"
                              accept={
                                headerType === 'image'
                                  ? 'image/*'
                                  : headerType === 'video'
                                  ? 'video/*'
                                  : '.pdf,.doc,.docx'
                              }
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setHeaderMedia(file);
                                try {
                                  toast.loading('Uploading…', { id: 'header-upload' });
                                  const r = await apiService.media.upload(file);
                                  const url = r?.data?.url || r?.data?.media?.url;
                                  if (r?.success && url) {
                                    // headerText doubles as the URL when the
                                    // header is media — that's what the submit
                                    // payload reads from.
                                    setHeaderText(url);
                                    toast.success('Uploaded', { id: 'header-upload' });
                                  } else {
                                    toast.error('Upload failed', { id: 'header-upload' });
                                  }
                                } catch (err: any) {
                                  toast.error('Upload failed', {
                                    description: err?.response?.data?.error?.message || err?.message,
                                    id: 'header-upload',
                                  });
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          {headerMedia && (
                            <p className="text-sm text-green-600 dark:text-green-400 mt-3">
                              ✓ {headerMedia.name}
                            </p>
                          )}
                          {headerText && !headerMedia && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 break-all">
                              Saved: {headerText}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Section */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <div>
                        <h2 className="text-base text-gray-900 dark:text-white">
                          {templateType === 'carousel' ? 'Lede Message' : 'Message Content'} <span className="text-red-600">*</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                          {templateType === 'carousel'
                            ? 'The intro message shown above the carousel cards (required by Meta).'
                            : 'The main content of your message'}
                        </p>
                      </div>
                      <button
                        onClick={addVariable}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Variable
                      </button>
                    </div>
                    <div className="p-6 space-y-3">
                      <div className="flex gap-2 mb-2">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <Bold className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <Italic className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <Strikethrough className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                      <textarea
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder="Enter your message content. Use variables like {{1}}, {{2}} for personalization."
                        rows={6}
                        maxLength={1024}
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          Variables: {variables.length} • Use {' {{'} {' }}'} for placeholders
                        </p>
                        <p className="text-xs text-gray-500">{bodyText.length} / 1024</p>
                      </div>

                      {/* Per-variable sample inputs — sent to Meta as
                          `example.body_text` so the reviewer sees real-looking
                          content during approval. Required by Meta whenever
                          the body contains {{n}} placeholders. */}
                      {(() => {
                        const matches = [...(bodyText || '').matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)];
                        const uniq = Array.from(new Set(matches.map((m) => m[1])));
                        if (uniq.length === 0) return null;
                        const prefix = templateType === 'carousel' ? '' : '';
                        return (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Sample values</p>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  Meta uses these examples to review your template. Provide a realistic value for each placeholder.
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {uniq.map((varName) => (
                                <div key={varName} className="grid grid-cols-[100px_1fr] gap-2 items-center">
                                  <label className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                    {`{{${varName}}}`}
                                  </label>
                                  <input
                                    type="text"
                                    value={variableSamples[prefix + varName] || ''}
                                    onChange={(e: any) =>
                                      setVariableSamples({
                                        ...variableSamples,
                                        [prefix + varName]: e.target.value,
                                      })
                                    }
                                    placeholder={`Example for {{${varName}}} (e.g. "John")`}
                                    className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                  />
                                </div>
                              ))}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-2">
                              Left blank? We'll send "Sample 1", "Sample 2", … to Meta so the template still passes review.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Test Phone Input for WhatsApp */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-blue-200 dark:border-blue-800">
                      <h2 className="text-sm text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-600" />
                        Test Mobile Number
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">Enter a mobile number to send a test WhatsApp message</p>
                    </div>
                    <div className="p-6">
                      <input
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                      {testPhone && !validatePhone(testPhone) && (
                        <p className="text-red-500 text-xs mt-2">Please enter a valid phone number (e.g., +1234567890)</p>
                      )}
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-base text-gray-900 dark:text-white">Footer (Optional)</h2>
                      <p className="text-xs text-gray-500 mt-1">Add a short line of text at the bottom</p>
                    </div>
                    <div className="p-6">
                      <input
                        type="text"
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        placeholder="e.g., Powered by Acme Corporation"
                        maxLength={60}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Buttons Section */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <div>
                        <h2 className="text-base text-gray-900 dark:text-white">Action Buttons (Optional)</h2>
                        <p className="text-xs text-gray-500 mt-1">Add up to 3 interactive buttons</p>
                      </div>
                      <button
                        onClick={addButton}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Button
                      </button>
                    </div>
                    <div className="p-6 space-y-3">
                      {buttons.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No buttons added yet. Click "Add Button" to create interactive actions.
                        </div>
                      ) : (
                        buttons.map((button, index) => (
                          <div
                            key={button.id}
                            className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                Button {index + 1}
                              </span>
                              <button
                                onClick={() => removeButton(button.id)}
                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <select
                                value={button.type}
                                onChange={(e) =>
                                  updateButton(button.id, 'type', e.target.value as ButtonType)
                                }
                                className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                              >
                                <option value="url">Website URL</option>
                                <option value="phone">Phone Number</option>
                                <option value="quick_reply">Quick Reply</option>
                              </select>

                              <input
                                type="text"
                                value={button.text}
                                onChange={(e) => updateButton(button.id, 'text', e.target.value)}
                                placeholder="Button Label"
                                maxLength={25}
                                className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                              />

                              <input
                                type="text"
                                value={button.value}
                                onChange={(e) => updateButton(button.id, 'value', e.target.value)}
                                placeholder={
                                  button.type === 'url'
                                    ? 'https://example.com'
                                    : button.type === 'phone'
                                    ? '+1234567890'
                                    : 'Reply text'
                                }
                                className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* WhatsApp Carousel: Lede Message (required by Meta) */}
              {channel === 'whatsapp' && templateType === 'carousel' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-base text-gray-900 dark:text-white">
                      Lede Message <span className="text-red-600">*</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      The intro message shown above the carousel cards (required by Meta).
                    </p>
                  </div>
                  <div className="p-6 space-y-3">
                    <textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      placeholder="e.g. Check out our latest travel packages!"
                      rows={3}
                      maxLength={1024}
                      className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                    />
                    <p className="text-xs text-gray-500 text-right">{bodyText.length} / 1024</p>
                  </div>
                </div>
              )}

              {/* WhatsApp Carousel Template */}
              {channel === 'whatsapp' && templateType === 'carousel' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-base text-gray-900 dark:text-white">
                        Carousel Cards ({carouselCards.length}/10)
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Create up to 10 cards with images and buttons
                      </p>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Card Selector */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {carouselCards.map((card, index) => (
                        <button
                          key={card.id}
                          onClick={() => setActiveCardIndex(index)}
                          className={`flex-shrink-0 w-20 h-20 border-2 rounded-lg transition-all ${
                            activeCardIndex === index
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {card.media ? (
                            <div className="w-full h-full rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-500" />
                            </div>
                          ) : (
                            <div className="w-full h-full rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <span className="text-lg text-gray-400">{index + 1}</span>
                            </div>
                          )}
                        </button>
                      ))}
                      <button
                        onClick={addCarouselCard}
                        className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-all flex items-center justify-center"
                      >
                        <Plus className="w-6 h-6 text-gray-400" />
                      </button>
                    </div>

                    {/* Active Card Editor */}
                    {activeCard && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm text-gray-900 dark:text-white">
                            Card {activeCardIndex + 1} Content
                          </h3>
                          {carouselCards.length > 1 && (
                            <button
                              onClick={() => removeCarouselCard(activeCardIndex)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Media Upload — uploads to /api/v1/media (Media Library)
                            and stores the returned URL on the card so the
                            preview can render it. Replace/Remove controls appear
                            once an image is attached. */}
                        <div>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                            Media
                          </label>
                          {activeCard.media ? (
                            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 bg-white dark:bg-gray-900">
                              <div className="relative inline-block w-full">
                                {activeCard.media.type === 'image' ? (
                                  <img
                                    src={`${(import.meta as any).env?.VITE_API_BASE_URL || 'https://suchna.onmobilise.com'}${activeCard.media.url}`}
                                    alt={`Card ${activeCardIndex + 1} media`}
                                    className="max-h-56 mx-auto rounded object-contain"
                                  />
                                ) : (
                                  <video
                                    src={`${(import.meta as any).env?.VITE_API_BASE_URL || 'https://suchna.onmobilise.com'}${activeCard.media.url}`}
                                    controls
                                    className="max-h-56 mx-auto rounded"
                                  />
                                )}
                              </div>
                              <div className="flex justify-center gap-2 mt-3">
                                <label className="cursor-pointer text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                                  Replace
                                  <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const t = file.type.startsWith('video/') ? 'video' : 'image';
                                      try {
                                        const r = await apiService.media.upload(file);
                                        if (r?.success && r.data?.url) {
                                          updateCarouselCard(activeCardIndex, { media: { type: t, url: r.data.url } });
                                          toast.success('Media replaced');
                                        }
                                      } catch (err: any) {
                                        toast.error('Upload failed', {
                                          description: err.response?.data?.error?.message || err.message,
                                        });
                                      } finally {
                                        e.target.value = '';
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => updateCarouselCard(activeCardIndex, { media: null })}
                                  className="text-sm px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center bg-white dark:bg-gray-900">
                              <label className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload className="w-8 h-8 text-gray-400" />
                                <span className="text-sm text-blue-600">Upload image or video</span>
                                <span className="text-xs text-gray-500">JPG, PNG, MP4 — up to 16MB</span>
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const t = file.type.startsWith('video/') ? 'video' : 'image';
                                    if (file.size > 16 * 1024 * 1024) {
                                      toast.error('File too large', { description: 'Maximum 16MB' });
                                      return;
                                    }
                                    try {
                                      const r = await apiService.media.upload(file);
                                      if (r?.success && r.data?.url) {
                                        updateCarouselCard(activeCardIndex, { media: { type: t, url: r.data.url } });
                                        toast.success('Media uploaded');
                                      } else {
                                        toast.error('Upload failed', { description: r?.error?.message });
                                      }
                                    } catch (err: any) {
                                      toast.error('Upload failed', {
                                        description: err.response?.data?.error?.message || err.message,
                                      });
                                    } finally {
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Card Content */}
                        <div>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                            Card Content
                          </label>
                          <textarea
                            value={activeCard.content}
                            onChange={(e) =>
                              updateCarouselCard(activeCardIndex, { content: e.target.value })
                            }
                            placeholder="Enter card message content"
                            rows={4}
                            maxLength={160}
                            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                          />
                          <p className="text-xs text-gray-500 text-right mt-1">
                            {activeCard.content.length} / 160
                          </p>
                        </div>

                        {/* Card Buttons */}
                        <div>
                          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                            Card Buttons (max 2)
                          </label>
                          <div className="space-y-3">
                            {activeCard.buttons.map((button, btnIndex) => (
                              <div
                                key={button.id}
                                className="flex gap-2 items-center bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-300 dark:border-gray-700"
                              >
                                <select
                                  value={button.type}
                                  onChange={(e) =>
                                    updateCardButton(
                                      activeCardIndex,
                                      button.id,
                                      'type',
                                      e.target.value
                                    )
                                  }
                                  className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white flex-1"
                                >
                                  <option value="url">URL</option>
                                  <option value="phone">Phone</option>
                                  <option value="quick_reply">Quick Reply</option>
                                </select>
                                <input
                                  type="text"
                                  value={button.text}
                                  onChange={(e) =>
                                    updateCardButton(
                                      activeCardIndex,
                                      button.id,
                                      'text',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Button Text"
                                  maxLength={25}
                                  className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white flex-1"
                                />
                                <input
                                  type="text"
                                  value={button.value}
                                  onChange={(e) =>
                                    updateCardButton(
                                      activeCardIndex,
                                      button.id,
                                      'value',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Value"
                                  className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white flex-1"
                                />
                                <button
                                  onClick={() => removeCardButton(activeCardIndex, button.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => addCardButton(activeCardIndex)}
                              className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700"
                            >
                              <Plus className="w-4 h-4" />
                              Add Button
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Limited Time Offer */}
              {channel === 'whatsapp' && templateType === 'limited_time' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-base text-gray-900 dark:text-white">Limited Time Offer Details</h2>
                    <p className="text-xs text-gray-500 mt-1">Configure your time-sensitive promotion</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Offer Message <span className="text-red-600">*</span>
                      </label>
                      <textarea
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder="Limited time offer! Use code {{1}} before {{2}}"
                        rows={4}
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Offer Code
                        </label>
                        <input
                          type="text"
                          value={offerCode}
                          onChange={(e) => setOfferCode(e.target.value)}
                          placeholder="e.g., SAVE20"
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Expiration Date
                        </label>
                        <input
                          type="datetime-local"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Template */}
              {channel === 'sms' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-base text-gray-900 dark:text-white">
                        SMS Message Content <span className="text-red-600">*</span>
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Keep it concise - SMS is limited to 160 characters per segment
                      </p>
                    </div>
                    <button
                      onClick={addVariable}
                      className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Variable
                    </button>
                  </div>
                  <div className="p-6 space-y-3">
                    <textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      placeholder="Enter your SMS message. Use {{1}}, {{2}} for personalization. Keep it short and clear."
                      rows={5}
                      className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                    />
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Characters</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {bodyText.length} / {smsSegments <= 1 ? 160 : smsCharLimit}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-gray-300 dark:bg-gray-700"></div>
                        <div>
                          <p className="text-xs text-gray-500">SMS Segments</p>
                          <p className={`text-sm ${
                            smsSegments <= 1 
                              ? 'text-green-600 dark:text-green-400' 
                              : smsSegments <= 3 
                              ? 'text-orange-600 dark:text-orange-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {smsSegments} {smsSegments === 1 ? 'segment' : 'segments'}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-gray-300 dark:bg-gray-700"></div>
                        <div>
                          <p className="text-xs text-gray-500">Variables</p>
                          <p className="text-sm text-gray-900 dark:text-white">{variables.length}</p>
                        </div>
                      </div>
                      {smsSegments > 1 && (
                        <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                          <AlertCircle className="w-4 h-4" />
                          Multi-part message
                        </div>
                      )}
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900 dark:text-blue-100">
                          <p className="mb-1">SMS Pricing Information:</p>
                          <ul className="text-xs space-y-1 list-disc list-inside text-blue-800 dark:text-blue-200">
                            <li>1 segment = 160 characters (single SMS)</li>
                            <li>2+ segments = 153 characters per segment</li>
                            <li>Each segment is billed separately</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SMS Template ID (DOT Approved) */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-base text-gray-900 dark:text-white">
                        DOT Template ID
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the Department of Telecom (DOT) approved template ID for this SMS template
                      </p>
                    </div>
                    <div className="p-6">
                      <input
                        type="text"
                        value={smsTemplateId}
                        onChange={(e) => setSmsTemplateId(e.target.value)}
                        placeholder="e.g., 1207163922745202205"
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        This template ID is required when sending SMS through DOT-approved gateways. Leave empty if not using DOT templates.
                      </p>
                    </div>
                  </div>

                  {/* Test Phone Input for SMS */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-blue-200 dark:border-blue-800">
                      <h2 className="text-sm text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-600" />
                        Test Mobile Number
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">Enter a mobile number to send a test SMS</p>
                    </div>
                    <div className="p-6">
                      <input
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+1234567890"
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                      {testPhone && !validatePhone(testPhone) && (
                        <p className="text-red-500 text-xs mt-2">Please enter a valid phone number (e.g., +1234567890)</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Email Template */}
              {channel === 'email' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-base text-gray-900 dark:text-white">
                        Email Subject <span className="text-red-600">*</span>
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">The subject line of your email</p>
                    </div>
                    <div className="p-6">
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Welcome to our service!"
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <div>
                        <h2 className="text-base text-gray-900 dark:text-white">
                          HTML Body <span className="text-gray-500 text-xs">(Optional)</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Rich HTML content for your email</p>
                      </div>
                      <button
                        onClick={addVariable}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Variable
                      </button>
                    </div>
                    <div className="p-6 space-y-3">
                      <textarea
                        value={htmlBody}
                        onChange={(e) => setHtmlBody(e.target.value)}
                        placeholder="<html><body><h1>Hello {{name}}!</h1><p>Welcome to our platform.</p></body></html>"
                        rows={10}
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none font-mono"
                      />
                      <p className="text-xs text-gray-500">
                        Variables: {variables.length} • Use {' {{'} {' }}'} for placeholders
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <div>
                        <h2 className="text-base text-gray-900 dark:text-white">
                          Plain Text Body <span className="text-red-600">*</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">Plain text version (required if HTML is not provided)</p>
                      </div>
                      <button
                        onClick={addVariable}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Variable
                      </button>
                    </div>
                    <div className="p-6 space-y-3">
                      <textarea
                        value={plainTextBody}
                        onChange={(e) => setPlainTextBody(e.target.value)}
                        placeholder="Hello {{name}}, welcome to our platform!"
                        rows={8}
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                      />
                      <p className="text-xs text-gray-500">
                        Variables: {variables.length} • Use {' {{'} {' }}'} for placeholders
                      </p>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex gap-3">
                          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-900 dark:text-blue-100">
                            <p className="mb-1">Email Template Requirements:</p>
                            <ul className="text-xs space-y-1 list-disc list-inside text-blue-800 dark:text-blue-200">
                              <li>Either HTML body or plain text body is required</li>
                              <li>Plain text is used as fallback for email clients that don't support HTML</li>
                              <li>HTML body allows rich formatting and styling</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test Email Input */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-blue-200 dark:border-blue-800">
                      <h2 className="text-sm text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-600" />
                        Test Email Address
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">Enter an email address to send a test email</p>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Email Configuration Selector */}
                      {emailConfigurations.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email Configuration
                          </label>
                          <select
                            value={selectedEmailConfig}
                            onChange={(e) => setSelectedEmailConfig(e.target.value)}
                            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                          >
                            <option value="">Use Default Configuration</option>
                            {emailConfigurations.map((config) => (
                              <option key={config.id} value={config.id}>
                                {config.name} ({config.provider.toUpperCase()}) {config.isDefault ? '(Default)' : ''} {config.isFallback ? '(Fallback)' : ''}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Select which email configuration to use for testing</p>
                        </div>
                      )}
                      <div>
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="test@example.com"
                          className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        />
                        {testEmail && !validateEmail(testEmail) && (
                          <p className="text-red-500 text-xs mt-2">Please enter a valid email address</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FCM Template */}
              {channel === 'fcm' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-base text-gray-900 dark:text-white">
                        Notification Title <span className="text-red-600">*</span>
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">The title of your push notification</p>
                    </div>
                    <div className="p-6">
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., New Message!"
                        maxLength={100}
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        {subject.length} / 100 characters
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                      <div>
                        <h2 className="text-base text-gray-900 dark:text-white">
                          Notification Message <span className="text-red-600">*</span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">The body text of your push notification</p>
                      </div>
                      <button
                        onClick={addVariable}
                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Variable
                      </button>
                    </div>
                    <div className="p-6 space-y-3">
                      <textarea
                        value={bodyText}
                        onChange={(e) => setBodyText(e.target.value)}
                        placeholder="Hello {{name}}, you have a new notification!"
                        rows={5}
                        maxLength={500}
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          Variables: {variables.length} • Use {' {{'} {' }}'} for placeholders
                        </p>
                        <p className="text-xs text-gray-500">
                          {bodyText.length} / 500 characters
                        </p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                        <div className="flex gap-3">
                          <Info className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-orange-900 dark:text-orange-100">
                            <p className="mb-1">FCM Notification Guidelines:</p>
                            <ul className="text-xs space-y-1 list-disc list-inside text-orange-800 dark:text-orange-200">
                              <li>Title should be concise (recommended: 50 characters or less)</li>
                              <li>Message body should be clear and actionable</li>
                              <li>Use variables for personalization</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test Phone Input for FCM */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                    <div className="px-6 py-4 border-b border-blue-200 dark:border-blue-800">
                      <h2 className="text-sm text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                        <Send className="w-4 h-4 text-blue-600" />
                        Test Mobile Number / FCM Token
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">Enter a mobile number or FCM token to send a test notification</p>
                    </div>
                    <div className="p-6">
                      <input
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+1234567890 or FCM token"
                        className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="colorful w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 z-10">
                <h3 className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Live Preview
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  See how your {channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'SMS' : channel === 'email' ? 'Email' : 'FCM'} message will appear
                </p>
              </div>

              <div className="p-6">
                {/* Focused Template Preview — shows the body with sample
                    values substituted live, plus an inline editor for each
                    {{n}} placeholder. Mirrors the layout used in Send
                    Message's MessageComposer so what you preview here matches
                    what your operators will fill in later. */}
                {(() => {
                  const previewBody = bodyText || '';
                  const matches = [...previewBody.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)];
                  const uniqVars = Array.from(new Set(matches.map((m) => m[1])));
                  if (!previewBody) return null;
                  return (
                    <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Template Preview
                        </p>
                      </div>
                      <div className="p-4 space-y-4">
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                          {applySamples(previewBody, variableSamples)}
                        </p>
                        {uniqVars.length > 0 && (
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Fill in template variables
                            </p>
                            {uniqVars.map((varName) => (
                              <div key={varName} className="space-y-1">
                                <label className="block text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  {varName}
                                </label>
                                <input
                                  type="text"
                                  value={variableSamples[varName] || ''}
                                  onChange={(e: any) =>
                                    setVariableSamples({
                                      ...variableSamples,
                                      [varName]: e.target.value,
                                    })
                                  }
                                  placeholder={`Enter ${varName}`}
                                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {channel === 'whatsapp' ? (
                  /* WhatsApp Preview */
                  <div className="bg-gradient-to-b from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-4 shadow-lg border border-green-200 dark:border-green-800">
                    {/* Phone Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-t-xl p-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {templateName || 'Template Preview'}
                        </p>
                        <p className="text-xs text-gray-500">WhatsApp Business</p>
                      </div>
                    </div>

                    {/* Message Preview */}
                    <div className="bg-[#e5ddd5] dark:bg-gray-800 p-4 min-h-[400px]">
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm max-w-[85%] space-y-2">
                        {/* Header */}
                        {headerType === 'text' && headerText && (
                          <div className="pb-2 border-b border-gray-200 dark:border-gray-600">
                            <p className="text-sm text-gray-900 dark:text-white">
                              {applySamples(headerText, variableSamples)}
                            </p>
                          </div>
                        )}
                        {(headerType === 'image' || headerType === 'video' || headerType === 'document') && (
                          <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                            {/* headerText doubles as the uploaded media URL
                                when the header type is media. If present and
                                looks like a URL, render the actual asset;
                                otherwise fall back to the placeholder icon. */}
                            {headerText && /^(https?:|\/uploads\/)/i.test(headerText) ? (
                              headerType === 'image' ? (
                                <img
                                  src={headerText.startsWith('http') ? headerText : `${MEDIA_HOST}${headerText}`}
                                  alt="Header preview"
                                  className="w-full h-full object-cover"
                                />
                              ) : headerType === 'video' ? (
                                <video
                                  src={headerText.startsWith('http') ? headerText : `${MEDIA_HOST}${headerText}`}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              ) : (
                                <div className="flex flex-col items-center text-gray-500">
                                  <FileText className="w-10 h-10" />
                                  <span className="text-[10px] mt-1 truncate max-w-[140px]">
                                    {headerText.split('/').pop()}
                                  </span>
                                </div>
                              )
                            ) : headerType === 'image' ? (
                              <ImageIcon className="w-10 h-10 text-gray-400" />
                            ) : headerType === 'video' ? (
                              <Video className="w-10 h-10 text-gray-400" />
                            ) : (
                              <FileText className="w-10 h-10 text-gray-400" />
                            )}
                          </div>
                        )}

                        {/* Body */}
                        {templateType === 'carousel' ? (
                          <div className="space-y-2">
                            <div className="w-full h-28 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                              {activeCard?.media?.url ? (
                                activeCard.media.type === 'video' ? (
                                  <video
                                    src={activeCard.media.url.startsWith('http') ? activeCard.media.url : `${MEDIA_HOST}${activeCard.media.url}`}
                                    className="w-full h-full object-cover"
                                    muted
                                  />
                                ) : (
                                  <img
                                    src={activeCard.media.url.startsWith('http') ? activeCard.media.url : `${MEDIA_HOST}${activeCard.media.url}`}
                                    alt="Card media"
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
                              {applySamples(
                                activeCard?.content || 'Card content...',
                                variableSamples,
                                `card${activeCardIndex + 1}.`,
                              )}
                            </p>
                            <p className="text-xs text-gray-500 text-center">
                              {activeCardIndex + 1} of {carouselCards.length}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">
                            {applySamples(
                              bodyText || 'Your message content will appear here...',
                              variableSamples,
                            )}
                          </p>
                        )}

                        {/* Footer */}
                        {footerText && (
                          <p className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-600">
                            {footerText}
                          </p>
                        )}

                        {/* Buttons */}
                        {((templateType === 'standard' && buttons.length > 0) ||
                          (templateType === 'carousel' && activeCard?.buttons.length > 0)) && (
                          <div className="pt-2 space-y-1">
                            {(templateType === 'standard' ? buttons : activeCard?.buttons || []).map(
                              (btn, idx) => (
                                <button
                                  key={idx}
                                  className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-center flex items-center justify-center gap-2"
                                >
                                  {btn.type === 'url' && <LinkIcon className="w-3 h-3" />}
                                  {btn.text || 'Button'}
                                </button>
                              )
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-xs text-gray-500 text-right mt-2">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Now
                        </p>
                      </div>
                    </div>

                    {/* Phone Footer */}
                    <div className="bg-white dark:bg-gray-800 rounded-b-xl p-3 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type a message"
                        disabled
                        className="flex-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 rounded-full"
                      />
                    </div>
                  </div>
                ) : channel === 'sms' ? (
                  /* SMS Preview */
                  <div className="space-y-4">
                    <div className="bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-4 shadow-lg border border-gray-300 dark:border-gray-700">
                      {/* Phone Header */}
                      <div className="bg-white dark:bg-gray-800 rounded-t-xl p-3 flex items-center gap-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {templateName || 'SMS Preview'}
                          </p>
                          <p className="text-xs text-gray-500">Text Message</p>
                        </div>
                      </div>

                      {/* Message Preview */}
                      <div className="bg-gray-100 dark:bg-gray-800 p-4 min-h-[300px]">
                        <div className="bg-green-600 text-white rounded-2xl rounded-bl-sm p-3 shadow-sm max-w-[85%] space-y-1">
                          <p className="text-xs whitespace-pre-wrap">
                            {applySamples(bodyText || 'Your SMS message will appear here...', variableSamples)}
                          </p>
                          <p className="text-xs opacity-75 text-right">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Now
                          </p>
                        </div>
                      </div>

                      {/* Phone Footer */}
                      <div className="bg-white dark:bg-gray-800 rounded-b-xl p-3 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Text Message"
                          disabled
                          className="flex-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 rounded-full"
                        />
                      </div>
                    </div>

                    {/* SMS Info Card */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm text-gray-900 dark:text-white mb-3">SMS Details</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Characters:</span>
                          <span className="text-gray-900 dark:text-white">{bodyText.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Segments:</span>
                          <span className={`${
                            smsSegments <= 1 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-orange-600 dark:text-orange-400'
                          }`}>
                            {smsSegments}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Variables:</span>
                          <span className="text-gray-900 dark:text-white">{variables.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Estimated Cost:</span>
                          <span className="text-gray-900 dark:text-white">
                            ${(smsSegments * 0.0075).toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : channel === 'email' ? (
                  /* Email Preview */
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 shadow-lg p-6">
                      <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <span className="text-sm text-gray-500">Email Preview</span>
                        </div>
                        <h3 className="text-base text-gray-900 dark:text-white font-semibold">
                          {subject || 'Email Subject'}
                        </h3>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {htmlBody ? (
                          <div dangerouslySetInnerHTML={{ __html: applySamples(htmlBody, variableSamples) || '<p>Your HTML email content will appear here...</p>' }} />
                        ) : (
                          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {applySamples(plainTextBody || 'Your plain text email content will appear here...', variableSamples)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* FCM Preview */
                  <div className="space-y-4">
                    <div className="bg-gradient-to-b from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-4 shadow-lg border border-orange-200 dark:border-orange-800">
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bell className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                              {applySamples(subject || 'Notification Title', variableSamples)}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {applySamples(bodyText || 'Your notification message will appear here...', variableSamples)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span>Push Notification</span>
                          <span>
                            <Clock className="w-3 h-3 inline mr-1" />
                            Now
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
