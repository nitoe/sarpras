import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logout } from '../lib/auth'
import { NAMA_PERAN } from '../lib/peran'
import { menuUntuk } from '../lib/menu'

export default function Layout() {
  const { profil, peran } = useAuth()
  const menu = menuUntuk(peran)

  const kelasLink = ({ isActive }: { isActive: boolean }) =>
    `flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-white/10 text-white' : 'text-muh-200 hover:bg-white/5 hover:text-white'
    }`

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col bg-muh-800 p-4 lg:flex lg:sticky lg:top-0 lg:h-screen xl:w-60 print:hidden">
        <div className="mb-6 flex items-center gap-3">
          <div className="auth-logo-tile">
            <img src="/logo-sdm.png" alt="" className="h-8 w-8 object-contain" />
          </div>
          <div className="leading-tight text-white">
            <div className="text-sm font-semibold">Sarpras</div>
            <div className="text-xs text-muh-200">SDM 01 Kukusan</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {menu.map((m) => (
            <NavLink key={m.path} to={m.path} end={m.path === '/'} className={kelasLink}>
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-3 text-sm">
          <div className="truncate font-medium text-white">{profil?.nama}</div>
          <div className="text-xs text-muh-200">{peran ? NAMA_PERAN[peran] : ''}</div>
          <button onClick={() => void logout()} className="mt-2 text-xs font-medium text-muh-200 hover:text-white">
            Keluar
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between bg-muh-800 px-4 py-3 lg:hidden print:hidden">
        <div className="flex items-center gap-2.5 text-white">
          <div className="auth-logo-tile auth-logo-tile--light" style={{ height: '2rem', width: '2rem' }}>
            <img src="/logo-sdm.png" alt="" className="h-6 w-6 object-contain" />
          </div>
          <span className="text-sm font-semibold">Sarpras</span>
        </div>
        <button onClick={() => void logout()} className="text-xs font-medium text-muh-200">
          Keluar
        </button>
      </header>

      {/* Konten mengisi sisa lebar penuh (tidak ada max-width di sini) */}
      <main className="min-w-0 flex-1 p-4 pb-28 sm:p-5 lg:p-6 lg:pb-6 print:p-0">
        <Outlet />
      </main>

      {menu.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">
          <div className="flex overflow-x-auto">
            {menu.map((m) => (
              <NavLink
                key={m.path}
                to={m.path}
                end={m.path === '/'}
                className={({ isActive }) =>
                  `flex min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center text-[0.6875rem] font-medium leading-tight ${
                    isActive ? 'bg-muh-50 text-muh-600' : 'text-muted'
                  }`
                }
              >
                {m.labelPendek ?? m.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
