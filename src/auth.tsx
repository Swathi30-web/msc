import { createContext, ReactNode, useContext, useState } from 'react';
import { api } from './api';
import type { User } from './types';

interface AuthCtx { user: User; login: (u: string, p: string) => Promise<void>; logout: () => void }
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const login = async (username: string, password: string) => {
    const r = await api.list<User>('users', { username, password });
    if (!r.length) throw new Error('Invalid username or password');
    localStorage.setItem('user', JSON.stringify(r[0]));
    setUser(r[0]);
  };
  const logout = () => { localStorage.removeItem('user'); setUser(null); };
  return <Ctx.Provider value={{ user: user as User, login, logout }}>{children}</Ctx.Provider>;
}
