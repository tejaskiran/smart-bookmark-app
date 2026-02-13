# Smart Bookmark App

## Live Demo
https://smart-bookmark-app-self-theta.vercel.app/

## GitHub Repository
https://github.com/tejaskiran/smart-bookmark-app

## Problems Faced & Solutions

- **Google OAuth redirect issues on Vercel:** Login worked locally but failed after deployment. Fixed by updating Supabase Auth URL Configuration (Site URL + Redirect URLs) and adding the Vercel domain in Google Cloud OAuth settings.
- **Row Level Security blocking inserts/selects:** Bookmarks were not showing or saving due to RLS. Fixed by enabling RLS on the `bookmarks` table and adding policies for select/insert/delete based on `auth.uid() = user_id`.
- **Realtime not updating across tabs:** Realtime changes were not appearing instantly. Fixed by enabling Realtime for the `bookmarks` table in Supabase Replication and subscribing to `postgres_changes` events in the client.
- **UUID id type mismatch in UI:** The app originally assumed numeric IDs, but Supabase uses UUIDs. Fixed by using string IDs and updating delete + optimistic UI logic.

  

