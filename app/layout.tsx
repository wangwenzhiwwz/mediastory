import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediaStory · 短视频分镜工作台",
  description: "为短视频与广告小团队打造的脚本、分镜和拍摄协作工具。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
