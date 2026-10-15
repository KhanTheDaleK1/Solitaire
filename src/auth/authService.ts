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

export class AuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private currentUser: AuthUser | null = null;
  private authSubscribers: ((user: AuthUser | null) => void)[] = [];
  public isFirebaseConfigured: boolean = false;

  constructor() {
    this.initFirebase();
  }

  private initFirebase(): void {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

    // Check if real credentials are provided
    if (apiKey && apiKey !== 'your_firebase_api_key' && projectId) {
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
          } else {
            this.loadLocalGuest();
          }
          this.notifySubscribers();
        });
        return;
      } catch (err) {
        console.warn('Firebase init error, using guest mode:', err);
      }
    }

    // Default to Guest Mode
    this.isFirebaseConfigured = false;
    this.loadLocalGuest();
    this.notifySubscribers();
  }

  private loadLocalGuest(): void {
    const savedUser = localStorage.getItem('solitaire_guest_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }
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
      this.notifySubscribers();
      return this.currentUser;
    }

    // Simulation / local developer mode when keys are not yet entered
    const guestUser: AuthUser = {
      uid: 'google-demo-user',
      displayName: 'Demo Google Player',
      email: 'player@beechem.site',
      photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=google',
      provider: 'google'
    };
    localStorage.setItem('solitaire_guest_user', JSON.stringify(guestUser));
    this.currentUser = guestUser;
    this.notifySubscribers();
    return guestUser;
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
      this.notifySubscribers();
      return this.currentUser;
    }

    // Simulation / local developer mode when keys are not yet entered
    const githubUser: AuthUser = {
      uid: 'github-demo-user',
      displayName: 'KhanTheDaleK1 (Demo)',
      email: 'evan.t.beechem@gmail.com',
      photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=github',
      provider: 'github'
    };
    localStorage.setItem('solitaire_guest_user', JSON.stringify(githubUser));
    this.currentUser = githubUser;
    this.notifySubscribers();
    return githubUser;
  }

  public async signOut(): Promise<void> {
    if (this.isFirebaseConfigured && this.auth) {
      await signOut(this.auth);
    }
    localStorage.removeItem('solitaire_guest_user');
    this.currentUser = null;
    this.notifySubscribers();
  }
}
