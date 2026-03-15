import { IndexedEntity } from "./core-utils";
import type { User, Chat, ChatMessage, TimeEntry, Task, QRForm, FormSubmission, AuthToken, WorkLocation, WorkSite, Shift } from "../shared/types";
import { MOCK_CHAT_MESSAGES, MOCK_CHATS, MOCK_USERS } from "../shared/mock-data";
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = { id: "", name: "", role: "employee" };
  static seedData = MOCK_USERS.map((u, i) => ({
    ...u,
    role: i === 0 ? 'admin' as const : 'employee' as const,
    pinCode: '1234',
    password: '123',
    email: i === 0 ? 'admin@synqwork.com' : `${u.name.toLowerCase().replace(' ', '.')}@synqwork.com`,
    emailVerified: true,
    shiftRoles: i === 0 ? [
      { id: "r1", title: "Front Desk", payRate: 15 },
      { id: "r2", title: "Night Auditor", payRate: 18 }
    ] : [
      { id: "r3", title: "Housekeeping", payRate: 16 }
    ]
  }));
}
export class AuthTokenEntity extends IndexedEntity<AuthToken> {
  static readonly entityName = "authToken";
  static readonly indexName = "authTokens";
  static readonly initialState: AuthToken = { id: "", userId: "", expiresAt: 0, createdAt: 0 };
}
export class WorkLocationEntity extends IndexedEntity<WorkLocation> {
  static readonly entityName = "workLocation";
  static readonly indexName = "workLocations";
  static readonly initialState: WorkLocation = { id: "", name: "", createdAt: 0 };
  static seedData: WorkLocation[] = [
    { id: "loc1", name: "Front Desk", description: "Main lobby reception", createdAt: Date.now() },
    { id: "loc2", name: "Pool Area", description: "Outdoor pool and cabanas", createdAt: Date.now() }
  ];
}
export class WorkSiteEntity extends IndexedEntity<WorkSite> {
  static readonly entityName = "workSite";
  static readonly indexName = "workSites";
  static readonly initialState: WorkSite = { id: "", siteCode: "", name: "", lat: 0, lng: 0, radius: 100, createdAt: 0 };
}
export class TimeEntryEntity extends IndexedEntity<TimeEntry> {
  static readonly entityName = "timeEntry";
  static readonly indexName = "timeEntries";
  static readonly initialState: TimeEntry = { id: "", userId: "", timestamp: 0, type: "clock_in", status: "pending" };
}
export class TaskEntity extends IndexedEntity<Task> {
  static readonly entityName = "task";
  static readonly indexName = "tasks";
  static readonly initialState: Task = { id: "", title: "", status: "pending", priority: "medium", createdAt: 0, timeSpentMs: 0, lastStartedAt: null, assignees: [], assignedRoles: [] };
  static seedData: Task[] = [
    { id: "t1", title: "Morning Store Checklist", description: "Complete opening procedures.", status: "pending", priority: "high", assignees: [], createdAt: Date.now() - 86400000, timeSpentMs: 0, lastStartedAt: null, checklist: [
      { id: "c1", text: "Turn on interior lights", completed: false },
      { id: "c2", text: "Unlock front entrance", completed: false },
      { id: "c3", text: "Count register drawer", completed: false }
    ] },
    { id: "t2", title: "Restock Inventory", description: "Aisle 4 needs restocking.", status: "in_progress", priority: "urgent", assignees: ["u1"], createdAt: Date.now() - 3600000, timeSpentMs: 300000, lastStartedAt: Date.now() - 600000 },
    { id: "t3", title: "Clean registers", status: "completed", priority: "low", assignees: ["u2"], photoUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop", createdAt: Date.now() - 172800000, timeSpentMs: 1200000, lastStartedAt: null }
  ];
}
export class QRFormEntity extends IndexedEntity<QRForm> {
  static readonly entityName = "qrForm";
  static readonly indexName = "qrForms";
  static readonly initialState: QRForm = { id: "", title: "", fields: [], defaultAssignees: [], defaultAssignedRoles: [], createdAt: 0 };
  static seedData: QRForm[] = [
    { id: "f1", title: "Customer Support Request", description: "Scan this code to request assistance from our team.", fields: [{ id: "field1", type: "text", label: "Your Name", required: true }, { id: "field2", type: "select", label: "Issue Type", required: true, options: ["General", "Technical", "Billing"] }, { id: "field3", type: "textarea", label: "Description", required: true }], createdAt: Date.now() - 100000 }
  ];
}
export class FormSubmissionEntity extends IndexedEntity<FormSubmission> {
  static readonly entityName = "formSubmission";
  static readonly indexName = "formSubmissions";
  static readonly initialState: FormSubmission = { id: "", formId: "", data: {}, submittedAt: 0, status: "new" };
}
export class ShiftEntity extends IndexedEntity<Shift> {
  static readonly entityName = "shift";
  static readonly indexName = "shifts";
  static readonly initialState: Shift = { id: "", userId: "", startTime: 0, endTime: 0, status: "draft", createdAt: 0 };
}
export type ChatBoardState = Chat & { messages: ChatMessage[] };
const SEED_CHAT_BOARDS: ChatBoardState[] = MOCK_CHATS.map(c => ({
  ...c,
  messages: MOCK_CHAT_MESSAGES.filter(m => m.chatId === c.id),
}));
export class ChatBoardEntity extends IndexedEntity<ChatBoardState> {
  static readonly entityName = "chat";
  static readonly indexName = "chats";
  static readonly initialState: ChatBoardState = { id: "", title: "", messages: [] };
  static seedData = SEED_CHAT_BOARDS;
  async listMessages(): Promise<ChatMessage[]> {
    const { messages } = await this.getState();
    return messages;
  }
  async sendMessage(userId: string, text: string, system?: boolean): Promise<ChatMessage> {
    const msg: ChatMessage = { id: crypto.randomUUID(), chatId: this.id, userId, text, ts: Date.now(), system };
    await this.mutate(s => ({ ...s, messages: [...s.messages, msg].slice(-200) }));
    return msg;
  }
}