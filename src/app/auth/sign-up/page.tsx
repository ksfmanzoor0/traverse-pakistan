import { redirect } from "next/navigation";

// Passwordless model — sign-up and sign-in are the same flow. Preserve the
// /auth/sign-up URL but route everyone to /auth/sign-in.
export default function SignUpPage() {
  redirect("/auth/sign-in");
}
