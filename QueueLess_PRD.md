# QueueLess — Product Requirements Document

**Product:** QueueLess  
**Version:** 1.0  
**Status:** Draft  
**Product Type:** Healthcare SaaS / Patient Flow Management  
**Primary Users:** Patients, Clinic Staff, Doctors, Administrators

---

## 1. Product Vision

QueueLess is a real-time healthcare queue and patient-flow management platform designed to make outpatient healthcare visits more predictable.

Patients can see their live queue position and estimated waiting time, while clinics receive tools to manage appointments, walk-ins, no-shows, doctor availability, and patient-flow performance.

**Core value proposition:**  
> Make healthcare waiting predictable instead of uncertain.

---

## 2. Problem Statement

Patients frequently experience long and unpredictable waiting periods in clinics and hospitals.

Traditional token systems may tell a patient their token number, but generally do not tell them:

- How long they are likely to wait
- Whether the doctor is delayed
- How quickly the queue is moving
- When they should return
- Whether they can safely leave the waiting area temporarily

This creates frustration, overcrowded waiting areas, wasted time, and repeated pressure on reception staff.

Clinics also lack unified real-time visibility into:

- Queue status
- Doctor availability
- Consultation duration
- No-shows
- Walk-ins
- Waiting-time bottlenecks
- Patient-flow performance

---

## 3. Product Opportunity

QueueLess addresses the gap between appointment management and real-time patient-flow management.

Instead of:

> "Your token is #147. Please wait."

QueueLess provides:

> "You are #7 in the queue. Your estimated wait is approximately 32 minutes. We'll notify you when your turn is approaching."

QueueLess is therefore positioned as a **real-time patient-flow platform**, rather than simply a digital token system.

---

## 4. Goals

QueueLess must:

1. Provide patients with real-time queue visibility.
2. Provide useful estimated waiting times.
3. Automatically update queue positions.
4. Notify patients when their turn approaches.
5. Give staff simple queue-management tools.
6. Handle no-shows, cancellations, and walk-ins.
7. Provide basic operational analytics.
8. Minimize unnecessary patient-data collection.
9. Be deployable by small and medium-sized clinics without replacing existing systems.

---

## 5. Non-Goals

The MVP will not attempt to become a complete hospital-management system.

Out of scope:

- Electronic medical records
- Medical diagnosis
- Treatment recommendations
- Prescription management
- Pharmacy management
- Insurance management
- Hospital billing
- Full telemedicine
- Medical AI
- Laboratory information management
- Complete hospital ERP
- Clinical decision-making

QueueLess is an **operational patient-flow platform**, not a medical decision-making system.

---

## 6. Target Market

### Initial Target

- Small clinics
- Medium-sized clinics
- Specialist practices
- Dental clinics
- Diagnostic centres
- Small hospitals
- Outpatient departments

### Initial Deployment Profile

The first customers should ideally have:

- 1–5 doctors
- One or a few departments
- Moderate daily patient volume
- Manual or basic token systems
- Minimal IT infrastructure

---

## 7. User Personas

### Patient

**Needs**

- Know queue position
- Know approximate waiting time
- Receive timely notifications
- Avoid unnecessary waiting-room time
- Understand delays

**Pain point**

> "I don't know when my turn will actually come."

### Receptionist / Front Desk

**Needs**

- Quickly register patients
- Manage queues
- Call patients
- Handle walk-ins
- Mark no-shows
- Handle cancellations
- Communicate delays

**Pain point**

> "Patients constantly ask us about the queue while we are already managing it."

### Doctor

**Needs**

- View current queue
- See upcoming patients
- Update consultation status
- Communicate availability
- Pause/resume flow

### Clinic Administrator

**Needs**

- Understand waiting times
- Monitor patient volume
- Identify bottlenecks
- Monitor no-show rates
- Understand doctor utilization

---

## 8. User Roles

Initial roles:

```text
PATIENT
STAFF
DOCTOR
ADMIN
```

### Patient
Accesses their own queue information.

### Staff
Manages queues and patient statuses.

### Doctor
Manages consultation status.

### Admin
Manages clinic configuration and analytics.

---

