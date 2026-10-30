import { useEffect, useState } from 'react'
import { data } from '@/data/store'

// Logged in? undefined while checking, then true/false. The login stays in the
// browser and is refreshed, so you stay logged in.
export function useSession() {
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    data.auth.signedIn().then(setSignedIn)
    return data.auth.onChange(setSignedIn)
  }, [])

  return signedIn
}
