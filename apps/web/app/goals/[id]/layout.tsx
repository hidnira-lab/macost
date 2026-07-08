// Static export: provide route params for pre-rendering
import goalsData from '@/mocks/goals.json'

export function generateStaticParams() {
  return goalsData.goals.map((g) => ({ id: g.id_goal }))
}

export default function GoalDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}