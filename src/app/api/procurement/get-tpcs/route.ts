export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: tpcs, error } = await supabase
      .from('tpc')
      .select('*, tpc_item_price_bids(*), tpc_item_decisions(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ success: true, tpcs: tpcs || [] })
  } catch (err: any) {
    console.error('get-tpcs error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
