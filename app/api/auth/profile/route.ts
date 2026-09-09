import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { Database } from "@/lib/supabase/types";

type UserUpdatePayload = Database["public"]["Tables"]["users"]["Update"];

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { authenticated: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, full_name, email, phone, role, farm_name, farm_location, address, is_verified, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn("Error fetching user profile from database:", profileError.message);
    }

    const userPayload = profile || {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      phone: user.user_metadata?.phone || "",
      role: user.user_metadata?.role || "buyer",
      farm_name: user.user_metadata?.farm_name || null,
      farm_location: user.user_metadata?.farm_location || null,
      address: user.user_metadata?.address || null,
      is_verified: false,
    };

    return NextResponse.json({
      success: true,
      profile: userPayload,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error fetching profile";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to update your profile." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { full_name, phone, address, farm_name, farm_location } = body;

    // Input Validation
    if (full_name !== undefined && (!full_name || full_name.trim().length < 2)) {
      return NextResponse.json(
        { success: false, error: "Full name must be at least 2 characters long." },
        { status: 400 }
      );
    }

    const updateFields: UserUpdatePayload = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updateFields.full_name = full_name.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (address !== undefined) updateFields.address = address.trim();
    if (farm_name !== undefined) updateFields.farm_name = farm_name.trim();
    if (farm_location !== undefined) updateFields.farm_location = farm_location.trim();

    // 1. Update public.users record
    const { data: updatedDbProfile, error: dbError } = await supabase
      .from("users")
      .update(updateFields)
      .eq("id", user.id)
      .select("id, full_name, email, phone, role, farm_name, farm_location, address, is_verified, created_at, updated_at")
      .maybeSingle();

    if (dbError) {
      console.warn("Failed to update public.users row:", dbError.message);
    }

    // 2. Sync to Supabase Auth metadata
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: updateFields.full_name || user.user_metadata?.full_name,
          phone: updateFields.phone || user.user_metadata?.phone,
          address: updateFields.address || user.user_metadata?.address,
          farm_name: updateFields.farm_name || user.user_metadata?.farm_name,
          farm_location: updateFields.farm_location || user.user_metadata?.farm_location,
        },
      });
    } catch (authMetaErr) {
      console.warn("Notice: Failed to update auth metadata:", authMetaErr);
    }

    const responseProfile = updatedDbProfile || {
      id: user.id,
      email: user.email,
      full_name: updateFields.full_name || user.user_metadata?.full_name || "User",
      phone: updateFields.phone || user.user_metadata?.phone || "",
      role: user.user_metadata?.role || "buyer",
      farm_name: updateFields.farm_name || user.user_metadata?.farm_name || null,
      farm_location: updateFields.farm_location || user.user_metadata?.farm_location || null,
      address: updateFields.address || user.user_metadata?.address || null,
      is_verified: user.user_metadata?.is_verified || false,
    };

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile: responseProfile,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error updating profile";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
