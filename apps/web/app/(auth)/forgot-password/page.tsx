"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="text-foreground">{t("auth.resetPassword", undefined, "Reset password")}</CardTitle>
        <CardDescription>{t("auth.resetPasswordDesc", undefined, "Enter your email to receive password reset instructions.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input type="email" placeholder={t("auth.email", undefined, "Email")} autoComplete="email" />
        <Button className="w-full">{t("auth.sendResetLink", undefined, "Send reset link")}</Button>
        <Link href="/login" className="block text-center text-sm font-semibold text-primary hover:underline">
          {t("auth.backToLogin", undefined, "Back to login")}
        </Link>
      </CardContent>
    </Card>
  );
}
