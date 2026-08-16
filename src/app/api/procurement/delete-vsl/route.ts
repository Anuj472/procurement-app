import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { pre_te_no } = await req.json()
    if (!pre_te_no) {
      return NextResponse.json({ success: false, error: 'Missing pre_te_no' })
    }

    const supabase = await createClient()

    // 1. Delete associated SHIS mappings from pre_te_shis table to avoid foreign key errors
    const { error: childErr } = await supabase
      .from('pre_te_shis')
      .delete()
      .eq('pre_te_no', pre_te_no)

    if (childErr) throw childErr

    // 2. Delete the parent row from pre_te
    const { error: deleteErr } = await supabase
      .from('pre_te')
      .delete()
      .eq('pre_te_no', pre_te_no)

    if (deleteErr) throw deleteErr

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting VSL:', error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
