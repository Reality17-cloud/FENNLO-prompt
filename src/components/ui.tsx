const paths = {
  arrow: "M4 8h12m-5-5 5 5-5 5",
  plus: "M8 3v10M3 8h10",
  copy: "M6 6h8v9H6zM3 11V2h8",
  check: "m3 8 3 3 7-7",
  close: "m4 4 8 8M12 4l-8 8",
  panel: "M2 3h12v10H2zM6 3v10",
  settings: "M3 4h10M3 8h10M3 12h10M6 2v4M10 6v4M6 10v4",
} as const;

export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className="icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LoadingIndicator() {
  return <span className="loading-indicator" aria-hidden="true" />;
}
