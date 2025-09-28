/*
<ai_context>
This client page provides the signup form from Clerk.
</ai_context>
*/

"use client"

import { SignUp } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useSearchParams } from "next/navigation"
import { useMemo } from "react"
import { useTheme } from "next-themes"

export default function SignUpPage() {
  const { theme } = useTheme()
  const searchParams = useSearchParams()

  const redirectUrl = useMemo(() => {
    const plan = searchParams.get("plan")
    if (plan === "pro") {
      return "/pricing?plan=pro"
    }

    return "/todo"
  }, [searchParams])

  return (
    <SignUp
      forceRedirectUrl={redirectUrl}
      afterSignUpUrl={redirectUrl}
      appearance={{ baseTheme: theme === "dark" ? dark : undefined }}
    />
  )
}
