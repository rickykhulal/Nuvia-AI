import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/aiva/theme-provider";
import FeedbackClientWrapper from "@/components/feedback/FeedbackClientWrapper"; // 🔁 we’ll create this

export const metadata: Metadata = {
  title: 'Nuvia - Your Smart AI Assistant',
  description: 'Nuvia – Think Smarter. Work Faster.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ✅ AdSense Verification Script */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2419579509132055"
          crossOrigin="anonymous"
        ></script>

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* If you want the feedback modal in the future, uncomment below */}
          {/* <FeedbackClientWrapper /> */}

          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
