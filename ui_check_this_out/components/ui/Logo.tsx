export default function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#003739" />
      <path
        d="M8 20 Q12 10 16 16 Q20 22 24 12"
        stroke="#dce5df"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="16" cy="16" r="3" fill="#dce5df" />
    </svg>
  )
}
