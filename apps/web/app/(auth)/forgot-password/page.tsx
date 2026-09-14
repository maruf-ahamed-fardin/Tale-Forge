import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Enter your email to receive password reset instructions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input type="email" placeholder="Email" autoComplete="email" />
        <Button className="w-full">Send reset link</Button>
        <Link href="/login" className="block text-center text-sm font-semibold text-primary">
          Back to login
        </Link>
      </CardContent>
    </Card>
  );
}
