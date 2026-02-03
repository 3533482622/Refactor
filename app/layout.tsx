import type { Metadata, Viewport } from "next";
import { ConfigProvider } from "antd";
import "antd/dist/reset.css";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Doubao Chat",
  description: "Doubao-inspired AI chat interface",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: "#5b5ce2",
              borderRadius: 10,
              fontSize: 14,
            },
          }}
        >
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
