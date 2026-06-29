import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";

/**
 * Admin-gated trigger for the external aeroglobe scraper hosted at
 * `ksfmanzoor0/traverse-flight-scraper`. Fires GitHub's workflow_dispatch
 * via the REST API. The PAT (`GITHUB_DISPATCH_TOKEN`) needs `Actions: write`
 * on that repo.
 *
 * Env required:
 *   GITHUB_DISPATCH_TOKEN — fine-grained PAT
 *   GITHUB_SCRAPER_REPO   — defaults to "ksfmanzoor0/traverse-flight-scraper"
 *   GITHUB_SCRAPER_WORKFLOW — defaults to "scrape.yml"
 *   GITHUB_SCRAPER_REF    — defaults to "main"
 */
export async function POST() {
  await requireAdmin();

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_DISPATCH_TOKEN not configured" },
      { status: 500 },
    );
  }

  const repo = process.env.GITHUB_SCRAPER_REPO ?? "ksfmanzoor0/traverse-flight-scraper";
  const workflow = process.env.GITHUB_SCRAPER_WORKFLOW ?? "scrape.yml";
  const ref = process.env.GITHUB_SCRAPER_REF ?? "main";

  const url = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref }),
  });

  if (res.status === 204) {
    return NextResponse.json({
      ok: true,
      message: `Scraper workflow dispatched on ${repo}@${ref} (${workflow}). Check GitHub Actions for progress.`,
      actionsUrl: `https://github.com/${repo}/actions`,
    });
  }

  const body = await res.text().catch(() => "");
  return NextResponse.json(
    { error: `GitHub API ${res.status}: ${body.slice(0, 200)}` },
    { status: 502 },
  );
}
