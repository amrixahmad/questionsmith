/*
<ai_context>
This server page has been deprecated. Redirect users to the dashboard.
</ai_context>
*/

"use server"

import { redirect } from "next/navigation"

export default async function TodoPage() {
  return redirect("/dashboard")
}
