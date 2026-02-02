"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Layout,
  List,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message as antdMessage,
} from "antd";
import type { UploadFile, UploadProps } from "antd";
import {
  CloudUploadOutlined,
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  PictureOutlined,
  SendOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Response } from "../components/ai-elements/response";

type ModelOption = "doubao-seed-1-6-vision" | "doubao-seed-code" | "doubao-seed-1-6";
type ModeOption = "deep" | "fast";

type SelectedImage = {
  uid: string;
  name: string;
  url: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  images?: SelectedImage[];
};

const API_URL = "http://localhost:3001/api/ai_talk/Doubao";
const AUTH_API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

const getCookieValue = (name: string) => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
};

const setAuthCookie = (token: string, expiresAt: number) => {
  if (typeof document === "undefined") return;
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  document.cookie = `auth-token=${token}; Path=/; Max-Age=${maxAge}`;
};

const clearAuthCookie = () => {
  if (typeof document === "undefined") return;
  document.cookie = "auth-token=; Path=/; Max-Age=0";
};

const modelOptions: { label: string; value: ModelOption; desc: string }[] = [
  { label: "doubao-seed-1-6-vision", value: "doubao-seed-1-6-vision", desc: "通用视觉" },
  { label: "doubao-seed-code", value: "doubao-seed-code", desc: "代码场景" },
  { label: "doubao-seed-1-6", value: "doubao-seed-1-6", desc: "通用对话" },
];

