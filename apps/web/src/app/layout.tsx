import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "TaskForge",
  description: "Local Runner-first AI-native engineering workspace",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center px-4 py-4">
            <Link
              href="/"
              className="text-xl font-bold text-indigo-600 hover:text-indigo-700"
            >
              TaskForge
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
