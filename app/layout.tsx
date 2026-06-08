import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider, type Theme } from "@/components/theme/theme-provider";

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const VALID_THEMES: Theme[] = ['light', 'dark', 'mono-light', 'mono-dark', 'mark', 'eve', 'thragg', 'omni-man']

export const metadata: Metadata = {
  title: "Better Schoology",
  description: "A local-first school dashboard — cleaner, calmer, faster.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('bs-theme')?.value
  const serverTheme: Theme = VALID_THEMES.includes(raw as Theme) ? (raw as Theme) : 'light'

  // Apply the theme class server-side so there is no flash — no inline script needed
  const themeClass =
    serverTheme === 'dark'      ? 'dark' :
    serverTheme === 'mono-light'? 'mono-light' :
    serverTheme === 'mono-dark' ? 'mono-dark' :
    serverTheme === 'mark'      ? 'dark theme-mark' :
    serverTheme === 'thragg'    ? 'dark theme-thragg' :
    serverTheme === 'eve'       ? 'theme-eve' :
    serverTheme === 'omni-man'  ? 'theme-omni-man' : ''

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        figtree.variable,
        "font-sans",
        themeClass,
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={serverTheme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
