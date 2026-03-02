import { useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/api"
import { AuthContext } from "./AuthContextObject"

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setRole(session?.user?.app_metadata?.role ?? null)
            setLoading(false)
        })

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            setRole(session?.user?.app_metadata?.role ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const logout = async () => {
        await supabase.auth.signOut()
    }

    return (
        <AuthContext.Provider value={{ session, user, role, loading, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

