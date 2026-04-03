import { NextRequest, NextResponse } from 'next/server';
import { createTodoForDevice, listTodosForDevice } from '../../../lib/tasks-store';
import { getDeviceIdFromRequest } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const todos = await listTodosForDevice();
    return NextResponse.json({ todos });
  } catch (error) {
    console.error('[todos/get]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const deviceId = getDeviceIdFromRequest(req);

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing device id' }, { status: 400 });
    }

    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : null;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const todo = await createTodoForDevice({
      deviceId,
      title,
      description,
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error('[todos/post]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
