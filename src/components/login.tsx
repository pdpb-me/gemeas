import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { data } from '@/data/store'

const CODE_LENGTH = 8 // must match Supabase: Auth > Sign In / Providers > Email > Email OTP Length
const EMAIL_KEY = 'gemeas:last-email'

function rememberedEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

// Two steps: type your email -> get a code by email (CODE_LENGTH digits) -> type the code.
export function Login() {
  const [email, setEmail] = useState(rememberedEmail)
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setBusy(true)
    const error = await data.auth.sendCode(email.trim()).then(() => null, (e: Error) => e)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    try {
      localStorage.setItem(EMAIL_KEY, email.trim())
    } catch {
      // Not important: it only pre-fills the email next time
    }
    setCode('')
    setStep('code')
    toast.success('Codice inviato. Controlla la tua email.')
  }

  async function verify(token: string) {
    setBusy(true)
    const error = await data.auth.verify(email.trim(), token).then(() => null, (e: Error) => e)
    setBusy(false)
    if (error) {
      toast.error(error.message)
      setCode('')
    }
    // On success, useSession() sees the new session and the app switches screens
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" className="mb-2 size-12 rounded-xl" />
          <CardTitle className="text-2xl">Gemeas</CardTitle>
          <CardDescription>
            {step === 'email'
              ? 'Accedi con un codice inviato alla tua email.'
              : `Inserisci il codice di ${CODE_LENGTH} cifre inviato a ${email.trim()}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={sendCode} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" size="lg" className="h-11" disabled={busy}>
                {busy ? 'Invio…' : 'Invia il codice'}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <InputOTP
                maxLength={CODE_LENGTH}
                value={code}
                onChange={setCode}
                onComplete={verify}
                disabled={busy}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
              >
                <InputOTPGroup>
                  {Array.from({ length: CODE_LENGTH }, (_, i) => (
                    <InputOTPSlot key={i} index={i} className="h-11 w-9 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <div className="flex w-full justify-between">
                <Button variant="ghost" onClick={() => setStep('email')} disabled={busy}>
                  Cambia email
                </Button>
                <Button variant="ghost" onClick={() => sendCode()} disabled={busy}>
                  Invia un nuovo codice
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <a href={`${import.meta.env.BASE_URL}demo/`} className="mt-6 self-center p-3 text-sm text-muted-foreground underline-offset-4 hover:underline">
        Vuoi solo dare un’occhiata? Apri la demo, con dati inventati
      </a>
    </main>
  )
}
