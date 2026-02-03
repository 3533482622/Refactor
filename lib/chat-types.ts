export type ModelOption = "doubao-seed-1-6-vision" | "doubao-seed-code" | "doubao-seed-1-6";
export type ModeOption = "deep" | "fast";

export type SelectedImage = {
  uid: string;
  name: string;
  url: string;
};

export type AttachedDoc = {
  uid: string;
  name: string;
  type: string;
  contentBase64: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  images?: SelectedImage[];
  attachedDocs?: Array<{ name: string; type: string }>;
  reasoning?: string;
  thinkingEnabled?: boolean;
};

export type HistoryItem = {
  conversationId: string;
  title: string;
  updatedAt?: string;
  model?: string;
};

export const AUTH_API_BASE = process.env.NEXT_PUBLIC_API_BASE;
export const API_URL = `${AUTH_API_BASE}/api/ai_talk/Doubao`;

export const URL_REGEX = /https?:\/\/[^\s]+/gi;
export const MAX_URLS = 3;

export const DOC_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".md",
  ".mobi",
  ".epub",
];

export const modelOptions: { label: string; value: ModelOption; desc: string }[] = [
  { label: "doubao-seed-1-6-vision", value: "doubao-seed-1-6-vision", desc: "通用视觉" },
  { label: "doubao-seed-code", value: "doubao-seed-code", desc: "代码场景" },
  { label: "doubao-seed-1-6", value: "doubao-seed-1-6", desc: "通用对话" },
];

export const DOC_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.mobi,.epub";
