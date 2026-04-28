export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface PendingMessage {
  id: string;
  organizationId: string;
  organizationName: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  
  // Message Details
  messageType: 'text' | 'template' | 'media';
  recipient: string;
  recipientName?: string;
  templateName?: string;
  messageContent: string;
  mediaUrl?: string;
  
  // Approval Details
  status: ApprovalStatus;
  priority: MessagePriority;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  
  // Metadata
  scheduledFor?: string;
  expiresAt: string;
  category?: 'marketing' | 'transactional' | 'utility';
  estimatedCost?: number;
  bulkSize?: number;
  isBulkMessage: boolean;
}

export interface ApprovalAction {
  messageId: string;
  action: 'approve' | 'reject';
  reason?: string;
  approvedBy: string;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  avgApprovalTime: number; // in minutes
}
