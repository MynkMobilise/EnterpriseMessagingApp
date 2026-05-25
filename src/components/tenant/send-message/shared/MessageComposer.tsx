import { useState, useEffect, useRef } from 'react';
import { FileText, MessageSquare, Upload, Search, ChevronDown } from 'lucide-react';
import { apiService } from '../../../../utils/api';
import { useOrganization } from '../../../../contexts/OrganizationContext';
import type { Channel, MessageType, Template } from '../types';

interface MessageComposerProps {
  channel: Channel;
  messageType: MessageType;
  onMessageTypeChange: (type: MessageType) => void;
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
  placeholders: { [key: string]: string };
  onPlaceholderChange: (placeholders: { [key: string]: string }) => void;
  textMessage: string;
  onTextMessageChange: (text: string) => void;
  attachment: File | null;
  onAttachmentChange: (file: File | null) => void;
  /** Optional — parent can react to the selected template (e.g. compute cost
   *  from category). Fires whenever the resolved template changes. */
  onSelectedTemplateChange?: (template: Template | null) => void;
}

export function MessageComposer({
  channel,
  messageType,
  onMessageTypeChange,
  selectedTemplate,
  onTemplateSelect,
  placeholders,
  onPlaceholderChange,
  textMessage,
  onTextMessageChange,
  attachment,
  onAttachmentChange,
  onSelectedTemplateChange,
}: MessageComposerProps) {
  const { currentOrganization } = useOrganization();
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (!currentOrganization) return;

    const fetchTemplates = async () => {
      try {
        const response = await apiService.templates.list({ status: 'approved', limit: 100 });
        if (response.success && response.data) {
          const templatesData = response.data.templates || response.data;
          const filteredTemplates = templatesData
            .filter((template: any) => template.channel === channel)
            .map((template: any) => ({
              id: template.id,
              name: template.name,
              channel: template.channel,
              content: template.body || template.htmlBody || template.plainTextBody || '',
              variables: template.variables || [],
              buttons: template.buttons || [],
              category: template.category,
              status: template.status,
              subject: template.subject,
              htmlBody: template.htmlBody,
              plainTextBody: template.plainTextBody,
            }));
          setTemplates(filteredTemplates);
        }
      } catch (error: any) {
        console.error('Failed to fetch templates:', error);
      }
    };
    fetchTemplates();
  }, [channel, currentOrganization?.id]);

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

  // Notify parent whenever the resolved template object changes so it can
  // react (e.g. recompute cost based on the template's category).
  useEffect(() => {
    if (onSelectedTemplateChange) onSelectedTemplateChange(selectedTemplateData || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, templates.length]);

  // Searchable template dropdown — replaces the native <select> so users
  // with many approved templates can filter by name or category.
  const [tplSearch, setTplSearch] = useState('');
  const [tplOpen, setTplOpen] = useState(false);
  const tplRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (tplRef.current && !tplRef.current.contains(e.target as Node)) {
        setTplOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filteredTemplates = (() => {
    const q = tplSearch.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
    );
  })();

  // Extract variables from template content based on channel
  const extractVariablesFromTemplate = (template: Template | undefined): string[] => {
    if (!template) return [];
    
    // If variables are already provided, use them
    if (template.variables && template.variables.length > 0) {
      return template.variables;
    }
    
    // Otherwise, extract from content based on channel
    const content = template.content || '';
    
    if (channel === 'sms') {
      // Extract #var# variables for SMS
      const matches = content.match(/#var#/g) || [];
      // Return var1, var2, var3, etc. based on count
      return Array.from({ length: matches.length }, (_, i) => `var${i + 1}`);
    } else {
      // Extract {{var}} variables for WhatsApp, Email, FCM
      const matches = content.match(/\{\{(\w+)\}\}/g) || [];
      return Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ''))));
    }
  };

  const templateVariables = extractVariablesFromTemplate(selectedTemplateData);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg text-gray-900 dark:text-white mb-4">Message Type</h3>
      
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => onMessageTypeChange('template')}
          className={`p-4 border-2 rounded-lg transition-all ${
            messageType === 'template'
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-900 dark:text-white">Template</p>
        </button>
        <button
          onClick={() => onMessageTypeChange('text')}
          className={`p-4 border-2 rounded-lg transition-all ${
            messageType === 'text'
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <MessageSquare className="w-6 h-6 mx-auto mb-2 text-green-600" />
          <p className="text-sm text-gray-900 dark:text-white">Text</p>
        </button>
        {channel === 'whatsapp' && (
          <button
            onClick={() => onMessageTypeChange('media')}
            className={`p-4 border-2 rounded-lg transition-all ${
              messageType === 'media'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <Upload className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-sm text-gray-900 dark:text-white">Media</p>
          </button>
        )}
      </div>

      {/* Template Selection */}
      {messageType === 'template' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Select Template <span className="text-red-500">*</span>
            </label>
            <div ref={tplRef} className="relative">
              <button
                type="button"
                onClick={() => setTplOpen((o) => !o)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between"
                aria-haspopup="listbox"
                aria-expanded={tplOpen}
              >
                <span className={selectedTemplateData ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                  {selectedTemplateData
                    ? `${selectedTemplateData.name}${selectedTemplateData.category ? ` (${selectedTemplateData.category})` : ''}`
                    : 'Choose a template...'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${tplOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {tplOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={tplSearch}
                        onChange={(e) => setTplSearch(e.target.value)}
                        placeholder="Search by name or category…"
                        autoFocus
                        className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {filteredTemplates.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        {templates.length === 0 ? 'No approved templates available.' : 'No matches.'}
                      </div>
                    ) : (
                      filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => {
                            onTemplateSelect(template.id);
                            setTplOpen(false);
                            setTplSearch('');
                          }}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                            selectedTemplate === template.id
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          <div className="truncate">{template.name}</div>
                          {template.category && (
                            <div className="text-xs text-gray-500 capitalize">{template.category}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {selectedTemplateData && (
            <>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Template Preview:</p>
                <p className="text-gray-900 dark:text-white">{selectedTemplateData.content}</p>
              </div>

              {(templateVariables.length > 0 || (selectedTemplateData?.buttons && selectedTemplateData.buttons.length > 0)) && (
                <div className="space-y-4">
                  {/* Body Variables */}
                  {templateVariables.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        {channel === 'sms' 
                          ? 'Fill in template variables (found #var# in template):'
                          : 'Fill in template variables:'}
                      </p>
                      {templateVariables.map((variable, index) => (
                        <div key={variable}>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1 capitalize">
                            {channel === 'sms' 
                              ? `Variable ${index + 1} (replaces #var#)`
                              : variable.replace(/_/g, ' ')}
                          </label>
                          <input
                            type="text"
                            value={placeholders[variable] || ''}
                            onChange={(e) =>
                              onPlaceholderChange({ ...placeholders, [variable]: e.target.value })
                            }
                            placeholder={
                              channel === 'sms' 
                                ? `Enter value for variable ${index + 1}`
                                : `Enter ${variable.replace(/_/g, ' ')}`
                            }
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Text Message */}
      {messageType === 'text' && (
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          {channel === 'email' ? (
            <div className="space-y-4">
              <textarea
                value={textMessage}
                onChange={(e) => onTextMessageChange(e.target.value)}
                rows={10}
                placeholder="Enter HTML content or plain text..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500">{textMessage.length} characters</p>
            </div>
          ) : (
            <div>
              <textarea
                value={textMessage}
                onChange={(e) => onTextMessageChange(e.target.value)}
                rows={5}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{textMessage.length} characters</p>
            </div>
          )}
        </div>
      )}

      {/* Media Upload (WhatsApp only) */}
      {messageType === 'media' && channel === 'whatsapp' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Upload Media</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700">Choose file</span>
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => onAttachmentChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">Supported: Images, Videos, PDFs (max 16MB)</p>
              {attachment && (
                <div className="mt-3 text-sm text-green-600 dark:text-green-400">✓ {attachment.name}</div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Caption (Optional)</label>
            <textarea
              value={textMessage}
              onChange={(e) => onTextMessageChange(e.target.value)}
              rows={3}
              placeholder="Add a caption..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

