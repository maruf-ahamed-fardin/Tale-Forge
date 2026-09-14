import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to continue writing with TaleForge.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input type="email" placeholder="Email" autoComplete="email" />
        <Input type="password" placeholder="Password" autoComplete="current-password" />
        <Button className="w-full">Log in</Button>
        <div className="flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-semibold text-primary">
            Forgot password?
          </Link>
          <Link href="/register" className="font-semibold text-primary">
            Create account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
