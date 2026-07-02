import Icon from './Icon'

/**
 * Compact select where the chevron hugs the label (native selects float the
 * chevron at the element's right edge, which looks detached). A visible
 * label + chevron sit together; a transparent native <select> overlays them
 * to keep the real dropdown behavior and keyboard access.
 */
export default function InlineSelect({
  value,
  onChange,
  label,
  title,
  children,
  className
}: {
  value: string
  onChange: (value: string) => void
  /** Visible text/content next to the chevron. */
  label: React.ReactNode
  title?: string
  /** <option> / <optgroup> elements. */
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={`relative inline-flex items-center gap-1 cursor-pointer text-fg hover:text-accent ${className ?? ''}`}
      title={title}
    >
      <span className="whitespace-nowrap">{label}</span>
      <Icon name="chevronDown" size={11} className="shrink-0 opacity-70" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {children}
      </select>
    </div>
  )
}
