import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { Database } from "@/lib/supabase/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  // Calling getUser() refreshes expired tokens in cookies automatically
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect Farmer Dashboard routes
  if (pathname.startsWith("/dashboard/farmer")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "login");
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const role = user.user_metadata?.role;
    if (role !== "farmer" && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("notice", "farmer_only");
      return NextResponse.redirect(url);
    }
  }

  // Protect Admin routes
  if (pathname.startsWith("/admin")) {
    if (!user || user.user_metadata?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("notice", "admin_only");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
};

export const createClient = updateSession;
