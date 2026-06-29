'use client';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand">InboxPilot</h1>
          <p className="text-gray-500 mt-1 text-sm">AI-powered sales autopilot for your inbox</p>
        </div>
        <button
          onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium hover:bg-gray-700 transition"
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
