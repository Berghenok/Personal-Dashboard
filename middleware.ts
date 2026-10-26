import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const isPublic = request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/auth/");
  if (!user && !isPublic) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.search = "";
    return NextResponse.redirect(destination);
  }
  // Personal dashboards must never be served from a shared CDN cache.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest).*)"],
};
