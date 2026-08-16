export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all pre_te records
    const { data: preTeRecords, error: preTeErr } = await supabase
      .from('pre_te')
      .select('*')
      .order('upd_dt', { ascending: false })

    if (preTeErr) throw preTeErr

    // If there's a metadata column containing the full payload, we can use that to perfectly reconstruct.
    // If not, we map what we have from pre_te.
    const vsls = (preTeRecords || []).map((row: any) => {
      if (row.metadata) {
        // We saved the full original payload in the metadata column
        return {
          ...row.metadata,
          id: row.metadata.id || `vsl-${row.pre_te_no}`,
          vsl_no: row.pre_te_no,
          pre_te_no: row.pre_te_no,
          status: 'Draft',
          created_at: row.upd_dt,
          vsl_dt: row.upd_dt?.split('T')[0] || new Date().toISOString().split('T')[0],
          prepared_by: row.user_id,
          user_id: row.user_id,
          pre_te: row
        }
      } else {
        // Fallback for rows without metadata
        return {
          id: `vsl-${row.pre_te_no}`,
          vsl_no: row.pre_te_no,
          pre_te_no: row.pre_te_no,
          vsl_dt: row.upd_dt?.split('T')[0] || new Date().toISOString().split('T')[0],
          status: 'Draft',
          prepared_by: row.user_id,
          user_id: row.user_id,
          created_at: row.upd_dt,
          items: [],
          vendors: [],
          pre_te: row
        }
      }
    })

    return NextResponse.json({
      success: true,
      vsls
    })

  } catch (err: any) {
    console.error('get-vsls error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

