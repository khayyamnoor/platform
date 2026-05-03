import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { coinbaseAppearance } from "./clerk-appearance";
import "./globals.css";

export const metadata = {
  title: "Platform",
  description: "Multi-app SaaS for Gemini-powered AI tools",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={coinbaseAppearance}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
