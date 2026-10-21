// Set completo de íconos vectoriales estilo Material Symbols Outlined / TRON HUD.
const PATHS = {
  check: "M4.5 10.5l3.5 3.5 7.5-8",
  plus: "M10 4v12M4 10h12",
  add_circle: "M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM10 6.75v6.5M6.75 10h6.5",
  edit: "M12.5 4.5l3 3L8 15H5v-3l7.5-7.5z",
  trash: "M4.5 6h11M8 6V4.5h4V6m-6 0l.6 9.5h6.8L14 6",
  calendar: "M4 6.5h12v9H4zM4 9h12M7.5 4.5v3M12.5 4.5v3",
  chevronLeft: "M12 5l-5 5 5 5",
  chevronRight: "M8 5l5 5-5 5",
  chevronDown: "M5.5 8l4.5 4.5L14.5 8",
  alert: "M10 6.5v4M10 13.5v.01M10 3l7.5 13h-15z",
  inbox: "M3.5 11l2-6.5h9l2 6.5M3.5 11v4.5h13V11M3.5 11H7l1 2h4l1-2h3.5",
  terminal: "M4 6l4 4-4 4M9.5 14H16M3 4h14v12H3z",
  person: "M10 9.5a3 3 0 100-6 3 3 0 000 6zM4.5 16.5a5.5 5.5 0 0111 0",
  grid_view: "M3.5 3.5h5.2v5.2H3.5zM11.3 3.5h5.2v5.2h-5.2zM3.5 11.3h5.2v5.2H3.5zM11.3 11.3h5.2v5.2h-5.2z",
  flag: "M4.5 3.5v13M4.5 4h9.5l-2 3.5 2 3.5H4.5",
  settings:
    "M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM16.2 11a1.4 1.4 0 00.3 1.5l.1.1a1.7 1.7 0 01-2.4 2.4l-.1-.1a1.4 1.4 0 00-1.5-.3 1.4 1.4 0 00-.9 1.3v.2a1.7 1.7 0 01-3.4 0V16a1.4 1.4 0 00-.9-1.3 1.4 1.4 0 00-1.5.3l-.1.1a1.7 1.7 0 01-2.4-2.4l.1-.1a1.4 1.4 0 00.3-1.5 1.4 1.4 0 00-1.3-.9H2.4a1.7 1.7 0 010-3.4h.2a1.4 1.4 0 001.3-.9 1.4 1.4 0 00-.3-1.5l-.1-.1a1.7 1.7 0 012.4-2.4l.1.1a1.4 1.4 0 001.5.3h.1a1.4 1.4 0 00.8-1.3v-.2a1.7 1.7 0 013.4 0v.2a1.4 1.4 0 00.8 1.3 1.4 1.4 0 001.5-.3l.1-.1a1.7 1.7 0 012.4 2.4l-.1.1a1.4 1.4 0 00-.3 1.5v.1a1.4 1.4 0 001.3.8h.2a1.7 1.7 0 010 3.4h-.2a1.4 1.4 0 00-1.3.8z",
  grid_4x4: "M3 7.5h14M3 12.5h14M7.5 3v14M12.5 3v14",
  refresh: "M15.5 8A6 6 0 104.8 13M15.5 4v4h-4",
  x: "M5.5 5.5l9 9M14.5 5.5l-9 9",
  layers: "M10 3.5l6.5 3.5L10 10.5 3.5 7zM3.5 10.5L10 14l6.5-3.5M3.5 13.5L10 17l6.5-3.5",
  search: "M9 15A6 6 0 109 3a6 6 0 000 12zM13.5 13.5L17 17",
  list: "M7 5.5h9.5M7 10h9.5M7 14.5h9.5M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01",
  board: "M3.5 4.5h3.5v11H3.5zM8.25 4.5h3.5v7.5h-3.5zM13 4.5h3.5v9.5H13z",
  sun: "M10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM10 2.5v1.5M10 16v1.5M4.7 4.7l1.1 1.1M14.2 14.2l1.1 1.1M2.5 10H4M16 10h1.5M4.7 15.3l1.1-1.1M14.2 5.8l1.1-1.1",
  moon: "M15.5 12.2A6 6 0 017.8 4.5a6 6 0 107.7 7.7z",
  sparkle: "M10 2.5l1.6 4.4L16 8.5l-4.4 1.6L10 14.5l-1.6-4.4L4 8.5l4.4-1.6L10 2.5z",
  clock: "M10 16.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM10 6.5V10l2.5 1.5",
  bolt: "M11 2.5L4.5 11H10l-1 6.5 6.5-8.5H10l1-6.5z",
  arrowRight: "M4.5 10h11M11 5.5L15.5 10 11 14.5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
