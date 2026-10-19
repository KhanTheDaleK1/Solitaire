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
  googleCallbackUrl?: string;
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

    if (
      apiKey &&
      apiKey !== 'your_firebase_api_key' &&
      projectId &&
      projectId !== 'solitaire-your-project' &&
      projectId !== 'solitare-your-project'
    ) {
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
        console.warn('Firebase init error, using direct backend OAuth:', err);
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
      // Fallback when offline
    }
    return {
      githubConfigured: false,
      googleConfigured: false,
      callbackUrl: `${window.location.origin}/api/auth/github/callback`,
      googleCallbackUrl: `${window.location.origin}/api/auth/google/callback`
    };
  }

  public async saveBackendCredentials(config: {
    githubClientId?: string;
    githubClientSecret?: string;
    googleClientId?: string;
    googleClientSecret?: string;
  }): Promise<boolean> {
    const res = await fetch('/api/auth/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json();
    return Boolean(data.success);
  }

  private openOAuthPopup(url: string, windowName: string): Promise<AuthUser> {
    return new Promise((resolve, reject) => {
      const width = 480;
      const height = 620;
      const left = Math.max(0, (window.screen.width - width) / 2);
      const top = Math.max(0, (window.screen.height - height) / 2);
      const popup = window.open(
        url,
        windowName,
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        // Fallback if popup is blocked on mobile PWA standalone mode
        window.location.href = url;
        return;
      }

      let resolved = false;
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'SOLITAIRE_AUTH_SUCCESS' && event.data.user) {
          resolved = true;
          clearInterval(checkInterval);
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
          if (!resolved) {
            this.loadSavedUser();
            if (this.currentUser) {
              this.notifySubscribers();
              resolve(this.currentUser);
            } else {
              reject(new Error('POPUP_CLOSED'));
            }
          }
        }
      }, 400);
    });
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

    return this.openOAuthPopup('/api/auth/google', 'solitaire_google_oauth');
  }

  public async signInGitHub(): Promise<AuthUser> {
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

    return this.openOAuthPopup('/api/auth/github', 'solitaire_github_oauth');
  }

  public async signInWithUsername(username: string): Promise<AuthUser> {
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed) throw new Error('Please enter a GitHub username.');

    try {
      const res = await fetch(`/api/auth/github/profile?username=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.currentUser = data.user;
          this.saveAuthUser(this.currentUser);
          this.notifySubscribers();
          return this.currentUser!;
        }
      }
    } catch {
      // Offline or direct fallback
    }

    // Direct GitHub public API fallback from browser
    try {
      const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(trimmed)}`);
      if (ghRes.ok) {
        const ghUser = await ghRes.json();
        this.currentUser = {
          uid: `gh_${ghUser.id || ghUser.login.toLowerCase()}`,
          displayName: ghUser.name || ghUser.login,
          email: ghUser.email || `${ghUser.login}@users.noreply.github.com`,
          photoURL: ghUser.avatar_url || `https://github.com/${encodeURIComponent(ghUser.login)}.png`,
          provider: 'github'
        };
        this.saveAuthUser(this.currentUser);
        this.notifySubscribers();
        return this.currentUser;
      }
    } catch {
      // Ignore network error
    }

    this.currentUser = {
      uid: `gh_${trimmed.toLowerCase()}`,
      displayName: trimmed,
      email: `${trimmed}@users.noreply.github.com`,
      photoURL: `https://github.com/${encodeURIComponent(trimmed)}.png`,
      provider: 'github'
    };
    this.saveAuthUser(this.currentUser);
    this.notifySubscribers();
    return this.currentUser;
  }

  public async signInWithGoogleProfile(email: string, name?: string): Promise<AuthUser> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid Google email address.');
    }

    try {
      const res = await fetch('/api/auth/google/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, name: name?.trim() || '' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.currentUser = data.user;
          this.saveAuthUser(this.currentUser);
          this.notifySubscribers();
          return this.currentUser!;
        }
      }
    } catch {
      // Offline fallback
    }

    const displayName = name?.trim() || cleanEmail.split('@')[0];
    this.currentUser = {
      uid: `google_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
      displayName,
      email: cleanEmail,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4285F4&color=fff&bold=true`,
      provider: 'google'
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
