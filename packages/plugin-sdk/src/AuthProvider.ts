/**
 * AuthProvider Capability Interface
 * 
 * Allows plugins to provide authentication backends
 */

export interface Credentials {
  email: string;
  password: string;
}

export interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  expires: Date;
}

export interface AuthProvider {
  /** Unique provider identifier */
  id: string;

  /** Provider name */
  name: string;

  /** Sign in with credentials */
  signIn(credentials: Credentials): Promise<Session>;

  /** Sign out current user */
  signOut(): Promise<void>;

  /** Get current session */
  getSession(): Promise<Session | null>;

  /** Listen to auth state changes */
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}

