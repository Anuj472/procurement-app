import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const lf_no = searchParams.get('lf_no')
    if (!lf_no) return NextResponse.json({ success: false, error: 'lf_no is required' }, { status: 400 })

    const supabase = await createClient()

    // 1. Fetch item description
    const { data: itemData, error: itemErr } = await supabase
      .from('m_item')
      .select('item_description, stock_qty')
      .eq('lf_no', lf_no)
      .single()

    if (itemErr) {
      console.error('Error fetching item:', itemErr)
      return NextResponse.json({ success: false, error: 'Item not found in m_item' }, { status: 404 })
    }

    // 2. Fetch SHIS details
    const { data: shisRecords, error: shisErr } = await supabase
      .from('shis_table')
      .select('shis_no, shis_dt, prop_qty, os_qty')
      .eq('lf_no', lf_no)
    
    if (shisErr) console.error('Error fetching SHIS:', shisErr)

    let totalShisQty = 0
    const shis_details: any[] = []
    if (shisRecords) {
      shisRecords.forEach((s: any) => {
        const qty = Number(s.prop_qty || s.os_qty || 0)
        if (qty > 0) {
          totalShisQty += qty
          shis_details.push({
            shis_no: s.shis_no,
            shis_dt: s.shis_dt,
            qty
          })
        }
      })
    }
    
    // If no active SHIS records, use stock_qty or fallback for UI testing purposes
    if (totalShisQty === 0) totalShisQty = itemData?.stock_qty || 0

    // 3. Fetch PO history
    const { data: poRecords, error: poErr } = await supabase
      .from('po_order')
      .select('po_no, po_dt, party_cd, unit_rate_wo_tax, oustanding_qty')
      .eq('lf_no', lf_no)
      
    if (poErr) console.error('Error fetching POs:', poErr)

    const partyCodes = Array.from(new Set((poRecords || []).map((p: any) => p.party_cd).filter(Boolean)))
    let partyMap = new Map<string, string>()
    
    if (partyCodes.length > 0) {
      const { data: partyRecords } = await supabase
        .from('m_party')
        .select('party_cd, party_nam')
        .in('party_cd', partyCodes)
        
      if (partyRecords) {
        partyRecords.forEach((p: any) => partyMap.set(p.party_cd, p.party_nam))
      }
    }

    const previous_vendors = new Set<string>()
    const pending_orders: any[] = []
    let last_supplied_rate = 0

    if (poRecords && poRecords.length > 0) {
      const sortedPos = [...poRecords].sort((a, b) => new Date(b.po_dt || 0).getTime() - new Date(a.po_dt || 0).getTime())
      
      if (sortedPos[0].unit_rate_wo_tax) {
        last_supplied_rate = Number(sortedPos[0].unit_rate_wo_tax)
      }

      sortedPos.forEach((po: any) => {
        const vendorName = partyMap.get(po.party_cd) || po.party_cd || 'Unknown Vendor'
        previous_vendors.add(vendorName)
        
        if (po.oustanding_qty && po.oustanding_qty > 0) {
          pending_orders.push({
            po_no: po.po_no,
            vendor_name: vendorName,
            po_dt: po.po_dt,
            outstanding_qty: po.oustanding_qty
          })
        }
      })
    }

    return NextResponse.json({
      success: true,
      item: {
        lf_no,
        item_description: itemData.item_description,
        total_shis_quantity: totalShisQty,
        shis_details,
        previous_vendors: Array.from(previous_vendors).length > 0 ? Array.from(previous_vendors) : ['No Prior Supplier Recorded'],
        last_supplied_rate,
        pending_orders
      }
    })

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
