# QueueLess — Product Requirements Document

**Product:** QueueLess  
**Version:** 1.1 — Initial MVP Architecture  
**Status:** Ready for MVP Development  
**Product Type:** Healthcare SaaS / Patient Flow Management  
**Primary Users:** Patients, Clinic Staff, Doctors, Clinic Administrators

---

## 1. Product Vision

QueueLess is a lightweight, real-time healthcare queue management platform designed to make outpatient waiting more predictable.

The initial product focuses on one core problem:

> **Patients should know where they are in the queue and approximately how long they need to wait.**

Patients receive a digital token, live queue position, estimated waiting time, and queue-status updates. Clinic staff receive a simple dashboard for controlling the queue and managing common events.

QueueLess is not intended to replace an EMR, hospital information system, billing platform, or clinical decision-making system.

---

## 2. MVP Objective

The first version will validate the core patient-flow workflow in a small clinic.

The MVP must demonstrate that a clinic can:

1. Create a daily doctor queue.
2. Register or add a patient.
3. Assign a queue token.
4. Let patients view their live position and ETA.
5. Let staff advance the queue.
6. Automatically update affected patients.
7. Handle no-shows and walk-ins.
8. Track consultation timing.
9. Provide basic operational metrics.

**Primary outcome:** reduce uncertainty around waiting before attempting advanced optimization.

---

## 3. MVP Scope

### Build in V1

- Single-clinic deployment.
- One or more departments.
- Multiple doctors.
- Daily queues.
- Patient registration.
- Walk-in registration.
- Digital tokens.
- Live queue position.
- Deterministic ETA.
- Staff queue control.
- Consultation lifecycle.
- No-show handling.
- Queue cancellation.
- Core realtime updates.
- Basic in-app/browser notifications.
- Basic analytics.

### Explicitly defer

- SMS and WhatsApp.
- Payments.
- EMR/medical records.
- Prescriptions and diagnosis.
- Telemedicine.
- Insurance.
- Hospital ERP integrations.
- Predictive ML.
- Demand forecasting.
- Advanced appointment scheduling.
- Multi-branch enterprise management.

---

## 4. Users and Roles

### Patient
Needs a fast way to join and monitor a queue without repeatedly asking reception staff.

### Staff
Manages registration, queue operations, walk-ins, no-shows, cancellations, and consultation status.

### Doctor
Views the assigned queue and controls consultation start/completion.

### Admin
Configures clinic, departments, doctors, staff assignments, and basic analytics.

Roles:

```text
PATIENT
STAFF
DOCTOR
ADMIN
```

Authorization is enforced server-side.

---

## 5. Core Patient Flow

```text
Open QueueLess
      ↓
Select / Scan Clinic Queue
      ↓
Enter Basic Details
      ↓
Select Doctor
      ↓
Join Queue
      ↓
Receive Token
      ↓
View Position + ETA
      ↓
Monitor Queue in Real Time
      ↓
Receive Approaching Notification
      ↓
Return to Consultation Area
      ↓
Patient Called
      ↓
Consultation
      ↓
Completed
```

---

## 6. Staff Flow

```text
Login
  ↓
Select Active Queue
  ↓
View Queue
  ↓
Register / Add Patient
  ↓
Call Next
  ↓
Start Consultation
  ↓
Complete Consultation
  ↓
Queue Advances
```

Alternative events:

```text
WAITING → NO_SHOW
WAITING → CANCELLED
ACTIVE → PAUSED
PAUSED → ACTIVE
```

---

## 7. Doctor Flow

```text
Login
  ↓
View Assigned Queue
  ↓
View Current Patient
  ↓
Start Consultation
  ↓
Complete Consultation
  ↓
Next Patient
```

The doctor interface remains intentionally minimal.

---

## 8. Queue Engine

The queue engine is the core business logic and must be implemented independently from the UI.

Responsibilities:

- Generate tokens.
- Maintain queue ordering.
- Calculate current position.
- Identify next patient.
- Handle completed consultations.
- Handle no-shows.
- Handle cancellations.
- Handle walk-ins.
- Recalculate ETA.
- Record queue events.
- Prevent conflicting queue operations.

