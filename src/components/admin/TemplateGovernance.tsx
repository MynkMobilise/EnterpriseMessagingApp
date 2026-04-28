import { useState } from 'react';
import { Search, Eye, CheckCircle2, XCircle, Clock, FileText, MessageSquare } from 'lucide-react';

export function TemplateGovernance() {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');

  const templates = [
    {
      id: 1,
      name: 'Welcome Message',
      tenant: 'Acme Corporation',
      category: 'Marketing',
      language: 'English',
      status: 'published',
      submittedAt: '2024-03-15 10:30 AM',
      approvedAt: '2024-03-16 02:15 PM',
      version: '1.2',
      content: 'Hello {{1}}! Welcome to Acme Corporation. We\'re excited to have you on board. Reply HELP for assistance.',
      variables: ['customer_name'],
    },
    {
      id: 2,
      name: 'Order Confirmation',
      tenant: 'TechStart Inc',
      category: 'Transactional',
      language: 'English',
      status: 'pending',
      submittedAt: '2024-03-18 03:45 PM',
      approvedAt: null,
      version: '1.0',
      content: 'Your order #{{1}} has been confirmed. Total: ${{2}}. Expected delivery: {{3}}.',
      variables: ['order_id', 'total_amount', 'delivery_date'],
    },
    {
      id: 3,
      name: 'Payment Reminder',
      tenant: 'FinServe Solutions',
      category: 'Utility',
      language: 'English',
      status: 'published',
      submittedAt: '2024-03-10 09:20 AM',
      approvedAt: '2024-03-11 11:30 AM',
      version: '2.1',
      content: 'Hi {{1}}, this is a reminder that your payment of ${{2}} is due on {{3}}. Pay now: {{4}}',
      variables: ['customer_name', 'amount', 'due_date', 'payment_link'],
    },
    {
      id: 4,
      name: 'Shipping Update',
      tenant: 'Global Retail Co',
      category: 'Transactional',
      language: 'English',
      status: 'draft',
      submittedAt: '2024-03-19 02:10 PM',
      approvedAt: null,
      version: '1.0',
      content: 'Your order #{{1}} has shipped! Track here: {{2}}',
      variables: ['order_id', 'tracking_link'],
    },
  ];

  const filteredTemplates = templates.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const statusCounts = {
    all: templates.length,
    pending: templates.filter((t) => t.status === 'pending').length,
    published: templates.filter((t) => t.status === 'published').length,
    draft: templates.filter((t) => t.status === 'draft').length,
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-white mb-2">Template Governance</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Review, approve, and manage WhatsApp message templates across all tenants
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { id: 'all', label: 'All Templates' },
          { id: 'pending', label: 'Pending Approval' },
          { id: 'published', label: 'Published' },
          { id: 'draft', label: 'Draft' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              filter === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-white dark:bg-gray-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 bg-white/20 dark:bg-black/20 rounded-full text-xs">
              {statusCounts[tab.id as keyof typeof statusCounts]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates by name, tenant, or content..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <select className="px-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300">
            <option>All Categories</option>
            <option>Marketing</option>
            <option>Transactional</option>
            <option>Utility</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-gray-900/50 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-slate-900 dark:text-white">{template.name}</h3>
                  <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 rounded">
                    v{template.version}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {template.tenant} • {template.category}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {template.status === 'published' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {template.status === 'pending' && (
                  <Clock className="w-5 h-5 text-yellow-600" />
                )}
                {template.status === 'draft' && (
                  <FileText className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>

            {/* Template Preview */}
            <div className="bg-slate-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-white dark:bg-gray-700 rounded-lg rounded-tl-none p-3 shadow-sm">
                    <p className="text-sm text-slate-900 dark:text-white">{template.content}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Variables */}
            <div className="mb-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Variables:</p>
              <div className="flex flex-wrap gap-2">
                {template.variables.map((variable, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded"
                  >
                    {`{{${idx + 1}}} = ${variable}`}
                  </span>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-4 border-b border-slate-200 dark:border-gray-800">
              <span>Submitted: {template.submittedAt}</span>
              {template.approvedAt && <span>Approved: {template.approvedAt}</span>}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTemplate(template.id)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
              {template.status === 'pending' && (
                <>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-slate-200 dark:border-gray-800 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-slate-900 dark:text-white mb-2">No templates found</h3>
          <p className="text-slate-600 dark:text-slate-400">
            No templates match your current filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
