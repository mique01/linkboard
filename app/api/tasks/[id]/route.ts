import { NextRequest, NextResponse } from 'next/server';
import { deleteTaskForDevice } from '../../../../lib/tasks-store';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    const deleted = await deleteTaskForDevice(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[tasks/delete]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
