/**
 * The battery_models id, on the card.
 *
 * Every card is also an anchor (`#row-20`), so a row can be linked to from a
 * commit message, an issue or a chat rather than described ("the 5.12kWh
 * wall-mount, third one down"). The scrapers, the migrations and the proposal
 * table all speak in these ids; until now the only screen that shows the rows
 * did not, which made every one of those references something to go and
 * decode by hand.
 */
export default function RowId({ id }: { id: number }) {
  return (
    <a
      href={`#row-${id}`}
      title={`battery_models row ${id} — link to this row`}
      className="text-xs font-mono text-zon-muted hover:text-zon-ink"
    >
      #{id}
    </a>
  )
}

