"use client";

import { Button, Form, Input, Modal, Segmented } from "antd";
import type { FormInstance } from "antd";

export type AuthMode = "password" | "email";

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  authForm: FormInstance;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  onPasswordLogin: (values: { username: string; password: string }) => void;
  onEmailLogin: (values: { email: string; verificationCode: string }) => void;
  onSendCode: () => void;
  authLoading: boolean;
  emailCountdown: number;
  sendingCode: boolean;
}

export function AuthModal({
  open,
  authForm,
  authMode,
  setAuthMode,
  onPasswordLogin,
  onEmailLogin,
  onSendCode,
  authLoading,
  emailCountdown,
  sendingCode,
}: AuthModalProps) {
  return (
    <Modal
      open={open}
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
        onChange={(value) => setAuthMode(value as AuthMode)}
        style={{ marginBottom: 16 }}
      />
      {authMode === "password" ? (
        <Form form={authForm} layout="vertical" onFinish={onPasswordLogin}>
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
        <Form form={authForm} layout="vertical" onFinish={onEmailLogin}>
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
                  onClick={onSendCode}
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
  );
}
