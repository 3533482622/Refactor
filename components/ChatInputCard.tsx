"use client";

import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Segmented,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import { CloudUploadOutlined, FileTextOutlined, SendOutlined } from "@ant-design/icons";
import type { AttachedDoc, ModelOption, ModeOption, SelectedImage } from "@/lib/chat-types";
import { modelOptions } from "@/lib/chat-types";

const { Text } = Typography;

export interface ChatInputCardProps {
  input: string;
  setInput: (value: string) => void;
  attachedFiles: AttachedDoc[];
  setAttachedFiles: (value: React.SetStateAction<AttachedDoc[]>) => void;
  model: ModelOption;
  setModel: (value: ModelOption) => void;
  mode: ModeOption;
  setMode: (value: ModeOption) => void;
  useWebSearch: boolean;
  setUseWebSearch: (value: boolean) => void;
  isStreaming: boolean;
  onSend: () => void;
  onStop: () => void;
  isAuthed: boolean;
  remainingQuota: number | null;
  uploadProps: UploadProps;
  docUploadProps: UploadProps;
  onDrop: (e: React.DragEvent) => void;
  isDraggingOver: boolean;
  setIsDraggingOver: (value: boolean) => void;
  extractUrlsFromText: (text: string) => string[];
  onPasteImage?: (file: File) => void;
  /** 当前输入是否包含图片（有图片时不支持联网） */
  hasImages?: boolean;
}

export function ChatInputCard({
  input,
  setInput,
  attachedFiles,
  setAttachedFiles,
  model,
  setModel,
  mode,
  setMode,
  useWebSearch,
  setUseWebSearch,
  isStreaming,
  onSend,
  onStop,
  isAuthed,
  remainingQuota,
  uploadProps,
  docUploadProps,
  onDrop,
  isDraggingOver,
  setIsDraggingOver,
  extractUrlsFromText,
  onPasteImage,
  hasImages = false,
}: ChatInputCardProps) {
  const detectedUrls = extractUrlsFromText(input);
  const webSearchDisabled = model !== "doubao-seed-1-6-vision" || hasImages;
  const webSearchTooltip = hasImages
    ? "有图片时不支持联网"
    : model === "doubao-seed-1-6-vision"
      ? "联网搜索（仅当前模型支持与深度思考同时使用）"
      : "仅 doubao-seed-1-6-vision 支持深度与联网同时使用";

  return (
    <Card
      className={`chat-input-card ${isDraggingOver ? "chat-input-card-dragging" : ""}`}
      bodyStyle={{ padding: 16 }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAuthed) setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={onDrop}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
        <Space wrap>
          <Tooltip title={isAuthed ? "上传图片" : "请先登录"}>
            <Upload {...uploadProps} disabled={!isAuthed}>
              <Button icon={<CloudUploadOutlined />} disabled={!isAuthed}>
                图片
              </Button>
            </Upload>
          </Tooltip>
          <Tooltip
            title={
              isAuthed
                ? "添加文档（PDF/Word/Excel/PPT 等，将解析内容）"
                : "请先登录"
            }
          >
            <Upload {...docUploadProps} disabled={!isAuthed}>
              <Button icon={<FileTextOutlined />} disabled={!isAuthed}>
                文档
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
          <Space size={8}>
            <Tooltip title={webSearchTooltip}>
              <Space size={8}>
                <Text type="secondary">联网</Text>
                <Switch
                  checked={useWebSearch}
                  onChange={setUseWebSearch}
                  checkedChildren="开"
                  unCheckedChildren="关"
                  disabled={webSearchDisabled}
                />
              </Space>
            </Tooltip>
          </Space>
          <Badge status={isStreaming ? "processing" : "default"} text="流式输出" />
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={isStreaming}
            onClick={onSend}
            disabled={!isAuthed || (remainingQuota !== null && remainingQuota <= 0)}
          >
            发送
          </Button>
          {isStreaming && (
            <Button onClick={onStop}>停止</Button>
          )}
        </Space>
      </div>

      {(attachedFiles.length > 0 || detectedUrls.length > 0) && (
        <div className="chat-attachments" style={{ marginTop: 12, marginBottom: 8 }}>
          {attachedFiles.length > 0 && (
            <Space wrap size={[8, 8]}>
              {attachedFiles.map((f) => (
                <Tag
                  key={f.uid}
                  closable
                  onClose={() =>
                    setAttachedFiles((prev) => prev.filter((x) => x.uid !== f.uid))
                  }
                  className="chat-doc-tag"
                >
                  <FileTextOutlined /> {f.name}
                </Tag>
              ))}
            </Space>
          )}
          {detectedUrls.length > 0 && (
            <div style={{ marginTop: attachedFiles.length > 0 ? 8 : 0, fontSize: 12 }}>
              <Text type="secondary">
                已检测到链接，发送后将自动解析内容：
                {detectedUrls.map((u) => (
                  <a
                    key={u}
                    href={u}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chat-input-url"
                    style={{ marginLeft: 4 }}
                  >
                    {u.slice(0, 40)}
                    {u.length > 40 ? "…" : ""}
                  </a>
                ))}
              </Text>
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="请输入内容；可粘贴链接或添加文档；支持将文件或图片拖入此处自动上传..."
          autoSize={{ minRows: 3, maxRows: 6 }}
          disabled={!isAuthed}
          onPaste={(event) => {
            const items = event.clipboardData?.items;
            if (!items || items.length === 0 || !onPasteImage) return;
            const imageItems = Array.from(items).filter((item) =>
              item.type.startsWith("image/")
            );
            if (imageItems.length === 0) return;
            imageItems.forEach((item) => {
              const file = item.getAsFile();
              if (file) onPasteImage(file);
            });
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return;
            if ((event.nativeEvent as KeyboardEvent).isComposing) return;
            event.preventDefault();
            if (!isStreaming) {
              onSend();
            }
          }}
        />
      </div>
    </Card>
  );
}
