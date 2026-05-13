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

  // --- 키 로테이션 로직 시작 ---
  // 첫 번째 시도 (기본 ALADIN_TTB_KEY 사용)
  let res = await fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "search", query }),
  });

  let text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  // 만약 첫 번째 키가 한도 초과(errorCode: 4)이거나 서비스 거부 상태라면
  // 수파베이스 엣지 펑션에 저장된 ALADIN_TTB_KEY_2를 사용하도록 요청
  if (data?.errorCode === "4" || data?.errorCode === 4 || (data?.error && data.error.includes("금지"))) {
    console.log("첫 번째 API 키 한도 초과. 두 번째 키(ALADIN_TTB_KEY_2)로 재시도합니다.");
    
    res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ 
        type: "search", 
        query,
        useAltKey: true // 엣지 펑션 코드에서 이 값을 확인하여 ALADIN_TTB_KEY_2를 쓰도록 약속
      }),
    });

    text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
  }
  // --- 키 로테이션 로직 끝 ---

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
