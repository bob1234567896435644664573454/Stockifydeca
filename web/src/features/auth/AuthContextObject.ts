import { createContext, useContext } from "react"
import type { Session, User } from "@supabase/supabase-js"

export interface AuthContextType {
    session: Session | null
    user: User | null
    role: string | null
    loading: boolean
    logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    loading: true,
    logout: async () => { },
})

export const useAuth = () => useContext(AuthContext)
