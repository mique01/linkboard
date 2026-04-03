import { NextRequest, NextResponse } from 'next/server';
import { deleteTodoForDevice } from '../../../../lib/tasks-store';
import { getDeviceIdFromRequest } from '../../../../lib/supabase';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const deviceId = getDeviceIdFromRequest(req);

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing device id' }, { status: 400 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing todo id' }, { status: 400 });
    }

    const deleted = await deleteTodoForDevice(id, deviceId);

    if (!deleted) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[todos/delete]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
