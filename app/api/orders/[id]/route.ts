import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { composeShippingTelegram, sendTelegramMessage } from '@/lib/telegram';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const orderId = params.id;
    const body = await request.json();
    const { 
      shipping_status, 
      cod_status, 
      combined_status,
      notes, 
      tags, 
      updated_by 
    } = body;

    // Get current order to compare values
    const { data: currentOrder, error: fetchError } = await db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
      last_updated_by: updated_by,
    };

    if (shipping_status !== undefined) {
      updateData.shipping_status = shipping_status;
    }
    if (cod_status !== undefined) {
      updateData.cod_status = cod_status;
    }
    if (combined_status !== undefined) {
      updateData.combined_status = combined_status;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (tags !== undefined) {
      updateData.tags = tags;
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // Log history for each changed field
    const historyEntries = [];

    if (shipping_status && shipping_status !== currentOrder.shipping_status) {
      const { error: historyError } = await db
        .from('logs_update')
        .insert({
          order_id: orderId,
          updated_by: updated_by || 'system',
          field_changed: 'shipping_status',
          old_value: currentOrder.shipping_status || '',
          new_value: shipping_status,
          action: 'manual',
        });

      if (!historyError) {
        historyEntries.push({
          timestamp: new Date().toISOString(),
          action: 'update',
          field: 'shipping_status',
          old_value: currentOrder.shipping_status,
          new_value: shipping_status,
          updated_by: updated_by || 'system',
        });
      }
    }

    if (cod_status && cod_status !== currentOrder.cod_status) {
      const { error: historyError } = await db
        .from('logs_update')
        .insert({
          order_id: orderId,
          updated_by: updated_by || 'system',
          field_changed: 'cod_status',
          old_value: currentOrder.cod_status || '',
          new_value: cod_status,
          action: 'manual',
        });

      if (!historyError) {
        historyEntries.push({
          timestamp: new Date().toISOString(),
          action: 'update',
          field: 'cod_status',
          old_value: currentOrder.cod_status,
          new_value: cod_status,
          updated_by: updated_by || 'system',
        });
      }
    }

    // Update history in order record
    if (historyEntries.length > 0) {
      const currentHistory = currentOrder.history || [];
      const newHistory = [...currentHistory, ...historyEntries];

      await db
        .from('orders')
        .update({ history: newHistory })
        .eq('id', orderId);
    }

    // Try send telegram if shipping_status changed and matches notify criteria
    if (shipping_status && shipping_status !== currentOrder.shipping_status) {
      const isNotifyState = ['đã giao', 'giao thành công', 'không thành công', 'thất bại', 'trả'].some(s => shipping_status.toLowerCase().includes(s));
      if (isNotifyState) {
        const msg = composeShippingTelegram({ ...updatedOrder });
        await sendTelegramMessage(msg).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      history_logged: historyEntries.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getSupabase();
    const orderId = params.id;

    const { data: order, error } = await db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get update logs
    const { data: logs, error: logsError } = await db
      .from('logs_update')
      .select('*')
      .eq('order_id', orderId)
      .order('updated_at', { ascending: false });

    return NextResponse.json({
      order,
      logs: logs || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
