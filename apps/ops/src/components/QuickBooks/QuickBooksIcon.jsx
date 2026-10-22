// components/QuickBooks/QuickBooksIcon.jsx — the small green mark from the old app.
export const QB_GREEN = "#2CA01C";

export default function QuickBooksIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill={QB_GREEN} />
      <path
        d="M16 6a10 10 0 100 20A10 10 0 0016 6zm0 3a7 7 0 110 14A7 7 0 0116 9zm-2 3v8l6-4-6-4z"
        fill="white"
      />
    </svg>
  );
}
