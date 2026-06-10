'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { login } from './actions'

function LoginForm() {
  const params = useSearchParams()
  const from = params.get('from') ?? '/'
  const [state, formAction, pending] = useActionState(login, undefined)

  return (
    <form
      action={formAction}
      style={{
        width: '100%', maxWidth: 360,
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 14, padding: 28,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--color-accent)', color: 'var(--color-bg)',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
        }}>D</div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-text)' }}>
            Dash
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Cockpit privé</p>
        </div>
      </div>

      <input type="hidden" name="from" value={from} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="password" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          style={{
            padding: '10px 12px', borderRadius: 8,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)', fontSize: 14,
          }}
        />
      </div>

      {state?.error && (
        <p style={{ fontSize: 12, color: 'var(--color-error, #EF4444)' }}>{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          padding: '10px 16px', borderRadius: 8, border: 'none',
          background: 'var(--color-accent)', color: 'var(--color-bg)',
          fontSize: 14, fontWeight: 600, cursor: pending ? 'default' : 'pointer',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
