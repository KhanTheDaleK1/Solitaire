import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  User,
  Auth
} from 'firebase/auth';
import { AuthUser } from '../game/types';

export interface BackendAuthStatus {
  githubConfigured: boolean;
  googleConfigured: boolean;
  callbackUrl: string;
}

export class AuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private currentUser: AuthUser | null = null;
  private authSubscribers: ((user: AuthUser | null) => void)[] = [];
  public isFirebaseConfigured: boolean = false;

  constructor() {
    this.loadSavedUser();
    this.initFirebase();
    this.initOAuthMessageListener();
  }

  private loadSavedUser(): void {
    const raw = localStorage.getItem('solitaire_auth_user');
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw);
      } catch {
        this.currentUser = null;
      }
    }
  }

  private saveAuthUser(user: AuthUser | null): void {
    if (user) {
      localStorage.setItem('solitaire_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('solitaire_auth_user');
    }
  }

  private initOAuthMessageListener(): void {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'SOLITAIRE_AUTH_SUCCESS' && event.data.user) {
        this.currentUser = event.data.user;
        this.saveAuthUser(this.currentUser);
        this.notifySubscribers();
      }
    });
  }

  private initFirebase(): void {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    // Check if real Firebase credentials are provided
    if (apiKey && apiKey !== 'your_firebase_api_key' && projectId && projectId !== 'solitare-your-project') {
      try {
        const firebaseConfig = {
          apiKey,
          authDomain: authDomain || `${projectId}.firebaseapp.com`,
          projectId,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID
        };

        this.app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        this.auth = getAuth(this.app);
        this.isFirebaseConfigured = true;

        onAuthStateChanged(this.auth, (user: User | null) => {
          if (user) {
            const providerId = user.providerData[0]?.providerId || '';
            const provider: 'google' | 'github' | 'guest' = providerId.includes('github') ? 'github' : 'google';
            this.currentUser = {
              uid: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'Player',
              email: user.email,
              photoURL: user.photoURL,
              provider
            };
            this.saveAuthUser(this.currentUser);
          }
          this.notifySubscribers();
        });
        return;
      } catch (err) {
        console.warn('Firebase init error, using direct/guest mode:', err);
      }
    }

    this.isFirebaseConfigured = false;
    this.notifySubscribers();
  }

  public subscribe(callback: (user: AuthUser | null) => void): void {
    this.authSubscribers.push(callback);
    callback(this.currentUser);
  }

  private notifySubscribers(): void {
    for (const sub of this.authSubscribers) {
      sub(this.currentUser);
    }
  }

  public getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  public async getBackendStatus(): Promise<BackendAuthStatus> {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return {
      githubConfigured: false,
      googleConfigured: false,
      callbackUrl: `${window.location.origin}/api/auth/github/callback`
    };
  }

  public async saveBackendCredentials(clientId: string, clientSecret: string): Promise<boolean> {
    const res = await fetch('/api/auth/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        githubClientId: clientId,
        githubClientSecret: clientSecret
      })
    });
    const data = await res.json();
    return Boolean(data.success);
  }

  public async signInGoogle(): Promise<AuthUser> {
    if (this.isFirebaseConfigured && this.auth) {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;
      this.currentUser = {
        uid: user.uid,
        displayName: user.displayName || 'Google Player',
        email: user.email,
        photoURL: user.photoURL,
        provider: 'google'
      };
      this.saveAuthUser(this.currentUser);
      this.notifySubscribers();
      return this.currentUser;
    }

    throw new Error('Google Sign-In requires Firebase credentials to be configured in .env.');
  }

  public async signInGitHub(): Promise<AuthUser> {
    // 1. Try Firebase if explicitly configured
    if (this.isFirebaseConfigured && this.auth) {
      const provider = new GithubAuthProvider();
      provider.addScope('read:user');
      const result = await signInWithPopup(this.auth, provider);
      const user = result.user;
      this.currentUser = {
        uid: user.uid,
        displayName: user.displayName || 'GitHub Player',
        email: user.email,
        photoURL: user.photoURL,
        provider: 'github'
      };
      this.saveAuthUser(this.currentUser);
      this.notifySubscribers();
      return this.currentUser;
    }

    // 2. Direct server-side GitHub OAuth
    const status = await this.getBackendStatus();
    if (!status.githubConfigured) {
      throw new Error('CONFIG_NEEDED');
    }

    return new Promise((resolve, reject) => {
      const popup = window.open('/api/auth/github', 'solitaire_oauth', 'width=600,height=700,scrollbars=yes');
      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }

      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'SOLITAIRE_AUTH_SUCCESS' && event.data.user) {
          window.removeEventListener('message', handler);
          this.currentUser = event.data.user;
          this.saveAuthUser(this.currentUser);
          this.notifySubscribers();
          resolve(this.currentUser!);
        }
      };

      window.addEventListener('message', handler);

      const checkInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkInterval);
          window.removeEventListener('message', handler);
          if (this.currentUser) {
            resolve(this.currentUser);
          } else {
            reject(new Error('Sign-in cancelled or window closed.'));
          }
        }
      }, 500);
    });
  }

  public signInWithUsername(username: string): AuthUser {
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed) throw new Error('Please enter a username.');

    this.currentUser = {
      uid: `gh_${trimmed}`,
      displayName: trimmed,
      email: `${trimmed}@users.noreply.github.com`,
      photoURL: `https://github.com/${encodeURIComponent(trimmed)}.png`,
      provider: 'github'
    };
    this.saveAuthUser(this.currentUser);
    this.notifySubscribers();
    return this.currentUser;
  }

  public async signOut(): Promise<void> {
    if (this.isFirebaseConfigured && this.auth) {
      await signOut(this.auth);
    }
    this.saveAuthUser(null);
    this.currentUser = null;
    this.notifySubscribers();
  }
}
