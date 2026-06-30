import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo';

const handler = NextAuth({
  providers: [
    // Demo login — works without any OAuth setup (judge-friendly)
    CredentialsProvider({
      name: 'Demo',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'demo@inboxpilot.dev' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        // Accept any email + the DEMO_PASSWORD (default: "demo")
        if (credentials.password !== DEMO_PASSWORD) return null;
        return { id: '1', name: 'Demo User', email: credentials.email };
      },
    }),

    // Real GitHub OAuth (optional — only works when CLIENT_ID/SECRET are set)
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID !== '...'
      ? [GithubProvider({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        })]
      : []),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session }) {
      return session;
    },
  },
});

export { handler as GET, handler as POST };
