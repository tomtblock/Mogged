import { AppShell } from "@/components/app-shell";
import { BulkUploader } from "./bulk-uploader";

export default function AdminBulkUploadPage() {
  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-bold">Bulk Upload</h1>
      <p className="mb-6 text-sm text-neutral-gray">
        Upload a CSV with columns: name, profession, category, gender
        (optional), headshot_url, attribution, license.
      </p>
      <BulkUploader />
    </AppShell>
  );
}
