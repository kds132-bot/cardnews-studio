import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "카드뉴스 스튜디오",
  description: "브랜드 페르소나와 주제만 입력하면 AI가 글과 이미지를 만들어주는 카드뉴스 제작 서비스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <div className="font-preload" aria-hidden>
          <span style={{ fontFamily: "Noto Sans KR" }}>가</span>
          <span style={{ fontFamily: "Nanum Myeongjo" }}>가</span>
          <span style={{ fontFamily: "Black Han Sans" }}>가</span>
          <span style={{ fontFamily: "Do Hyeon" }}>가</span>
          <span style={{ fontFamily: "Gowun Dodum" }}>가</span>
          <span style={{ fontFamily: "Jua" }}>가</span>
        </div>
      </body>
    </html>
  );
}
