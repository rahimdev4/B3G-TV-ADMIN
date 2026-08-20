export function UpdatedAt({ value }: { value?: string | null }) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return (
    <span className="updated-at">
      {" · Updated "}
      <time dateTime={date.toISOString()}>
        {new Intl.DateTimeFormat("en-PK", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Karachi",
        }).format(date)}
      </time>
      {" PKT"}
    </span>
  );
}