The **backend is the authoritative source of queue state**. Clients must never determine official queue order.

---

## 9. Queue States

Normal lifecycle:

```text
REGISTERED
   ↓
WAITING
   ↓
CALLED
   ↓
IN_CONSULTATION
   ↓
COMPLETED
```

Alternative terminal states:

```text
WAITING → NO_SHOW
WAITING → CANCELLED
CALLED → NO_SHOW
```

Invalid transitions must be rejected server-side.

---

## 10. Token Generation

Tokens are generated server-side and must be unique within a queue.

Example:

```text
001
002
003
004
```

Daily queues normally restart token numbering.

---

## 11. Queue Position

For a waiting patient:

```text
Position =
Number of active patients ahead + 1
```

Example:

```text
Currently serving: #103
Patient token: #107

Patients ahead:
#104
#105
#106

Position: 4
```

Position is derived from authoritative queue state rather than stored as a mutable field.

---

## 12. ETA

### MVP algorithm

```text
Estimated Wait =
Patients Ahead × Average Consultation Duration
```

Example:

```text
Patients ahead = 6
Average consultation = 7 minutes

Estimated wait = 42 minutes
```

The initial average is configured per doctor.

The implementation may refine the estimate for a consultation already in progress by considering elapsed consultation time.

### Future ETA intelligence

Later versions may use:

- Median consultation duration.
- Recent consultation duration.
- Doctor-specific patterns.
- Time-of-day patterns.
- Day-of-week patterns.
- Appointment type.
- Queue velocity.
- Historical no-show rate.

Machine learning is deferred until enough real operational data exists.

---

## 13. Queue Events

Every important queue operation creates an event.

```text
QUEUE_CREATED
PATIENT_REGISTERED
QUEUE_JOINED
PATIENT_CALLED
CONSULTATION_STARTED
CONSULTATION_COMPLETED
PATIENT_NO_SHOW
PATIENT_CANCELLED
WALK_IN_ADDED
QUEUE_PAUSED
QUEUE_RESUMED
DOCTOR_DELAYED
```

Events provide the audit trail and analytics foundation.

---

## 14. Technical Architecture

### Stack

```text
Frontend / Application
Next.js
React
TypeScript
Tailwind CSS

Backend
Next.js Server Actions / Route Handlers

Database
PostgreSQL via Supabase

ORM
Prisma

Authentication
Supabase Auth

Realtime
Supabase Realtime

Deployment
Vercel + Supabase

Source Control
GitHub
```

### Architectural decision

The V1 application will be a **single Next.js full-stack application**.

We will not create a separate Node.js backend initially.

This reduces infrastructure, deployment, and development complexity while keeping business logic server-side.

A separate service can be introduced later if scale requires it.

---

## 15. High-Level Architecture

```text
┌─────────────────────────────────────────────┐
│                  CLIENTS                    │
│ Patient │ Staff Dashboard │ Doctor │ Admin │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                NEXT.JS APP                  │
│ UI + Server Actions / Route Handlers        │
│ Auth Checks + Queue Services + ETA Service  │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                  PRISMA                     │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│             SUPABASE POSTGRES               │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│             SUPABASE REALTIME               │
└──────────────────────┬──────────────────────┘
                       │
              Connected Clients
```

### Realtime mutation flow

```text
User Action
    ↓
Authenticated Server Operation
    ↓
Authorization Check
    ↓
Queue State Validation
    ↓
Database Transaction
    ↓
Queue Event
    ↓
Realtime Update
    ↓
Connected Clients
    ↓
UI Refresh / State Update
```

Realtime propagates changes; it does not determine queue correctness.

---

## 16. Database Model

### User

```text
id
auth_user_id
name
phone
email
role
clinic_id
created_at
updated_at
```

### Clinic

```text
id
name
address
contact
timezone
created_at
updated_at
```

### Department

```text
id
clinic_id
name
status
created_at
updated_at
```

