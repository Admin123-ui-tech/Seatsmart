import { redirect } from "next/navigation";

export default function LegacyLoginRoute() {
  redirect("/admin/login");
}

