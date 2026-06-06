import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * EC-No lookup against the vehicle_reference catalog, used by the New Vehicle
 * screen to auto-fill VTD/Device ID, Chassis No, and Color.
 *
 * GET /api/vehicle-reference?ec=EC000001
 *   → { found: true, device_id, chassis_no, color }  (match)
 *   → { found: false }                                (no match)
 *
 * RLS allows any authenticated user to read vehicle_reference.
 */
export async function GET(request: Request) {
  const ec = new URL(request.url).searchParams.get("ec")?.trim().toUpperCase()
  if (!ec) return NextResponse.json({ found: false })

  const supabase = createClient()
  const { data, error } = await supabase
    .from("vehicle_reference")
    .select("device_id, chassis_no, color")
    .eq("ec_no", ec)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ found: false })

  return NextResponse.json({ found: true, ...data })
}
