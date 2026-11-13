"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError, clearTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldError, Hint, Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthShell } from "@/components/auth-shell";

type LinkState = "checking" | "valid" | "invalid";

/** Field errors come back as {new_password: [...], confirm_password: [...]} */
function fieldErrors(body: unknown, field: string): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>)[field];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string").join(" ");
  return typeof value === "string" ? value : null;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [linkState, setLinkState] = useState<LinkState>(uid && token ? "checking" : "invalid");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Check the link up front, so an expired or already-used link says so before
  // the user types a new password.
  useEffect(() => {
    if (!uid || !token) return;
    let cancelled = false;
    api
      .post<{ data: { email: string } }>("/auth/password/reset/validate/", { uid, token }, { auth: false })
      .then((res) => {
        if (cancelled) return;
        setEmail(res.data.email);
        setLinkState("valid");
      })
      .catch(() => {
        if (!cancelled) setLinkState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [uid, token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    setConfirmError(null);
    if (password !== confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(
        "/auth/password/reset/",
        { uid, token, new_password: password, confirm_password: confirm },
        { auth: false }
      );
      // Every existing session was signed out server-side; drop this browser's too.
      clearTokens();
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const pwd = fieldErrors(err.body, "new_password");
        const conf = fieldErrors(err.body, "confirm_password");
        if (pwd || conf) {
          setPasswordError(pwd);
          setConfirmError(conf);
        } else if (/invalid or has expired/i.test(err.message)) {
          setLinkState("invalid");
        } else {
          setError(err.status === 429 ? "Too many attempts. Please wait a while and try again." : err.message);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (linkState === "checking") {
    return (
      <div className="mt-7 space-y-3" role="status" aria-label="Checking reset link">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (linkState === "invalid") {
    return (
      <div className="mt-7 space-y-5" data-testid="reset-link-invalid">
        <Alert tone="error" title="This link can't be used">
          This password reset link is invalid, has already been used, or has expired. Links work
          once and expire after 1 hour.
        </Alert>
        <Link href="/forgot-password" className="block">
          <Button variant="primary" size="lg" className="w-full">
            Request a new link
          </Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-7 space-y-5" data-testid="reset-password-done">
        <Alert tone="success" title="Password updated">
          Your password has been reset and you&apos;ve been signed out of all devices. Log in with
          your new password.
        </Alert>
        <Link href="/login" className="block">
          <Button variant="primary" size="lg" className="w-full">
            Go to log in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      {email && (
        <p className="text-sm text-muted">
          Resetting the password for <span className="font-medium text-heading">{email}</span>
        </p>
      )}
      <div>
        <Label htmlFor="new_password">New password</Label>
        <Input
          id="new_password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-state={passwordError ? "error" : undefined}
          minLength={8}
          required
        />
        {passwordError ? (
          <FieldError>{passwordError}</FieldError>
        ) : (
          <Hint>At least 8 characters, not too common, and not only numbers.</Hint>
        )}
      </div>
      <div>
        <Label htmlFor="confirm_password">Confirm new password</Label>
        <Input
          id="confirm_password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          data-state={confirmError ? "error" : undefined}
          required
        />
        {confirmError && <FieldError>{confirmError}</FieldError>}
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
        {isSubmitting ? "Saving…" : "Reset password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Card className="w-full max-w-md p-7 shadow-xl sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary ring-1 ring-inset ring-secondary/15">
          <Icon name="shield" size={20} />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-heading">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-sm text-muted">The link from your email lets you set it once.</p>
        {/* useSearchParams needs a Suspense boundary (see next/dist/docs). */}
        <Suspense
          fallback={
            <div className="mt-7 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
        <p className="mt-7 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-secondary underline-offset-4 hover:underline">
            Back to log in
          </Link>
        </p>
      </Card>
    </AuthShell>
  );
}
