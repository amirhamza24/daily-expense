import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmModal";
import { ThemeProvider } from "@/components/ThemeProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Expensify — Premium Daily Expense Tracker",
  description:
    "Manage your daily balance, record transactions transactionally, view monthly and category charts, and keep your financial records secure.",
  keywords:
    "expense tracker, financial planner, money manager, glassmorphism dashboard, budget tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} antialiased scroll-smooth`}
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
      <body
        className="min-h-screen relative overflow-x-hidden select-none"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              {/* Ambient Glowing Background Blobs */}
              <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="glow-blob glow-purple top-[-10%] left-[-10%]" />
                <div className="glow-blob glow-blue bottom-[10%] right-[-10%]" />
                <div className="glow-blob glow-pink top-[40%] left-[30%] opacity-20" />
              </div>

              {/* Core App View */}
              <div className="relative z-10 min-h-screen flex flex-col">
                {children}
              </div>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