## 9. Core Patient Journey

```text
Register
   ↓
Select Department / Doctor
   ↓
Join Queue
   ↓
Receive Queue ID
   ↓
View Position + ETA
   ↓
Monitor Updates
   ↓
Receive Notification
   ↓
Return to Consultation Area
   ↓
Consultation
   ↓
Completed
```

---

## 10. Queue Creation

Authorized staff create a queue using:

- Date
- Department
- Doctor
- Operating hours

Example:

```text
Clinic: City Clinic
Department: General Medicine
Doctor: Dr. Sharma
Date: 31 August 2026
Queue: General Medicine — Morning
```

---

## 11. Patient Registration

Patients can enter a queue through:

- Online appointment
- QR code
- Clinic registration
- Walk-in registration

Potential fields:

```text
Name
Phone number
Appointment / Walk-in
Doctor
Department
```

The system generates a queue entry:

```text
Queue ID: GM-2026-147
Token: #147
```

---

## 12. Queue States

Each queue entry supports:

```text
REGISTERED
WAITING
CALLED
IN_CONSULTATION
COMPLETED
NO_SHOW
CANCELLED
RESCHEDULED
```

State transitions must be controlled by authorized users.

---

## 13. Queue Management

Staff must be able to:

- View live queue
- Call next patient
- Call a specific patient
- Start consultation
- Complete consultation
- Mark no-show
- Cancel patient
- Add walk-in
- Pause queue
- Resume queue

---

## 14. Queue Position

The system calculates a patient's current position from the active queue.

Example:

```text
Currently serving: #140
Patient: #147
Patients ahead: 6
```

Patient view:

```text
Your position: 7
```

Position updates automatically after queue events.

---

## 15. Waiting-Time Estimation

### MVP Algorithm

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

---

## 16. Dynamic ETA

ETA must recalculate after relevant events:

- Patient completed
- Patient added
- Patient cancelled
- No-show
- Doctor delay
- Queue pause
- Doctor resumes
- Consultation duration changes

Example:

```text
Initial:
Position: 8
ETA: 52 minutes

After several consultations:
Position: 5
ETA: 31 minutes

After doctor delay:
Position: 5
ETA: 44 minutes
```

---

## 17. Future ETA Intelligence

Future versions may incorporate:

- Historical consultation duration
- Median consultation duration
- Doctor-specific averages
- Department-specific averages
- Time-of-day patterns
- Day-of-week patterns
- Appointment type
- Queue velocity
- Historical no-show rates
- Historical walk-in volume

Long-term model:

```text
Historical Data
+
Current Queue
+
Doctor Availability
+
Current Events
        ↓
Predictive ETA
```

Machine learning should only be introduced after sufficient real-world operational data has been collected.

---

## 18. Patient Dashboard

Must display:

- Doctor
- Department
- Queue ID
- Token number
- Current position
- Estimated wait
- Currently serving
- Queue status

Example:

```text
GENERAL MEDICINE

Dr. Sharma

Token: #147
Position: 7
Estimated wait: ~32 minutes
Currently serving: #140

Status:
Queue moving normally
```

---

## 19. Wait Elsewhere

A key feature allows patients to temporarily leave the waiting area.

Example:

```text
Position: 12
ETA: ~74 minutes
```

The patient can choose to wait elsewhere.

Later:

```text
Position: 4
ETA: ~18 minutes
```

QueueLess sends an alert asking the patient to return.

The goal is to reduce **unnecessary physical waiting**, not eliminate consultation time.

---

## 20. Notifications

### Early Notification

```text
You have 8 patients ahead.

Estimated wait:
~50 minutes
```

### Approaching Notification

```text
Your turn is approaching.

Estimated wait:
~15 minutes.

Please return to the consultation area.
```

### Called Notification

```text
Your token has been called.

Please proceed to:
Room 204
```

---

## 21. Staff Dashboard

The staff dashboard prioritizes speed and simplicity.

### Required Information

- Doctor
- Department
- Current patient
- Next patients
- Waiting count
- Average waiting time
- Queue status

### Required Actions

