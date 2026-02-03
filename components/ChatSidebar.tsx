"use client";

import { Button, Card, Empty, Input, List, Popconfirm, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { HistoryItem } from "@/lib/chat-types";
import type { ModelOption, ModeOption } from "@/lib/chat-types";

const { Text, Title } = Typography;

export interface ChatSidebarProps {
  model: ModelOption;
  mode: ModeOption;
  modeLabel: string;
  historyItems: HistoryItem[];
  historyLoading: boolean;
  historySearch: string;
  setHistorySearch: (value: string) => void;
  onNewConversation: () => void;
  onLoadConversation: (id: string) => void;
  onEditTitle: (item: HistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  formatHistoryTime: (value?: string | { $$date?: number } | number) => string;
  apiUrl: string;
  /** When true (e.g. mobile drawer), hide the "当前模型" card */
  hideModelCard?: boolean;
}

export function ChatSidebar({
  model,
  mode,
  modeLabel,
  historyItems,
  historyLoading,
  historySearch,
  setHistorySearch,
  onNewConversation,
  onLoadConversation,
  onEditTitle,
  onDeleteHistory,
  formatHistoryTime,
  apiUrl,
  hideModelCard = false,
}: ChatSidebarProps) {
  return (
    <div className="chat-sider-inner" style={{ padding: 24 }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          豆包 · Chat
        </Title>
        <Text type="secondary">日常对话 · 代码问答 · 拍照搜题</Text>
      </div>

      {!hideModelCard && (
        <Card size="small">
          <Text type="secondary">当前模型</Text>
          <div style={{ marginTop: 8 }}>
            <Text strong>{model}</Text>
          </div>
          <Tag style={{ marginTop: 12 }} color={mode === "deep" ? "purple" : "blue"}>
            {modeLabel} 模式
          </Tag>
        </Card>
      )}

      <Card
        size="small"
        title="历史对话"
        extra={
          <Button size="small" icon={<PlusOutlined />} onClick={onNewConversation}>
            新对话
          </Button>
        }
      >
        <Input.Search
          placeholder="搜索历史"
          allowClear
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
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
                      onClick={() => onEditTitle(item)}
                    />
                  </Tooltip>,
                  <Popconfirm
                    key="delete"
                    title="确认删除该会话？"
                    onConfirm={() => onDeleteHistory(item.conversationId)}
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <Button type="text" onClick={() => onLoadConversation(item.conversationId)}>
                  <div style={{ textAlign: "left" }}>
                    <Tooltip title={item.title}>
                      <div style={{ fontWeight: 600 }}>
                        {item.title.length > 5 ? `${item.title.slice(0, 7)}…` : item.title}
                      </div>
                    </Tooltip>
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
        API: {apiUrl}
      </Text>
    </div>
  );
}
