import { useContext } from 'react'
import { AuthContext } from './authContextCore'
import type { AuthContextType } from './authTypes'

// Re-exported hook to avoid Fast Refresh issues in the context file
export const useAuth = (): AuthContextType => {
    return useContext(AuthContext)
}
