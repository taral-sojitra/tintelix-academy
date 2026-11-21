/** Inline SVG bodies (24 × 24 view box), from the Caching prototype. Static, trusted markup. */
export const ICONS = {
  users: '<circle cx="9" cy="7.5" r="3.5" fill="currentColor" fill-opacity=".3"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0z" fill="currentColor" fill-opacity=".3"/><path d="M15.5 4.2a3.5 3.5 0 0 1 0 6.6"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  lb: '<rect x="8.5" y="2.5" width="7" height="5" rx="1.5" fill="currentColor" fill-opacity=".35"/><path d="M12 7.5v4M12 11.5H5.5v3M12 11.5h6.5v3M12 11.5v3"/><rect x="2.5" y="14.5" width="6" height="5" rx="1.5" fill="currentColor" fill-opacity=".3"/><rect x="9" y="14.5" width="6" height="5" rx="1.5" fill="currentColor" fill-opacity=".3"/><rect x="15.5" y="14.5" width="6" height="5" rx="1.5" fill="currentColor" fill-opacity=".3"/>',
  edge: '<circle cx="11" cy="11" r="7.5" fill="currentColor" fill-opacity=".3"/><path d="M3.5 11h15"/><path d="M11 3.5c2.2 2.1 3.2 4.6 3.2 7.5s-1 5.4-3.2 7.5"/><path d="M11 3.5C8.8 5.6 7.8 8.1 7.8 11s1 5.4 3.2 7.5"/><circle cx="18.5" cy="18.5" r="2.6" fill="currentColor"/>',
  origin: '<rect x="3" y="9.5" width="14.5" height="11" rx="2" fill="currentColor" fill-opacity=".3"/><path d="M6.5 13.5h.01M6.5 17h.01M10 13.5h4.5M10 17h4.5"/><path d="M19.5 9.5V2.5"/><path d="M19.5 3h2.5l-.8 1.6.8 1.6h-2.5" fill="currentColor" fill-opacity=".5"/>',
  stack: '<rect x="3" y="3" width="8" height="8" rx="1.6" fill="currentColor" fill-opacity=".3"/><rect x="13" y="3" width="8" height="8" rx="1.6" fill="currentColor" fill-opacity=".3"/><rect x="3" y="13" width="8" height="8" rx="1.6" fill="currentColor" fill-opacity=".3"/><rect x="13" y="13" width="8" height="8" rx="1.6" fill="currentColor" fill-opacity=".3"/>',
  bars: '<path d="M3 20.5h18"/><rect x="4.5" y="6" width="4" height="14.5" rx="1" fill="currentColor" fill-opacity=".3"/><rect x="10" y="13" width="4" height="7.5" rx="1" fill="currentColor" fill-opacity=".3"/><rect x="15.5" y="16.5" width="4" height="4" rx="1" fill="currentColor" fill-opacity=".3"/>',
  server: '<rect x="3" y="3.5" width="18" height="7.5" rx="2" fill="currentColor" fill-opacity=".3"/><rect x="3" y="13" width="18" height="7.5" rx="2" fill="currentColor" fill-opacity=".3"/><path d="M7 7.25h.01M7 16.75h.01M11 7.25h6M11 16.75h6"/>',
  bolt: '<path d="M13 2.5L4.5 13.5h7l-1 8 8.5-11h-7z"/>',
  db: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  activity: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5"/><path d="M9.5 2.5h5"/><path d="M18.4 7.1l1.6-1.6"/>',
  gauge: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4.2-4.8"/><circle cx="12" cy="17" r="1.3"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor"/>',
  pause: '<path d="M8.5 5v14"/><path d="M15.5 5v14"/>',
  replay: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v5h5"/>',
  alert: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/>',
  wrench: '<path d="M15 3.5a5 5 0 0 0-4.6 6.9L3.8 17a1.9 1.9 0 0 0 2.7 2.7l6.6-6.6A5 5 0 0 0 20 8.5l-3 3-3-1-1-3z"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>',
  list: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.6 2.6M15.8 15.8l2.6 2.6M5.6 18.4l2.6-2.6M15.8 8.2l2.6-2.6"/>',
  target: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.8.7 1 1.4 1 2.4h6c0-1 .2-1.7 1-2.4a6.5 6.5 0 0 0-4-11.6z"/>',
  arrowRight: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  learn: '<path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z"/><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z"/>',
  practice: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  lab: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M10 6.5h4.5a3 3 0 0 1 3 3V14"/>',
  sheet: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>',
  blocks: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  hourglass: '<path d="M6.5 3h11M6.5 21h11"/><path d="M7.5 3v2.5c0 3 4.5 4.5 4.5 6.5s-4.5 3.5-4.5 6.5V21"/><path d="M16.5 3v2.5c0 3-4.5 4.5-4.5 6.5s4.5 3.5 4.5 6.5V21"/>',
  shuffle: '<path d="M3 7h3.5c4 0 6 10 10 10H21"/><path d="M3 17h3.5c1.7 0 3-1.8 4.2-4"/><path d="M13.3 11c1.2-2.2 2.5-4 3.7-4H21"/><path d="M18 4l3 3-3 3"/><path d="M18 14l3 3-3 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
} as const;

export type IconName = keyof typeof ICONS;

/** A complete inline SVG element for an icon. */
export function iconSvg(name: IconName, cls = "tx-i"): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}
