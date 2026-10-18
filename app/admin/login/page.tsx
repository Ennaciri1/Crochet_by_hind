import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="wrap">
      <div className="login-box">
        <h1>Admin login</h1>
        <p className="muted">Log in with the email and password of your Supabase user.</p>
        <LoginForm />
      </div>
    </main>
  );
}
