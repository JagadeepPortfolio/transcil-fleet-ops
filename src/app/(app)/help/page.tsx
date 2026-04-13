import Link from "next/link"
import {
  ArrowLeftRight,
  CalendarPlus,
  CreditCard,
  Landmark,
  Lock,
  LogOut,
  PhoneCall,
  Undo2,
  Unlock,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"

export const metadata = {
  title: "Help & Guide · Transcil Fleet Ops",
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-20">
      <PageHeader
        title="Help & Guide"
        description="Everything you need to know to use Transcil Fleet Ops. Scroll through or use Ctrl+F to search."
      />

      {/* Table of contents */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold">On this page</h2>
        <nav className="mt-3 columns-2 gap-6 text-sm">
          <TOCLink href="#overview" label="App Overview" />
          <TOCLink href="#roles" label="User Roles" />
          <TOCLink href="#riders" label="Managing Riders" />
          <TOCLink href="#vehicles" label="Managing Vehicles" />
          <TOCLink href="#deployments" label="Creating Deployments" />
          <TOCLink href="#daily-workflow" label="Daily Workflow" />
          <TOCLink href="#record-payment" label="Record Payment" />
          <TOCLink href="#record-deposit" label="Record Deposit" />
          <TOCLink href="#refund-deposit" label="Refund Deposit" />
          <TOCLink href="#reminder-call" label="Log Reminder Call" />
          <TOCLink href="#replace-vehicle" label="Replace Vehicle" />
          <TOCLink href="#extend-deployment" label="Extend Deployment" />
          <TOCLink href="#return-vehicle" label="Return Vehicle" />
          <TOCLink href="#lock-vehicle" label="Lock Vehicle" />
          <TOCLink href="#unlock-vehicle" label="Unlock Vehicle" />
          <TOCLink href="#action-badges" label="Action Badges" />
          <TOCLink href="#pay-status" label="Pay Status" />
          <TOCLink href="#reports" label="Reports" />
          <TOCLink href="#search" label="Quick Search" />
          <TOCLink href="#tips" label="Tips & Shortcuts" />
        </nav>
      </Card>

      {/* ── Overview ──────────────────────────────────────────────── */}
      <Section id="overview" title="App Overview">
        <p>
          Transcil Fleet Ops is the operational management tool for Transcil
          Sustainable Services. It tracks <strong>riders</strong>,{" "}
          <strong>vehicles</strong>, and <strong>deployments</strong> (the
          contract where a rider takes a vehicle on weekly rent).
        </p>
        <p>
          The app replaces the Excel spreadsheet that was used for tracking
          payments, deposits, returns, reminders, and vehicle locks. Every
          action you take here is recorded in the activity log automatically.
        </p>
        <KeyConcept>
          A <strong>deployment</strong> is the central object. It ties a rider
          to a vehicle for a set number of weeks at a weekly rate. All
          payments, deposits, calls, and actions happen on a deployment.
        </KeyConcept>
      </Section>

      {/* ── Roles ─────────────────────────────────────────────────── */}
      <Section id="roles" title="User Roles">
        <div className="space-y-3">
          <RoleCard
            role="CMD"
            name="Chairman & Managing Director"
            description="Full access to all hubs, all data, and admin features (vehicle management, user management). Can see the complete picture across all hubs."
            count="1"
          />
          <RoleCard
            role="HUB_MANAGER"
            name="Hub Manager"
            description="Manages one hub. Can create and edit riders, deployments, vehicles, and activity for their assigned hub only. Responsible for collections and operations at the hub."
            count="4 (one per hub)"
          />
          <RoleCard
            role="CUSTOMER_SUPPORT"
            name="Customer Support Officer"
            description="Hub-scoped support role. Can view riders and deployments for their hub, log reminder calls, and record lock/unlock actions. Cannot modify payments or create deployments."
            count="4 (one per hub)"
          />
        </div>
        <KeyConcept>
          <strong>9 total users</strong> — 1 CMD + 4 Hub Managers + 4 Customer
          Support Officers. All hub-scoped roles only see data for their assigned
          hub (Nagole, Kukatpally, Vijayawada, or Vizag). CMD sees everything.
        </KeyConcept>
      </Section>

      {/* ── Riders ────────────────────────────────────────────────── */}
      <Section id="riders" title="Managing Riders">
        <Steps
          steps={[
            "Go to Riders from the sidebar (or press Cmd+K and type \"Riders\")",
            "Click New Rider in the top right",
            "Fill in name, phone (10 digits), source, and location",
            "Optionally upload a photo and ID proof",
            "Click Create Rider",
          ]}
        />
        <KeyConcept>
          Each rider has a unique phone number. If you try to add a rider
          with a phone that already exists, the app will show you a link to
          the existing rider instead.
        </KeyConcept>
        <p>
          To edit a rider, click their name in the list to open the detail
          page, then make changes and save.
        </p>
      </Section>

      {/* ── Vehicles ──────────────────────────────────────────────── */}
      <Section id="vehicles" title="Managing Vehicles (CMD Only)">
        <p>
          Vehicles are managed under <strong>Vehicles</strong> in the sidebar
          (visible to CMD role only). Each vehicle has a unique VTD number.
        </p>
        <Steps
          steps={[
            "Go to Vehicles from the sidebar",
            "Click New Vehicle",
            "Enter VTD number, vehicle type, and optionally a colour and vehicle ID",
            "Click Create Vehicle",
          ]}
        />
        <KeyConcept>
          Vehicle availability is automatic — a vehicle is &quot;available&quot;
          when it has no active deployment. You never need to manually mark a
          vehicle as available or in-use. Returning or cancelling a deployment
          frees the vehicle immediately.
        </KeyConcept>
      </Section>

      {/* ── Deployments ───────────────────────────────────────────── */}
      <Section id="deployments" title="Creating Deployments">
        <p>
          A deployment is created when a rider takes a vehicle. It captures the
          contract terms: which rider, which vehicle, which hub, how many weeks,
          and the weekly rate.
        </p>
        <Steps
          steps={[
            "Go to Deployments from the sidebar",
            "Click New Deployment",
            "Search and select a rider (by name or phone)",
            "Select a vehicle from the available list (only shows vehicles not currently deployed)",
            "Choose the hub, set the deploy date, weeks, weekly rate, and deposit amount",
            "If the rider is carrying forward a deposit from a previous deployment, uncheck \"New deposit needed\"",
            "Click Create Deployment",
          ]}
        />
        <KeyConcept>
          Each rider can only have one active deployment at a time. Each
          vehicle can only be in one active deployment. The system enforces
          this automatically — if someone else creates a deployment for the
          same rider or vehicle at the same time, one will succeed and the
          other will see a clear error message.
        </KeyConcept>
      </Section>

      {/* ── Daily workflow ────────────────────────────────────────── */}
      <Section id="daily-workflow" title="Daily Workflow">
        <p>Here is the typical daily routine for field staff:</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Check the Dashboard</strong> — look at the alert cards.
            &quot;Lock Now&quot; means overdue and needs immediate action.
            &quot;Call Today&quot; means reminder calls are due.
          </li>
          <li>
            <strong>Make reminder calls</strong> — open each deployment that
            needs a call, click <strong>Log reminder call</strong>, record the
            outcome. This clears them from the &quot;Call Today&quot; count.
          </li>
          <li>
            <strong>Collect payments</strong> — when a rider pays, open their
            deployment and click <strong>Record payment</strong>. Always enter
            the Transaction ID (UPI ref, receipt number) — payments without a
            Txn ID don&apos;t count toward Total Paid.
          </li>
          <li>
            <strong>Handle returns/replacements</strong> — if a rider returns
            a vehicle, use <strong>Return vehicle</strong>. If they need a
            different vehicle, use <strong>Replace vehicle</strong>.
          </li>
          <li>
            <strong>Lock overdue vehicles</strong> — for riders who are past
            due and unreachable, use <strong>Lock vehicle</strong> to record
            the anti-fraud lock.
          </li>
        </ol>
      </Section>

      {/* ── 9 Event flows ─────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold" id="event-flows">
        Event Flows (Quick Actions)
      </h2>
      <p className="text-sm text-muted-foreground">
        All event flows are accessed from the <strong>Quick Actions</strong>{" "}
        section on a deployment detail page. Click any deployment in the list,
        then use the buttons below the status cards.
      </p>

      <EventFlow
        id="record-payment"
        icon={CreditCard}
        title="Record Payment"
        description="Weekly rent collection from the rider."
        fields={[
          { name: "Event date", note: "defaults to today" },
          { name: "Amount", note: "in rupees" },
          { name: "Week #", note: "optional — which week this covers (1-52)" },
          { name: "Transaction ID", note: "UPI ref, receipt no, bank ref — leave blank for cash" },
          { name: "Additional Txn ID", note: "optional — for split payments" },
          { name: "Notes", note: "optional" },
        ]}
        important="Payments without a Transaction ID are recorded but DO NOT count toward Total Paid. This is intentional — cash payments can be logged without a Txn ID, and the ID can be added later once a receipt is available."
      />

      <EventFlow
        id="record-deposit"
        icon={Landmark}
        title="Record Deposit"
        description="Security deposit collected for this deployment. Tracked separately from weekly rent."
        fields={[
          { name: "Event date", note: "defaults to today" },
          { name: "Amount", note: "in rupees" },
          { name: "Transaction ID", note: "UPI ref, receipt no, bank ref" },
          { name: "Notes", note: "optional" },
        ]}
      />

      <EventFlow
        id="refund-deposit"
        icon={Undo2}
        title="Refund Deposit"
        description="Return the security deposit to the rider, or carry it forward to a new deployment."
        fields={[
          { name: "Event date", note: "defaults to today" },
          { name: "Amount", note: "in rupees" },
          { name: "Refund status", note: "Refunded (cash returned) or Carried Forward (new deployment)" },
          { name: "Transaction ID", note: "for carry-forward, use the same CARRY-xxx ref on both sides" },
          { name: "Notes", note: "optional" },
        ]}
        important="When carrying forward a deposit: record a REFUND on the old deployment and a DEPOSIT on the new deployment, both with the same Transaction ID (e.g. CARRY-001). This keeps the money trail clean."
      />

      <EventFlow
        id="reminder-call"
        icon={PhoneCall}
        title="Log Reminder Call"
        description="Record the outcome of a pre-due reminder call. Updates the deployment's call status so it disappears from the 'Call Today' count on the dashboard."
        fields={[
          { name: "Call date", note: "defaults to today" },
          { name: "Outcome", note: "Called-Will Return, Called-Extending, Called-No Response, or Not Required" },
          { name: "Notes", note: "what the rider said" },
        ]}
      />

      <EventFlow
        id="replace-vehicle"
        icon={ArrowLeftRight}
        title="Replace Vehicle"
        description="Swap the current vehicle for a different one mid-deployment. The deployment stays active with the new vehicle."
        fields={[
          { name: "Event date", note: "defaults to today" },
          { name: "New vehicle", note: "pick from available vehicles" },
          { name: "Reason", note: "Vehicle breakdown, Battery issue, Rider request, Upgrade, Damage, or Other" },
          { name: "Notes", note: "optional" },
        ]}
        important="The old vehicle becomes available for other riders immediately. The new vehicle must not have another active deployment."
      />

      <EventFlow
        id="extend-deployment"
        icon={CalendarPlus}
        title="Extend Deployment"
        description="Add extra weeks to the current deployment. The due date recalculates automatically."
        fields={[
          { name: "Event date", note: "defaults to today" },
          { name: "Extra weeks", note: "1-52 — added to the existing weeks" },
          { name: "Notes", note: "reason for extension, new terms, etc." },
        ]}
        important="The Total Due on the dashboard updates automatically because it's calculated as weeks x rate. So extending by 4 weeks at 1000/wk adds 4,000 to Total Due."
      />

      <EventFlow
        id="return-vehicle"
        icon={LogOut}
        title="Return Vehicle"
        description="Rider gives the vehicle back. The deployment status changes to RETURNED and the vehicle becomes available."
        fields={[
          { name: "Return date", note: "defaults to today" },
          { name: "Return reason", note: "Contract complete, Rider request, Non-payment, Vehicle issue, Rider relocated, or Other" },
          { name: "Notes", note: "outstanding balance, vehicle condition, etc." },
        ]}
        important="After a return, the Quick Actions section hides — you can't record payments on a returned deployment. Make sure to handle any deposit refund BEFORE processing the return, or use a separate deposit refund action afterward."
      />

      <EventFlow
        id="lock-vehicle"
        icon={Lock}
        title="Lock Vehicle"
        description="Anti-fraud remote vehicle lock for overdue riders. The deployment status changes to LOCKED."
        fields={[
          { name: "Lock date", note: "defaults to today" },
          { name: "Notes", note: "reason for lock — overdue amount, failed contact, etc." },
        ]}
        important="Lock is only available on ACTIVE deployments. Once locked, the deployment shows an Unlock button instead."
      />

      <EventFlow
        id="unlock-vehicle"
        icon={Unlock}
        title="Unlock Vehicle"
        description="Reverse a lock after the rider resolves the issue (pays dues, settles dispute)."
        fields={[
          { name: "Unlock date", note: "defaults to today" },
          { name: "Notes", note: "resolution details — payment received, dispute settled, etc." },
        ]}
        important="Unlock is only available on LOCKED deployments. After unlocking, the deployment remains in LOCKED status in the system — use Return to fully close it, or it will continue to show in the overdue list."
      />

      {/* ── Action badges ─────────────────────────────────────────── */}
      <Section id="action-badges" title="Understanding Action Badges">
        <p>
          Every active deployment gets a coloured badge that tells you what
          needs to happen:
        </p>
        <div className="space-y-2">
          <BadgeExplainer
            color="bg-destructive text-destructive-foreground"
            label="LOCK NOW"
            meaning="Overdue — past the due date. Lock the vehicle or contact the rider urgently."
          />
          <BadgeExplainer
            color="bg-warning text-warning-foreground"
            label="AT RISK"
            meaning="Due date is today. Payment should be collected today."
          />
          <BadgeExplainer
            color="bg-info text-info-foreground"
            label="CALL TODAY"
            meaning="3 days before due date. Time to make a reminder call."
          />
          <BadgeExplainer
            color="bg-muted text-muted-foreground"
            label="UPCOMING"
            meaning="5 days before due date. On the radar but no action needed yet."
          />
          <BadgeExplainer
            color="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
            label="OK"
            meaning="More than 5 days until due. Everything is fine."
          />
        </div>
      </Section>

      {/* ── Pay status ────────────────────────────────────────────── */}
      <Section id="pay-status" title="Understanding Pay Status">
        <div className="space-y-2">
          <BadgeExplainer
            color="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
            label="PAID"
            meaning="Total Paid >= Total Due. Fully settled."
          />
          <BadgeExplainer
            color="bg-warning/15 text-warning-foreground"
            label="PARTIAL"
            meaning="Some payment received but balance remains."
          />
          <BadgeExplainer
            color="bg-destructive/15 text-destructive"
            label="OVERDUE"
            meaning="Past due date with no payment at all."
          />
          <BadgeExplainer
            color="bg-muted text-muted-foreground"
            label="PENDING"
            meaning="Not yet due — payment expected in the future."
          />
        </div>
        <KeyConcept>
          Total Paid only counts payments that have a Transaction ID. If you
          record a payment without a Txn ID, it appears in the activity log
          but the Pay Status won&apos;t update until the Txn ID is added.
        </KeyConcept>
      </Section>

      {/* ── Reports ───────────────────────────────────────────────── */}
      <Section id="reports" title="Reports">
        <p>
          Three reports are available under{" "}
          <Link href="/reports" className="font-medium underline">
            Reports
          </Link>{" "}
          in the sidebar:
        </p>
        <div className="space-y-3">
          <ReportCard
            title="Monthly Summary"
            description="Revenue, fleet utilization, new deployments vs returns, deposit movements. Use the month picker to navigate between months."
          />
          <ReportCard
            title="Outstanding Balances"
            description="All active deployments with unpaid balances, grouped by how overdue they are: current, 1-7 days, 8-14 days, 15-30 days, 30+ days. Shows total outstanding per bucket."
          />
          <ReportCard
            title="Hub Performance"
            description="Side-by-side comparison of hubs: active deployments, overdue count, collection amount, collection rate (with visual bar), and utilization."
          />
        </div>
      </Section>

      {/* ── Search ────────────────────────────────────────────────── */}
      <Section id="search" title="Quick Search (Cmd+K)">
        <p>
          Press <Kbd>Cmd+K</Kbd> (Mac) or <Kbd>Ctrl+K</Kbd> (Windows) anywhere
          in the app to open the search palette. You can:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Search for riders by name or phone</li>
          <li>Search for deployments by rider name, VTD number, or status</li>
          <li>Navigate to any page by typing its name</li>
        </ul>
        <p>
          Use arrow keys to navigate results and Enter to open. Press Escape
          to close.
        </p>
      </Section>

      {/* ── Tips ──────────────────────────────────────────────────── */}
      <Section id="tips" title="Tips & Shortcuts">
        <div className="space-y-3">
          <Tip title="Click table rows">
            You can click anywhere on a table row to open that record — you
            don&apos;t need to click the name link specifically.
          </Tip>
          <Tip title="Transaction ID matters">
            Always enter the Txn ID when recording payments or deposits. Without
            it, the payment shows in the activity log but doesn&apos;t count
            toward the financial totals. You can add it later if needed.
          </Tip>
          <Tip title="Deposit carry-forward">
            When a rider returns one vehicle and takes another with the same
            deposit: (1) Refund deposit on the old deployment with status
            &quot;Carried Forward&quot; and a Txn ID like CARRY-001, then (2)
            Record deposit on the new deployment with the same CARRY-001 ref.
          </Tip>
          <Tip title="Check the Dashboard first">
            Start your day on the Dashboard. The alert cards (Lock Now, At Risk,
            Call Today) tell you exactly what needs attention. The &quot;Most
            Urgent&quot; list shows the top 5 deployments that need action.
          </Tip>
          <Tip title="Extension updates Total Due">
            When you extend a deployment, the due date moves forward AND the
            Total Due increases (more weeks at the same rate). The balance
            updates automatically.
          </Tip>
        </div>
      </Section>
    </div>
  )
}

// ── Helper components ────────────────────────────────────────────────────

function TOCLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block py-0.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
    </a>
  )
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
      {steps.map((s, i) => (
        <li key={i}>{s}</li>
      ))}
    </ol>
  )
}

