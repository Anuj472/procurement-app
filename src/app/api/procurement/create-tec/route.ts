import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function POST(req: Request) {
  try {
    const payload = await req.json()
    const { tecData, vendorEvaluations } = payload

    if (!tecData || !tecData.tec_no || !tecData.te_no) {
      return NextResponse.json({ success: false, error: 'Missing required TEC fields' })
    }

    const supabase = await createClient()

    const { error: tecErr } = await supabase
      .from('tec')
      .insert({
        tec_no: tecData.tec_no,
        te_no: tecData.te_no,
        tec_dt: tecData.tec_dt || new Date().toISOString().split('T')[0],
        tender_opening_dt: tecData.tender_opening_dt || null,
        tec_level: tecData.tec_level || 'TEC-II',
        committee_remarks: tecData.committee_remarks || '',
        prepared_by: tecData.prepared_by || 'System',
        status: tecData.status || 'Approved'
      })

    if (tecErr) throw tecErr

    if (vendorEvaluations && vendorEvaluations.length > 0) {
      const rows = vendorEvaluations.map((v: any) => ({
        tec_no: tecData.tec_no,
        vendor_name: v.vendor_name,
        compliance_statement: v.compliance_statement || '',
        local_content_cert: v.local_content_cert || '',
        nda_cert: v.nda_cert || '',
        non_blacklisted_cert: v.non_blacklisted_cert || '',
        land_border_cert: v.land_border_cert || '',
        msme_status: v.msme_status || '',
        participation_as: v.participation_as || '',
        gst_pct: v.gst_pct || '',
        for_destination_delivery: v.for_destination_delivery || '',
        pre_integrity_pact: v.pre_integrity_pact || '',
        emd_status: v.emd_status || '',
        registration_with_ofb: v.registration_with_ofb || '',
        clarifications: v.clarifications || '',
        user_section_remarks: v.user_section_remarks || '',
        is_technically_suitable: !!v.is_technically_suitable
      }))

      const { error: evalErr } = await supabase
        .from('tec_vendor_evaluations')
        .insert(rows)

      if (evalErr) {
        await supabase.from('tec').delete().eq('tec_no', tecData.tec_no)
        throw evalErr
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in create-tec:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
