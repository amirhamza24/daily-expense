import type { Metadata } from "next";
import { Hind_Siliguri, Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmModal";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { getI18n, getLocale } from "@/lib/i18n/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Display face for hero headings (e.g. the dashboard welcome banner)
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

// Bengali glyphs (Inter / Poppins have none); the browser falls back to it per character
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bengali",
});

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return {
    title: m.meta.title,
    description: m.meta.description,
    keywords: "expense tracker, financial planner, money manager, budget tracker",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${poppins.variable} ${hindSiliguri.variable} antialiased`}
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
        <I18nProvider locale={locale}>
          <ThemeProvider>
            <ToastProvider>
              <ConfirmProvider>
                {/* Global Portal Target for DatePicker & other absolute overlays */}
                <div id="root-portal" className="relative z-[100]" />

                <div className="min-h-screen flex flex-col">{children}</div>
              </ConfirmProvider>
            </ToastProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
