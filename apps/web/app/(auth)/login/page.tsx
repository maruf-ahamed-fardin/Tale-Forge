"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="text-foreground">{t("auth.welcomeBack", undefined, "Welcome back")}</CardTitle>
        <CardDescription>{t("auth.signInDesc", undefined, "Sign in to continue writing with TaleForge.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="login-email"
            type="email"
            placeholder={t("auth.email", undefined, "Email")}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="login-password"
            type="password"
            placeholder={t("auth.password", undefined, "Password")}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <Button id="login-submit" type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.signingIn", undefined, "Signing in…") : t("auth.logIn", undefined, "Log in")}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
              {t("auth.forgotPassword", undefined, "Forgot password?")}
            </Link>
            <Link href="/register" className="font-semibold text-primary hover:underline">
              {t("auth.createAccount", undefined, "Create account")}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