- Call Next
- Start Consultation
- Complete Consultation
- No-show
- Cancel
- Add Walk-in
- Pause Queue
- Resume Queue

---

## 22. Doctor Interface

The MVP doctor interface remains minimal.

Doctor can:

- View current patient
- Start consultation
- Complete consultation
- Pause availability
- Resume availability

Example:

```text
CURRENT

Patient #147

[ START ]

During consultation:

[ COMPLETE ]
```

---

## 23. Walk-In Management

Staff can add walk-in patients.

A walk-in receives:

- Queue ID
- Token number
- Estimated wait
- Queue position

Queue ordering follows configurable clinic rules.

QueueLess must not independently determine medical priority.

---

## 24. No-Show Management

Staff can mark a patient:

```text
NO_SHOW
```

The system recalculates:

- Queue position
- ETA
- Waiting count

Historical no-show events are retained for analytics.

---

## 25. Doctor Delay

Authorized staff or doctors can indicate:

```text
Doctor delayed
```

Optional:

```text
Estimated delay: 20 minutes
```

Affected ETAs are recalculated and patients are appropriately notified.

---

## 26. Queue Pausing

Queues may be paused for:

- Doctor breaks
- Emergencies
- Administrative interruptions
- Temporary closure

When paused:

```text
Queue status: PAUSED
```

Patients are informed and ETA calculation resumes when the queue restarts.

---

## 27. Admin Dashboard

MVP analytics:

- Patients served
- Patients waiting
- Average waiting time
- Average consultation duration
- No-show rate
- Queue volume
- Peak hours

---

## 28. Analytics

QueueLess stores operational events.

Example:

```text
Patient joined: 10:04
Called: 10:47
Consultation started: 10:50
Completed: 10:57
```

This allows calculation of:

```text
Waiting time = 43 minutes
Consultation duration = 7 minutes
```

---

## 29. Success Metrics

### Product Metrics

- Patient adoption
- ETA accuracy
- Notification effectiveness
- Queue abandonment

### Operational Metrics

- Average waiting time
- Reception workload
- No-show rate
- Patient satisfaction

Specific numerical targets should be established after collecting baseline data during pilot validation.

---

## 30. MVP Success Criteria

The MVP should demonstrate that:

1. Patients can join and track queues easily.
2. Staff can manage common queue events quickly.
3. Queue updates appear in near real-time.
4. ETA updates correctly after queue events.
5. Patients receive useful turn notifications.
6. Clinics can view basic waiting-time analytics.
7. Pilot users perceive meaningful improvement in queue visibility and experience.

---

## 31. Recommended Technical Stack

### Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
```

### Backend

```text
Next.js API
or
Node.js API
```

### Database

```text
PostgreSQL
```

### ORM

```text
Prisma
```

### Authentication

Role-based authentication supporting:

```text
PATIENT
STAFF
DOCTOR
ADMIN
```

### Real-Time

Initial implementation:

```text
Supabase Realtime
```

Future alternatives:

```text
WebSockets
Server-Sent Events
```

---

## 32. Core Data Model

### User

```text
id
name
phone
email
role
created_at
```

### Clinic

```text
id
name
address
contact
created_at
```

### Department

```text
id
clinic_id
name
status
```

### Doctor

```text
id
department_id
name
status
average_consultation_time
```

### Queue

```text
id
doctor_id
date
status
started_at
ended_at
```

### Queue Entry

```text
id
queue_id
patient_id
token_number
status
joined_at
called_at
consultation_started_at
completed_at
```

### Queue Event

```text
id
queue_id
queue_entry_id
event_type
timestamp
metadata
```

---

## 33. Real-Time Architecture

```text
Staff Action
     ↓
API
     ↓
Database
     ↓
Queue Event
     ↓
Realtime Channel
     ↓
Patient / Staff Clients
     ↓
UI Update
```

Example:

```text
Staff clicks CALL NEXT
        ↓
WAITING → CALLED
        ↓
Event emitted
        ↓
Patient receives update
        ↓
Position + ETA recalculated
        ↓
