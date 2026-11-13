"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { AuthShell } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await api.post<{ message: string }>(
        "/auth/password/forgot/",
        { email: email.trim() },
        { auth: false }
      );
      setSentMessage(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? "Too many requests. Please wait a while and try again."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <Card className="w-full max-w-md p-7 shadow-xl sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
          <Icon name="mail" size={20} />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-heading">
          Forgot your password?
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Enter the email you registered with and we&apos;ll send you a link to reset it.
        </p>

        {sentMessage ? (
          <div className="mt-7 space-y-5" data-testid="forgot-password-sent">
            <Alert tone="success" title="Check your email">
              {sentMessage} The link expires in 1 hour.
            </Alert>
            <Button variant="outline" className="w-full" onClick={() => setSentMessage(null)}>
              Send to a different email
            </Button>
          </div>
        ) : (
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

            {error && <Alert tone="error">{error}</Alert>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-7 text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-secondary underline-offset-4 hover:underline">
            Back to log in
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}
