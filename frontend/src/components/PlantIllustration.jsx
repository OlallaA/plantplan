import CatalogIcon, { hasCatalogIcon } from './CatalogIcon.jsx'

export default function PlantIllustration({ catalogIconId, species = 'basil', className = '' }) {
  const icon = catalogIconId ?? species
  if (hasCatalogIcon(icon)) return <CatalogIcon crop={icon} className={`plant-illustration ${className}`} />

  const stem = '#416847'
  return (
    <svg className={`plant-illustration ${className}`} viewBox="0 0 100 110" fill="none" aria-hidden="true" focusable="false">
      {species === 'radish' ? <>
        <path d="M49 57c-28-5-33 27-9 35l10 12 2-12c28-2 29-39-3-35Z" fill="#b85c5c" />
        <path d="m40 91 10 13 2-13" fill="#f0ddc5" />
        <path d="M49 60V24m0 22L29 30m20 8 19-18" stroke={stem} strokeWidth="4" strokeLinecap="round" />
        <path d="M48 40C32 36 31 16 43 12c13 5 16 15 5 28ZM36 46C15 50 12 30 18 26c15-1 22 8 18 20Zm20-6c-1-18 11-28 23-21 0 16-10 23-23 21Z" fill="#819b60" />
      </> : <>
        <ellipse cx="50" cy="99" rx="28" ry="4" fill="#405638" opacity=".13" />
        <path d="M49 96V25m0 45L25 52m24 2 24-18m-24 6L34 26" stroke={stem} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M47 69C21 81 12 62 15 50c18-4 31 5 32 19Zm5-13c-4-19 12-31 29-28 4 16-9 31-29 28ZM47 42C26 44 21 29 25 20c15-2 24 7 22 22Zm3-12C46 12 58 5 69 7c2 14-6 23-19 23Z" fill={species === 'basil' ? '#709367' : '#77965b'} />
        <path d="m22 57 18 10m18-19 15-11m-43-9 10 9" stroke="#476d48" strokeWidth="1.4" strokeLinecap="round" />
      </>}
    </svg>
  )
}

export function SproutMark({ className = '' }) {
  return <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <path d="M24 40V20m0 10C10 32 7 19 9 13c11-1 18 5 15 17Zm0-9C22 10 30 6 39 7c1 10-5 16-15 14Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
}

export function TaskIcon({ type, className = '' }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {type === 'watering' ? <><path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z" /><path d="M9 15c0 2 1 3 3 3" /></> : type === 'transplant' ? <><path d="m6 14 2 7h8l2-7H6Zm6 0V5m0 5c-6 1-7-5-6-7 5 0 7 3 6 7Zm0-3c0-5 4-6 7-5 0 4-2 6-7 5Z" /></> : <><path d="M5 18c0-8 5-12 14-12 0 9-4 13-12 13m-3 2 11-11" /></>}
  </svg>
}