Patient UI updates
```

---

## 34. Security Requirements

QueueLess must implement:

- Secure authentication
- Role-based authorization
- Input validation
- Server-side authorization checks
- Secure sessions
- HTTPS
- Protection against unauthorized queue access
- Audit logging for sensitive administrative actions
- Minimal patient-data collection

Healthcare deployments must comply with applicable privacy and data-protection requirements in the target jurisdiction.

---

## 35. Privacy Principles

QueueLess follows:

> **Collect the minimum data required to operate the queue.**

The system does not require a patient's complete medical history.

The MVP should avoid storing unnecessary clinical information.

Sensitive information should not be exposed through public queue identifiers.

---

## 36. Clinical Safety Boundary

QueueLess is not a medical decision-making system.

It must not:

- Diagnose patients
- Recommend treatment
- Prescribe medication
- Determine emergency status
- Independently assign clinical priority
- Override clinician decisions

Priority rules are defined and controlled by the healthcare facility.

---

## 37. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Patient can register | P0 |
| FR-002 | Patient can join a queue | P0 |
| FR-003 | System generates queue token | P0 |
| FR-004 | Patient can view queue position | P0 |
| FR-005 | Patient can view ETA | P0 |
| FR-006 | Staff can view live queue | P0 |
| FR-007 | Staff can call next patient | P0 |
| FR-008 | Staff can start consultation | P0 |
| FR-009 | Staff can complete consultation | P0 |
| FR-010 | Staff can mark no-show | P0 |
| FR-011 | Staff can add walk-in | P0 |
| FR-012 | Queue updates in real time | P0 |
| FR-013 | ETA recalculates after queue events | P0 |
| FR-014 | Patient receives turn notification | P1 |
| FR-015 | Staff can pause/resume queue | P1 |
| FR-016 | Staff can report doctor delay | P1 |
| FR-017 | Admin can view analytics | P1 |
| FR-018 | Doctor can manage consultation status | P1 |
| FR-019 | Admin can configure queue rules | P1 |
| FR-020 | Historical analytics | P2 |
| FR-021 | Predictive ETA | P2 |
| FR-022 | Hospital integrations | P2 |

---

## 38. Non-Functional Requirements

### Performance

Queue updates should propagate to connected clients within a few seconds under normal clinic workloads.

### Reliability

Queue state must remain consistent if a client disconnects.

### Scalability

Architecture should support multiple clinics and queues without requiring a fundamental redesign.

### Accessibility

Patient interface should be:

- Mobile-friendly
- Simple
- High contrast
- Easy to understand
- Usable by non-technical users

### Availability

The system should be designed for high availability during clinic operating hours.

---

## 39. MVP Screens

### Patient

1. Registration
2. Join Queue
3. Queue Status
4. Turn Alert
5. Visit Completed

### Staff

1. Login
2. Dashboard
3. Queue Management
4. Add Patient
5. Patient Details
6. Queue Controls

### Doctor

1. Login
2. Current Queue
3. Current Patient
4. Consultation Status

### Admin

1. Login
2. Overview
3. Analytics
4. Clinic Configuration

---

## 40. MVP Priorities

### P0 — Must Have

```text
Authentication
Patient registration
Queue creation
Queue joining
Token generation
Live queue
Queue position
ETA
Staff queue control
Consultation lifecycle
No-show
Walk-in
Real-time updates
```

### P1 — Should Have

```text
Notifications
Doctor delay
Queue pause
Admin analytics
Doctor dashboard
```

### P2 — Future

```text
Predictive ETA
Demand forecasting
Advanced analytics
Hospital integrations
Multi-branch management
AI-assisted operations
```

---

## 41. Pilot Plan

The first pilot should remain intentionally small.

### Target

```text
1 Clinic
2–3 Doctors
1 Department
100–300 Patients
Several Weeks
```

### Before Deployment

Measure:

- Average waiting time
- Average consultation time
- No-show rate
- Queue abandonment
- Reception workload

### During Pilot

Measure:

- QueueLess adoption
- ETA accuracy
- Notification response
- Patient satisfaction
- Staff satisfaction
- Queue-related questions

### After Pilot

Compare baseline performance against QueueLess performance.

---

## 42. Business Model

QueueLess will initially operate as a B2B SaaS.

Initial pricing hypotheses:

### Small Clinic

₹999–₹2,999/month

### Medium Clinic

₹3,000–₹10,000/month

### Hospital

Custom pricing

Pricing must be validated through customer discovery and pilot deployments.

---

## 43. Competitive Positioning

QueueLess should not position itself simply as:

> "A digital token system."

Instead:

> **QueueLess is a real-time patient-flow platform that makes waiting predictable and gives clinics operational visibility.**

### Key Differentiators

1. Dynamic ETA
2. Real-time queue updates
3. Patient mobility
4. Smart notifications
5. Operational analytics
6. Lightweight clinic deployment
7. Future predictive patient-flow capabilities

---

## 44. Product Principles

### Predictability over complexity

Patients should understand their situation immediately.

### Real-time by default

Queue information should reflect what is actually happening.

### Staff-first workflow

Reception staff should perform common actions quickly.

### Minimum necessary data

Do not collect clinical information that the queue system does not require.

### AI only where it creates measurable value

Do not add AI merely for marketing.

### Clinical decisions stay with clinicians

QueueLess manages operations, not medicine.

---

## 45. Future Vision

```text
Patient Demand
       +
