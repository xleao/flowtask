// Íconos vectoriales (estilo Material Symbols Outlined): solo los que usa la interfaz.
const PATHS = {
  plus: "M10 4v12M4 10h12",
  add_circle: "M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM10 6.75v6.5M6.75 10h6.5",
  edit: "M12.5 4.5l3 3L8 15H5v-3l7.5-7.5z",
  trash: "M4.5 6h11M8 6V4.5h4V6m-6 0l.6 9.5h6.8L14 6",
  chevronLeft: "M12 5l-5 5 5 5",
  chevronRight: "M8 5l5 5-5 5",
  alert: "M10 6.5v4M10 13.5v.01M10 3l7.5 13h-15z",
  inbox: "M3.5 11l2-6.5h9l2 6.5M3.5 11v4.5h13V11M3.5 11H7l1 2h4l1-2h3.5",
  terminal: "M4 6l4 4-4 4M9.5 14H16M3 4h14v12H3z",
  person: "M10 9.5a3 3 0 100-6 3 3 0 000 6zM4.5 16.5a5.5 5.5 0 0111 0",
  grid_view: "M3.5 3.5h5.2v5.2H3.5zM11.3 3.5h5.2v5.2h-5.2zM3.5 11.3h5.2v5.2H3.5zM11.3 11.3h5.2v5.2h-5.2z",
  flag: "M4.5 3.5v13M4.5 4h9.5l-2 3.5 2 3.5H4.5",
  grid_4x4: "M3 7.5h14M3 12.5h14M7.5 3v14M12.5 3v14",
  refresh: "M15.5 8A6 6 0 104.8 13M15.5 4v4h-4",
  x: "M5.5 5.5l9 9M14.5 5.5l-9 9",
  layers: "M10 3.5l6.5 3.5L10 10.5 3.5 7zM3.5 10.5L10 14l6.5-3.5M3.5 13.5L10 17l6.5-3.5",
  search: "M9 15A6 6 0 109 3a6 6 0 000 12zM13.5 13.5L17 17",
  bolt: "M11 2.5L4.5 11H10l-1 6.5 6.5-8.5H10l1-6.5z",
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
