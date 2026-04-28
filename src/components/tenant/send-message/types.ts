export type Channel = 'whatsapp' | 'sms' | 'email' | 'fcm';
export type SendMode = 'single' | 'bulk';
export type MessageType = 'text' | 'template' | 'media';

export interface Recipient {
  phone?: string;
  email?: string;
  fcmToken?: string;
  name?: string;
}

export interface Template {
  id: string;
  name: string;
  channel: Channel;
  content: string;
  variables: string[];
  buttons?: any[];
  category?: string;
  status?: string;
  subject?: string;
  htmlBody?: string;
  plainTextBody?: string;
}

export interface MessageData {
  channel: Channel;
  messageType: MessageType;
  recipientPhone?: string;
  recipientEmail?: string;
  recipientFcmToken?: string;
  subject?: string;
  content?: string;
  templateId?: string;
  variables?: { [key: string]: string };
  smsProvider?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: string;
}

