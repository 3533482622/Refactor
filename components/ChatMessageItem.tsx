"use client";

import type { ReactNode } from "react";
import {
  Avatar,
  Button,
  Input,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { EditOutlined, FileTextOutlined, UserOutlined } from "@ant-design/icons";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./ai-elements/reasoning";
import { Response } from "./ai-elements/response";
import type { ChatMessage, SelectedImage } from "@/lib/chat-types";

const { Text } = Typography;

export interface ChatMessageItemProps {
  msg: ChatMessage;
  isStreaming: boolean;
  streamingId: string | null;
  editTargetId: string | null;
  lastUserId: string | null;
  inlineEditText: string;
  inlineEditImages: SelectedImage[];
  setInlineEditText: (value: string) => void;
  setInlineEditImages: (value: SelectedImage[]) => void;
  onEditLast: (message: ChatMessage) => void;
  onCancelInlineEdit: () => void;
  onConfirmInlineEdit: () => void;
  renderTextWithUrls: (text: string) => ReactNode;
}

export function ChatMessageItem({
  msg,
  isStreaming,
  streamingId,
  editTargetId,
  lastUserId,
  inlineEditText,
  inlineEditImages,
  setInlineEditText,
  setInlineEditImages,
  onEditLast,
  onCancelInlineEdit,
  onConfirmInlineEdit,
  renderTextWithUrls,
}: ChatMessageItemProps) {
  const showReasoning =
    msg.role === "assistant" &&
    msg.thinkingEnabled &&
    (Boolean(msg.reasoning) || (isStreaming && msg.id === streamingId));

  return (
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
        className={`chat-bubble ${msg.role === "user" ? "user" : "assistant"}`}
      >
        {msg.role === "assistant" ? (
          <>
            {showReasoning && (
              <Reasoning
                className="chat-reasoning"
                isStreaming={isStreaming && msg.id === streamingId}
              >
                <ReasoningTrigger
                  getThinkingMessage={(streaming, duration) => {
                    if (streaming || duration === 0) {
                      return <span>思考中...</span>;
                    }
                    if (duration === undefined) {
                      return <span>思考完成</span>;
                    }
                    return <span>思考耗时 {duration} 秒</span>;
                  }}
                />
                <ReasoningContent>{msg.reasoning || ""}</ReasoningContent>
              </Reasoning>
            )}
            {msg.id === streamingId && !msg.text ? (
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
            )}
          </>
        ) : msg.id === editTargetId ? (
          <div style={{ minWidth: 260 }}>
            <Input.TextArea
              value={inlineEditText}
              onChange={(e) => setInlineEditText(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) return;
                if ((event.nativeEvent as KeyboardEvent).isComposing) return;
                event.preventDefault();
                if (!isStreaming) {
                  onConfirmInlineEdit();
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
              <Button size="small" type="primary" onClick={onConfirmInlineEdit}>
                重新发送
              </Button>
              <Button size="small" onClick={onCancelInlineEdit}>
                取消
              </Button>
            </Space>
          </div>
        ) : (
          <Space align="start" direction="vertical" size={4}>
            <Space align="start" style={{ width: "100%" }}>
              <Text style={{ whiteSpace: "pre-wrap", color: "inherit", flex: 1 }}>
                {renderTextWithUrls(msg.text)}
              </Text>
              {msg.id === lastUserId && (
                <Tooltip title="编辑并重新发送">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => onEditLast(msg)}
                  />
                </Tooltip>
              )}
            </Space>
            {msg.attachedDocs && msg.attachedDocs.length > 0 && (
              <Space wrap size={[6, 6]}>
                {msg.attachedDocs.map((d, i) => (
                  <Tag key={i} className="chat-doc-tag-inline">
                    <FileTextOutlined /> {d.name}
                  </Tag>
                ))}
              </Space>
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
  );
}
