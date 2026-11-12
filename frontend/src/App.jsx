import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Header from './components/Header.jsx'
import { catalogHref, cropSheetPath, gardensHref, seedBankHref, seedbedHref, usePathname } from './components/AppLink.jsx'
import CatalogPage from './components/CatalogPage.jsx'
import Dashboard from './components/Dashboard.jsx'
import LoginForm from './components/LoginForm.jsx'
import SignedInContent from './components/SignedInContent.jsx'
import { readSession, storeSession } from './lib/api.js'

const pages = { [seedBankHref]: 'bank', [seedbedHref]: 'seedbed', [gardensHref]: 'gardens' }

export default function App() {
  const { t } = useTranslation()
  const [session, setSession] = useState(readSession)
  const activeSession = useRef(session)
  const [expired, setExpired] = useState(false)
  const pathname = usePathname()
  const page = pages[pathname]
  const showCatalog = pathname === catalogHref || pathname.startsWith(`${catalogHref}/`)
  const catalogId = pathname.slice(catalogHref.length + 1)
  const sheetId = pathname.startsWith(cropSheetPath) ? pathname.slice(cropSheetPath.length) : ''
  const showSheet = /^[1-9]\d*$/.test(sheetId)

  function signIn(nextSession) {
    activeSession.current = nextSession
    storeSession(nextSession)
    setSession(nextSession)
    setExpired(false)
  }

  const signOut = useCallback((sessionExpired = false, token) => {
    if (token && token !== activeSession.current?.token) return
    activeSession.current = null
    storeSession(null)
    setSession(null)
    setExpired(sessionExpired)
  }, [])

  return <>
    <a className="skip-link" href="#contenido">{t('page.skipToContent')}</a>
    <Header user={session?.user} onSignOut={signOut} />
    <main id="contenido" className="page-width" tabIndex={-1}>
      {showCatalog ? <CatalogPage catalogId={catalogId} session={session} onLogin={signIn} expired={expired}
        onSignOut={signOut} /> : session ? <SignedInContent key={session.token} token={session.token} page={page}
        sheetId={showSheet ? sheetId : null} onSignOut={signOut} />
        : (page || showSheet) ? <LoginForm onLogin={signIn} expired={expired}
          prompt={showSheet ? 'auth.sheetPrompt' : `auth.${page}Prompt`} /> : <Dashboard />}
    </main>
    <footer className="site-footer page-width">
      <span className="flex items-center gap-2">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} width="24" height="24" alt="" />
        PlantPlan
      </span>
    </footer>
  </>
}
