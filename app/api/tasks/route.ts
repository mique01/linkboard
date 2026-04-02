import { NextRequest, NextResponse } from 'next/server';
import { createTaskForUser, listTasksForUser } from '../../../lib/tasks-store';
import { getAuthenticatedUser } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tasks = await listTasksForUser(user.id);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[tasks/get]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : null;
    const dueDate = typeof body.dueDate === 'string' ? body.dueDate : '';

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: 'title and dueDate are required' },
        { status: 400 }
      );
    }

    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 });
    }

    const task = await createTaskForUser({
      userId: user.id,
      title,
      description,
      dueDate: parsedDueDate.toISOString(),
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('[tasks/post]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
