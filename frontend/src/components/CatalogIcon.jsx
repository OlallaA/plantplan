const green = '#568054'
const leaf = '#87a166'

const crops = {
  potato: <><ellipse cx="13" cy="22" rx="9" ry="7" fill="#bd9162" transform="rotate(-28 13 22)" /><ellipse cx="25" cy="15" rx="8" ry="6" fill="#d7ad75" transform="rotate(25 25 15)" /><path d="M9 22h1m6 3h1m9-13h1m-5 4h1" stroke="#88613d" /></>,
  pepper: <><path d="M16 11c-7-4-12 2-9 10 2 7 7 12 11 8 5 3 10-3 11-11 1-8-5-11-11-7Z" fill="#c87159" /><path d="M18 12c0-4 2-6 5-7" stroke={green} fill="none" /></>,
  tomato: <><path d="M18 12C7 7 2 18 8 26c5 6 15 6 21 0 6-7 0-19-11-14Z" fill="#c96b50" /><path d="m18 6 1 6 8 1-6 2 1 4-5-4-5 3 1-4-5-2 8-1Z" fill={green} /></>,
  'green-bean': <><path d="M6 9c10 15 21 7 24 2 2 16-16 21-22 10C4 15 4 12 6 9Z" fill="#6d9155" /><path d="M8 16c5 9 15 9 20 1" fill="none" stroke="#adc184" /></>,
  onion: <><path d="M17 13C12 17 7 20 8 25c2 8 20 9 21 0 1-5-6-9-9-12Z" fill="#b77e7c" /><path d="M18 14V5m1 7 5-8m-8 9-4-5" fill="none" stroke={green} /><path d="M17 18c-5 6-4 10-1 12" fill="none" stroke="#e4b5a2" /></>,
  cabbage: <><circle cx="18" cy="20" r="12" fill="#789d79" /><path d="M18 31C5 22 12 13 18 10c7 4 11 13 0 21Z" fill="#a9bd8d" /><path d="M18 30V15m0 10-7-5m7 3 8-6" fill="none" stroke={green} /></>,
  lettuce: <><path d="M17 30C5 31 3 24 7 19c-4-7 4-10 7-8 0-8 10-7 10 0 6-1 9 6 5 9 6 7-1 12-12 10Z" fill="#7b9b5d" /><path d="M18 28C9 26 11 18 15 17c0-6 6-5 8 0 7 3 3 10-5 11Z" fill="#b5c588" /></>,
  garlic: <><path d="M17 10c-1 5-10 6-11 13-2 10 24 11 24 1 0-7-8-8-10-14Z" fill="#eee1c8" stroke="#bda58d" /><path d="M18 10V5m0 8c-7 8-6 13-2 17m4-17c6 6 7 13 2 17" fill="none" stroke="#b1997f" /></>,
  'turnip-greens': <><path d="M18 31V10m0 13-8-8m8 6 8-7" fill="none" stroke={green} /><path d="M11 18C4 17 4 8 7 6c6 1 8 6 4 12Zm8-4C15 9 19 3 23 4c3 5 0 8-4 10Zm5 5c-2-5 4-9 8-7 0 5-4 8-8 7Z" fill={leaf} /></>,
  collards: <><path d="M18 32c-2-9-14-9-13-17 1-8 8-8 12-4 1-8 10-7 13-1 6 10-8 13-12 22Z" fill="#64875e" /><path d="M18 31V11m0 13-8-8m8 5 8-7" fill="none" stroke="#c1ce98" /></>,
  'broad-bean': <><path d="M11 29C3 25 5 14 14 9c8-5 17-4 16 2-2 9-12 22-19 18Z" fill="#829b62" /><path d="M11 25 26 10" stroke="#d5ddb1" /><path d="M17 22c-5-4-2-9 3-6m3 0c-3-3-1-6 3-5" fill="none" stroke={green} /></>,
  pea: <><path d="M6 18c7-4 17 8 25-7-1 14-11 22-20 17-4-2-6-6-5-10Z" fill="#719a60" /><circle cx="12" cy="22" r="2.5" fill="#c5d69c" /><circle cx="18" cy="23" r="2.5" fill="#c5d69c" /><circle cx="24" cy="20" r="2.5" fill="#c5d69c" /></>,
  leek: <><path d="m15 31 1-15h6l-1 15Z" fill="#e8e3bd" /><path d="M17 19 10 6l5 2 4 9 2-13 4 1-2 13 6-8 3 2-10 9Z" fill="#6f9368" /><path d="m15 31-2 2m5-2v2m3-2 2 2" stroke="#aa997c" /></>,
  chard: <><path d="M18 28C10 26 5 19 7 12c0-6 9-8 13-5 8-3 14 3 11 10-2 5-6 8-13 11Z" fill="#688b66" /><path d="m17 32 5-21m-3 13-8-9m8 7 9-7" fill="none" stroke="#d7a0a0" /></>,
  carrot: <><path d="M11 16c-1-5 9-8 13-3 3 4-4 16-13 19-1-5-2-11 0-16Z" fill="#d99157" /><path d="m20 12 1-8m0 7 6-6m-6 7 9-1" fill="none" stroke={green} /><path d="m12 19 5 2m-5 3 3 2" stroke="#aa693a" /></>,
  zucchini: <><path d="M6 24c-1-6 12-11 20-15l5 5c-3 9-12 16-20 16-3 0-5-2-5-6Z" fill="#618351" /><path d="M10 25c6-2 14-6 18-12" fill="none" stroke="#a2b978" /><path d="m26 10 3-4 3 5-3 4" fill={leaf} /></>,
  pumpkin: <><path d="M17 13c-8-4-15 3-12 11 3 8 24 8 27-1 2-7-6-13-14-10Z" fill="#d99a55" /><path d="M17 13c-6 4-7 11-3 16m5-16c6 3 8 10 3 16" fill="none" stroke="#bd793c" /><path d="M18 14c-1-4 1-7 5-7" fill="none" stroke={green} /></>,
  cucumber: <><path d="M5 22C6 12 23 7 29 10c7 3-1 15-12 18C9 31 4 27 5 22Z" fill="#78935a" /><path d="M9 24c8-1 15-5 20-10" fill="none" stroke="#b5c68a" /><path d="M13 18h1m5 4h1m1-8h1m4 4h1" stroke="#496f4f" /></>,
  cauliflower: <><path d="M7 16c-3 9 3 15 11 16 8-1 14-7 11-16l-11 7Z" fill="#739467" /><path d="M9 23c-5-3-3-9 1-10 0-4 5-6 8-4 4-3 8 0 9 4 5 2 4 8 0 10-5 4-13 3-18 0Z" fill="#eee5cc" stroke="#b9b397" /></>,
  broccoli: <><path d="m14 31 2-13-6-3 8 2 8-3-5 5 1 12Z" fill="#82a265" /><path d="M8 19c-8-1-6-10 0-10 2-4 6-6 10-3 5-3 10 0 11 4 7 2 6 9 0 10Z" fill="#547b55" /><path d="M11 13h1m6-3h1m6 5h1" stroke="#8ba76b" /></>,
}

export function hasCatalogIcon(crop) {
  return Object.hasOwn(crops, crop)
}

export default function CatalogIcon({ crop, className = '' }) {
  return <svg className={`catalog-icon ${className}`} viewBox="0 0 36 36" strokeWidth="1.6"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {crops[crop]}
  </svg>
}
