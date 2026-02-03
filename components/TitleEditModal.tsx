"use client";

import { Input, Modal } from "antd";

export interface TitleEditModalProps {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

export function TitleEditModal({
  open,
  value,
  onChange,
  onOk,
  onCancel,
}: TitleEditModalProps) {
  return (
    <Modal
      open={open}
      title="编辑标题"
      onOk={onOk}
      onCancel={onCancel}
      okText="保存"
      cancelText="取消"
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="请输入标题"
      />
    </Modal>
  );
}
