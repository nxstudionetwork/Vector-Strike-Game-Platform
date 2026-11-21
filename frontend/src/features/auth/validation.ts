export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())

/** 0–4 heuristic score, used only to guide the learner. The server enforces real rules. */
export function passwordScore(pw: string): number {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  if (/^\d+$/.test(pw) || pw.length < 8) score = Math.min(score, 1)
  return Math.max(1, Math.min(score, 4))
}

export function ageFromDob(dob: string): number | null {
  const [y, m, d] = dob.split('-').map(Number)
  if (!y || !m || !d) return null
  const now = new Date()
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age
}
