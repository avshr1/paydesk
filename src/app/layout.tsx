import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paydesk",
  description:
    "Invoicing and payments for freelancers: manage clients, send invoices, and get paid online.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Lets keyboard users jump past the navigation. Hidden until focused. */}
        <a
          href="#main"
          className="sr-only rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
