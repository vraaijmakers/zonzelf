import { redirect } from 'next/navigation'

// Battery review moved into the component catalogue on 2026-10-02, with panels
// and inverters (supabase/migrations/20261002000001_component_catalog_batteries.sql).
// battery_models is frozen, so this page would have shown a table nothing
// writes to any more — and approving a row here would have changed nothing a
// visitor sees. Old links and bookmarks land on the catalogue's battery view.
export default function AdminBatteriesPage() {
  redirect('/admin/catalog?category=battery')
}
