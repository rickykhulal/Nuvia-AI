
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, LogIn, UserPlus, AlertTriangle, Loader2, MailQuestion, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type UserCredential,
  doc,
  setDoc,
  serverTimestamp,
  firebaseInitializedCorrectly
} from '@/lib/firebase';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
type LoginFormData = z.infer<typeof loginSchema>;

const signUpSchema = z.object({
  name: z.string().min(1, { message: "Name is required."}).optional(),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});
type SignUpFormData = z.infer<typeof signUpSchema>;

const passwordResetSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});
type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("login");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showPasswordResetForm, setShowPasswordResetForm] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);


  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const passwordResetForm = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (!firebaseInitializedCorrectly && (activeTab === 'login' || activeTab === 'signup')) {
        setAuthError("Firebase is not properly configured. Please check console logs and setup.");
        if(activeTab === 'login' || activeTab === 'signup') {
          toast({ title: "Configuration Error", description: "Firebase is not properly configured.", variant: "destructive" });
        }
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/');
      } else {
        setIsCheckingAuth(false);
      }
    }, (error) => {
        console.error("Auth state listener error:", error);
        setIsCheckingAuth(false);
        setAuthError("Error checking authentication status. Firebase might be misconfigured.");
        toast({ title: "Auth Error", description: "Could not check authentication status.", variant: "destructive" });
    });
    return () => unsubscribe();
  }, [router, activeTab, toast]);


  const handleLogin: SubmitHandler<LoginFormData> = async (data) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: "Login Successful", description: "Welcome back to Nuvia!" });
      router.push('/');
    } catch (error: any) {
      console.error("Login error object:", error);
      let message = "An unknown error occurred during login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Invalid email format.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Too many login attempts. Please try again later.";
      } else if (error.code === 'auth/missing-config') {
        message = "Firebase is not configured. Please set API Key and Project ID in your environment.";
      } else if (error.code === 'auth/initialization-failed') {
        message = "Firebase connection failed. Please check configuration and console settings, then try again.";
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
      toast({ title: "Login Failed", description: message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSignUp: SubmitHandler<SignUpFormData> = async (data) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        const displayName = data.name || user.email?.split('@')[0] || "User";
        await updateProfile(user, { displayName: displayName });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName,
          signupDate: serverTimestamp(),
        });

        toast({ title: "Sign Up Successful", description: `Welcome to Nuvia, ${displayName}!` });
        router.push('/');
      } else {
        throw new Error("User not created in Firebase Auth.");
      }
    } catch (error: any) {
      console.error("Sign up error object:", error); 
      let message = "An unknown error occurred during sign up.";
      if (error.code === 'auth/email-already-in-use') {
        message = "This email address is already in use.";
      } else if (error.code === 'auth/weak-password') {
        message = "Password is too weak. It must be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Invalid email format.";
      } else if (error.code === 'auth/missing-config') {
        message = "Firebase is not configured. Please ensure API Key and Project ID are set and the server was restarted.";
      } else if (error.code === 'auth/initialization-failed') {
        message = "Firebase connection failed. Please check configuration, console settings, and restart the server.";
      } else if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission-denied'))) {
        message = "Failed to save user data: Permission denied. Please check your Firestore security rules to allow new user documents to be created in the 'users' collection.";
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
      toast({ title: "Sign Up Failed", description: message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handlePasswordReset: SubmitHandler<PasswordResetFormData> = async (data) => {
    setIsResettingPassword(true);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: "Password Reset Email Sent",
        description: "If an account exists for this email, a password reset link has been sent. Please check your inbox.",
      });
      setShowPasswordResetForm(false);
      passwordResetForm.reset();
    } catch (error: any) {
      console.error("Password reset error object:", error);
      let message = "An unknown error occurred.";
       if (error.code === 'auth/user-not-found') {
        message = "No user found with this email address.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Invalid email format.";
      } else if (error.code === 'auth/missing-config' || error.code === 'auth/initialization-failed') {
        message = "Firebase is not properly configured. Cannot send reset email.";
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message); 
      toast({ title: "Password Reset Failed", description: message, variant: "destructive" });
    }
    setIsResettingPassword(false);
  };

  if (isCheckingAuth) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying session...</p>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    setAuthError(null);
    loginForm.reset();
    signUpForm.reset();
    passwordResetForm.reset();
    setShowPasswordResetForm(false);
    setActiveTab(value);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 auth-page-background">
      <Card className="w-full max-w-md shadow-xl bg-card/90 backdrop-blur-sm rounded-lg border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Bot className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-semibold font-headline text-foreground">Nuvia</h1>
          </div>
          <CardDescription className="text-muted-foreground">
            Your Smart AI Assistant. Please login or sign up.
          </CardDescription>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Login</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {!showPasswordResetForm ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                    <CardContent className="space-y-4 pt-6">
                      {authError && activeTab === 'login' && !showPasswordResetForm && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Login Error</AlertTitle>
                          <AlertDescription>{authError}</AlertDescription>
                        </Alert>
                      )}
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground/80">Email</FormLabel>
                            <FormControl>
                              <Input placeholder="m@example.com" {...field} className="bg-input border-border focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground/80">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showLoginPassword ? "text" : "password"}
                                  placeholder="••••••••" 
                                  {...field} 
                                  className="bg-input border-border focus:border-primary pr-10" 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:text-primary"
                                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                                >
                                  {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  <span className="sr-only">{showLoginPassword ? "Hide password" : "Show password"}</span>
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="text-right">
                          <Button variant="link" type="button" size="sm" className="p-0 h-auto text-primary hover:text-primary/80 text-xs" onClick={() => { setAuthError(null); setShowPasswordResetForm(true);}}>
                            Forgot Password?
                          </Button>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || !firebaseInitializedCorrectly}>
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <LogIn className="h-5 w-5 mr-2" />}
                        Login
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Button variant="link" type="button" size="sm" className="p-0 h-auto text-primary hover:text-primary/80" onClick={() => handleTabChange('signup')}>
                          Sign Up
                        </Button>
                      </p>
                    </CardFooter>
                  </form>
                </Form>
              ) : (
                <Form {...passwordResetForm}>
                  <form onSubmit={passwordResetForm.handleSubmit(handlePasswordReset)}>
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2"><KeyRound className="h-6 w-6 text-primary"/>Reset Password</CardTitle>
                      <CardDescription>Enter your email to receive a password reset link.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                      {authError && showPasswordResetForm && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Reset Error</AlertTitle>
                          <AlertDescription>{authError}</AlertDescription>
                        </Alert>
                      )}
                      <FormField
                        control={passwordResetForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground/80">Email</FormLabel>
                            <FormControl>
                              <Input placeholder="m@example.com" {...field} className="bg-input border-border focus:border-primary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isResettingPassword || !firebaseInitializedCorrectly}>
                        {isResettingPassword ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <MailQuestion className="h-5 w-5 mr-2" />}
                        Send Reset Link
                      </Button>
                      <Button variant="link" type="button" size="sm" className="p-0 h-auto text-primary hover:text-primary/80" onClick={() => { setAuthError(null); setShowPasswordResetForm(false); }}>
                        Back to Login
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)}>
                  <CardContent className="space-y-4 pt-6">
                    {authError && activeTab === 'signup' && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Sign Up Error</AlertTitle>
                        <AlertDescription>{authError}</AlertDescription>
                      </Alert>
                    )}
                    <FormField
                      control={signUpForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Name (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Name" {...field} className="bg-input border-border focus:border-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Email</FormLabel>
                          <FormControl>
                            <Input placeholder="m@example.com" {...field} className="bg-input border-border focus:border-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Password</FormLabel>
                           <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showSignUpPassword ? "text" : "password"}
                                  placeholder="•••••••• (min. 6 characters)" 
                                  {...field} 
                                  className="bg-input border-border focus:border-primary pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:text-primary"
                                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                >
                                  {showSignUpPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                  <span className="sr-only">{showSignUpPassword ? "Hide password" : "Show password"}</span>
                                </Button>
                              </div>
                            </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || !firebaseInitializedCorrectly}>
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <UserPlus className="h-5 w-5 mr-2" />}
                      Sign Up
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Button variant="link" type="button" size="sm" className="p-0 h-auto text-primary hover:text-primary/80" onClick={() => handleTabChange('login')}>
                        Login
                      </Button>
                    </p>
                  </CardFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
      </Card>
    </div>
  );
}
