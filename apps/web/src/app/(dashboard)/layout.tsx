'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/queue', label: 'Approval Queue' },
  { href: '/dashboard/activity', label: 'Activity Log' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const path = usePathname();

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  if (!session) { redirect('/login'); }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-6 px-4 gap-1 fixed h-full">
        <div className="mb-6 px-2">
          <h1 className="text-lg font-bold text-brand">InboxPilot</h1>
          <p className="text-xs text-gray-400">AI Sales Autopilot</p>
        </div>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${path === n.href ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {n.label}
          </Link>
        ))}
        <div className="mt-auto">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-800"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  );
}
