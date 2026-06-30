'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: 'dashboard' },
  { href: '/dashboard/queue', label: 'Approval Queue', icon: 'checklist' },
  { href: '/dashboard/activity', label: 'Activity Log', icon: 'history' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const path = usePathname();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined spinner-rotate text-primary text-4xl">autorenew</span>
      </div>
    );
  }
  if (!session) { redirect('/login'); }

  const initials = (session.user?.name ?? session.user?.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface-bright border-r border-outline-variant flex flex-col justify-between py-6 z-50">
        <div>
          {/* Brand */}
          <div className="px-6 mb-8 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              mail
            </span>
            <div>
              <h1 className="text-lg font-bold text-primary leading-none">InboxPilot</h1>
              <p className="text-[10px] text-on-surface-variant mt-0.5">AI Sales Autopilot</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="px-3 space-y-1">
            {NAV.map((n) => {
              const active = n.href === '/dashboard' ? path === n.href : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-secondary-container text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl ${active ? 'text-primary' : ''}`}>
                    {n.icon}
                  </span>
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: user + sign out */}
        <div className="px-3 space-y-2">
          <div className="px-4 py-3 flex items-center gap-3 bg-surface-container-low rounded-xl">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt="avatar"
                className="w-8 h-8 rounded-full border border-outline-variant object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed text-xs font-bold">
                {initials}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-on-surface truncate">
                {session.user?.name ?? 'User'}
              </p>
              <p className="text-[10px] text-on-surface-variant truncate">{session.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Top bar */}
      <header className="fixed top-0 left-[240px] right-0 h-16 bg-surface border-b border-outline-variant flex items-center justify-between px-8 z-40">
        <div className="relative max-w-md w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Search inquiries..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <Link href="/dashboard/settings" className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="ml-[240px] pt-16 flex-1 min-h-screen">
        <div className="p-8 max-w-[1280px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
