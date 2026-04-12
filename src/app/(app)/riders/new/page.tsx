import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { listLocations } from "@/lib/db/hubs"
import { findRiderByPhone } from "@/lib/db/riders"
import { riderCreateSchema, riderSources } from "@/lib/validation/rider"

export const metadata = {
  title: "New rider · Transcil Fleet Ops",
}

async function createRider(formData: FormData) {
  "use server"

  const parsed = riderCreateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    source: formData.get("source"),
    location_id: formData.get("location_id"),
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ")
    redirect(`/riders/new?error=${encodeURIComponent(msg)}`)
  }
  const input = parsed.data

  // Surface duplicate phones with a friendly link instead of a raw
  // constraint violation.
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

  // File uploads (photo + id_proof). Kept small and simple for v1:
  // server-side only, no compression on the wire yet. Client-side
  // compression lands when Module 4 introduces photo capture.
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
    if (!error) {
      photoUrl = path
    }
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
    if (!error) {
      idProofUrl = path
    }
  }

  const { error: insertErr } = await supabase.from("riders").insert({
    id: riderId,
    name: input.name,
    phone: input.phone,
    source: input.source,
    location_id: input.location_id,
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
  const locations = await listLocations()
  const error = searchParams.error

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New rider</h1>
          <p className="text-sm text-muted-foreground">
            Capture rider details. Photo and ID proof are optional for now.
          </p>
        </div>
        <Link
          href="/riders"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to list
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          {searchParams.existing ? (
            <>
              {" · "}
              <Link
                href={`/riders/${searchParams.existing}`}
                className="underline"
              >
                Open existing profile
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <form
        action={createRider}
        encType="multipart/form-data"
        className="space-y-5 rounded-lg border bg-background p-6 shadow-sm"
      >
        <Field label="Name" name="name" required />
        <Field
          label="Phone (10 digits)"
          name="phone"
          required
          inputProps={{ pattern: "[0-9]{10}", inputMode: "numeric" }}
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
          <SelectField label="Location" name="location_id" required>
            <option value="">Select location…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </SelectField>
        </div>
        <Field label="Address" name="address" />
        <TextareaField label="Notes" name="notes" />
        <div className="grid gap-5 sm:grid-cols-2">
          <FileField label="Photo" name="photo" accept="image/*" />
          <FileField
            label="ID proof"
            name="id_proof"
            accept="image/*,application/pdf"
          />
        </div>
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            href="/riders"
            className="text-sm text-muted-foreground hover:underline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create rider
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  required,
  inputProps,
}: {
  label: string
  name: string
  required?: boolean
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        {...inputProps}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  )
}

function SelectField({
  label,
  name,
  required,
  children,
}: {
  label: string
  name: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </select>
    </div>
  )
}

function TextareaField({ label, name }: { label: string; name: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  )
}

function FileField({
  label,
  name,
  accept,
}: {
  label: string
  name: string
  accept?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="file"
        accept={accept}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium"
      />
    </div>
  )
}
