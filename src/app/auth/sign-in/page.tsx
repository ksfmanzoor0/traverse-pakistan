import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Traverse Pakistan to manage your bookings.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <div className="py-12 sm:py-20">
      <Container>
        <div className="max-w-[420px] mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[var(--text-primary)] tracking-tight">
              Sign in
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2">
              Use your email to sign in or create an account. No password required.
            </p>
          </div>
          <SignInForm />
        </div>
      </Container>
    </div>
  );
}