### Doctor

```text
id
user_id
department_id
display_name
status
average_consultation_minutes
created_at
updated_at
```

### Queue

```text
id
clinic_id
department_id
doctor_id
queue_date
status
current_token
started_at
paused_at
ended_at
created_at
updated_at
```

Queue status:

```text
NOT_STARTED
ACTIVE
PAUSED
COMPLETED
CANCELLED
```

### Queue Entry

```text
id
queue_id
patient_id
token_number
entry_type
status
joined_at
called_at
consultation_started_at
completed_at
cancelled_at
```

Entry type:

```text
APPOINTMENT
WALK_IN
```

### Queue Event

```text
id
queue_id
queue_entry_id
actor_user_id
event_type
timestamp
metadata
```

### Notification

```text
id
queue_entry_id
type
status
created_at
sent_at
```

---

## 17. Server Operations

### Patient

```text
registerPatient()
joinQueue()
getQueueStatus()
leaveQueue()
```

### Staff

```text
createQueue()
registerPatient()
addWalkIn()
callNextPatient()
callSpecificPatient()
markNoShow()
cancelPatient()
pauseQueue()
resumeQueue()
```

### Consultation

```text
startConsultation()
completeConsultation()
```

### Doctor

```text
getDoctorQueue()
startConsultation()
completeConsultation()
setAvailability()
```

### Admin

```text
createClinic()
createDepartment()
createDoctor()
assignStaff()
getAnalytics()
```

Exact contracts will be defined in `docs/API_SPECIFICATION.md`.

---

## 18. Patient UI

Mobile-first screens:

```text
1. Join Queue
2. Registration
3. Queue Confirmation
4. Queue Status
5. Turn Alert
6. Visit Completed
```

Queue Status should prominently show:

```text
GENERAL MEDICINE

Dr. Sharma

Your Token
#147

Position
7

Estimated Wait
~32 min

Currently Serving
#140

Queue Status
Moving Normally
```

Patients should not need to refresh manually.

---

## 19. Wait Elsewhere

QueueLess supports the concept of leaving the waiting area while retaining queue visibility.

Example:

```text
Position: 12
Estimated wait: ~74 minutes
```

When the queue approaches:

```text
Your turn is approaching.

Estimated wait: ~15 minutes.

Please return to the consultation area.
```

V1 does not use location tracking.

---

## 20. Staff Dashboard

The staff dashboard is the operational center.

### Information

```text
Doctor
Department
Current token
Next patients
Waiting count
Queue status
```

### Primary actions

```text
CALL NEXT
START CONSULTATION
COMPLETE CONSULTATION
NO-SHOW
CANCEL
ADD WALK-IN
PAUSE QUEUE
RESUME QUEUE
```

Common actions should require minimal interaction.

---

## 21. Doctor Dashboard

```text
CURRENT PATIENT

Token #147

[ START CONSULTATION ]

During consultation:

[ COMPLETE CONSULTATION ]
```

The doctor should not manage administrative configuration.

---

## 22. Walk-Ins and No-Shows

### Walk-in

Staff can add a walk-in and the system assigns:

- Token.
- Queue position.
- Estimated wait.

Default MVP policy:

```text
New walk-in → end of queue
```

The policy can become configurable later.

### No-show

When staff marks a patient as `NO_SHOW`:

1. Remove them from active waiting calculations.
2. Recalculate positions.
3. Recalculate ETA.
4. Create an event.
5. Notify/update affected clients.

QueueLess does not independently determine clinical priority.

---

## 23. Pause and Doctor Delay

### Pause

Staff can pause a queue for:

- Doctor break.
- Emergency.
- Administrative interruption.
- Temporary closure.

Patients see:

```text
QUEUE PAUSED
```

### Doctor delay

Staff may record:

```text
Doctor delayed
Estimated delay: 20 minutes
```

This is P1 after the core queue engine.

---

## 24. Notifications

V1 uses low-cost channels:

```text
In-app notifications
+
Browser/Web notifications where supported
```

