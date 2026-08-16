import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { pre_te_no, te_no } = await req.json()
    if (!pre_te_no || !te_no) {
      return NextResponse.json({ success: false, error: 'Missing required fields' })
    }

    const supabase = await createClient()

    // First fetch existing metadata
    const { data: existing, error: fetchErr } = await supabase
      .from('pre_te')
      .select('metadata')
      .eq('pre_te_no', pre_te_no)
      .single()

    if (fetchErr) throw fetchErr

    const newMetadata = existing?.metadata || {}
    newMetadata.te_no = te_no

    // Update te_no and metadata
    const { error: updateErr } = await supabase
      .from('pre_te')
      .update({ te_no, metadata: newMetadata })
      .eq('pre_te_no', pre_te_no)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating TE no:', error)
    return NextResponse.json({ success: false, error: error.message })
  }
}
