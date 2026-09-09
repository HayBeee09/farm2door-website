import { NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id, full_name, email, phone, role, farm_name, farm_location, address, is_verified")
      .eq("id", user.id)
      .maybeSingle();

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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error fetching user session";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
