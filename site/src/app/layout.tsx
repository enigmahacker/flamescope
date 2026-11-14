// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flamescope",
  description: "Microgravity fire evidence for crews on the Moon and Mars: NASA flame-spread experiments, summarized, ranked and cited.",
  generator: "Flamescope pipeline. SI-generated code: Claude (Anthropic) via Claude Code. Project idea: human (team).",
  other: { "ai-assistance": "Code, data extraction, insight drafts and answers produced with SI (Claude by Anthropic; Groq-hosted LLM) under team direction. Project idea: human (team). No SI-generated images." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <body className="min-h-[100dvh] font-sans">
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
