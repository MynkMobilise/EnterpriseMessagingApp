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
  headerType?: 'text' | 'image' | 'video' | 'document' | 'location';
  headerContent?: string;
  footer?: string;
  // Saved sample values for each placeholder ("1" → "John"). Used by the
  // live preview as the fallback shown when the user hasn't filled in the
  // variable input yet, so {{1}} renders as the saved example value instead
  // of as a raw placeholder marker. Carousel card placeholders use the
  // namespaced key shape "card{N}.{key}" (e.g. "card1.1" for {{1}} in card 1).
  variableSamples?: { [key: string]: string };
  templateType?: 'standard' | 'carousel' | 'limited_time';
  cards?: CarouselCard[];
}

export interface CarouselCard {
  id: string;
  media: { type: 'image' | 'video'; url: string } | null;
  content: string;
  buttons?: { id?: string; type?: 'url' | 'phone' | 'quick_reply'; text?: string; value?: string }[];
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
  skipApproval?: boolean;
}

