'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/aiva/theme-provider";
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export const metadata: Metadata = {
  title: 'Nuvia - Your Smart AI Assistant',
  description: 'Nuvia – Think Smarter. Work Faster.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmitFeedback = () => {
    if (!name || !email || !message) {
      toast({ title: "All fields required", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://formsubmit.co/nuviatechltd@gmail.com"; // 🔁 Replace with your email

    const inputs = [
      { name: "name", value: name },
      { name: "email", value: email },
      { name: "message", value: message },
    ];

    inputs.forEach(({ name, value }) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}

          {/* 🔘 Feedback Button Floating Bottom Left */}
          <div className="fixed bottom-5 left-5 z-50">
            <Button
              onClick={() => setShowFeedbackModal(true)}
              variant="outline"
              className="shadow-md"
            >
              💬 Feedback
            </Button>
          </div>

          {/* 🧾 Feedback Modal */}
          {showFeedbackModal && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md shadow-lg space-y-4">
                <h2 className="text-xl font-bold text-foreground">Send Feedback</h2>
                <Input placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Your Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Textarea placeholder="Your Message" value={message} onChange={(e) => setMessage(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowFeedbackModal(false)}>Cancel</Button>
                  <Button onClick={handleSubmitFeedback}>Send</Button>
                </div>
              </div>
            </div>
          )}

          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
