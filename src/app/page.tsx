'use client';

import dynamic from 'next/dynamic';
import Head from 'next/head'; // ✅ for SEO meta tags
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { auth, onAuthStateChanged } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

const AppShell = dynamic(() => import('@/components/aiva/app-shell'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setAuthUser(user);
        } else {
          setAuthUser(null);
          router.replace('/auth');
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
  }, [router]);

  if (isLoading) {
    return (
      <>
        <Head>
          <title>Nuvia | Smart AI Assistant</title>
          <meta name="description" content="Nuvia is your personalized AI assistant for study, planning, productivity, and more. Built to help you stay on track with intelligent tools." />
          <meta name="robots" content="index, follow" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying session...</p>
        </div>
      </>
    );
  }

  if (!authUser) {
    return (
      <>
        <Head>
          <title>Login | Nuvia</title>
          <meta name="description" content="Secure login to access your smart AI tools with Nuvia." />
        </Head>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard | Nuvia AI</title>
        <meta name="description" content="Access your AI-powered dashboard for assignments, tasks, focus zone, and productivity features in Nuvia." />
      </Head>
      <main>
        <AppShell />
      </main>
    </>
  );
}
