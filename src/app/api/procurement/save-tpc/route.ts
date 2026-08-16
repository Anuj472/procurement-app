import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { tpc, price_bids, decisions } = body;

    // Upsert master TPC record
    const { error: tpcErr } = await supabase
      .from("tpc")
      .upsert({ ...tpc, updated_at: new Date().toISOString() });
    if (tpcErr) throw tpcErr;

    // Delete existing bids/decisions for this tpc_no (clean re-upsert)
    await supabase.from("tpc_item_price_bids").delete().eq("tpc_no", tpc.tpc_no);
    await supabase.from("tpc_item_decisions").delete().eq("tpc_no", tpc.tpc_no);

    // Insert price bids
    if (price_bids && price_bids.length > 0) {
      const { error: bidsErr } = await supabase
        .from("tpc_item_price_bids")
        .insert(price_bids.map((b: any) => ({ ...b, tpc_no: tpc.tpc_no })));
      if (bidsErr) throw bidsErr;
    }

    // Insert decisions
    if (decisions && decisions.length > 0) {
      const { error: decErr } = await supabase
        .from("tpc_item_decisions")
        .insert(decisions.map((d: any) => ({ ...d, tpc_no: tpc.tpc_no })));
      if (decErr) throw decErr;
    }

    return NextResponse.json({ success: true, tpc_no: tpc.tpc_no });
  } catch (err: any) {
    console.error("save-tpc error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
