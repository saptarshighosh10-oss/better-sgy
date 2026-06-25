import { cn } from '@/lib/utils'
import type { AssignmentStatus } from '@/lib/types'

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  normal:     'bg-muted text-muted-foreground',
  missing:    'bg-destructive/10 text-destructive dark:bg-destructive/20',
  late:       'bg-warning/20 text-warning-foreground dark:bg-warning/15',
  excused:    'bg-muted text-muted-foreground',
  submitted:  'bg-success/10 text-success dark:bg-success/20 dark:text-success',
  incomplete: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
}

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  normal:     'Graded',
  missing:    'Missing',
  late:       'Late',
  excused:    'Excused',
  submitted:  'Submitted',
  incomplete: 'Incomplete',
}

type Props = {
  status: AssignmentStatus
  className?: string
}

export function StatusChip({ status, className }: Props) {
  if (status === 'normal') return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
