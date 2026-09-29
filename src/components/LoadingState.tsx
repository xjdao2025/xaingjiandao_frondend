import { Spinner } from '@astryxdesign/core/Spinner'

export function LoadingState({ label, className = 'loading-line' }: { label: string; className?: string }) {
  return <div className={className}><Spinner size="lg" label={label} /></div>
}