Primary notifications:

```text
Approaching:
Your turn is approaching.
Estimated wait: ~15 minutes.

Called:
Your token has been called.
Please proceed to the consultation area.
```

Deferred:

```text
SMS
WhatsApp
Email
```

External notification providers can be added after validation.

---

## 25. Analytics

V1 analytics:

```text
Patients served
Patients waiting
Average waiting time
Average consultation duration
No-show count
No-show rate
Queue volume
Peak queue periods
```

These metrics are calculated from queue events and timestamps.

Example:

```text
Joined:               10:04
Consultation started: 10:50
Completed:             10:57

Waiting time:          46 min
Consultation duration:  7 min
```

---

## 26. Security and Privacy

Required:

- Supabase authentication.
- Server-side authorization.
- Role-based access control.
- Input validation.
- Protected server operations.
- Secure sessions.
- HTTPS in production.
- Clinic-level data isolation.
- Minimal patient data.
- Audit events for important queue operations.

The client must never be trusted to enforce authorization.

QueueLess should not store medical history, diagnosis, prescriptions, or unnecessary clinical information in V1.

Healthcare deployments must comply with applicable privacy/data-protection requirements in the target jurisdiction.

---

## 27. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Patient can register | P0 |
| FR-002 | Patient can join a queue | P0 |
| FR-003 | System generates unique token | P0 |
| FR-004 | Patient can view position | P0 |
| FR-005 | Patient can view ETA | P0 |
| FR-006 | Staff can create queue | P0 |
| FR-007 | Staff can view live queue | P0 |
| FR-008 | Staff can call next | P0 |
| FR-009 | Staff can start consultation | P0 |
| FR-010 | Staff can complete consultation | P0 |
| FR-011 | Staff can mark no-show | P0 |
| FR-012 | Staff can add walk-in | P0 |
| FR-013 | Queue state persists server-side | P0 |
| FR-014 | Queue changes propagate in realtime | P0 |
| FR-015 | ETA recalculates after queue events | P0 |
| FR-016 | Patient can leave/cancel queue | P0 |
| FR-017 | Doctor can view assigned queue | P1 |
| FR-018 | Doctor can manage consultation status | P1 |
| FR-019 | Staff can pause/resume queue | P1 |
| FR-020 | Staff can report doctor delay | P1 |
| FR-021 | Patient receives turn notification | P1 |
| FR-022 | Admin can manage doctors/departments | P1 |
| FR-023 | Admin can view basic analytics | P1 |
| FR-024 | Historical queue events retained | P1 |
| FR-025 | SMS/WhatsApp notifications | P2 |
| FR-026 | Predictive ETA | P2 |
| FR-027 | Advanced analytics | P2 |
| FR-028 | External healthcare integrations | P2 |

---

## 28. Non-Functional Requirements

### Performance

- Queue actions should feel immediate under normal clinic workloads.
- Realtime updates should normally reach clients within a few seconds.
- Queue calculations should remain fast for expected MVP queue sizes.

### Reliability

- Database state is authoritative.
- Client disconnection must not corrupt queue state.
- Important mutations should use transactions.
- Duplicate/conflicting queue operations must be prevented.

### Accessibility

The patient UI must be:

- Mobile-first.
- High contrast.
- Simple.
- Readable.
- Usable by non-technical users.

### Scalability

The model should support:

```text
1 Clinic
 ↓
Multiple Doctors
 ↓
Multiple Clinics
 ↓
Multi-branch Platform
```

without a fundamental domain-model rewrite.

---

## 29. Project Structure

