"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export function AdminLoginView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn.email({
      email,
      password,
    });
    setLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Admin portal accessed");
      router.push("/admin");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Red accent for admin portal to make it distinct */}
      <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      <div className="absolute top-0 w-full h-1 bg-primary" />
      
      <Card className="w-full max-w-md bg-card border-border shadow-2xl rounded-none relative z-10 border-t-4 border-t-primary">
        <CardHeader className="space-y-1 border-b border-border bg-muted/30">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
              <ShieldAlert className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black uppercase tracking-tighter text-foreground text-center">
            Restricted Area
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium text-center">
            Sign in to access the FightIQ Admin Portal
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
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
              {loading ? "Authenticating..." : "Sign In to Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
