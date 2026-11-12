import { useSyncExternalStore } from 'react'

export const homeHref = import.meta.env.BASE_URL
export const seedBankHref = `${homeHref}sementes`
export const seedbedHref = `${homeHref}sementeiro`
export const gardensHref = `${homeHref}hortas`
export const catalogHref = `${homeHref}que-plantar`
export const seedbedEntryId = 'engadir-plantel'
export const gardenEntryId = 'engadir-planta'
export const cropSheetPath = `${homeHref}fichas/`

function subscribe(callback) {
  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}

function pathname() {
  return window.location.pathname.replace(/\/$/, '')
}

export function usePathname() {
  return useSyncExternalStore(subscribe, pathname)
}

export default function AppLink({ href, onClick, children, ...props }) {
  function follow(event) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    onClick?.(event)
    if (event.defaultPrevented) return
    event.preventDefault()
    const target = new URL(href, window.location.href)
    if (target.href !== window.location.href) {
      window.history.pushState(null, '', target)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    requestAnimationFrame(() => {
      const section = document.getElementById(target.hash.slice(1))
      const content = document.getElementById('contenido')
      if (section) {
        section.focus()
        section.scrollIntoView()
      } else {
        content.focus()
        window.scrollTo(0, 0)
      }
    })
  }

  return <a {...props} href={href} onClick={follow}>{children}</a>
}
