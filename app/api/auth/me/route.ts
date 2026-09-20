import { NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    let user = null;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    } catch {
      // Supabase network unreachable or session absent
    }

    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    let profile = null;
    try {
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, phone, role, farm_name, farm_location, address, is_verified")
        .eq("id", user.id)
        .maybeSingle();
      profile = data;
    } catch {
      // Ignore database query error on offline mode
    }

    const userPayload = profile || {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      phone: user.user_metadata?.phone || "",
      role: user.user_metadata?.role || "buyer",
      farm_name: user.user_metadata?.farm_name || null,
      farm_location: user.user_metadata?.farm_location || null,
      address: user.user_metadata?.address || null,
      is_verified: false,
    };

    return NextResponse.json({
      authenticated: true,
      user: userPayload,
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 200 });
  }
}
