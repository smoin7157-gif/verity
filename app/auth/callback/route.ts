import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GitHub OAuth redirects here with a `code` query param.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Only allow relative redirects back into the app.
      const redirectTo = next.startsWith("/") ? next : "/dashboard";
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
