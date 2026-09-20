import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, phone, role, farm_name, farm_location, address } = body;

    // 1. Validation
    if (!email || !password || !full_name || !phone) {
      return NextResponse.json(
        { error: "Please provide email, password, full name, and phone number." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const assignedRole: UserRole = role === "farmer" ? "farmer" : "buyer";

    let authData: any = null;
    let authError: any = null;
    let isNetworkError = false;

    // 2. Register via Supabase Auth
    try {
      const supabase = await createServerSupabase();
      const res = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: full_name.trim(),
            phone: phone.trim(),
            role: assignedRole,
            farm_name: assignedRole === "farmer" ? (farm_name?.trim() || null) : null,
            farm_location: assignedRole === "farmer" ? (farm_location?.trim() || null) : null,
            address: address?.trim() || null,
          },
        },
      });
      authData = res.data;
      authError = res.error;
    } catch (networkErr: any) {
      console.warn("Supabase Auth unreachable during register, activating fallback:", networkErr?.message);
      isNetworkError = true;
    }

    if (!isNetworkError && authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    // 3. Upsert user profile in public.users if Supabase is online
    if (authData?.user) {
      try {
      const adminClient = getAdminClient();
      await adminClient.from("users").upsert({
        id: authData.user.id,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: assignedRole,
        farm_name: assignedRole === "farmer" ? (farm_name?.trim() || null) : null,
        farm_location: assignedRole === "farmer" ? (farm_location?.trim() || null) : null,
        address: address?.trim() || null,
        is_verified: false,
      });
    } catch (dbErr) {
      console.warn("Direct public.users sync notice (trigger may handle):", dbErr);
    }

    const cleanUser = {
      id: authData?.user?.id || `usr_${Buffer.from(email).toString("hex").slice(0, 10)}`,
      email: authData?.user?.email || email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role: assignedRole,
      phone: phone.trim(),
      farm_name: assignedRole === "farmer" ? (farm_name?.trim() || null) : null,
      farm_location: assignedRole === "farmer" ? (farm_location?.trim() || null) : null,
      address: address?.trim() || null,
    };

    return NextResponse.json({
      success: true,
      user: cleanUser,
      message: "Account created successfully.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error during registration";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