function KeyConcept({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-info bg-info/5 px-4 py-3 text-sm">
      {children}
    </div>
  )
}

function EventFlow({
  id,
  icon: Icon,
  title,
  description,
  fields,
  important,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  fields: { name: string; note: string }[]
  important?: string
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Form fields
          </div>
          {fields.map((f) => (
            <div key={f.name} className="flex items-baseline gap-2 text-sm">
              <span className="font-medium text-foreground">{f.name}</span>
              <span className="text-xs text-muted-foreground">— {f.note}</span>
            </div>
          ))}
        </div>
        {important ? (
          <div className="mt-4 rounded-lg border-l-4 border-warning bg-warning/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-warning-foreground">Important:</strong>{" "}
            {important}
          </div>
        ) : null}
      </Card>
    </section>
  )
}

function RoleCard({
  role,
  name,
  description,
  count,
}: {
  role: string
  name: string
  description: string
  count?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-4">
      <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold">
        {role}
      </span>
      <div>
        <div className="text-sm font-medium">
          {name}
          {count ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({count})
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function BadgeExplainer({
  color,
  label,
  meaning,
}: {
  color: string
  label: string
  meaning: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${color}`}
      >
        {label}
      </span>
      <span className="text-sm text-muted-foreground">{meaning}</span>
    </div>
  )
}

function ReportCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">
      {children}
    </kbd>
  )
}
