import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isSynthesizedEmail } from "@/lib/auth/phone";
import { SettingsForm } from "@/components/account/SettingsForm";

export default async function SettingsPage() {
  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user;
  if (!user) redirect("/auth/sign-in?next=/account/settings");

  const meta = (user.user_metadata as Record<string, unknown> | undefined) ?? {};
  const name = (meta.name as string | undefined) ?? "";
  const username = (meta.username as string | undefined) ?? null;
  const realEmail = user.email && !isSynthesizedEmail(user.email) ? user.email : null;

  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "Account", href: "/account" }, { label: "Settings" }]} />
        <div className="mt-6 max-w-[680px]">
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
          <p className="mt-1.5 text-[14px] text-[var(--text-secondary)]">
            Update how you appear across Traverse Pakistan.
          </p>
          <div className="mt-8">
            <SettingsForm initialName={name} username={username} email={realEmail} />
          </div>
        </div>
      </Container>
    </div>
  );
}
