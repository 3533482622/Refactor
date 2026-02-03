"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Form,
  Layout,
  Space,
  Typography,
  Upload,
  message as antdMessage,
} from "antd";
import type { UploadFile, UploadProps } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { AuthModal } from "@/components/AuthModal";
import { ChatInputCard } from "@/components/ChatInputCard";
import { ChatMessageItem } from "@/components/ChatMessageItem";
import { ChatSidebar } from "@/components/ChatSidebar";
import { TitleEditModal } from "@/components/TitleEditModal";
import {
  API_URL,
  AUTH_API_BASE,
  type AttachedDoc,
  type ChatMessage,
  DOC_EXTENSIONS,
  DOC_ACCEPT,
  type HistoryItem,
  type ModelOption,
  type ModeOption,
  modelOptions,
  type SelectedImage,
} from "@/lib/chat-types";
import { extractUrlsFromText, renderTextWithUrls } from "@/lib/chat-utils";
import { clearAuthCookie, getCookieValue, setAuthCookie } from "@/lib/auth";

export default function HomePage() {
  const { Sider, Header, Content } = Layout;
  const { Text, Title } = Typography;
  const [model, setModel] = useState<ModelOption>("doubao-seed-1-6-vision");
  const [mode, setMode] = useState<ModeOption>("deep");
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedDoc[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [inlineEditText, setInlineEditText] = useState("");
  const [inlineEditImages, setInlineEditImages] = useState<SelectedImage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [titleEditId, setTitleEditId] = useState<string | null>(null);
  const [titleEditValue, setTitleEditValue] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [authForm] = Form.useForm();
  const [authMode, setAuthMode] = useState<"password" | "email">("password");
  const [authLoading, setAuthLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authUser, setAuthUser] = useState<{ username: string; email: string } | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const modeLabel = mode === "deep" ? "深度" : "快速";

  // 仅 doubao-seed-1-6-vision 支持深度+联网同时使用，切换为其他模型时关闭联网
  const handleModelChange = (value: ModelOption) => {
    if (value !== "doubao-seed-1-6-vision") setUseWebSearch(false);
    setModel(value);
  };

  const isDocFile = (file: File) =>
    DOC_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

  const handleInputDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (!isAuthed) return;
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith("image/");
      if (isImage) {
        const reader = new FileReader();
        reader.onload = () => {
          setImages((prev) => [
            ...prev,
            {
              uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              name: file.name,
              url: String(reader.result),
            },
          ]);
        };
        reader.readAsDataURL(file);
        return;
      }
      if (isDocFile(file)) {
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          antdMessage.warning(`「${file.name}」超过 10MB，已跳过`);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string)?.split(",")?.[1] ?? "";
          if (!base64) return;
          setAttachedFiles((prev) => [
            ...prev,
            {
              uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              name: file.name,
              type: file.type,
              contentBase64: base64,
            },
          ]);
        };
        reader.readAsDataURL(file);
        return;
      }
      antdMessage.warning(`暂不支持「${file.name}」，仅支持图片或文档（PDF/Word/Excel 等）`);
    });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = getCookieValue("auth-token");
      if (!token) {
        setIsAuthed(false);
        setAuthModalOpen(true);
        return;
      }
      try {
        const resp = await fetch(`${AUTH_API_BASE}/api/user/validate-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const result = await resp.json();
        if (!resp.ok || result.code !== 200) {
          clearAuthCookie();
          setIsAuthed(false);
          setAuthUser(null);
          setRemainingQuota(null);
          setAuthModalOpen(true);
          return;
        }
        setIsAuthed(true);
        setAuthModalOpen(false);
        setAuthUser({
          username: result.data.username,
          email: result.data.email,
        });
        setRemainingQuota(
          result.data.remainingQuota ?? result.data.chatQuota ?? 50
        );
      } catch {
        setIsAuthed(false);
        setAuthUser(null);
        setRemainingQuota(null);
        setAuthModalOpen(true);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (emailCountdown <= 0) return;
    const timer = setInterval(() => {
      setEmailCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCountdown]);

  useEffect(() => {
    if (!isAuthed) {
      setHistoryItems([]);
      return;
    }
    fetchHistoryList();
  }, [isAuthed]);

  useEffect(() => {
    if (!listRef.current) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = window.localStorage.getItem("chatConversationId");
    if (storedId) {
      setConversationId(storedId);
      return;
    }
    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `conv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem("chatConversationId", newId);
    setConversationId(newId);
  }, []);

  const lastUserId = useMemo(() => {
    const last = [...messages].reverse().find((msg) => msg.role === "user");
    return last?.id ?? null;
  }, [messages]);

  const uploadProps: UploadProps = useMemo(
    () => ({
      multiple: true,
      listType: "picture",
      fileList: images.map((img) => ({
        uid: img.uid,
        name: img.name,
        status: "done",
        url: img.url,
      })) as UploadFile[],
      beforeUpload: (file) => {
        const isImage = file.type.startsWith("image/");
        if (!isImage) {
          antdMessage.warning("仅支持图片格式");
          return Upload.LIST_IGNORE;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setUseWebSearch(false);
          setImages((prev) => [
            ...prev,
            { uid: file.uid, name: file.name, url: String(reader.result) },
          ]);
        };
        reader.readAsDataURL(file);
        return false;
      },
      onRemove: (file) => {
        setImages((prev) => prev.filter((img) => img.uid !== file.uid));
      },
    }),
    [images]
  );

  const docUploadProps: UploadProps = useMemo(
    () => ({
      multiple: true,
      showUploadList: false,
      accept: DOC_ACCEPT,
      beforeUpload: (file) => {
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          antdMessage.warning("单个文档不超过 10MB");
          return Upload.LIST_IGNORE;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string)?.split(",")?.[1] ?? "";
          if (!base64) return;
          setAttachedFiles((prev) => [
            ...prev,
            {
              uid: file.uid,
              name: file.name,
              type: file.type,
              contentBase64: base64,
            },
          ]);
        };
        reader.readAsDataURL(file);
        return false;
      },
    }),
    []
  );

  const buildRequestMessages = (history: ChatMessage[]) => {
    return history.map((msg) => {
      if (msg.role === "user") {
        if (msg.images && msg.images.length > 0) {
          const contentParts: Array<
            { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
          > = [];
          if (msg.text.trim()) {
            contentParts.push({ type: "text", text: msg.text });
          }
          msg.images.forEach((img) => {
            contentParts.push({ type: "image_url", image_url: { url: img.url } });
          });
          return { role: "user", content: contentParts };
        }
        return { role: "user", content: msg.text };
      }
      return { role: "assistant", content: msg.text };
    });
  };

  const refreshQuota = async () => {
    const token = getCookieValue("auth-token");
    if (!token) return;
    try {
      const resp = await fetch(`${AUTH_API_BASE}/api/user/validate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await resp.json();
      if (resp.ok && result.code === 200) {
        setRemainingQuota(
          result.data.remainingQuota ?? result.data.chatQuota ?? 50
        );
      }
    } catch {
      // ignore
    }
  };

  const startSend = async (params?: {
    text?: string;
    images?: SelectedImage[];
    editMessageId?: string | null;
  }) => {
    if (!isAuthed) {
      setAuthModalOpen(true);
      antdMessage.warning("请先登录后再对话");
      return;
    }
    if (remainingQuota !== null && remainingQuota <= 0) {
      antdMessage.warning("对话次数已用完");
      return;
    }
    const nextText = params?.text ?? input;
    const nextImages = params?.images ?? images;
    const nextAttached = params?.editMessageId ? [] : attachedFiles;
    const editMessageId = params?.editMessageId ?? null;

    if (!nextText.trim() && nextImages.length === 0 && nextAttached.length === 0) {
      antdMessage.warning("请输入内容、上传图片或添加文档/链接");
      return;
    }
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: nextText.trim(),
      images: nextImages,
      attachedDocs:
        nextAttached.length > 0
          ? nextAttached.map((f) => ({ name: f.name, type: f.type }))
          : undefined,
    };
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
      reasoning: "",
      thinkingEnabled: mode === "deep",
    };
    const editIndex = editMessageId
      ? messages.findIndex((msg) => msg.id === editMessageId)
      : -1;
    const baseHistory = editIndex >= 0 ? messages.slice(0, editIndex) : messages;
    const historyForRequest = [...baseHistory, userMessage];
    setMessages([...baseHistory, userMessage, assistantMessage]);
    setInput("");
    setImages([]);
    setAttachedFiles([]);
    setEditTargetId(null);
    setInlineEditText("");
    setInlineEditImages([]);
    setIsStreaming(true);
    setStreamingId(assistantId);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const activeConversationId =
        conversationId ||
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `conv-${Date.now()}-${Math.random().toString(16).slice(2)}`);
      if (!conversationId && typeof window !== "undefined") {
        window.localStorage.setItem("chatConversationId", activeConversationId);
        setConversationId(activeConversationId);
      }
      const token = getCookieValue("auth-token");

      const payloadUrls = extractUrlsFromText(nextText);
      const payloadFiles = nextAttached.map((f) => ({
        name: f.name,
        type: f.type,
        contentBase64: f.contentBase64,
      }));
      const payload = {
        model,
        mode,
        webSearch: useWebSearch,
        conversationId: activeConversationId,
        stream: true,
        messages: [
          { role: "system", content: `当前模式：${modeLabel}。` },
          ...buildRequestMessages(historyForRequest),
        ],
        ...(payloadUrls.length > 0 && { urls: payloadUrls }),
        ...(payloadFiles.length > 0 && { files: payloadFiles }),
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          const errData = await response.json().catch(() => ({}));
          antdMessage.warning(errData.msg || "对话次数已用完");
          await refreshQuota();
        } else {
          throw new Error(`接口异常：${response.status}`);
        }
        return;
      }
      if (!response.body) {
        throw new Error("接口异常");
      }
      const responseConversationId = response.headers.get("x-conversation-id");
      if (
        responseConversationId &&
        responseConversationId !== conversationId &&
        typeof window !== "undefined"
      ) {
        window.localStorage.setItem("chatConversationId", responseConversationId);
        setConversationId(responseConversationId);
      }
      if (response.headers.get("x-web-search-disabled") === "image") {
        antdMessage.info("有图片时已自动关闭联网");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) return;
          const data = trimmed.replace(/^data:\s*/, "");
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            const delta =
              json?.choices?.[0]?.delta?.content ||
              (json?.type && json.type.includes("response.output_text.delta")
                ? json?.delta
                : null);
            const reasoningDelta =
              json?.choices?.[0]?.delta?.reasoning_content ||
              json?.choices?.[0]?.delta?.reasoning ||
              (json?.type && json.type.includes("response.output_reasoning.delta")
                ? json?.delta
                : null);
            const reasoningDone =
              json?.choices?.[0]?.message?.reasoning_content ||
              (json?.type === "response.output_reasoning.done" && typeof json.text === "string"
                ? json.text
                : null);
            if (delta) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, text: msg.text + delta } : msg
                )
              );
            }
            if (reasoningDelta) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, reasoning: `${msg.reasoning || ""}${reasoningDelta}` }
                    : msg
                )
              );
            } else if (reasoningDone) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId && !msg.reasoning
                    ? { ...msg, reasoning: reasoningDone }
                    : msg
                )
              );
            }
          } catch (error) {
            console.error("SSE parse error:", error);
          }
        });
      }
      await refreshQuota();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      const errorText = error instanceof Error ? error.message : "请求失败";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, text: `请求失败：${errorText}` }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
      abortRef.current = null;
      fetchHistoryList();
    }
  };

  const handleSend = async () => {
    await startSend();
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setStreamingId(null);
  };

  const handleEditLast = (message: ChatMessage) => {
    if (isStreaming) {
      antdMessage.warning("请先停止当前回复");
      return;
    }
    setEditTargetId(message.id);
    setInlineEditText(message.text);
    setInlineEditImages(message.images ? [...message.images] : []);
  };

  const handleCancelInlineEdit = () => {
    setEditTargetId(null);
    setInlineEditText("");
    setInlineEditImages([]);
  };

  const handleConfirmInlineEdit = async () => {
    await startSend({
      text: inlineEditText,
      images: inlineEditImages,
      editMessageId: editTargetId,
    });
  };

  const buildMessageFromStored = (message: {
    role: "user" | "assistant";
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }): ChatMessage => {
    if (typeof message.content === "string") {
      return {
        id: `${message.role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: message.role,
        text: message.content,
        thinkingEnabled: false,
      };
    }
    const textParts = message.content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
    const imageParts = message.content
      .filter((part) => part.type === "image_url" && part.image_url?.url)
      .map((part) => ({
        uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: "history-image",
        url: part.image_url!.url,
      }));
    return {
      id: `${message.role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role: message.role,
      text: textParts,
      images: imageParts.length > 0 ? imageParts : undefined,
      thinkingEnabled: false,
    };
  };

  const fetchHistoryList = async () => {
    if (!isAuthed) return;
    setHistoryLoading(true);
    try {
      const token = getCookieValue("auth-token");
      const response = await fetch(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setHistoryItems(data.conversations || []);
    } catch (error) {
      console.error("历史列表获取失败:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadConversation = async (id: string) => {
    if (!isAuthed) return;
    try {
      const token = getCookieValue("auth-token");
      const response = await fetch(
        `${API_URL}/history?conversationId=${encodeURIComponent(id)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      const loadedMessages = Array.isArray(data.messages)
        ? data.messages.map(buildMessageFromStored)
        : [];
      setMessages(loadedMessages);
      setConversationId(id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("chatConversationId", id);
      }
    } catch (error) {
      console.error("历史会话加载失败:", error);
    }
  };

  const formatHistoryTime = (value?: string | { $$date?: number } | number) => {
    if (!value) return "";
    if (typeof value === "number") return new Date(value).toLocaleString();
    if (typeof value === "string") return new Date(value).toLocaleString();
    if (typeof value === "object" && value.$$date) {
      return new Date(value.$$date).toLocaleString();
    }
    return "";
  };

  const handleNewConversation = () => {
    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `conv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setConversationId(newId);
    setMessages([]);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chatConversationId", newId);
    }
  };

  const openTitleEditor = (item: { conversationId: string; title: string }) => {
    setTitleEditId(item.conversationId);
    setTitleEditValue(item.title || "");
    setTitleModalOpen(true);
  };

  const handleUpdateTitle = async () => {
    if (!titleEditId || !titleEditValue.trim()) return;
    try {
      const token = getCookieValue("auth-token");
      const response = await fetch(`${API_URL}/history/${titleEditId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: titleEditValue.trim() }),
      });
      if (!response.ok) {
        throw new Error("更新失败");
      }
      setTitleModalOpen(false);
      setTitleEditId(null);
      setTitleEditValue("");
      fetchHistoryList();
    } catch (error) {
      antdMessage.error("更新标题失败");
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      const token = getCookieValue("auth-token");
      const response = await fetch(`${API_URL}/history/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("删除失败");
      }
      if (conversationId === id) {
        handleNewConversation();
      }
      fetchHistoryList();
    } catch (error) {
      antdMessage.error("删除会话失败");
    }
  };

  const handlePasswordLogin = async (values: { username: string; password: string }) => {
    setAuthLoading(true);
    try {
      const resp = await fetch(`${AUTH_API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await resp.json();
      if (!resp.ok || result.code !== 200) {
        throw new Error(result.msg || "登录失败");
      }
      setAuthCookie(result.data.token, result.data.expiresAt);
      setIsAuthed(true);
      setAuthModalOpen(false);
      setAuthUser({
        username: result.data.user.username,
        email: result.data.user.email,
      });
      setRemainingQuota(result.data.user.chatQuota ?? 50);
      antdMessage.success("登录成功");
      fetchHistoryList();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "登录失败";
      antdMessage.error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailLogin = async (values: { email: string; verificationCode: string }) => {
    setAuthLoading(true);
    try {
      const resp = await fetch(`${AUTH_API_BASE}/api/user/login-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await resp.json();
      if (!resp.ok || result.code !== 200) {
        throw new Error(result.msg || "登录失败");
      }
      setAuthCookie(result.data.token, result.data.expiresAt);
      setIsAuthed(true);
      setAuthModalOpen(false);
      setAuthUser({
        username: result.data.user.username,
        email: result.data.user.email,
      });
      setRemainingQuota(result.data.user.chatQuota ?? 50);
      antdMessage.success("登录成功");
      fetchHistoryList();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "登录失败";
      antdMessage.error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendEmailCode = async () => {
    const email = authForm.getFieldValue("email");
    if (!email) {
      antdMessage.warning("请输入邮箱地址");
      return;
    }
    setSendingCode(true);
    try {
      const resp = await fetch(`${AUTH_API_BASE}/api/user/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, expiresIn: 150 }),
      });
      const result = await resp.json();
      if (!resp.ok || result.code !== 200) {
        throw new Error(result.msg || "发送验证码失败");
      }
      setEmailCountdown(result.data.expiresIn || 150);
      antdMessage.success("验证码已发送");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "发送验证码失败";
      antdMessage.error(msg);
    } finally {
      setSendingCode(false);
    }
  };

  const handleLogout = () => {
    clearAuthCookie();
    setIsAuthed(false);
    setAuthUser(null);
    setRemainingQuota(null);
    setHistoryItems([]);
    setMessages([]);
    setAuthModalOpen(true);
    antdMessage.success("已退出登录");
  };

  return (
    <div className="chat-root">
      <TitleEditModal
        open={titleModalOpen}
        value={titleEditValue}
        onChange={setTitleEditValue}
        onOk={handleUpdateTitle}
        onCancel={() => setTitleModalOpen(false)}
      />
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        authForm={authForm}
        authMode={authMode}
        setAuthMode={setAuthMode}
        onPasswordLogin={handlePasswordLogin}
        onEmailLogin={handleEmailLogin}
        onSendCode={handleSendEmailCode}
        authLoading={authLoading}
        emailCountdown={emailCountdown}
        sendingCode={sendingCode}
      />
      <Layout className="chat-layout">
        <Sider
          width={280}
          className="chat-sider"
          breakpoint="lg"
          collapsedWidth={0}
        >
          <ChatSidebar
            model={model}
            mode={mode}
            modeLabel={modeLabel}
            historyItems={historyItems}
            historyLoading={historyLoading}
            historySearch={historySearch}
            setHistorySearch={setHistorySearch}
            onNewConversation={handleNewConversation}
            onLoadConversation={loadConversation}
            onEditTitle={openTitleEditor}
            onDeleteHistory={handleDeleteHistory}
            formatHistoryTime={formatHistoryTime}
            apiUrl={API_URL}
          />
        </Sider>

        <Layout>
          <Header className="chat-header">
            <div>
              <Title level={5} style={{ margin: 0 }}>
                AI 对话
              </Title>
              <Text type="secondary">支持图文、流式输出与富文本</Text>
            </div>
            <div className="chat-user-area">
              <div className="chat-user-meta">
                <div className="chat-user-name">{authUser?.username || "未登录"}</div>
                <div className="chat-user-email">{authUser?.email || "请先登录"}</div>
                {isAuthed && remainingQuota !== null && (
                  <div className="chat-user-quota">剩余 {remainingQuota} 次</div>
                )}
              </div>
              <Avatar size={36} icon={<UserOutlined />} />
              <Button size="small" onClick={handleLogout} disabled={!isAuthed}>
                退出登录
              </Button>
            </div>
          </Header>

          <Content className="chat-content">
            <div ref={listRef} className="chat-list chat-scrollbar">
              {messages.length === 0 && (
                <div style={{ marginTop: 80, textAlign: "center" }}>
                  <Text type="secondary">现在开始对话吧，支持文字 + 图片。</Text>
                </div>
              )}

              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  msg={msg}
                  isStreaming={isStreaming}
                  streamingId={streamingId}
                  editTargetId={editTargetId}
                  lastUserId={lastUserId}
                  inlineEditText={inlineEditText}
                  inlineEditImages={inlineEditImages}
                  setInlineEditText={setInlineEditText}
                  setInlineEditImages={setInlineEditImages}
                  onEditLast={handleEditLast}
                  onCancelInlineEdit={handleCancelInlineEdit}
                  onConfirmInlineEdit={handleConfirmInlineEdit}
                  renderTextWithUrls={renderTextWithUrls}
                />
              ))}

            </div>

            <ChatInputCard
              input={input}
              setInput={setInput}
              attachedFiles={attachedFiles}
              setAttachedFiles={setAttachedFiles}
              model={model}
              setModel={handleModelChange}
              mode={mode}
              setMode={setMode}
              useWebSearch={useWebSearch}
              setUseWebSearch={setUseWebSearch}
              isStreaming={isStreaming}
              onSend={handleSend}
              onStop={handleStop}
              isAuthed={isAuthed}
              remainingQuota={remainingQuota}
              uploadProps={uploadProps}
              docUploadProps={docUploadProps}
              onDrop={handleInputDrop}
              isDraggingOver={isDraggingOver}
              setIsDraggingOver={setIsDraggingOver}
              extractUrlsFromText={extractUrlsFromText}
              hasImages={images.length > 0}
              onPasteImage={(file) => {
                const reader = new FileReader();
                reader.onload = () => {
                  setUseWebSearch(false);
                  setImages((prev) => [
                    ...prev,
                    {
                      uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                      name: file.name || "pasted-image",
                      url: String(reader.result),
                    },
                  ]);
                };
                reader.readAsDataURL(file);
              }}
            />
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}
