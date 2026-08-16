import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()

    // Build pre_te_no using financial year logic + auto-increment style
    const now = new Date()
    const month = now.getMonth() + 1
    const fyYear = month >= 4 ? now.getFullYear() : now.getFullYear() - 1
    const yy = String(fyYear).slice(-2)

    // Check existing count for this FY to build sequence
    const { count } = await supabase
      .from('pre_te')
      .select('pre_te_no', { count: 'exact', head: true })
      .ilike('pre_te_no', `${yy}%`)
    const seq = String((count || 0) + 1).padStart(5, '0')
    const pre_te_no = body.pre_te_no || `${yy}35P${seq}`

    // Insert into pre_te table
    const { data: preTe, error: preteErr } = await supabase
      .from('pre_te')
      .insert({
        pre_te_no,
        te_typ: body.te_typ,
        opt_cl: body.opt_cl,
        tpc_lv: body.tpc_lv,
        head_cd: body.head_cd,
        bid_typ: body.bid_typ,
        qty_dist: body.qty_dist,
        dp_days: body.dp_days,
        gst_per: body.gst_per,
        user_id: body.user_id,
        upd_dt: new Date().toISOString(),
      })
      .select()
      .single()

    if (preteErr) {
      console.warn('pre_te insert warning:', preteErr.message)
    }

    // Insert into pre_te_shis mapping table
    if (body.items && Array.isArray(body.items)) {
      const shisInserts: any[] = []
      body.items.forEach((item: any) => {
        if (item.shis_details && Array.isArray(item.shis_details)) {
          item.shis_details.forEach((sh: any) => {
            if (sh.shis_no) {
              shisInserts.push({ pre_te_no, shis_no: sh.shis_no })
            }
          })
        }
      })
      
      if (shisInserts.length > 0) {
        // Remove duplicates just in case
        const uniqueInserts = shisInserts.filter((v, i, a) => a.findIndex(t => (t.shis_no === v.shis_no)) === i)
        
        const { error: shisErr } = await supabase
          .from('pre_te_shis')
          .insert(uniqueInserts)
          
        if (shisErr) {
          console.warn('pre_te_shis insert warning:', shisErr.message)
        }
      }
    }
    
    // Attempt to store the full JSON payload in a 'metadata' column if it exists 
    // (useful for reconstructing exact VSL state on the frontend)
    await supabase.from('pre_te').update({ metadata: body }).eq('pre_te_no', pre_te_no).select()
    

    return NextResponse.json({
      success: true,
      pre_te_no,
      pre_te: preTe || { pre_te_no, ...body },
    })
  } catch (err: any) {
    console.error('save-vsl error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
