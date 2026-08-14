import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch items with their SHIS requirements and PO history (including vendor names)
    const { data: items, error } = await supabase
      .from('m_item')
      .select(`
        lf_no,
        item_description,
        shis_table (
          shis_no,
          prop_qty
        ),
        po_order (
          po_no,
          po_dt,
          unit_rate_wo_tax,
          m_party (
            party_nam
          )
        )
      `)

    if (error) throw error

    // Filter and process items that have at least one active SHIS requirement
    const clubbedRows = (items || [])
      .filter((item: any) => item.shis_table && item.shis_table.length > 0)
      .map((item: any) => {
        // 1. Calculate Total Required Quantity from SHIS table
        const totalRequiredQty = item.shis_table.reduce((sum: number, s: any) => sum + (s.prop_qty || 0), 0)

        // 2. Extract unique vendor names from historical POs
        const vendorNamesSet = new Set<string>()
        if (item.po_order && Array.isArray(item.po_order)) {
          item.po_order.forEach((po: any) => {
            if (po.m_party?.party_nam) {
              vendorNamesSet.add(po.m_party.party_nam)
            }
          })
        }
        const vendors = vendorNamesSet.size > 0 ? Array.from(vendorNamesSet) : ['No Prior Supplier Recorded']

        // 3. Find Last Purchased Rate (sort POs by date descending)
        let lastRate = 'N/A'
        if (item.po_order && item.po_order.length > 0) {
          const sortedPOs = [...item.po_order].sort((a: any, b: any) => 
            new Date(b.po_dt || 0).getTime() - new Date(a.po_dt || 0).getTime()
          )
          if (sortedPOs[0]?.unit_rate_wo_tax != null) {
            lastRate = Number(sortedPOs[0].unit_rate_wo_tax).toFixed(2)
          }
        }

        return {
          lf_no: item.lf_no,
          item_description: item.item_description,
          vendors: vendors,
          shis_list: item.shis_table.map((s: any) => s.shis_no),
          total_required_qty: totalRequiredQty,
          last_purchased_rate: lastRate
        }
      })

    return NextResponse.json({ success: true, data: clubbedRows })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