```text
queueless/
├── docs/
│   ├── PRD.md
│   ├── TECHNICAL_DESIGN.md
│   ├── DATABASE_SCHEMA.md
│   ├── API_SPECIFICATION.md
│   ├── QUEUE_ENGINE.md
│   ├── REALTIME_ARCHITECTURE.md
│   ├── SECURITY.md
│   └── TESTING_STRATEGY.md
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── app/
│   │   ├── (patient)/
│   │   ├── (staff)/
│   │   ├── (doctor)/
│   │   ├── (admin)/
│   │   └── api/
│   ├── components/
│   │   ├── ui/
│   │   └── shared/
│   ├── features/
│   │   ├── auth/
│   │   ├── patients/
│   │   ├── queues/
│   │   ├── doctors/
│   │   ├── staff/
│   │   ├── notifications/
│   │   └── analytics/
│   ├── lib/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── queue/
│   │   ├── realtime/
│   │   └── validation/
│   └── types/
│
├── tests/
├── .env.example
├── README.md
└── package.json
```

Business logic must not be embedded directly inside UI components.

---

## 30. Development Phases

### Phase 1 — Foundation

```text
Next.js project
TypeScript
Tailwind
Supabase
Prisma
Environment configuration
Git
```

Deliverable: running application with database connectivity.

### Phase 2 — Authentication

```text
Supabase Auth
User profiles
Roles
Protected routes
Server authorization
```

### Phase 3 — Database

Implement:

```text
User
Clinic
Department
Doctor
Queue
QueueEntry
QueueEvent
Notification
```

### Phase 4 — Queue Engine

Implement and test:

```text
Create Queue
Generate Token
Join Queue
Get Position
Call Next
Start Consultation
Complete Consultation
No-Show
Cancel
Walk-In
ETA
```

### Phase 5 — Patient UI

Build:

```text
Registration
Join Queue
Confirmation
Queue Status
Turn Alert
```

### Phase 6 — Staff Dashboard

Build:

```text
Queue Overview
Current Patient
Next Patients
Call Next
Start
Complete
No-Show
Cancel
Walk-In
Pause/Resume
```

### Phase 7 — Doctor Dashboard

Build:

```text
Current Patient
Start Consultation
Complete Consultation
Queue Overview
Availability
```

### Phase 8 — Realtime

Build:

```text
Queue events
Realtime subscriptions
Patient live status
Staff live dashboard
Realtime ETA refresh
```

### Phase 9 — Notifications

Build:

```text
Approaching notification
Called notification
In-app notification state
Browser notification where supported
```

### Phase 10 — Analytics

Build:

```text
Waiting time
Consultation duration
Patients served
No-shows
Queue volume
Peak periods
```

---

## 31. Testing Strategy

The queue engine is business-critical and must be tested independently of the UI.

### Unit tests

- Token generation.
- Position calculation.
- ETA calculation.
- State transitions.
- No-show behavior.
- Cancellation.
- Pause/resume.
- Walk-in handling.

### Integration tests

```text
Database
+
Queue service
+
Authentication
+
Authorization
```

### End-to-end tests

Patient:

```text
Register → Join Queue → View ETA → Receive Update
```

Staff:

```text
Login → Create Queue → Add Patient → Call Next → Complete
```

No-show:

```text
Patient A → No-show → Queue recalculates → Patient B moves forward
```

Realtime:

```text
Staff action → Database → Realtime event → Patient UI
```

---

## 32. MVP Cost Strategy

The initial product is intentionally designed around free/low-cost infrastructure.

### Development

```text
Next.js        → Free
GitHub         → Free
Supabase       → Free tier
Vercel         → Free tier
Prisma         → Open source
```

Target:

> **₹0 infrastructure cost during development where free-tier limits are sufficient.**

### Early pilot

Potential costs:

- Custom domain.
- Paid hosting/database if limits are exceeded.
- SMS/WhatsApp provider.
- Email provider.
- Monitoring.

The first working MVP must not depend on paid SMS or WhatsApp.

---

## 33. Pilot Plan

Initial pilot target:

```text
1 Clinic
2–3 Doctors
1 Department
100–300 Patients
Several Weeks
```

Measure:

- Average waiting time.
- ETA accuracy.
- Queue abandonment.
- No-show rate.
- Reception workload.
- Patient satisfaction.
- Staff satisfaction.
- Notification effectiveness.

The pilot validates the product before investing in advanced features.

---

## 34. MVP Success Criteria

The MVP is complete when:

