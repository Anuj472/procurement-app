export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: tecs, error } = await supabase
      .from('tec')
      .select(`*, evaluations:tec_vendor_evaluations(*)`)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, tecs: tecs || [] })
  } catch (err: any) {
    console.error('get-tecs error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
