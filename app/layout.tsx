import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "青森県競馬 IPAT",
  description: "青森県競馬の即パット投票・馬主管理システム",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon",
    apple: "/icon",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "青森県競馬",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}