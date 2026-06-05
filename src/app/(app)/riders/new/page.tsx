import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { findRiderByPhone } from "@/lib/db/riders"
import { riderCreateSchema, riderSources } from "@/lib/validation/rider"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import {
  Field,
  SelectField,
  TextareaField,
  FileField,
  FormError,
} from "@/components/ui/form-fields"

export const metadata = {
  title: "New rider · Transcil Fleet Ops",
}

async function createRider(formData: FormData) {
  "use server"

  const parsed = riderCreateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    source: formData.get("source"),
    app_rider_id: formData.get("app_rider_id") ?? "",
    current_location: formData.get("current_location") ?? "",
    alt_contact_name: formData.get("alt_contact_name") ?? "",
    alt_contact_number: formData.get("alt_contact_number") ?? "",
    purpose: formData.get("purpose") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ")
    redirect(`/riders/new?error=${encodeURIComponent(msg)}`)
  }
  const input = parsed.data

  const existing = await findRiderByPhone(input.phone)
  if (existing) {
    redirect(
      `/riders/new?error=${encodeURIComponent(
        `Phone already registered to ${existing.name}`
      )}&existing=${existing.id}`
    )
  }

  const supabase = createClient()
  const { data: user } = await supabase.auth.getUser()
  const userId = user.user?.id

  const photoFile = formData.get("photo") as File | null
  const idProofFile = formData.get("id_proof") as File | null

  let photoUrl: string | null = null
  let idProofUrl: string | null = null

  const riderId = crypto.randomUUID()

  if (photoFile && photoFile.size > 0) {
    const ext = photoFile.name.split(".").pop() ?? "jpg"
    const path = `${riderId}/photo.${ext}`
    const { error } = await supabase.storage
      .from("rider-photos")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type })
    if (!error) photoUrl = path
  }

  if (idProofFile && idProofFile.size > 0) {
    const ext = idProofFile.name.split(".").pop() ?? "jpg"
    const path = `${riderId}/id.${ext}`
    const { error } = await supabase.storage
      .from("rider-id-proofs")
      .upload(path, idProofFile, {
        upsert: true,
        contentType: idProofFile.type,
      })
    if (!error) idProofUrl = path
  }

  const { error: insertErr } = await supabase.from("riders").insert({
    id: riderId,
    name: input.name,
    phone: input.phone,
    source: input.source,
    app_rider_id: input.app_rider_id || null,
    current_location: input.current_location,
    alt_contact_name: input.alt_contact_name || null,
    alt_contact_number: input.alt_contact_number || null,
    purpose: input.purpose || null,
    address: input.address || null,
    notes: input.notes || null,
    photo_url: photoUrl,
    id_proof_url: idProofUrl,
    created_by: userId,
    updated_by: userId,
  })

  if (insertErr) {
    redirect(`/riders/new?error=${encodeURIComponent(insertErr.message)}`)
  }

  revalidatePath("/riders")
  redirect(`/riders/${riderId}`)
}

export default async function NewRiderPage({
  searchParams,
}: {
  searchParams: { error?: string; existing?: string }
}) {
  const error = searchParams.error

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Riders", href: "/riders" },
          { label: "New" },
        ]}
        title="New rider"
        description="Capture rider details. Photo and ID proof are optional for now."
        action={
          <Button variant="ghost" render={<Link href="/riders" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <FormError message={error} />
      {error && searchParams.existing ? (
        <div className="-mt-3 text-xs">
          <Link
            href={`/riders/${searchParams.existing}`}
            className="text-destructive underline"
          >
            Open existing profile →
          </Link>
        </div>
      ) : null}

      <Card>
        <form
          action={createRider}
          encType="multipart/form-data"
          className="space-y-5 p-6"
        >
          <Field label="Name" name="name" required />
          <Field
            label="Phone (10 digits)"
            name="phone"
            required
            inputProps={{
              pattern: "[0-9]{10}",
              inputMode: "numeric",
              placeholder: "9876543210",
            }}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Source" name="source" required>
              <option value="">Select source…</option>
              {riderSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
            <Field
              label="Rider ID"
              name="app_rider_id"
              hint="Mobile app rider ID (optional)"
            />
          </div>
          <Field label="Current location" name="current_location" required />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Alt contact name" name="alt_contact_name" />
            <Field
              label="Alt contact number"
              name="alt_contact_number"
              inputProps={{
                pattern: "[0-9]{10}",
                inputMode: "numeric",
                placeholder: "9876543210",
              }}
            />
          </div>
          <Field label="Purpose" name="purpose" />
          <Field label="Address" name="address" />
          <TextareaField label="Notes" name="notes" />
          <div className="grid gap-5 sm:grid-cols-2">
            <FileField label="Photo" name="photo" accept="image/*" hint="≤ 400 KB" />
            <FileField
              label="ID proof"
              name="id_proof"
              accept="image/*,application/pdf"
              hint="≤ 1 MB (image or PDF)"
            />
          </div>
          <div className="flex items-center justify-end gap-3 border-t pt-5">
            <Button variant="ghost" render={<Link href="/riders" />}>
              Cancel
            </Button>
            <Button type="submit" size="lg">
              Create rider
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
