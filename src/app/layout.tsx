import type { Metadata } from "next";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/config";
import { Providers } from "./providers";
import { Navbar } from "@/components";
import "./globals.css";

export const metadata: Metadata = { title: APP_NAME, description: APP_DESCRIPTION };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-app text-txt-1 font-sans antialiased">
        <Providers>
          <Navbar />
          <main className="max-w-[520px] mx-auto px-5 pt-10 pb-24">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