### Foundation

- Next.js application is deployed.
- Supabase is configured.
- Prisma database access works.
- Authentication works.
- Role-based authorization works.

### Queue

- Admin/staff can configure a doctor and queue.
- Patient can join a queue.
- Unique token is generated.
- Position is correct.
- ETA is calculated correctly.
- Staff can call next.
- Consultation can start and complete.
- No-shows work.
- Walk-ins work.

### Realtime

- Queue changes reach connected clients.
- Patient position updates without manual refresh.
- Current serving token updates in realtime.

### Patient

- Token is visible.
- Position is visible.
- ETA is visible.
- Approaching/called status is visible.

### Analytics

- Waiting time is calculated.
- Consultation duration is calculated.
- Basic metrics are visible.

### Quality

- Core queue logic has automated tests.
- Critical flows have E2E tests.
- No known critical authorization issue exists.
- Application is responsive.
- Production deployment can support a small clinic pilot.

---

## 35. MVP Priorities

### P0 — Build First

```text
Project foundation
Authentication
Database
Clinic/Doctor/Queue setup
Patient registration
Queue joining
Token generation
Queue position
ETA
Staff queue control
Consultation lifecycle
No-show
Walk-in
Core realtime updates
```

### P1 — Build After Core Works

```text
Doctor dashboard
Queue pause/resume
Doctor delay
Notifications
Admin analytics
```

### P2 — Do Not Build Yet

```text
SMS
WhatsApp
Payments
Predictive ETA
Machine learning
Demand forecasting
Advanced analytics
Hospital integrations
Multi-branch management
EMR
```

---

## 36. Future Expansion

### Phase 2 — Clinic Operations

```text
Appointments
Multiple Departments
Multiple Doctors
Advanced Analytics
```

### Phase 3 — Intelligence

```text
Predictive ETA
Demand Forecasting
Bottleneck Detection
Capacity Recommendations
```

### Phase 4 — Integrations

```text
SMS
WhatsApp
Hospital Management Systems
Appointment Platforms
External APIs
```

### Phase 5 — Healthcare Operations Platform

```text
Patient Flow
+
Scheduling
+
Capacity Planning
+
Operational Intelligence
```

---

## 37. Implementation Sequence

```text
PRD
 ↓
Technical Design
 ↓
Database Schema
 ↓
Project Initialization
 ↓
Authentication
 ↓
Queue Engine
 ↓
Patient UI
 ↓
Staff Dashboard
 ↓
Doctor Dashboard
 ↓
Realtime
 ↓
Notifications
 ↓
Analytics
 ↓
Testing
 ↓
Deployment
 ↓
Pilot
 ↓
Feedback
 ↓
Iteration
```

---

## 38. Immediate Next Deliverables

```text
docs/
├── PRD.md                         ✅
├── TECHNICAL_DESIGN.md            ← NEXT
├── DATABASE_SCHEMA.md             ← NEXT
├── API_SPECIFICATION.md           ← NEXT
├── QUEUE_ENGINE.md                ← NEXT
├── REALTIME_ARCHITECTURE.md       ← NEXT
└── TESTING_STRATEGY.md            ← NEXT
```

The immediate implementation milestone is:

> **Build a reliable single-clinic queue engine with authentication, PostgreSQL persistence, server-side authorization, and realtime updates.**

Everything else in V1 should be built around this core.

---

## 39. North Star

```text
BEFORE

"Take token #147 and wait."
```

↓

```text
QUEUELESS

"You're #7 in the queue.
Estimated wait: ~32 minutes.
We'll notify you when your
turn is approaching."
```

QueueLess does not promise zero waiting.

It aims to eliminate unnecessary uncertainty around waiting.

---

## 40. Final Product Statement

> **QueueLess is a real-time healthcare queue and patient-flow platform that gives patients live visibility into their queue position and estimated waiting time while giving clinics simple tools to manage patient flow, consultations, walk-ins, no-shows, and operational performance.**

> **Build the queue engine first. Prove the problem. Then expand.**
