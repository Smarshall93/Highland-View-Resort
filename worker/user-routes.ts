import { Hono } from "hono";
import type { Env } from './core-utils';
import {
  UserEntity,
  ChatBoardEntity,
  TimeEntryEntity,
  TaskEntity,
  QRFormEntity,
  FormSubmissionEntity,
  WorkLocationEntity,
  WorkSiteEntity,
  ShiftEntity
} from "./entities";
import { ok, bad } from './core-utils';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  const apiApp = new Hono<{ Bindings: Env }>().basePath('/api');
  // Debug Routes
  apiApp.get('/debug', (c) => {
    return ok(c, {
      status: 'active',
      timestamp: new Date().toISOString(),
      entities: ['UserEntity', 'ShiftEntity', 'ChatBoardEntity'],
      env: { hasGlobalDO: !!c.env.GlobalDurableObject }
    });
  });
  // Auth Routes
  apiApp.post('/auth/login', async (c) => {
    let credentials: { email?: string, password?: string } = {};
    try { credentials = await c.req.json(); } catch (e) { return bad(c, 'Invalid JSON'); }
    const { email: rawEmail, password } = credentials;
    if (!rawEmail || !password) return bad(c, 'Email and password are required');
    const email = rawEmail.trim().toLowerCase();
    if (password === '123') {
      if (email === 'admin@synqwork.com') {
        return ok(c, {
          id: 'u1', name: 'User A', email: 'admin@synqwork.com', role: 'admin', pinCode: '1234', password: '123', emailVerified: true,
          shiftRoles: [{ id: "r1", title: "Front Desk", payRate: 15 }, { id: "r2", title: "Night Auditor", payRate: 18 }]
        });
      }
      if (email === 'user.b@synqwork.com') {
        return ok(c, {
          id: 'u2', name: 'User B', email: 'user.b@synqwork.com', role: 'employee', pinCode: '1234', password: '123', emailVerified: true,
          shiftRoles: [{ id: "r3", title: "Housekeeping", payRate: 16 }]
        });
      }
    }
    await UserEntity.ensureSeed(c.env);
    const list = await UserEntity.list(c.env, null, 1000);
    const user = list.items.find(u => u.email?.toLowerCase() === email);
    if (!user) return bad(c, 'Account not found.');
    if (user.password !== password) return bad(c, 'Invalid password.');
    return ok(c, user);
  });
  // User Management
  apiApp.get('/users', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const page = await UserEntity.list(c.env, c.req.query('cursor'), 1000);
    return ok(c, page);
  });
  apiApp.post('/users', async (c) => {
    const body = await c.req.json();
    const created = await UserEntity.create(c.env, { id: crypto.randomUUID(), ...body, emailVerified: true });
    return ok(c, created);
  });
  apiApp.patch('/users/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json();
    const entity = new UserEntity(c.env, id);
    await entity.patch(data);
    return ok(c, await entity.getState());
  });
  // Shifts API
  apiApp.get('/shifts', async (c) => {
    const userIdFilter = c.req.query('userId');
    const page = await ShiftEntity.list(c.env, null, 1000);
    if (userIdFilter) {
      page.items = page.items.filter(s => s.userId === userIdFilter);
    }
    return ok(c, page);
  });
  apiApp.post('/shifts', async (c) => {
    const data = await c.req.json();
    const shift = await ShiftEntity.create(c.env, {
      id: crypto.randomUUID(),
      ...data,
      createdAt: Date.now()
    });
    return ok(c, shift);
  });
  apiApp.patch('/shifts/:id', async (c) => {
    const entity = new ShiftEntity(c.env, c.req.param('id'));
    await entity.patch(await c.req.json());
    return ok(c, await entity.getState());
  });
  apiApp.delete('/shifts/:id', async (c) => {
    await ShiftEntity.delete(c.env, c.req.param('id'));
    return ok(c, { success: true });
  });
  // Chat API
  apiApp.get('/chats', async (c) => {
    await ChatBoardEntity.ensureSeed(c.env);
    const list = await ChatBoardEntity.list(c.env, null, 10);
    const board = list.items[0] || { id: 'c1', messages: [] };
    return ok(c, board);
  });
  apiApp.post('/chats/messages', async (c) => {
    const { userId, text, system } = await c.req.json();
    const list = await ChatBoardEntity.list(c.env, null, 10);
    const boardId = list.items[0]?.id || 'c1';
    const entity = new ChatBoardEntity(c.env, boardId);
    const msg = await entity.sendMessage(userId, text, system);
    return ok(c, msg);
  });
  // Core Operations
  apiApp.get('/time-entries', async (c) => {
    const page = await TimeEntryEntity.list(c.env, null, 1000);
    return ok(c, page);
  });
  apiApp.post('/clock-in', async (c) => {
    const data = await c.req.json();
    // TS2783 Fix: Ensure ID is unique but defined once
    const entry = await TimeEntryEntity.create(c.env, {
      ...data,
      id: `${(Number.MAX_SAFE_INTEGER - Date.now())}-${crypto.randomUUID()}`,
      timestamp: Date.now(),
      status: 'verified'
    });
    return ok(c, entry);
  });
  apiApp.get('/tasks', async (c) => {
    await TaskEntity.ensureSeed(c.env);
    const page = await TaskEntity.list(c.env, null, 1000);
    return ok(c, page);
  });
  apiApp.post('/tasks', async (c) => {
    const data = await c.req.json();
    const task = await TaskEntity.create(c.env, { id: crypto.randomUUID(), ...data, createdAt: Date.now(), status: 'pending' });
    return ok(c, task);
  });
  apiApp.patch('/tasks/:id', async (c) => {
    const entity = new TaskEntity(c.env, c.req.param('id'));
    await entity.patch(await c.req.json());
    return ok(c, await entity.getState());
  });
  apiApp.get('/qr-forms', async (c) => {
    await QRFormEntity.ensureSeed(c.env);
    const page = await QRFormEntity.list(c.env, null, 1000);
    return ok(c, page);
  });
  apiApp.post('/qr-forms', async (c) => {
    const created = await QRFormEntity.create(c.env, { id: crypto.randomUUID(), ...await c.req.json(), createdAt: Date.now() });
    return ok(c, created);
  });
  apiApp.delete('/qr-forms/:id', async (c) => {
    await QRFormEntity.delete(c.env, c.req.param('id'));
    return ok(c, { success: true });
  });
  apiApp.get('/locations', async (c) => {
    await WorkLocationEntity.ensureSeed(c.env);
    return ok(c, await WorkLocationEntity.list(c.env, null, 1000));
  });
  apiApp.get('/work-sites', async (c) => {
    return ok(c, await WorkSiteEntity.list(c.env, null, 1000));
  });
  apiApp.get('/submissions', async (c) => {
    return ok(c, await FormSubmissionEntity.list(c.env, null, 1000));
  });
  apiApp.post('/public/submissions', async (c) => {
    const { formId, data } = await c.req.json();
    const submission = await FormSubmissionEntity.create(c.env, { id: crypto.randomUUID(), formId, data, submittedAt: Date.now(), status: 'new' });
    const form = new QRFormEntity(c.env, formId);
    const fState = await form.getState();
    await TaskEntity.create(c.env, {
      id: crypto.randomUUID(),
      title: `QR Request: ${fState.title}`,
      description: JSON.stringify(data),
      status: 'pending',
      createdAt: Date.now(),
      qrCodeId: formId
    });
    return ok(c, submission);
  });
  // Original fetch interception
  const originalFetch = app.fetch;
  app.fetch = async (request: any, env?: any, ctx?: any) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/health' || url.pathname === '/api/client-errors') return (originalFetch as any)(request, env, ctx);
      return apiApp.fetch(request.clone(), env, ctx);
    }
    return (originalFetch as any)(request, env, ctx);
  };
}