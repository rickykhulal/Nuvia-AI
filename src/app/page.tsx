
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/aiva/app-shell';
import { Loader2 } from 'lucide-react';
import { auth, onAuthStateChanged } from '@/lib/firebase'; 
import type { User as FirebaseUser } from 'firebase/auth';

export default function Home() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying session...</p>
      </div>
    );
  }

  if (!authUser) {
    // This case is typically handled by the redirect in useEffect,
    // but serves as a fallback or if redirect hasn't completed.
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // If authorized, render the AppShell
  return <AppShell />;
}
    
