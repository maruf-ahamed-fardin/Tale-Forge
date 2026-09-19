"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { register } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

export default function RegisterPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(
        language === "bn"
          ? "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে"
          : "Password must be at least 8 characters"
      );
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="text-foreground">{t("auth.createWorkspace", undefined, "Create your workspace")}</CardTitle>
        <CardDescription>{t("auth.createWorkspaceDesc", undefined, "Set up a private TaleForge account.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="register-name"
            placeholder={t("auth.name", undefined, "Name")}
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            id="register-email"
            type="email"
            placeholder={t("auth.email", undefined, "Email")}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="register-password"
            type="password"
            placeholder={t("auth.passwordMin", undefined, "Password (min 8 characters)")}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <Button id="register-submit" type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.creatingAccount", undefined, "Creating account…") : t("auth.createAccount", undefined, "Create account")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t("auth.alreadyHaveAccount", undefined, "Already have an account?")}{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {t("auth.logIn", undefined, "Log in")}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
