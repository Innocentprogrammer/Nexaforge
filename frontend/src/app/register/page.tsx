"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, Hint } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { AuthShell } from "@/components/auth-shell";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        full_name: fullName,
        email,
        phone,
        password,
        confirm_password: confirmPassword,
      });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as Record<string, unknown>;
        const firstError = Object.values(body || {})[0];
        setError(Array.isArray(firstError) ? String(firstError[0]) : err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Purely visual: flags an obvious mismatch before the request is made. The
  // server remains the authority — submission is never blocked here.
  const mismatch =
    confirmPassword.length > 0 && password.length > 0 && password !== confirmPassword;

  return (
    <AuthShell>
      <Card className="w-full max-w-md p-7 shadow-xl sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
          <Icon name="sparkles" size={20} />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-heading">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted">Start designing your invitation today.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <Hint>At least 8 characters.</Hint>
          </div>
          <div>
            <Label htmlFor="confirm_password">Confirm password</Label>
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-state={mismatch ? "error" : confirmPassword && !mismatch ? "success" : undefined}
              aria-invalid={mismatch || undefined}
              required
            />
            {mismatch && (
              <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-error">
                <Icon name="warning" size={13} />
                Passwords don&apos;t match yet.
              </p>
            )}
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
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-7 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-secondary underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}
