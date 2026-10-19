/**
 * Gemeinsame Identität der Demo-Lehrkraft.
 *
 * Wird vom Seed (legt Beispieldaten an) und vom Demo-Login (`GET /api/auth/demo`)
 * verwendet, damit beide dieselbe Lehrkraft nutzen. Beides ist nur außerhalb
 * von Produktion aktiv.
 */
export const DEMO_TEACHER = {
  googleId: 'demo-user',
  email: 'demo@klara.local',
  displayName: 'Demo Lehrkraft',
} as const;
