import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { Card } from '@/components/ui/Surfaces'

/** Plain-language summaries. Final legal text is a launch requirement (flagged in the UI). */
export default function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t } = useTranslation()
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--sp-8) var(--gutter)', display: 'grid', gap: 'var(--sp-6)' }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <Logo size={28} />
      </Link>
      <h1 style={{ fontSize: 'var(--fs-3xl)' }}>{t(kind === 'terms' ? 'legal.termsTitle' : 'legal.privacyTitle')}</h1>
      <Card>
        <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>{t('legal.draftNotice')}</p>
        <p style={{ color: 'var(--text-muted)' }}>{t(kind === 'terms' ? 'legal.termsSummary' : 'legal.privacySummary')}</p>
      </Card>
    </main>
  )
}
