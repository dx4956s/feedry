import type { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthState = {
  error: string | null;
  initialized: boolean;
  isBusy: boolean;
  session: Session | null;
  signInWithGoogle: () => Promise<'success' | 'cancelled' | 'error'>;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<'success' | 'invalid_credentials' | 'error'>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<'success' | 'error'>;
  status: AuthStatus;
  syncSession: (session: Session | null) => void;
  initialize: () => () => void;
  user: User | null;
};

function deriveStatus(session: Session | null): AuthStatus {
  return session ? 'authenticated' : 'unauthenticated';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}

function normalizeCredentials(email: string, password: string) {
  return {
    email: email.trim(),
    password,
  };
}

const googleRedirectUrl = 'feedry://auth/callback';

function getOAuthCallbackParams(url: string) {
  const normalizedUrl = url.replace('#', '?');
  const parsedUrl = new URL(normalizedUrl);

  return {
    accessToken: parsedUrl.searchParams.get('access_token'),
    code: parsedUrl.searchParams.get('code'),
    errorCode: parsedUrl.searchParams.get('error_code'),
    errorDescription: parsedUrl.searchParams.get('error_description'),
    refreshToken: parsedUrl.searchParams.get('refresh_token'),
  };
}

WebBrowser.maybeCompleteAuthSession();

export const useAuthStore = create<AuthState>((set) => ({
  error: null,
  initialized: false,
  isBusy: false,
  session: null,
  status: 'loading',
  user: null,
  syncSession: (session) =>
    set({
      error: null,
      initialized: true,
      session,
      status: deriveStatus(session),
      user: session?.user ?? null,
    }),
  initialize: () => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          set({
            error: 'Missing Supabase env vars.',
            initialized: true,
            session: null,
            status: 'unauthenticated',
            user: null,
          });
        }

        return;
      }

      set({ error: null, status: 'loading' });

      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        set({
          error: error.message,
          initialized: true,
          session: null,
          status: 'unauthenticated',
          user: null,
        });

        return;
      }

      set({
        error: null,
        initialized: true,
        session: data.session,
        status: deriveStatus(data.session),
        user: data.session?.user ?? null,
      });
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      set({
        error: null,
        initialized: true,
        session,
        status: deriveStatus(session),
        user: session?.user ?? null,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  },
  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      set({ error: 'Missing Supabase env vars.' });
      return 'error';
    }

    set({ error: null, isBusy: true });

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: googleRedirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('Unable to start Google sign-in.');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, googleRedirectUrl);

      if (result.type !== 'success') {
        return 'cancelled';
      }

      const { accessToken, code, errorCode, errorDescription, refreshToken } =
        getOAuthCallbackParams(result.url);

      if (errorCode) {
        throw new Error(errorDescription ?? errorCode);
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          throw exchangeError;
        }

        return 'success';
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        return 'success';
      }

      throw new Error('Google sign-in did not return a valid session.');
    } catch (error) {
      set({ error: getErrorMessage(error) });
      return 'error';
    } finally {
      set({ isBusy: false });
    }
  },
  signInWithEmail: async (email, password) => {
    if (!isSupabaseConfigured) {
      set({ error: 'Missing Supabase env vars.' });
      return 'error';
    }

    const credentials = normalizeCredentials(email, password);

    if (!credentials.email || !credentials.password) {
      set({ error: 'Email and password are required.' });
      return 'error';
    }

    set({ error: null, isBusy: true });

    try {
      const { error } = await supabase.auth.signInWithPassword(credentials);

      if (error) {
        if (error.message.toLowerCase() === 'invalid login credentials') {
          set({ error: null });
          return 'invalid_credentials';
        }

        throw error;
      }

      return 'success';
    } catch (error) {
      set({ error: getErrorMessage(error) });
      return 'error';
    } finally {
      set({ isBusy: false });
    }
  },
  signOut: async () => {
    set({ error: null, isBusy: true });

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      set({ error: getErrorMessage(error) });
    } finally {
      set({ isBusy: false });
    }
  },
  signUpWithEmail: async (email, password) => {
    if (!isSupabaseConfigured) {
      set({ error: 'Missing Supabase env vars.' });
      return 'error';
    }

    const credentials = normalizeCredentials(email, password);

    if (!credentials.email || !credentials.password) {
      set({ error: 'Email and password are required.' });
      return 'error';
    }

    if (credentials.password.length < 6) {
      set({ error: 'Password must be at least 6 characters.' });
      return 'error';
    }

    set({ error: null, isBusy: true });

    try {
      const { data, error } = await supabase.auth.signUp(credentials);

      if (error) {
        throw error;
      }

      if (!data.session) {
        set({
          error: 'Account created. Check your email for a confirmation link before signing in.',
        });
        return 'error';
      }

      return 'success';
    } catch (error) {
      set({ error: getErrorMessage(error) });
      return 'error';
    } finally {
      set({ isBusy: false });
    }
  },
}));
