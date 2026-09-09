import { NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal server error during logout";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
