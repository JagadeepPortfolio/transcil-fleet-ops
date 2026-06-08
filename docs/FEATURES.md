# Transcil Fleet Ops — Feature Overview

_A high-level summary of what the web application does, prepared for Transcil
Sustainable Services. Last updated: June 2026._

---

## 1. What the application is

**Transcil Fleet Ops** is a secure, web-based system for managing the
**day-to-day operations of your EV fleet after a vehicle is handed to a rider** —
payments, deposits, returns, replacements, extensions, reminders, locking, and
reporting.

It is the digital replacement for the Excel operations template, giving every
hub a single shared, always-current source of truth instead of spreadsheets.

It works **alongside** your existing fleet platform: vehicle manufacturing,
hubs, vehicle assignment, agreement printing, and tracking continue to live in
that system. Rider and deployment information flows in once (one-way), and all
**post-deployment operations** are then run here.

---

## 2. Who uses it (roles & access)

| Role | What they can do |
|---|---|
| **CMD** (Chairman & Managing Director) | Full access — everything below, plus vehicle inventory management, user administration, and protected corrections (e.g. editing a deployment date with a reason). |
| **Hub Manager** | Manage riders and deployments for daily operations; view vehicles and reports. |
| **Field Staff** | Record day-to-day rider events (payments, calls, returns); view vehicles. |

Access is enforced at every layer, so staff only see and do what their role
permits.

---

## 3. Core modules

### Dashboard
The operational home screen. At a glance:
- **Active deployments**, **Riders**, **Total Vehicles**, **Available Vehicles**, **Locked Vehicles**
- **Action alerts** — *Lock Now* and *Due Date Crossed* counts
- A **most-urgent list** so staff know exactly who to act on first each morning

### Riders
A complete rider profile system:
- Full profile capture — name, phone, **address (mandatory)**, **current location**
- **Source** classification — Individual / 3PL / Camions
- **Emergency contact** — relationship (Father / Mother / Brother / Guardian), name, number
- **Purpose / platform** — structured dropdown (Big Basket, Zepto, Swiggy, Swiggy Instamart, Zomato, Blinkit, Amazon, Flipkart Minute, Amazon One, others) with store ID, location, and name
- Photo / ID document upload (secure, private storage)
- Searchable, filterable rider list

### Vehicles
- Vehicle inventory with EC number, chassis number, colour, hub
- **Viewable by all roles**; add / edit / delete restricted to CMD
- **Availability is automatic** — a vehicle is "available" whenever it has no
  active deployment, so the list is never out of date

### Deployments
The heart of the system — each deployment is one rider on one vehicle:
- **Guided new-deployment screen** captures rider, vehicle, hub, rental terms,
  battery & charger-cable numbers, the **initial payment**, and the **deposit**
  in a single flow
- **Weekly or Monthly** rental — Weekly (default ₹1799/week) or Monthly
  (₹6500/month), with deposit (default ₹2000)
- Every deployment gets a unique code (e.g. **DEP-2026-12**)
- Built-in safeguards prevent the same vehicle or rider being double-booked
- A full **activity timeline** showing every event on the deployment

---

## 4. The daily rider lifecycle (post-deployment operations)

Every action a rider takes after delivery is captured as an event on their
deployment. All nine are live in the app:

| Event | What it does |
|---|---|
| **Payment** | Record weekly/monthly rent collection (with transaction reference). |
| **Deposit** | Collect the security deposit. |
| **Deposit Refund** | Refund or carry forward the deposit at contract close. |
| **Replacement** | Swap the rider onto a different vehicle (breakdown, damage, upgrade). |
| **Extension** | Extend the term by **weeks or months** — due date and amount due update automatically. |
| **Return** | Mark the vehicle returned; capture returned battery & charger; free the vehicle. |
| **Reminder Call** | Log a reminder-call outcome before the due date. |
| **Lock** | Remotely flag a vehicle as locked for overdue / non-payment. |
| **Unlock** | Reverse a lock once resolved. |

Because the system updates the deployment and its history **in the same step**,
the numbers can never silently drift out of sync — a key weakness of the old
spreadsheet.

---

## 5. Money & collections

A clear, auditable financial picture for every deployment:

- **Total Due** — full contracted amount (rent + deposit)
- **Total Collected** — all cash actually received (rent + late fees + deposit)
- **Balance** — what the rider still owes against the contract
- **Pay status** — Paid / Partial / Overdue / Pending, calculated automatically

**Payment controls (carried over from the Excel audit rules):**
- Every payment requires a **transaction reference (UTR)** — "no reference, no
  validated payment"
- Payments are categorised as **Billing Cycle** (rent) or **Late fee**
- Payment modes: **UPI** or **Mobile App**

**Late return fees:**
- On the Return screen, if a vehicle comes back **after the due date**, the
  system shows the **late fee** (daily rate = weekly rate ÷ 7, e.g. ₹257/day for
  a ₹1799/week plan) alongside any outstanding rent, so staff know the exact
  amount to collect.
- A dedicated **"Late fee collected"** figure lets you verify total collections.

**Deposits** can be refunded or **carried forward** to a new vehicle, with the
money trail preserved.

---

## 6. Alerts & ageing

The system continuously classifies every active deployment by urgency (all on
**Indian Standard Time**, so the night shift sees correct dates):

- **Lock Now** — overdue, action required
- **Due Date Crossed** — past due
- **Call Today / Upcoming** — approaching due date
- Riders are colour-coded so staff always **work the most urgent first**

---

## 7. Reports

On-the-fly business reporting:

- **Monthly Summary** — revenue, fleet utilisation, new deployments vs returns, overdue count
- **Outstanding Balances** — every unpaid active deployment grouped by ageing bucket (current, 1–7d, 8–14d, 15–30d, 30d+)
- **Hub Performance** — collection rate, utilisation, and overdue count compared side-by-side across hubs

---

## 8. Built-in conveniences & safeguards

- **Global search (⌘K / Ctrl-K)** — jump to any rider, vehicle, or deployment instantly
- **Consistent date format** throughout (e.g. *12 Mar 2026*)
- **Full audit trail** — every event records who did it and when
- **Safe deletes** — records are removed in a controlled, reversible way; nothing is lost by accident
- **Secure by design** — role-based access, encrypted connections, private document storage, and protected secrets

---

## 9. Technology & hosting

- Modern web application — works on desktop and mobile browsers, nothing to install
- **Secure SSL**, hosted on **Vercel** (application) and **Supabase** (database), co-located in the Mumbai region for speed
- Automatic, always-current data — no manual file sharing or version conflicts

---

## 10. On the roadmap (planned)

- **CSV import** of rider deployments from the existing fleet platform
- **Integration** with the existing software to pull customer information automatically
- **API-based lock / unlock** with the vehicle hardware
- **Return / repair tracking** workflow
- User administration UI (add staff, assign roles & hubs)
- WhatsApp / SMS (OTP) notifications

---

_For internal/technical detail see `ARCHITECTURE.md`, `RIDER_FLOWS.md`, and
`CHANGELOG.md` in this repository._
