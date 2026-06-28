import { useUser } from '@clerk/clerk-react'

interface AdminData {
  isAdmin: boolean
  isSuperAdmin: boolean // 🌟 New flag for master access privileges
  role: string | null
  companyId: number | null 
  checking: boolean
}

export function useAdminAuth() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      role: null,
      companyId: null,
      checking: true,
    }
  }

  if (!user) {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      role: null,
      companyId: null,
      checking: false,
    }
  }

  // Assuming metadata is stored on the Clerk user:
  // user.publicMetadata.role
  // user.publicMetadata.company_id
  
  const role = (user.publicMetadata.role as string) || 'admin' // Defaulting to admin for local testing
  const companyId = (user.publicMetadata.company_id as number) || 3

  return {
    isAdmin: role === 'admin' || role === 'mineazy_admin' || role === 'farmeazy_admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
    role: role,
    companyId: companyId,
    checking: false,
  }
}