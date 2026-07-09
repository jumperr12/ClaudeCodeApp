// Inline SVG icon set (lucide-style, stroke = currentColor). Replaces emoji across the UI.
import type { CSSProperties } from 'react'

export type IconName =
  | 'folder'
  | 'chart'
  | 'history'
  | 'sparkles'
  | 'settings'
  | 'git'
  | 'check'
  | 'x'
  | 'alert'
  | 'arrowUp'
  | 'arrowDown'
  | 'refresh'
  | 'insert'
  | 'dot'
  | 'circle'
  | 'chevrons'
  | 'chevronDown'
  | 'gauge'
  | 'send'
  | 'copy'
  | 'help'
  | 'image'
  | 'file'
  | 'plus'

interface Props {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
  style?: CSSProperties
  title?: string
}

// Each entry is the inner SVG markup for a 24x24 viewBox.
const PATHS: Record<IconName, React.ReactNode> = {
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  chart: (
    <>
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="5" y="11" width="3.5" height="7" rx="0.5" />
      <rect x="10.25" y="7" width="3.5" height="11" rx="0.5" />
      <rect x="15.5" y="13" width="3.5" height="5" rx="0.5" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <polyline points="3 3 3 8 8 8" />
      <polyline points="12 7 12 12 15 14" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  git: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="9" r="2.5" />
      <path d="M18 11.5v.5a4 4 0 0 1-4 4H6" />
      <line x1="6" y1="8.5" x2="6" y2="15.5" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  arrowUp: (
    <>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="6 11 12 5 18 11" />
    </>
  ),
  arrowDown: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="18 13 12 19 6 13" />
    </>
  ),
  refresh: (
    <>
      <polyline points="21 3 21 9 15 9" />
      <path d="M21 9a9 9 0 1 0-2.6 6.4" />
    </>
  ),
  insert: (
    <>
      <polyline points="9 10 4 15 9 20" />
      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />,
  circle: <circle cx="12" cy="12" r="6" />,
  chevrons: (
    <>
      <polyline points="7 7 12 12 7 17" />
      <polyline points="13 7 18 12 13 17" />
    </>
  ),
  chevronDown: <polyline points="6 9 12 15 18 9" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.2a2.8 2.8 0 0 1 5.5.8c0 1.9-2.8 2-2.8 3.5" />
      <line x1="12" y1="17.5" x2="12.01" y2="17.5" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <line x1="12" y1="18" x2="15.5" y2="11.5" />
    </>
  ),
  send: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.6" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 3 14 8 19 8" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  )
}

export default function Icon({ name, size = 16, className, strokeWidth = 2, style, title }: Props): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  )
}

/** Claude "spark" mark — used as the app logo and the thinking spinner. */
export function Spark({ size = 16, className, style }: { size?: number; className?: string; style?: CSSProperties }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden>
      <path
        d="M12 1.5c.4 3.4 1.3 5.6 2.9 7.1 1.6 1.6 3.8 2.5 7.1 2.9-3.4.4-5.6 1.3-7.1 2.9-1.6 1.6-2.5 3.8-2.9 7.1-.4-3.4-1.3-5.6-2.9-7.1-1.6-1.6-3.8-2.5-7.1-2.9 3.4-.4 5.6-1.3 7.1-2.9C10.7 7.1 11.6 4.9 12 1.5z"
        fill="currentColor"
      />
    </svg>
  )
}
