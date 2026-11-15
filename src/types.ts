export type ReasoningMode = 'fast' | 'balanced' | 'deep';

export type FocusPreset = 'general' | 'engineering' | 'editorial' | 'research';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  /** Base64 string (without data URL prefix) for binary/image, or UTF-8 string for text files */
  data: string;
  kind: 'image' | 'text' | 'document';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  sources?: GroundingSource[];
  createdAt: number;
  mode?: ReasoningMode;
  webSearch?: boolean;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  preset: FocusPreset;
  customInstructions: string;
}
