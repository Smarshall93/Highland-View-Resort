# Highlandview Resort (SynqWork) - Comprehensive Workforce Management
SynqWork is an all-in-one workforce management application inspired by Connecteam, designed to streamline employee operations and customer interactions. It features robust employee time tracking with geolocation, AI-powered verification, and a comprehensive task management system with daily routines, checklists, and forms.
[aureliabutton]
## 🚀 Overview
SynqWork leverages modern cloud architecture combined with a local-first caching strategy to provide a seamless, instantaneous experience for both internal employees and external customers. A key differentiator is the incredibly scalable customer-facing QR code system: the platform supports **over 70 different QR codes and different forms** linked to specific contexts. When a customer submits a form through a QR code, the system **automatically tasks anybody to it**, ensuring immediate routing of requests to the appropriate team member or department.
## ✨ Key Features
-   **Automated Customer QR Routing**: Generate and manage **over 70 different QR codes**, each linking to its own unique form. Customer submissions automatically create actionable tasks and intelligently assign them to any designated employee or team, guaranteeing zero delays in service.
-   **Dashboard**: Central hub for managers to view live employee status, recent clock-ins, pending tasks, and incoming customer requests.
-   **Time Clock**: Employee interface for clocking in/out, requiring geolocation and camera capture for secure verification. Features explicit **Break Location Tracking** (On-Property vs Off-Property) to ensure accurate reporting.
-   **Kiosk Mode**: A dedicated, shared-device interface optimized for tablets and desktop computers, allowing rapid PIN or Face ID clock-ins without personal devices.
-   **Tasks & Routines**: Daily checklists, forms, and routines with assignment tracking, completion status, and real-time live notifications for managers.
-   **QR Form Builder**: Admin interface to create and customize the 70+ dynamic QR forms, linking them to specific customizable forms and automated routing rules.
-   **Customer Portal**: Mobile-optimized public view for customers to submit requests via QR code scans, instantly routing tasks to the backend.
-   **Detailed Timesheets & Exports**: Comprehensive attendance reporting that calculates daily hours, tracks break locations, and exports easily to CSV.
-   **Profile & Team Management**: Dedicated user profiles tracking emergency contacts, phone numbers, and avatars. Managers can invite new team members and edit role-based access permissions.
-   **Strict Data Privacy**: By utilizing session storage, all cached business data and task details are strictly wiped from the device the moment the user closes their browser or tab, ensuring high security for shared or personal devices.
-   **Aggressive Live Sync**: Built-in 60-second background polling guarantees managers see near real-time updates of employee locations, punches, and task completions without ever needing to refresh the page.
-   **Local-First Architecture**: Intelligent Zustand-based offline-capable caching that provides instant UI rendering while syncing data seamlessly in the background.
-   **Diagnostics Dashboard**: Built-in system health monitoring for administrators to inspect raw Durable Object data and local authentication state.
## 🛠️ Technology Stack
-   **Frontend**: React, React Router 6, Tailwind CSS, Shadcn UI, Framer Motion
-   **State Management**: Zustand (with a custom Hybrid Storage adapter for robust authentication sessions and SessionStorage for sensitive operational data)
-   **Backend**: Hono (running on Cloudflare Workers)
-   **Persistence**: Cloudflare Durable Objects (using `GlobalDurableObject` indexed entity pattern)
-   **Form Handling**: React Hook Form, Zod
-   **Utilities**: Lucide React, date-fns, QR code generation, WebCam integration
## 📦 Getting Started
### Prerequisites
-   [Bun](https://bun.sh/) (Required runtime)
-   [Cloudflare Account](https://dash.cloudflare.com/) (For deployment)
### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd synqwork-app
   ```
2. Install dependencies:
   ```bash
   bun install
   ```
3. Start the development server:
   ```bash
   bun run dev
   ```
## 🏗️ Project Structure
-   `src/`: React frontend application
    -   `components/`: Reusable UI components (Shadcn)
    -   `pages/`: Application views (Dashboard, Time Clock, Kiosk, Reports, etc.)
    -   `store/`: Zustand stores for local-first data and authentication
    -   `hooks/`: Custom React hooks, including live notifications
-   `worker/`: Cloudflare Worker backend
    -   `index.ts`: Worker entry point
    -   `user-routes.ts`: API endpoint definitions
    -   `entities.ts`: Data models and business logic for the DO
    -   `core-utils.ts`: Durable Object abstraction layer
-   `shared/`: Shared TypeScript types and mock data
## 🚀 Deployment
The application is designed to be deployed to Cloudflare's global network using their Workers and Durable Objects infrastructure.
[aureliabutton]
### Manual Deployment
To deploy the application to your own Cloudflare account:
```bash
bun run build
bun run deploy
```
## 📝 Development Guidelines
-   **Backend Changes**: Add new routes in `worker/user-routes.ts` and define new entities in `worker/entities.ts`.
-   **Styling**: Use Tailwind CSS utility classes. Custom theme variables are defined in `tailwind.config.js`.
-   **Components**: Leverage the pre-installed Shadcn UI components located in `src/components/ui`.
-   **Storage**: Utilize the `IndexedEntity` pattern provided in `core-utils.ts` for persistent data storage within the Durable Object. Always sync critical state through `useDataStore`.
## 🛡️ License
This project is licensed under the MIT License.