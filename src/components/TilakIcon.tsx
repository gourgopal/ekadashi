export default function TilakIcon({
  size = 28,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* Urdhva Pundra — two vertical lines with U-bottom (lotus feet of the Lord) */}
      <path
        d="M16 8 C16 8 16 34 16 36 C16 39 18 42 24 42 C30 42 32 39 32 36 C32 34 32 8 32 8"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tulsi leaf or bindu between the lines */}
      <ellipse cx="24" cy="34" rx="3" ry="3.5" fill="currentColor" opacity="0.6" />
    </svg>
  )
}
