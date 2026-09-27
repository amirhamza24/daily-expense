import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmModal";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Expensify — Daily Expense Tracker",
  description:
    "Manage your daily balance, record transactions, view monthly and category charts, and keep your financial records secure.",
  keywords: "expense tracker, financial planner, money manager, budget tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var theme = saved || 'light';
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              {/* Global Portal Target for DatePicker & other absolute overlays */}
              <div id="root-portal" className="relative z-[100]" />

              <div className="min-h-screen flex flex-col">{children}</div>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
