import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/common/providers";

export const metadata: Metadata = {
  title: "Nexus Messenger",
  description: "Friends-first secure messaging"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
