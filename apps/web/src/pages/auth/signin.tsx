import { getSession, signIn, signOut, useSession } from 'next-auth/react';
import React from 'react';

export default function SignInPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {session ? (
        <div>
          <p>Signed in as {session.user?.email}</p>
          <button className="btn mt-2" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            className="btn"
            onClick={() => signIn('google')}
          >
            Sign in with Google
          </button>
          <p className="text-sm text-gray-600">Use Google to sign in. Email provider/magic link can be added later.</p>
        </div>
      )}
    </div>
  );
}
