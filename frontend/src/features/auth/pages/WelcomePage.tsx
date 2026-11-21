import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Gamepad2, Lightbulb, TrendingUp } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { UniverseArt } from './UniverseArt'
import styles from './WelcomePage.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
}

export default function WelcomePage() {
  const { t } = useTranslation()
  const pillars = [
    { icon: <Gamepad2 size={22} />, title: t('welcome.pillars.play'), body: t('welcome.pillars.playBody') },
    { icon: <Lightbulb size={22} />, title: t('welcome.pillars.learn'), body: t('welcome.pillars.learnBody') },
    { icon: <TrendingUp size={22} />, title: t('welcome.pillars.progress'), body: t('welcome.pillars.progressBody') },
  ]
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Logo size={30} />
        <ButtonLink to="/login" variant="ghost" size="sm">
          {t('auth.loginCta')}
        </ButtonLink>
      </header>
      <main className={styles.hero}>
        <div className={styles.copy}>
          <motion.p className={styles.eyebrow} variants={fadeUp} initial="hidden" animate="show" custom={0}>
            {t('welcome.eyebrow')}
          </motion.p>
          <motion.h1 className={styles.title} variants={fadeUp} initial="hidden" animate="show" custom={1}>
            <span className="gradient-text">{t('welcome.title')}</span>
          </motion.h1>
          <motion.p className={styles.subtitle} variants={fadeUp} initial="hidden" animate="show" custom={2}>
            {t('welcome.subtitle')}
          </motion.p>
          <motion.div className={styles.actions} variants={fadeUp} initial="hidden" animate="show" custom={3}>
            <ButtonLink to="/signup" variant="glow" size="lg" iconEnd={<ArrowRight size={20} aria-hidden="true" />}>
              {t('welcome.getStarted')}
            </ButtonLink>
            <ButtonLink to="/login" variant="secondary" size="lg">
              {t('welcome.login')}
            </ButtonLink>
          </motion.div>
        </div>
        <motion.div
          className={styles.art}
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <UniverseArt />
        </motion.div>
      </main>
      <ul className={styles.pillars}>
        {pillars.map((p, i) => (
          <motion.li key={p.title} className={styles.pillar} variants={fadeUp} initial="hidden" animate="show" custom={4 + i}>
            <span className={styles.pillarIcon} aria-hidden="true">
              {p.icon}
            </span>
            <div>
              <h2 className={styles.pillarTitle}>{p.title}</h2>
              <p className={styles.pillarBody}>{p.body}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
