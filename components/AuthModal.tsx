"use client";

import { Button, Form, Input, Modal, Segmented } from "antd";
import type { FormInstance } from "antd";

export type AuthMode = "password" | "email" | "register";

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  authForm: FormInstance;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  onPasswordLogin: (values: { username: string; password: string }) => void;
  onEmailLogin: (values: { email: string; verificationCode: string }) => void;
  onRegister?: (values: {
    username: string;
    email: string;
    verificationCode: string;
    password: string;
    confirmPassword: string;
  }) => void;
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
  onRegister,
  onSendCode,
  authLoading,
  emailCountdown,
  sendingCode,
}: AuthModalProps) {
  return (
    <Modal
      open={open}
      title={authMode === "register" ? "注册账号" : "登录后继续使用"}
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
          { label: "注册", value: "register" },
        ]}
        value={authMode}
        onChange={(value) => setAuthMode(value as AuthMode)}
        style={{ marginBottom: 16 }}
      />
      {authMode === "password" && (
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
      )}
      {authMode === "email" && (
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
      {authMode === "register" && onRegister && (
        <Form form={authForm} layout="vertical" onFinish={onRegister}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: "请输入用户名" },
              { min: 3, message: "用户名至少3个字符" },
              { max: 20, message: "用户名最多20个字符" },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>
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
            label="邮箱验证码"
            rules={[
              { required: true, message: "请输入验证码" },
              { len: 6, message: "验证码为6位数字" },
            ]}
          >
            <Input
              placeholder="请输入6位验证码"
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
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: "请输入密码" },
              { min: 6, message: "密码至少6个字符" },
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={["password"]}
            rules={[
              { required: true, message: "请确认密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={authLoading}>
            注册
          </Button>
          <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#666" }}>
            已有账号？{" "}
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setAuthMode("password")}>
              立即登录
            </Button>
          </div>
        </Form>
      )}
    </Modal>
  );
}
