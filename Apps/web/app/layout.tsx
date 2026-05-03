import type { ReactNode } from "react";

export const metadata = {
  title: "Platform",
  description: "Multi-app SaaS for Gemini-powered AI tools",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
