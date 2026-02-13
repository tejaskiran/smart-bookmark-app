'use client';

import { supabase } from '@/lib/supabaseClient';


export default function Home() {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <button
        onClick={signInWithGoogle}
        className="px-6 py-3 bg-black text-white rounded"
      >
        Sign in with Google
      </button>
    </main>
  );
}
