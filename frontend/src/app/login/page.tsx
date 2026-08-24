"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn.email({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged in successfully");
        router.push("/chat");
      }
    } else {
      const { signUp } = await import("@/lib/auth-client");
      const { error } = await signUp.email({
        email,
        password,
        name: email.split("@")[0],
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created successfully");
        router.push("/chat");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/chat",
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl rounded-none">
        <CardHeader className="space-y-1 border-b border-border bg-muted/30">
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-foreground">
            {isLogin ? "Sign In" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            {isLogin
              ? "Enter your email to sign in to your account"
              : "Enter your email to create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <Button
            variant="outline"
            className="w-full h-12 bg-background border-border hover:bg-accent text-foreground rounded-none font-bold uppercase tracking-wider"
            onClick={handleGoogleSignIn}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-bold tracking-widest">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m.khabib@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border text-foreground h-12 focus-visible:ring-primary rounded-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-border text-foreground h-12 focus-visible:ring-primary rounded-none"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 font-bold uppercase tracking-wider rounded-none"
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-4 uppercase tracking-wider"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
