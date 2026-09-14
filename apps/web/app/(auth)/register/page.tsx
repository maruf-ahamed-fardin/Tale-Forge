import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>Set up a private TaleForge account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Name" autoComplete="name" />
        <Input type="email" placeholder="Email" autoComplete="email" />
        <Input type="password" placeholder="Password" autoComplete="new-password" />
        <Button className="w-full">Create account</Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
