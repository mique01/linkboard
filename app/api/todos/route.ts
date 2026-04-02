import { NextRequest, NextResponse } from 'next/server';
import { createTodoForUser, listTodosForUser } from '../../../lib/tasks-store';
import { getAuthenticatedUser } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todos = await listTodosForUser(user.id);
    return NextResponse.json({ todos });
  } catch (error) {
    console.error('[todos/get]', error);
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

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const todo = await createTodoForUser({
      userId: user.id,
      title,
      description,
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error('[todos/post]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
