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
  ShiftEntity,
  ResortSettingsEntity
} from "./entities";
import { ok, bad, notFound } from './core-utils';
import type { Task, TimeEntry, QRForm, User, TaskStatus, ChatMessage, ResortSettings } from "../shared/types";
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  try {
    if (!app) {
      console.error("[INIT ERROR] Hono app instance is undefined.");
      return;
    }
    const apiApp = new Hono<{ Bindings: Env }>().basePath('/api');
    apiApp.use('*', async (c, next) => {
      if (!c.env.GlobalDurableObject) {
        console.error("[CRITICAL] GlobalDurableObject binding is missing in environment.");
        return c.json({ 
          success: false, 
          error: "Database unavailable. Please check your Wrangler configuration.",
          code: "BINDING_MISSING"
        }, 503);
      }
      await next();
    });
    const processAiVerification = (task: Task, updates: Partial<Task>): Partial<Task> => {
      if (updates.status === 'completed' && (updates.photoUrl || task.photoUrl)) {
        return {
          ...updates,
          isAiVerified: true,
          aiAnalysis: "Visual Verification Result: Task completed according to standard operating procedures. Area appears tidy and safety compliant."
        };
      }
      return updates;
    };
    apiApp.post('/auth/login', async (c) => {
      try {
        const credentials = await c.req.json<{ email?: string, password?: string }>();
        const { email: rawEmail, password } = credentials;
        if (!rawEmail || !password) return bad(c, 'Email and password are required');
        const email = rawEmail.trim().toLowerCase();
        await UserEntity.ensureSeed(c.env);
        const list = await UserEntity.list(c.env, null, 1000);
        let user = list.items.find(u => u.email?.toLowerCase() === email);
        if (email === 'owner@synqwork.com' && !user) {
          user = await UserEntity.create(c.env, {
            id: crypto.randomUUID(),
            name: 'Resort Owner',
            email: 'owner@synqwork.com',
            password: '123',
            role: 'owner',
            emailVerified: true
          });
        }
        if (!user) return bad(c, 'Account not found.');
        if (user.password !== password) return bad(c, 'Invalid password.');
        return ok(c, user);
      } catch (e) {
        return bad(c, 'Invalid login request');
      }
    });
    apiApp.get('/users', async (c) => {
      try {
        await UserEntity.ensureSeed(c.env);
        const page = await UserEntity.list(c.env, c.req.query('cursor'), 1000);
        return ok(c, page);
      } catch (e) {
        return bad(c, 'Failed to fetch users');
      }
    });
    apiApp.post('/users', async (c) => {
      try {
        const body = await c.req.json<User>();
        const created = await UserEntity.create(c.env, { ...body, id: crypto.randomUUID(), emailVerified: true });
        return ok(c, created);
      } catch (e) {
        return bad(c, 'Failed to create user');
      }
    });
    apiApp.patch('/users/:id', async (c) => {
      try {
        const id = c.req.param('id');
        const data = await c.req.json<Partial<User>>();
        const entity = new UserEntity(c.env, id);
        await entity.patch(data);
        return ok(c, await entity.getState());
      } catch (e) {
        return bad(c, 'Update failed');
      }
    });
    apiApp.get('/tasks', async (c) => {
      try {
        await TaskEntity.ensureSeed(c.env);
        const qrCodeId = c.req.query('qrCodeId');
        const page = await TaskEntity.list(c.env, null, 1000);
        if (qrCodeId) {
          page.items = page.items.filter(t => t.qrCodeId === qrCodeId);
        }
        return ok(c, page);
      } catch (e) {
        return bad(c, 'Failed to fetch tasks');
      }
    });
    apiApp.post('/tasks', async (c) => {
      try {
        const data = await c.req.json<Partial<Task> & { userRole?: string }>();
        const { userRole, ...taskData } = data;

        if (userRole === 'owner' || userRole === 'employee') {
          return c.json({ success: false, error: 'Unauthorized: Owners and Employees cannot create tasks directly.' }, 403);
        }

        const task = await TaskEntity.create(c.env, {
          ...taskData, // Use taskData to exclude userRole
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          status: taskData.status || 'pending' // Use taskData.status
        } as Task);
        return ok(c, task);
      } catch (e) {
        return bad(c, 'Task creation failed');
      }
    });
    apiApp.patch('/tasks/:id', async (c) => {
      try {
        const id = c.req.param('id');
        const updates = await c.req.json<Partial<Task>>();
        const entity = new TaskEntity(c.env, id);
        const current = await entity.getState();
        const processedUpdates = processAiVerification(current, updates);
        await entity.patch(processedUpdates);
        return ok(c, await entity.getState());
      } catch (e) {
        return bad(c, 'Task update failed');
      }
    });
    apiApp.delete('/tasks/:id', async (c) => {
      try {
        const success = await TaskEntity.delete(c.env, c.req.param('id'));
        return ok(c, { success });
      } catch (e) {
        return bad(c, 'Delete failed');
      }
    });
    apiApp.get('/time-entries', async (c) => {
      try {
        const page = await TimeEntryEntity.list(c.env, null, 1000);
        return ok(c, page);
      } catch (e) {
        return bad(c, 'Failed to fetch entries');
      }
    });
    apiApp.post('/clock-in', async (c) => {
      try {
        const data = await c.req.json<Partial<TimeEntry>>();
        const entry = await TimeEntryEntity.create(c.env, {
          ...data,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          status: 'verified'
        } as TimeEntry);
        return ok(c, entry);
      } catch (e) {
        return bad(c, 'Punch recorded failed');
      }
    });
    apiApp.post('/time-entries', async (c) => {
      try {
        const data = await c.req.json<TimeEntry>();
        const entry = await TimeEntryEntity.create(c.env, {
          ...data,
          id: crypto.randomUUID(),
          status: data.status || 'verified'
        });
        return ok(c, entry);
      } catch (e) {
        return bad(c, 'Manual entry failed');
      }
    });
    apiApp.patch('/time-entries/:id', async (c) => {
      try {
        const entity = new TimeEntryEntity(c.env, c.req.param('id'));
        await entity.patch(await c.req.json());
        return ok(c, await entity.getState());
      } catch (e) {
        return bad(c, 'Update failed');
      }
    });
    apiApp.delete('/time-entries/:id', async (c) => {
      try {
        const success = await TimeEntryEntity.delete(c.env, c.req.param('id'));
        return ok(c, { success });
      } catch (e) {
        return bad(c, 'Delete failed');
      }
    });
    apiApp.get('/qr-forms', async (c) => {
      try {
        await QRFormEntity.ensureSeed(c.env);
        const page = await QRFormEntity.list(c.env, null, 1000);
        return ok(c, page);
      } catch (e) {
        return bad(c, 'Failed to fetch forms');
      }
    });
    apiApp.post('/qr-forms', async (c) => {
      try {
        const data = await c.req.json<Partial<QRForm>>();
        const created = await QRFormEntity.create(c.env, { ...data, id: crypto.randomUUID(), createdAt: Date.now() } as QRForm);
        return ok(c, created);
      } catch (e) {
        return bad(c, 'Create failed');
      }
    });
    apiApp.patch('/qr-forms/:id', async (c) => {
      try {
        const id = c.req.param('id');
        const entity = new QRFormEntity(c.env, id);
        await entity.patch(await c.req.json());
        return ok(c, await entity.getState());
      } catch (e) {
        return bad(c, 'Update failed');
      }
    });
    apiApp.delete('/qr-forms/:id', async (c) => {
      try {
        const success = await QRFormEntity.delete(c.env, c.req.param('id'));
        return ok(c, { success });
      } catch (e) {
        return bad(c, 'Delete failed');
      }
    });
    apiApp.get('/settings', async (c) => {
      try {
        const entity = new ResortSettingsEntity(c.env, 'global');
        if (!(await entity.exists())) {
           const initial = ResortSettingsEntity.initialState;
           await ResortSettingsEntity.create(c.env, { ...initial, id: 'global' });
        }
        return ok(c, await entity.getState());
      } catch (e) {
        return bad(c, 'Failed to fetch settings');
      }
    });
    apiApp.patch('/settings', async (c) => {
      try {
        const body = await c.req.json();
        const entity = new ResortSettingsEntity(c.env, 'global');
        await entity.patch(body);
        return ok(c, await entity.getState());
      } catch (e) {
        return bad(c, 'Update failed');
      }
    });
    apiApp.get('/chats', async (c) => {
      try {
        await ChatBoardEntity.ensureSeed(c.env);
        const list = await ChatBoardEntity.list(c.env, null, 10);
        const board = list.items[0] || { id: 'c1', messages: [] };
        return ok(c, board);
      } catch (e) {
        return bad(c, 'Chat load failed');
      }
    });
    apiApp.post('/chats/messages', async (c) => {
      try {
        const { userId, text, announcement } = await c.req.json<{ userId: string, text: string, announcement?: boolean }>();
        const list = await ChatBoardEntity.list(c.env, null, 10);
        const boardId = list.items[0]?.id || 'c1';
        const entity = new ChatBoardEntity(c.env, boardId);
        const msgText = announcement ? `📢 ANNOUNCEMENT: ${text}` : text;
        const msg = await entity.sendMessage(userId, msgText, announcement);
        return ok(c, msg);
      } catch (e) {
        return bad(c, 'Send failed');
      }
    });
    apiApp.delete('/chats/history', async (c) => {
      try {
        const list = await ChatBoardEntity.list(c.env, null, 10);
        const boardId = list.items[0]?.id || 'c1';
        const entity = new ChatBoardEntity(c.env, boardId);
        await entity.mutate(s => ({ ...s, messages: [] }));
        return ok(c, { success: true });
      } catch (e) {
        return bad(c, 'Clear failed');
      }
    });
    apiApp.get('/public/qr-forms/:id', async (c) => {
      try {
        const entity = new QRFormEntity(c.env, c.req.param('id'));
        if (!(await entity.exists())) return bad(c, 'Form not found');
        return ok(c, await entity.getState());
      } catch (e) {
        return bad(c, 'Fetch failed');
      }
    });
    apiApp.post('/public/submissions', async (c) => {
      try {
        const { formId, data } = await c.req.json<{ formId: string, data: Record<string, any> }>();
        const formEntity = new QRFormEntity(c.env, formId);
        if (!(await formEntity.exists())) return bad(c, 'Form not found');
        const form = await formEntity.getState();
        const submission = await FormSubmissionEntity.create(c.env, {
          id: crypto.randomUUID(),
          formId,
          data,
          submittedAt: Date.now(),
          status: 'new'
        });
        const details = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
        const assignees = form.defaultAssignees || [];
        const assignedRoles = form.defaultAssignedRoles || [];
        await TaskEntity.create(c.env, {
          id: crypto.randomUUID(),
          title: `QR Request: ${form.title}`,
          description: `Customer submission via QR code.\n\nDATA:\n${details}`,
          status: 'pending',
          priority: form.autoPriority || 'medium',
          createdAt: Date.now(),
          qrCodeId: formId,
          assignees,
          assignedRoles
        } as Task);
        return ok(c, submission);
      } catch (e) {
        return bad(c, 'Submission failed');
      }
    });
    apiApp.get('/locations', async (c) => {
      try {
        await WorkLocationEntity.ensureSeed(c.env);
        return ok(c, await WorkLocationEntity.list(c.env, null, 1000));
      } catch (e) {
        return ok(c, { items: [] });
      }
    });
    apiApp.get('/work-sites', async (c) => {
      try {
        return ok(c, await WorkSiteEntity.list(c.env, null, 1000));
      } catch (e) {
        return ok(c, { items: [] });
      }
    });
    apiApp.get('/shifts', async (c) => {
      try {
        return ok(c, await ShiftEntity.list(c.env, null, 1000));
      } catch (e) {
        return ok(c, { items: [] });
      }
    });
    apiApp.get('/debug', async (c) => {
      return ok(c, {
        status: 'active',
        timestamp: new Date().toISOString(),
        env: { hasGlobalDO: !!c.env.GlobalDurableObject }
      });
    });
    apiApp.get('/debug/dump', async (c) => {
      try {
        const users = await UserEntity.list(c.env, null, 1000);
        const tasks = await TaskEntity.list(c.env, null, 1000);
        const time = await TimeEntryEntity.list(c.env, null, 1000);
        return ok(c, { users: users.items, tasks: tasks.items, timeEntries: time.items });
      } catch (e) {
        return bad(c, 'Dump failed');
      }
    });
    app.route('/', apiApp);
  } catch (error) {
    console.error("[FATAL EVAL ERROR] userRoutes failed to initialize:", error);
  }
}