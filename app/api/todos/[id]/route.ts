import { NextRequest, NextResponse } from 'next/server';
import { deleteTodoForUser } from '../../../../lib/tasks-store';
import { getAuthenticatedUser } from '../../../../lib/supabase';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Missing todo id' }, { status: 400 });
    }

    const deleted = await deleteTodoForUser(id, user.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[todos/delete]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
