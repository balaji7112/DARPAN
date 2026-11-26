export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="darpan-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38BDF8" />
          <stop offset="1" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0C1321" />
      <path d="M32 8 52 20v24L32 56 12 44V20Z" fill="none" stroke="url(#darpan-g)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M35 16 22 35h9l-3 13 14-20h-9z" fill="url(#darpan-g)" />
    </svg>
  );
}
