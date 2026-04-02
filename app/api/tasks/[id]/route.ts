import { NextRequest, NextResponse } from 'next/server';
import { deleteTaskForDevice } from '../../../../lib/tasks-store';
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
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    const deleted = await deleteTaskForDevice(id, deviceId);

    if (!deleted) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[tasks/delete]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
