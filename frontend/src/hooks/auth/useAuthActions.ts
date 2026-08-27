import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signIn, authClient } from "@/lib/auth-client";

export function useAuthActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged in successfully");
      router.push("/");
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
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
      router.push("/");
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signIn.social({
      provider: "google",
      callbackURL: "/",
    });
    setLoading(false);
    
    if (error) {
      toast.error(error.message || "Google Sign-In failed or not configured.");
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    toast.loading("Signing out...", { id: "signout-toast" });
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.dismiss("signout-toast");
          toast.success("Signed out successfully");
          router.push("/");
          router.refresh();
        },
        onError: () => {
          toast.dismiss("signout-toast");
          toast.error("Failed to sign out");
          setIsSigningOut(false);
        },
      },
    });
  };

  return {
    loading,
    isSigningOut,
    handleSignIn,
    handleSignUp,
    handleGoogleSignIn,
    handleSignOut,
  };
}
