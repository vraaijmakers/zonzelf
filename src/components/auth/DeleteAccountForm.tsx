'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { deleteAccount } from '@/app/account/actions'

function Confirm() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? 'Deleting…' : 'Yes, delete my account'}
    </Button>
  )
}

/**
 * Two clicks, because the second one cannot be undone. No typed confirmation:
 * the account holds an email address and nothing a reader built.
 */
export default function DeleteAccountForm() {
  const [asking, setAsking] = useState(false)

  if (!asking) {
    return (
      <Button variant="outline" onClick={() => setAsking(true)}>
        Delete my account
      </Button>
    )
  }

  return (
    <form action={deleteAccount} className="space-y-3">
      <p className="text-sm text-zon-body">
        This removes your account straight away and cannot be undone. Are you sure?
      </p>
      <div className="flex flex-wrap gap-2">
        <Confirm />
        <Button type="button" variant="outline" onClick={() => setAsking(false)}>
          Keep my account
        </Button>
      </div>
    </form>
  )
}