Doctor Availability
       +
Current Queue
       +
Historical Flow
       +
Consultation Patterns
       ↓
QUEUELESS INTELLIGENCE
       ↓
Predicted Demand
       +
Predicted Waiting Time
       +
Capacity Recommendations
       ↓
Better Patient Flow
```

QueueLess can eventually help administrators answer:

- When will this department become overloaded?
- How many doctors are needed at a particular time?
- Which appointment slots produce the longest waits?
- Where are bottlenecks occurring?
- Which queues consistently underperform?
- How can patient demand be distributed more efficiently?

---

## 46. Product Expansion

### Phase 1 — Queue

```text
Digital Token
Live Queue
ETA
Notifications
```

### Phase 2 — Clinic Operations

```text
Appointments
Departments
Multiple Doctors
Analytics
```

### Phase 3 — Intelligence

```text
Predictive ETA
Demand Forecasting
Bottleneck Detection
Staff Optimization
```

### Phase 4 — Integration

```text
Hospital Management Systems
Appointment Platforms
SMS / WhatsApp
Patient Identity Systems
```

### Phase 5 — Healthcare Operations Platform

```text
Patient Flow
+
Capacity Planning
+
Scheduling
+
Operational Intelligence
```

---

## 47. North Star

The fundamental transformation is:

```text
BEFORE

"Take token #147 and wait."

             ↓

QUEUELESS

"You're #7 in the queue.
Estimated wait: ~32 minutes.
We'll notify you when your
turn is approaching."
```

QueueLess does not promise zero waiting.

It aims to eliminate **unnecessary uncertainty around waiting**.

---

## 48. Final Product Statement

> **QueueLess is a smart healthcare queue and patient-flow platform that gives patients real-time visibility into their position and estimated waiting time while giving clinics the tools to manage queues, doctor availability, walk-ins, no-shows, and operational bottlenecks.**

---

## 49. Definition of MVP Done

The QueueLess MVP is complete when:

- A clinic administrator can configure a doctor and queue.
- A patient can register and join the queue.
- The system assigns a token.
- The patient can see their position and ETA.
- Staff can advance the queue.
- Patient positions update automatically.
- ETA changes when queue events occur.
- Staff can handle no-shows and walk-ins.
- Doctor consultation status can be updated.
- Patients receive turn-approaching notifications.
- Administrators can view basic queue analytics.
- Authentication and authorization work correctly.
- The application is responsive on mobile and desktop.
- Core workflows are tested end-to-end.
- The application can be deployed for a real pilot.

---

## 50. Implementation Sequence

```text
PRD
 ↓
UX / User Flows
 ↓
Database Schema
 ↓
System Architecture
 ↓
API Specification
 ↓
UI Design
 ↓
MVP Development
 ↓
Testing
 ↓
Pilot Deployment
 ↓
User Feedback
 ↓
Iteration
```

**QueueLess should be built as a focused patient-flow product first, then expanded into a healthcare operations platform after the core problem is validated.**
