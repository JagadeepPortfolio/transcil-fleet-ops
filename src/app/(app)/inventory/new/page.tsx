import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { getCurrentUserContext, INVENTORY_MANAGER_ROLES } from "@/lib/auth/role"
import { listCategories, createPartWithStock } from "@/lib/db/spare-parts"
import { resolveHubId } from "@/lib/db/hubs"
import { partCreateSchema } from "@/lib/validation/repairs"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { FormError } from "@/components/ui/form-fields"

export const metadata = { title: "Add part · Inventory · Transcil Fleet Ops" }

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
const label = "block text-xs font-medium text-muted-foreground mb-1"

async function createPart(formData: FormData) {
  "use server"
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !INVENTORY_MANAGER_ROLES.includes(ctx.role)) {
    redirect("/inventory")
  }
  const parsed = partCreateSchema.safeParse({
    name: formData.get("name"),
    category_id: formData.get("category_id") || undefined,
    unit: formData.get("unit") || "piece",
    part_number: formData.get("part_number") || undefined,
    reorder_level: formData.get("reorder_level") || 0,
    opening_qty: formData.get("opening_qty") || 0,
  })
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ")
    redirect(`/inventory/new?error=${encodeURIComponent(msg)}`)
  }
  const hubId = ctx.hubId ?? (await resolveHubId("NAG"))
  if (hubId == null) redirect(`/inventory/new?error=${encodeURIComponent("No hub configured")}`)

  try {
    await createPartWithStock({
      name: parsed.data.name,
      categoryId: parsed.data.category_id,
      unit: parsed.data.unit,
      partNumber: parsed.data.part_number,
      reorderLevel: parsed.data.reorder_level,
      openingQty: parsed.data.opening_qty,
      hubId,
    })
  } catch (e) {
    redirect(`/inventory/new?error=${encodeURIComponent((e as Error).message)}`)
  }
  revalidatePath("/inventory")
  redirect("/inventory")
}

export default async function NewPartPage({ searchParams }: { searchParams: { error?: string } }) {
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !INVENTORY_MANAGER_ROLES.includes(ctx.role)) redirect("/inventory")
  const categories = await listCategories()

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Add part" }]}
        title="Add part"
        action={
          <Button variant="ghost" render={<Link href="/inventory" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />
      <FormError message={searchParams.error} />
      <Card>
        <form action={createPart} className="space-y-5 p-6">
          <div>
            <label className={label} htmlFor="name">Part name</label>
            <input id="name" name="name" required className={field} placeholder="e.g. REAR BRAKE SHOE" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="category_id">Category</label>
              <select id="category_id" name="category_id" className={field} defaultValue="">
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="unit">Unit</label>
              <input id="unit" name="unit" className={field} defaultValue="piece" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="opening_qty">Opening stock (this hub)</label>
              <input id="opening_qty" name="opening_qty" type="number" min={0} defaultValue={0} className={field} />
            </div>
            <div>
              <label className={label} htmlFor="reorder_level">Reorder at</label>
              <input id="reorder_level" name="reorder_level" type="number" min={0} defaultValue={0} className={field} />
            </div>
          </div>
          <div>
            <label className={label} htmlFor="part_number">Part number (optional)</label>
            <input id="part_number" name="part_number" className={field} />
          </div>
          <div className="flex items-center justify-end gap-3 border-t pt-5">
            <Button variant="ghost" render={<Link href="/inventory" />}>Cancel</Button>
            <Button type="submit" size="lg">Add part</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
