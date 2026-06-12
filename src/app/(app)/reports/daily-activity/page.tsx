import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { getDailyActivity, getDailySourceBreakdown } from "@/lib/db/reports"
import { formatDate } from "@/lib/dates"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/form-fields"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = {
  title: "Daily Activity · Reports · Transcil Fleet Ops",
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function istToday(): string {
  // YYYY-MM-DD in IST (en-CA yields ISO-style date).
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
}

export default async function DailyActivityPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string }
}) {
  const today = istToday()
  let from = searchParams.from && DATE_RE.test(searchParams.from) ? searchParams.from : today
  let to = searchParams.to && DATE_RE.test(searchParams.to) ? searchParams.to : today
  if (from > to) [from, to] = [to, from]

  const [{ rows, totals }, bySource] = await Promise.all([
    getDailyActivity(from, to),
    getDailySourceBreakdown(from, to),
  ])
  const inr = (v: number) => `₹${Number(v).toLocaleString("en-IN")}`

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Daily Activity" }]}
        title="Daily Activity"
        description="Deployments, customers and money collected per day. Defaults to today."
        action={
          <Button variant="ghost" render={<Link href="/reports" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <Field label="From" name="from" type="date" defaultValue={from} />
          </div>
          <div className="w-40">
            <Field label="To" name="to" type="date" defaultValue={to} />
          </div>
          <Button type="submit" size="sm">
            Apply
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">By rider source</h2>
        <Card className="overflow-hidden p-0">
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Deployments</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Deposit</TableHead>
                  <TableHead className="text-right">Weekly rent</TableHead>
                  <TableHead className="text-right">Late fee</TableHead>
                  <TableHead className="text-right">Total received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySource.rows.map((r) => (
                  <TableRow key={r.source}>
                    <TableCell className="font-medium">{r.source}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.deployments}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.active}</TableCell>
                    <TableCell className="text-right tabular-nums">{inr(r.deposit)}</TableCell>
                    <TableCell className="text-right tabular-nums">{inr(r.rent)}</TableCell>
                    <TableCell className="text-right tabular-nums">{inr(r.lateFee)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{inr(r.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 bg-muted/40 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{bySource.totals.deployments}</TableCell>
                  <TableCell className="text-right tabular-nums">{bySource.totals.active}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr(bySource.totals.deposit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr(bySource.totals.rent)}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr(bySource.totals.lateFee)}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr(bySource.totals.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Day by day</h2>
        <Card className="overflow-hidden p-0">
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                <TableHead className="text-right">Deployments</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
                <TableHead className="text-right">Weekly rent</TableHead>
                <TableHead className="text-right">Late fee</TableHead>
                <TableHead className="text-right">Total received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.date}>
                  <TableCell className="font-medium">{formatDate(r.date)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.deployments}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.customers}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr(r.deposit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr(r.rent)}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr(r.lateFee)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{inr(r.total)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 bg-muted/40 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{totals.deployments}</TableCell>
                <TableCell className="text-right tabular-nums">{totals.customers}</TableCell>
                <TableCell className="text-right tabular-nums">{inr(totals.deposit)}</TableCell>
                <TableCell className="text-right tabular-nums">{inr(totals.rent)}</TableCell>
                <TableCell className="text-right tabular-nums">{inr(totals.lateFee)}</TableCell>
                <TableCell className="text-right tabular-nums">{inr(totals.total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        </Card>
      </div>
    </div>
  )
}
