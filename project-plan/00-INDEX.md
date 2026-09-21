# Project Plan & Status Index

This directory is the single source of truth for **project status, architectural decisions, and next implementation steps**, organized feature by feature.

> [!IMPORTANT]
> - This folder tracks **WHAT** has been decided and built, feature by feature.
> - [AGENTS.md](file:///d:/Cursor/Mai_Website/AGENTS.md) tracks **HOW** to code (coding standards, tech stack rules, anti-damage guidelines).
> - **Before starting any task**, read the relevant subfolder under `project-plan/`.
> - Decisions documented in each `decisions.md` file must be treated as **settled** unless the user explicitly instructs to revisit them.

---

## High-Level Status Overview

| Feature Area | Subfolder | Status | Summary |
| :--- | :--- | :--- | :--- |
| **Booking System** | [`/booking`](file:///d:/Cursor/Mai_Website/project-plan/booking) | **In Progress (#1 Priority)** | Frontend built; awaiting real database persistence and Google Calendar sync. |
| **Payments** | [`/payments`](file:///d:/Cursor/Mai_Website/project-plan/payments) | **Planned** | Gateway chosen (PayTabs); pending clean backend build after booking persistence. |
| **Mobile App** | [`/mobile-app`](file:///d:/Cursor/Mai_Website/project-plan/mobile-app) | **Postponed** | Capacitor wrapper configured and verified; parked on dedicated branch. |
| **Infrastructure** | [`/infrastructure`](file:///d:/Cursor/Mai_Website/project-plan/infrastructure) | **Live** | Keep-alive workflow live and confirmed working. |
| **WhatsApp Automation** | [`/whatsapp`](file:///d:/Cursor/Mai_Website/project-plan/whatsapp) | **In Progress (Stage 1)** | Self-hosted `whatsapp-web.js` microservice on Oracle Always Free VM. |
| **Bunny Stream** | [`/bunny-stream`](file:///d:/Cursor/Mai_Website/project-plan/bunny-stream) | **Admin example live** | Signed example playback works on the production admin page; real course lesson mapping and progress verification remain. |
| **Course CMS & Delivery** | [`/courses`](file:///d:/Cursor/Mai_Website/project-plan/courses) | **In Progress** | Production-ready course authoring, modules, lessons, direct video uploads, materials, and student delivery. |
| **CRM & Client Engagement** | [`/crm`](file:///d:/Cursor/Mai_Website/project-plan/crm) | **Planned** | Two-track engagement model, dynamic content library, unseen rotation, and per-client admin CRM view. |

---

## Directory Navigation

- [Course Authoring & Delivery Plan](file:///d:/Cursor/Mai_Website/project-plan/courses):
  - [Status](file:///d:/Cursor/Mai_Website/project-plan/courses/status.md)
  - [Decisions](file:///d:/Cursor/Mai_Website/project-plan/courses/decisions.md)
  - [Database Schema](file:///d:/Cursor/Mai_Website/project-plan/courses/schema.md)
  - [Next Steps](file:///d:/Cursor/Mai_Website/project-plan/courses/next-steps.md)
- [Booking Plan](file:///d:/Cursor/Mai_Website/project-plan/booking):
  - [Status](file:///d:/Cursor/Mai_Website/project-plan/booking/status.md)
  - [Decisions](file:///d:/Cursor/Mai_Website/project-plan/booking/decisions.md)
  - [Next Steps](file:///d:/Cursor/Mai_Website/project-plan/booking/next-steps.md)
- [WhatsApp Automation Plan](file:///d:/Cursor/Mai_Website/project-plan/whatsapp):
  - [Status](file:///d:/Cursor/Mai_Website/project-plan/whatsapp/status.md)
  - [Decisions](file:///d:/Cursor/Mai_Website/project-plan/whatsapp/decisions.md)
  - [Next Steps](file:///d:/Cursor/Mai_Website/project-plan/whatsapp/next-steps.md)
  - [Oracle VM Setup Guide](file:///d:/Cursor/Mai_Website/project-plan/whatsapp/oracle-vm-setup.md)
- [Payments Plan](file:///d:/Cursor/Mai_Website/project-plan/payments):
  - [Status](file:///d:/Cursor/Mai_Website/project-plan/payments/status.md)
  - [Decisions](file:///d:/Cursor/Mai_Website/project-plan/payments/decisions.md)
  - [Next Steps](file:///d:/Cursor/Mai_Website/project-plan/payments/next-steps.md)
- [Mobile App Plan](file:///d:/Cursor/Mai_Website/project-plan/mobile-app):
  - [Status](file:///d:/Cursor/Mai_Website/project-plan/mobile-app/status.md)
  - [Decisions](file:///d:/Cursor/Mai_Website/project-plan/mobile-app/decisions.md)
  - [Next Steps](file:///d:/Cursor/Mai_Website/project-plan/mobile-app/next-steps.md)
- [Infrastructure Plan](file:///d:/Cursor/Mai_Website/project-plan/infrastructure):
  - [Status](file:///d:/Cursor/Mai_Website/project-plan/infrastructure/status.md)
  - [Decisions](file:///d:/Cursor/Mai_Website/project-plan/infrastructure/decisions.md)
- [Bunny Stream Plan](file:///d:/Cursor/Mai_Website/project-plan/bunny-stream):
  - [Status](file:///d:/Cursor/Mai_Website/project-plan/bunny-stream/status.md)
  - [Decisions](file:///d:/Cursor/Mai_Website/project-plan/bunny-stream/decisions.md)
  - [Next Steps](file:///d:/Cursor/Mai_Website/project-plan/bunny-stream/next-steps.md)
- [CRM & Client Engagement Plan](file:///d:/Cursor/Mai_Website/project-plan/crm):
  - [Status](file:///d:/Cursor/Mai_Website/project-plan/crm/status.md)
  - [Decisions](file:///d:/Cursor/Mai_Website/project-plan/crm/decisions.md)
  - [Next Steps](file:///d:/Cursor/Mai_Website/project-plan/crm/next-steps.md)
