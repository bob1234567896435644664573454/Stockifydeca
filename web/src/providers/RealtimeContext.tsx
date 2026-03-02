import { createContext, useContext } from "react"

interface RealtimeContextType {
    isConnected: boolean
}

export const RealtimeContext = createContext<RealtimeContextType>({ isConnected: false })

export const useRealtime = () => useContext(RealtimeContext)
