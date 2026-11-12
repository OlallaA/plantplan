import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { languages, selectLanguage } from '../i18n.js'
import AppLink, { catalogHref, homeHref, seedBankHref, usePathname } from './AppLink.jsx'

export default function Header({ user, onSignOut }) {
  const { t, i18n } = useTranslation()
  const pathname = usePathname()
  return <header className="site-header">
    <div className="page-width flex flex-wrap items-center justify-between gap-3">
      <AppLink href={homeHref} className="brand" aria-label={t('header.home')}>
        <span className="brand-mark">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} width="43" height="43" alt="" />
        </span>
        <span>Plant<span className="brand-light">Plan</span></span>
      </AppLink>
      <div className="header-actions">
        <nav aria-label={t('header.mainNav')}>
          <AppLink className="header-catalog-link" href={catalogHref}
            aria-current={pathname === catalogHref ? 'page' : undefined}>{t('catalog.heading')}</AppLink>
        </nav>
        <select className="language-select" aria-label={t('header.language')} value={i18n.resolvedLanguage}
          onChange={(event) => selectLanguage(event.target.value)}>
          {Object.entries(languages).map(([code, label]) => <option key={code} value={code} lang={code}>{label}</option>)}
        </select>
        <UserMenu user={user} onSignOut={onSignOut} />
      </div>
    </div>
  </header>
}

export function UserMenu({ user, onSignOut }) {
  const { t } = useTranslation()
  const menu = useRef(null)
  function closeMenu() {
    menu.current.open = false
    menu.current.querySelector('summary').focus()
  }
  function closeWithEscape(event) {
    if (event.key === 'Escape' && menu.current.open) closeMenu()
  }
  return <details ref={menu} className="user-menu">
    <summary aria-label={t('header.userOptions')} onKeyDown={closeWithEscape}>
      <span className="user-avatar" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} width="25" height="25" alt="" />
      </span>
      <span className="user-menu-label">{t('header.mySpace')}</span><span className="chevron" aria-hidden="true">⌄</span>
    </summary>
    <nav className="user-menu-panel" aria-label={t('header.userAccount')}>
      <p>{user?.name || t('header.yourAccount')}</p>
      <ul>
        {user ? <li><button type="button" onKeyDown={closeWithEscape} onClick={() => { closeMenu(); onSignOut() }}>{t('header.signOut')}</button></li>
          : <li><AppLink href={seedBankHref} onClick={closeMenu} onKeyDown={closeWithEscape}>{t('auth.signIn')}</AppLink></li>}
      </ul>
    </nav>
  </details>
}
