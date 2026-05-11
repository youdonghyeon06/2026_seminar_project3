import { NextResponse } from "next/server";

const isJwtLike = (value: string) => value.split(".").length === 3;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_KEY;
  const functionsJwt =
    process.env.SUPABASE_FUNCTIONS_JWT ??
    process.env.NEXT_PUBLIC_SUPABASE_LEGACY_ANON_KEY;

  if (!projectUrl || !apiKey) {
    return NextResponse.json(
      { error: "Supabase env vars are missing" },
      { status: 500 },
    );
  }

  const functionsBase = projectUrl.replace(
    ".supabase.co",
    ".functions.supabase.co",
  );
  const targetUrl = `${functionsBase}/aladin`;

  const bearerKey = functionsJwt ?? (isJwtLike(apiKey) ? apiKey : undefined);

  if (!bearerKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_FUNCTIONS_JWT is missing. Set a legacy anon JWT key for Edge Function authorization.",
      },
      { status: 500 },
    );
  }

  const headers: Record<string, string> = {
    apikey: bearerKey,
    Authorization: `Bearer ${bearerKey}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "search", query }),
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      (data as { message?: string; error?: string })?.message ??
      (data as { message?: string; error?: string })?.error ??
      `Edge function failed with status ${res.status}`;

    return NextResponse.json(
      { error: message, detail: data },
      { status: res.status },
    );
  }

  return NextResponse.json(data ?? {});
}
