import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/Toast";
import { Telemetry } from "@/components/Telemetry";

export const metadata: Metadata = {
  title: "Acme App",
  description: "Feito com o golden template Acme.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}<Telemetry /><Toaster /></body>
    </html>
  );
}
