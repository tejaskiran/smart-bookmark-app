'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Bookmark = {
  id: string;
  title: string;
  url: string;
  user_id: string;
  created_at: string;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const fetchBookmarks = async (userId: string) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookmarks(data);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);

      if (session?.user) {
        fetchBookmarks(session.user.id);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchBookmarks(session.user.id);
        } else {
          setBookmarks([]);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setBookmarks((prev) => {
            if (prev.find((b) => b.id === payload.new.id)) return prev;
            return [payload.new as Bookmark, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setBookmarks((prev) =>
            prev.map((b) =>
              b.id === payload.new.id ? (payload.new as Bookmark) : b
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBookmarks([]);
  };

  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url || !user) return;

    setLoading(true);

    // optimistic UI temp id
    const tempId = `temp-${Date.now()}`;

    const newBookmark: Bookmark = {
      id: tempId,
      title,
      url,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };

    setBookmarks((prev) => [newBookmark, ...prev]);

    const { error, data } = await supabase
      .from('bookmarks')
      .insert([{ title, url, user_id: user.id }])
      .select()
      .single();

    setTitle('');
    setUrl('');

    if (error) {
      setBookmarks((prev) => prev.filter((b) => b.id !== tempId));
      console.error('Add error:', error);
      alert(`Error: ${error.message}`);
    } else if (data) {
      setBookmarks((prev) =>
        prev.map((b) => (b.id === tempId ? (data as Bookmark) : b))
      );
    }

    setLoading(false);
  };

  const deleteBookmark = async (id: string) => {
    // optimistic remove
    setBookmarks((prev) => prev.filter((b) => b.id !== id));

    const { error } = await supabase.from('bookmarks').delete().eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      if (user) {
        fetchBookmarks(user.id);
      }
      alert(`Delete failed: ${error.message}`);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      {!user ? (
        <button
          onClick={signInWithGoogle}
          className="px-6 py-3 bg-black text-white rounded-lg shadow hover:bg-gray-800"
        >
          Sign in with Google
        </button>
      ) : (
        <div className="w-full max-w-md bg-white p-6 rounded-xl shadow">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold">My Bookmarks</h1>
            <button
              onClick={handleSignOut}
              className="text-xs text-red-500 underline"
            >
              Sign Out
            </button>
          </div>

          <form onSubmit={addBookmark} className="flex flex-col gap-2 mb-4">
            <input
              type="text"
              placeholder="Bookmark title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
              className="p-2 border rounded disabled:opacity-50"
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={loading}
              className="p-2 border rounded disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : 'Add Bookmark'}
            </button>
          </form>

          {bookmarks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">
              No bookmarks yet. Add one above!
            </p>
          ) : (
            <ul className="space-y-2">
              {bookmarks.map((b) => (
                <li
                  key={b.id}
                  className="flex justify-between items-center border p-2 rounded hover:bg-gray-50"
                >
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm break-all hover:text-blue-800"
                    title={b.url}
                  >
                    {b.title}
                  </a>
                  <button
                    onClick={() => deleteBookmark(b.id)}
                    className="text-xs text-red-500 ml-2 hover:text-red-700 font-medium"
                    title="Delete"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
