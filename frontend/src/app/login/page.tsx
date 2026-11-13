"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      const requestedNext = new URLSearchParams(window.location.search).get("next");
      const safeNext = requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
        ? requestedNext
        : "/dashboard";
      router.push(safeNext);
    } catch (err) {
      setError(err instanceof ApiError ? "Invalid email or password." : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <Card className="w-full max-w-md p-7 shadow-xl sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
          <Icon name="user" size={20} />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-heading">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-muted">Log in to manage your invitations.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-state={error ? "error" : undefined}
              required
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-secondary underline-offset-4 hover:underline"
                data-testid="forgot-password-link"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-state={error ? "error" : undefined}
              required
            />
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-secondary underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}
