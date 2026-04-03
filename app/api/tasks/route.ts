import { NextRequest, NextResponse } from 'next/server';
import { createTaskForDevice, listTasksForDevice } from '../../../lib/tasks-store';
import { getDeviceIdFromRequest } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const tasks = await listTasksForDevice();
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[tasks/get]', error);
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

    const task = await createTaskForDevice({
      deviceId,
      title,
      description,
      dueDate: parsedDueDate.toISOString(),
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('[tasks/post]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