export default function HomePage() {
  const { Sider, Header, Content } = Layout;
  const { Text, Title } = Typography;
  const [model, setModel] = useState<ModelOption>("doubao-seed-1-6-vision");
  const [mode, setMode] = useState<ModeOption>("deep");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [inlineEditText, setInlineEditText] = useState("");
  const [inlineEditImages, setInlineEditImages] = useState<SelectedImage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<
    { conversationId: string; title: string; updatedAt?: string; model?: string }[]
  >([]);
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
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);

  const modeLabel = mode === "deep" ? "深度" : "快速";

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
          setAuthModalOpen(true);
          return;
        }
        setIsAuthed(true);
        setAuthModalOpen(false);
        setAuthUser({
          username: result.data.username,
          email: result.data.email,
        });
      } catch {
        setIsAuthed(false);
        setAuthUser(null);
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
    const nextText = params?.text ?? input;
    const nextImages = params?.images ?? images;
    const editMessageId = params?.editMessageId ?? null;

    if (!nextText.trim() && nextImages.length === 0) {
      antdMessage.warning("请输入内容或上传图片");
      return;
    }
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: nextText.trim(),
      images: nextImages,
    };
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      text: "",
    };
    const editIndex = editMessageId
      ? messages.findIndex((msg) => msg.id === editMessageId)
      : -1;
    const baseHistory = editIndex >= 0 ? messages.slice(0, editIndex) : messages;
    const historyForRequest = [...baseHistory, userMessage];
    setMessages([...baseHistory, userMessage, assistantMessage]);
    setInput("");
    setImages([]);
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

      const payload = {
        model,
        conversationId: activeConversationId,
        stream: true,
        messages: [
          { role: "system", content: `当前模式：${modeLabel}。` },
          ...buildRequestMessages(historyForRequest),
        ],
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

      if (!response.ok || !response.body) {
        throw new Error(`接口异常：${response.status}`);
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
            if (delta) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, text: msg.text + delta } : msg
                )
              );
            }
          } catch (error) {
            console.error("SSE parse error:", error);
          }
        });
      }
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
    setHistoryItems([]);
    setMessages([]);
    setAuthModalOpen(true);
    antdMessage.success("已退出登录");
  };

  return (
    <div className="chat-root">
      <Modal
        open={titleModalOpen}
        title="编辑标题"
        onOk={handleUpdateTitle}
        onCancel={() => setTitleModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Input
          value={titleEditValue}
          onChange={(event) => setTitleEditValue(event.target.value)}
          placeholder="请输入标题"
        />
      </Modal>
      <Modal
        open={authModalOpen}
        title="登录后继续使用"
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={null}
      >
        <Segmented
          block
          options={[
            { label: "密码登录", value: "password" },
            { label: "邮箱登录", value: "email" },
          ]}
          value={authMode}
          onChange={(value) => setAuthMode(value as "password" | "email")}
          style={{ marginBottom: 16 }}
        />
        {authMode === "password" ? (
          <Form form={authForm} layout="vertical" onFinish={handlePasswordLogin}>
            <Form.Item
              name="username"
              label="用户名或邮箱"
              rules={[{ required: true, message: "请输入用户名或邮箱" }]}
            >
              <Input placeholder="请输入用户名或邮箱" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={authLoading}>
              登录
            </Button>
          </Form>
        ) : (
          <Form form={authForm} layout="vertical" onFinish={handleEmailLogin}>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: "请输入邮箱" },
                { type: "email", message: "邮箱格式不正确" },
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>
            <Form.Item
              name="verificationCode"
              label="验证码"
              rules={[
                { required: true, message: "请输入验证码" },
                { len: 6, message: "验证码为6位数字" },
              ]}
            >
              <Input
                placeholder="请输入验证码"
                maxLength={6}
                suffix={
                  <Button
                    size="small"
                    type="link"
                    disabled={emailCountdown > 0 || sendingCode}
                    onClick={handleSendEmailCode}
                  >
                    {emailCountdown > 0 ? `${emailCountdown}s` : "发送验证码"}
                  </Button>
                }
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={authLoading}>
              登录
            </Button>
          </Form>
        )}
      </Modal>
      <Layout className="chat-layout">
        <Sider
          width={280}
          className="chat-sider"
          breakpoint="lg"
          collapsedWidth={0}
        >
          <div className="chat-sider-inner" style={{ padding: 24 }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                豆包 · Chat
              </Title>
              <Text type="secondary">日常对话 · 代码问答 · 拍照搜题</Text>
            </div>

            <Card size="small">
              <Text type="secondary">当前模型</Text>
              <div style={{ marginTop: 8 }}>
                <Text strong>{model}</Text>
              </div>
              <Tag style={{ marginTop: 12 }} color={mode === "deep" ? "purple" : "blue"}>
                {modeLabel} 模式
              </Tag>
            </Card>

            <Card
              size="small"
              title="历史对话"
              extra={
                <Button size="small" icon={<PlusOutlined />} onClick={handleNewConversation}>
                  新对话
                </Button>
              }
            >
              <Input.Search
                placeholder="搜索历史"
                allowClear
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                style={{ marginBottom: 12 }}
              />
              {historyItems.length === 0 ? (
                <Empty description="暂无历史" />
              ) : (
                <List
                  size="small"
                  loading={historyLoading}
                  dataSource={historyItems.filter((item) =>
                    item.title.toLowerCase().includes(historySearch.toLowerCase())
                  )}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Tooltip key="edit" title="编辑标题">
                          <Button
                            size="small"
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openTitleEditor(item)}
                          />
                        </Tooltip>,
                        <Popconfirm
                          key="delete"
                          title="确认删除该会话？"
                          onConfirm={() => handleDeleteHistory(item.conversationId)}
                        >
                          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>,
                      ]}
                    >
                      <Button
                        type="text"
                        onClick={() => loadConversation(item.conversationId)}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {formatHistoryTime(item.updatedAt)}
                          </div>
                        </div>
                      </Button>
                    </List.Item>
                  )}
                />
              )}
            </Card>

            <Text type="secondary" style={{ marginTop: "auto", fontSize: 12 }}>
              API: {API_URL}
            </Text>
          </div>
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
                <div
                  key={msg.id}
                  className={`chat-row ${msg.role === "user" ? "user" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <Avatar size={36} style={{ backgroundColor: "#5b5ce2" }}>
                      豆
                    </Avatar>
                  )}
                  <div
                    className={`chat-bubble ${msg.role === "user" ? "user" : "assistant"
                      }`}
                  >
                    {msg.role === "assistant" ? (
                      msg.id === streamingId && !msg.text ? (
                        <Space size={8}>
                          <Spin size="small" />
                          <Text type="secondary">豆包思考中...</Text>
                        </Space>
                      ) : (
                        <Response
                          className="chat-response"
                          mode="streaming"
                          isAnimating={isStreaming && msg.id === streamingId}
                        >
                          {msg.text || " "}
                        </Response>
                      )
                    ) : msg.id === editTargetId ? (
                      <div style={{ minWidth: 260 }}>
                        <Input.TextArea
                          value={inlineEditText}
                          onChange={(event) => setInlineEditText(event.target.value)}
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" || event.shiftKey) return;
                            if ((event.nativeEvent as KeyboardEvent).isComposing) return;
                            event.preventDefault();
                            if (!isStreaming) {
                              handleConfirmInlineEdit();
                            }
                          }}
                        />
                        {inlineEditImages.length > 0 && (
                          <div className="chat-images" style={{ marginTop: 8 }}>
                            {inlineEditImages.map((img) => (
                              <img key={img.uid} src={img.url} alt={img.name} />
                            ))}
                          </div>
                        )}
                        <Space size={8} style={{ marginTop: 8 }}>
                          <Button size="small" type="primary" onClick={handleConfirmInlineEdit}>
                            重新发送
                          </Button>
                          <Button size="small" onClick={handleCancelInlineEdit}>
                            取消
                          </Button>
                        </Space>
                      </div>
                    ) : (
                      <Space align="start">
                        <Text style={{ whiteSpace: "pre-wrap", color: "inherit" }}>
                          {msg.text}
                        </Text>
                        {msg.id === lastUserId && (
                          <Tooltip title="编辑并重新发送">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEditLast(msg)}
                            />
                          </Tooltip>
                        )}
                      </Space>
                    )}
                    {msg.images && msg.images.length > 0 && (
                      <div className="chat-images">
                        {msg.images.map((img) => (
                          <img key={img.uid} src={img.url} alt={img.name} />
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <Avatar size={36} icon={<UserOutlined />} />
                  )}
                </div>
              ))}

            </div>

            <Card className="chat-input-card" bodyStyle={{ padding: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
                <Space wrap>
                  <Tooltip title={isAuthed ? "上传图片" : "请先登录"}>
                    <Upload {...uploadProps} disabled={!isAuthed}>
                      <Button icon={<CloudUploadOutlined />} disabled={!isAuthed}>
                        上传
                      </Button>
                    </Upload>
                  </Tooltip>
                  <Select
                    value={model}
                    onChange={(value) => setModel(value)}
                    style={{ width: 220 }}
                    options={modelOptions}
                    optionRender={(option) => (
                      <div>
                        <Text>{option.data.label}</Text>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {option.data.desc}
                        </div>
                      </div>
                    )}
                  />
                  <Segmented
                    value={mode}
                    onChange={(value) => setMode(value as ModeOption)}
                    options={[
                      { label: "深度", value: "deep" },
                      { label: "快速", value: "fast" },
                    ]}
                  />
                  <Badge status={isStreaming ? "processing" : "default"} text="流式输出" />
                </Space>
                <Space>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={isStreaming}
                    onClick={handleSend}
                    disabled={!isAuthed}
                  >
                    发送
                  </Button>
                  {isStreaming && (
                    <Button onClick={handleStop}>停止</Button>
                  )}
                </Space>
              </div>

              <div style={{ marginTop: 12 }}>
                <Input.TextArea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="请输入内容，支持 Markdown/代码块/表格..."
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  disabled={!isAuthed}
                  onPaste={(event) => {
                    const items = event.clipboardData?.items;
                    if (!items || items.length === 0) return;
                    const imageItems = Array.from(items).filter((item) =>
                      item.type.startsWith("image/")
                    );
                    if (imageItems.length === 0) return;
                    imageItems.forEach((item) => {
                      const file = item.getAsFile();
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
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
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey) return;
                    if ((event.nativeEvent as KeyboardEvent).isComposing) return;
                    event.preventDefault();
                    if (!isStreaming) {
                      handleSend();
                    }
                  }}
                />
              </div>
            </Card>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}
