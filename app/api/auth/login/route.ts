import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please provide both email and password." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Invalid email or password." },
        { status: 401 }
      );
    }

    // Retrieve full profile from public.users
    const { data: profile } = await supabase
      .from("users")
      .select("id, full_name, email, phone, role, farm_name, farm_location, address, is_verified")
      .eq("id", authData.user.id)
      .maybeSingle();

    const userPayload = profile || {
      id: authData.user.id,
      email: authData.user.email,
      full_name: authData.user.user_metadata?.full_name || authData.user.email,
      phone: authData.user.user_metadata?.phone || "",
      role: authData.user.user_metadata?.role || "buyer",
      farm_name: authData.user.user_metadata?.farm_name || null,
      farm_location: authData.user.user_metadata?.farm_location || null,
      address: authData.user.user_metadata?.address || null,
      is_verified: false,
    };

    return NextResponse.json({
      success: true,
      user: userPayload,
      message: "Logged in successfully.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error during login";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
