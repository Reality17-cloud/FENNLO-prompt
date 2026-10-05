const paths = {
  arrow: "M4 8h12m-5-5 5 5-5 5",
  plus: "M8 3v10M3 8h10",
  copy: "M6 6h8v9H6zM3 11V2h8",
  check: "m3 8 3 3 7-7",
  close: "m4 4 8 8M12 4l-8 8",
  panel: "M2 3h12v10H2zM6 3v10",
  settings: "M3 4h10M3 8h10M3 12h10M6 2v4M10 6v4M6 10v4",
  more: "M3 8h.01M8 8h.01M13 8h.01",
  person:
    "M10.5 5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM3 14v-1a5 5 0 0 1 10 0v1",
  archive: "M2 3h12v3H2zM3 6v8h10V6M6 9h4",
  edit: "m3 11 8-8 2 2-8 8H3v-2Z",
  conversation: "M2 3h12v9H6l-4 2V3Z",
} as const;

export function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className="icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth={name === "more" ? 3 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LoadingIndicator() {
  return <span className="loading-indicator" aria-hidden="true" />;
}
