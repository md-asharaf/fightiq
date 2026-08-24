import { LoginView } from "@/components/auth/LoginView";

export const metadata = {
  title: "Sign Up | FightIQ",
  description: "Create a new FightIQ account.",
};

export default function SignUpPage() {
  return <LoginView defaultIsLogin={false} />;
}
