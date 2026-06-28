import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useAdminAuth } from '../hooks/useAdminAuth'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut } = useClerk()
  const { user, isLoaded } = useUser()
  const { companyId, isSuperAdmin } = useAdminAuth()

  const [companyName, setCompanyName] = useState<string>('Admin')

  useEffect(() => {
    if (isLoaded && !user) {
      navigate('/login')
    }
  }, [isLoaded, user, navigate])

  useEffect(() => {
    if (isSuperAdmin || companyId === 3) {
      setCompanyName('Super Admin')
    } else if (companyId === 1) {
      setCompanyName('Mineazy Admin')
    } else if (companyId === 2) {
      setCompanyName('Farmeazy Admin')
    } else {
      setCompanyName('Admin')
    }
  }, [companyId, isSuperAdmin])

  const logout = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path: string) => {
    if (path === '/admin/products') {
      return location.pathname === '/admin/products' || location.pathname === '/admin/' || location.pathname === '/admin'
        ? 'text-blue-200 font-black underline underline-offset-4' 
        : 'text-white/80 hover:text-white'
    }
    return location.pathname === path 
      ? 'text-blue-200 font-black underline underline-offset-4' 
      : 'text-white/80 hover:text-white'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between px-4 py-3 gap-3">
          
          <div className="flex items-center justify-between w-full md:w-auto">
            <h1 className="text-xl font-black tracking-tight">{companyName} Dashboard</h1>
            <button 
              onClick={logout} 
              className="md:hidden bg-blue-900/60 hover:bg-blue-900 px-2.5 py-1.5 rounded-lg transition-colors text-[11px] font-bold tracking-wide uppercase"
            >
              🚪 Sign Out
            </button>
          </div>

          <div className="w-full md:w-auto overflow-x-auto whitespace-nowrap flex items-center gap-5 font-medium text-xs pb-2 md:pb-0 scrollbar-none border-t border-blue-700/40 pt-2 md:pt-0 md:border-0">
            <Link to="/admin/orders" className={`transition-colors flex-shrink-0 ${isActive('/admin/orders')}`}>📦 Orders</Link>
            <Link to="/admin/products" className={`transition-colors flex-shrink-0 ${isActive('/admin/products')}`}>📋 Products</Link>
            <Link to="/admin/logistics" className={`transition-colors flex-shrink-0 ${isActive('/admin/logistics')}`}>🚚 Logistics</Link>
            <Link to="/admin/upload" className={`transition-colors flex-shrink-0 ${isActive('/admin/upload')}`}>📤 Upload CSV</Link>
            <Link to="/admin/upload-images" className={`transition-colors flex-shrink-0 ${isActive('/admin/upload-images')}`}>🖼️ Bulk Images</Link>
            <Link to="/admin/users" className={`transition-colors flex-shrink-0 ${isActive('/admin/users')}`}>👥 Users</Link>
            
            <Link to="/" className="text-white/90 hover:text-white transition-colors border-l border-blue-700 pl-4 flex-shrink-0">
              🛍️ View Store
            </Link>
          </div>

          <button 
            onClick={logout} 
            className="hidden md:block bg-blue-900/50 hover:bg-blue-900 px-3 py-1.5 rounded-md transition-colors text-xs font-semibold"
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}