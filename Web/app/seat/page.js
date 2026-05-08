import { redirect } from "next/navigation";

function toQueryString(searchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams || {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && String(item).trim() !== "") {
          query.append(key, String(item));
        }
      });
      continue;
    }
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

export default function SeatAliasPage({ searchParams }) {
  const qs = toQueryString(searchParams);
  redirect(qs ? `/student?${qs}` : "/student");
}
