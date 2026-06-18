import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getRider, findRiderByPhone } from "@/lib/db/riders"
import { getCurrentRole } from "@/lib/auth/role"
import {
  riderCreateSchema,
  riderSources,
  emergencyRelationships,
} from "@/lib/validation/rider"
import { RiderPurposeFields } from "../../new/rider-purpose-fields"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Field, FileField, FormError, SelectField, TextareaField } from "@/components/ui/form-fields"

export const metadata = { title: "Edit rider · Transcil Fleet Ops" }

async function updateRider(riderId: string, formData: FormData) {
  "use server"
  if ((await getCurrentRole()) !== "CMD") redirect(`/riders/${riderId}`)

  const parsed = riderCreateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    alt_phone: formData.get("alt_phone") ?? "",
    source: formData.get("source"),
    app_rider_id: formData.get("app_rider_id") ?? "",
    current_location: formData.get("current_location") ?? "",
    emergency_contact_relationship: formData.get("emergency_contact_relationship"),
    emergency_contact_name: formData.get("emergency_contact_name") ?? "",
    emergency_contact_number: formData.get("emergency_contact_number") ?? "",
    purpose: formData.get("purpose"),
    store_id: formData.get("store_id") ?? "",
    store_location: formData.get("store_location") ?? "",
    purpose_other: formData.get("purpose_other") ?? "",
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ")
    redirect(`/riders/${riderId}/edit?error=${encodeURIComponent(msg)}`)
  }
  const input = parsed.data

  // Phone uniqueness — only an issue if it now collides with a DIFFERENT rider.
  const existing = await findRiderByPhone(input.phone)
  if (existing && existing.id !== riderId) {
    redirect(`/riders/${riderId}/edit?error=${encodeURIComponent(`Phone already registered to ${existing.name}`)}`)
  }

  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()

  // Optional re-uploads — keep the existing file when no new one is chosen.
  const patch: Record<string, unknown> = {
    name: input.name,
    phone: input.phone,
    alt_phone: input.alt_phone || null,
    source: input.source,
    app_rider_id: input.app_rider_id || null,
    current_location: input.current_location,
    emergency_contact_relationship: input.emergency_contact_relationship,
    emergency_contact_name: input.emergency_contact_name,
    emergency_contact_number: input.emergency_contact_number,
    purpose: input.purpose,
    store_id: input.store_id || null,
    store_location: input.store_location || null,
    purpose_other: input.purpose_other || null,
    notes: input.notes || null,
    updated_by: user.user?.id,
  }

  const photoFile = formData.get("photo") as File | null
  if (photoFile && photoFile.size > 0) {
    const ext = photoFile.name.split(".").pop() ?? "jpg"
    const path = `${riderId}/photo.${ext}`
    const { error } = await supabase.storage
      .from("rider-photos")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type })
    if (!error) patch.photo_url = path
  }
  const idProofFile = formData.get("id_proof") as File | null
  if (idProofFile && idProofFile.size > 0) {
    const ext = idProofFile.name.split(".").pop() ?? "jpg"
    const path = `${riderId}/id.${ext}`
    const { error } = await supabase.storage
      .from("rider-id-proofs")
      .upload(path, idProofFile, { upsert: true, contentType: idProofFile.type })
    if (!error) patch.id_proof_url = path
  }

  const { error: updErr } = await supabase.from("riders").update(patch).eq("id", riderId)
  if (updErr) {
    redirect(`/riders/${riderId}/edit?error=${encodeURIComponent(updErr.message)}`)
  }

  revalidatePath(`/riders/${riderId}`)
  revalidatePath("/riders")
  redirect(`/riders/${riderId}`)
}

export default async function EditRiderPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  if ((await getCurrentRole()) !== "CMD") redirect(`/riders/${params.id}`)
  const rider = (await getRider(params.id)) as Record<string, string | null> | null
  if (!rider) notFound()

  const v = (k: string) => (rider[k] as string | null) ?? ""
  const action = updateRider.bind(null, params.id)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Riders", href: "/riders" },
          { label: rider.name ?? "Rider", href: `/riders/${params.id}` },
          { label: "Edit" },
        ]}
        title={`Edit ${rider.name ?? "rider"}`}
        description="CMD-only. Update any field; leave a file blank to keep the current photo / ID proof."
        action={
          <Button variant="ghost" render={<Link href={`/riders/${params.id}`} />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <FormError message={searchParams.error} />

      <Card>
        <form action={action} encType="multipart/form-data" className="space-y-5 p-6">
          <Field label="Name" name="name" required defaultValue={v("name")} />
          <Field
            label="Phone (10 digits)"
            name="phone"
            required
            defaultValue={v("phone")}
            inputProps={{ pattern: "[0-9]{10}", inputMode: "numeric" }}
          />
          <Field
            label="Alternate number (optional)"
            name="alt_phone"
            defaultValue={v("alt_phone")}
            inputProps={{ pattern: "[0-9]{10}", inputMode: "numeric" }}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Source" name="source" required defaultValue={v("source")}>
              <option value="">Select source…</option>
              {riderSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </SelectField>
            <Field label="Rider ID" name="app_rider_id" hint="Mobile app rider ID (optional)" defaultValue={v("app_rider_id")} />
          </div>
          <Field label="Current location" name="current_location" required defaultValue={v("current_location")} />

          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Emergency contact
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <SelectField
                label="Relationship"
                name="emergency_contact_relationship"
                required
                defaultValue={v("emergency_contact_relationship")}
              >
                <option value="">Select…</option>
                {emergencyRelationships.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </SelectField>
              <Field label="Name" name="emergency_contact_name" required defaultValue={v("emergency_contact_name")} />
              <Field
                label="Number"
                name="emergency_contact_number"
                required
                defaultValue={v("emergency_contact_number")}
                inputProps={{ pattern: "[0-9]{10}", inputMode: "numeric" }}
              />
            </div>
          </div>

          <RiderPurposeFields
            defaultPurpose={v("purpose")}
            defaultStoreId={v("store_id")}
            defaultStoreLocation={v("store_location")}
            defaultPurposeOther={v("purpose_other")}
          />
          <TextareaField label="Notes" name="notes" defaultValue={v("notes")} />
          <div className="grid gap-5 sm:grid-cols-2">
            <FileField label="Replace photo" name="photo" accept="image/*" hint="≤ 400 KB · leave blank to keep current" />
            <FileField
              label="Replace ID proof"
              name="id_proof"
              accept="image/*,application/pdf"
              hint="≤ 1 MB · leave blank to keep current"
            />
          </div>
          <div className="flex items-center justify-end gap-3 border-t pt-5">
            <Button variant="ghost" render={<Link href={`/riders/${params.id}`} />}>Cancel</Button>
            <Button type="submit" size="lg">Save changes</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
