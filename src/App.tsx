import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import AdminOrders from './pages/admin/AdminOrders'
import AdminProducts from './pages/admin/AdminProducts' 
import AdminUpload from './pages/admin/AdminUpload'
import AdminUsers from './pages/admin/AdminUsers'
import BulkImageUpload from './pages/admin/BulkImageUpload' 
import toast, { Toaster } from 'react-hot-toast' 
import SuperConsole from './pages/SuperConsole'
import AdminLogistics from './pages/admin/AdminLogistics'
import PaymentSandbox from './components/PaymentSandbox'
import { useUser, useAuth } from '@clerk/clerk-react'

export default function App() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { isLoaded: authLoaded } = useAuth()
  
  const loading = !isLoaded || !authLoaded
  const session = isSignedIn
  
  // Check Clerk metadata for admin role
  const role = user?.publicMetadata?.role as string | undefined
  const isAdmin = role === 'admin' || role === 'mineazy_admin' || role === 'farmeazy_admin' || role === 'super_admin'

  // Removed Supabase Channels and Auth Listeners since we use Clerk now
  // ========================================================
  // ⭐ PERSISTENT TOAST DISPATCHER AFTER FORCE CACHE RESETS
  // ========================================================
  useEffect(() => {
    if (localStorage.getItem('show_promotion_toast') === 'true') {
      toast.success('🎉 You have been granted Administrative access!')
      localStorage.removeItem('show_promotion_toast')
    }

    if (localStorage.getItem('show_update_toast') === 'true') {
      toast.error('⚠️ Administrative clearance updated. Synchronized permissions successfully.')
      localStorage.removeItem('show_update_toast')
    }

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('access_revoked') === 'true') {
      toast.error('🔒 Your Administrative access has been revoked.')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-medium text-gray-600">Loading EazyHub...</div>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        reverseOrder={false} 
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'sans-serif',
            borderRadius: '14px',
            padding: '12px 16px',
            fontSize: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
          },
          success: {
            style: { background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', fontWeight: '700' },
            iconTheme: { primary: '#22c55e', secondary: '#ffffff' },
          },
          error: {
            style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fee2e2', fontWeight: '700' },
            iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
          },
        }}
      />

      <Routes>
        {/* Auth Entry Blocks - Only accessible if NOT logged in */}
        <Route path="/login/*" element={!session ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/signup/*" element={!session ? <Signup /> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ⭐ FULLY LOCKED DOWN STOREFRONT - Redirects to /login if no session */}
        <Route element={session ? <Layout isAdmin={isAdmin} /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment/sandbox/:orderId" element={<PaymentSandbox />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/profile/*" element={<Profile />} />
        </Route>

        {/* Administrative Storefront Control Modules */}
        <Route path="/admin" element={session && isAdmin ? <AdminLayout /> : <Navigate to="/" replace />}>
          <Route index element={<Navigate to="orders" />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/edit/:id" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProducts />} />
          <Route path="logistics" element={<AdminLogistics />} />
          <Route path="upload" element={<AdminUpload />} />
          <Route path="upload-images" element={<BulkImageUpload />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="super-console" element={<SuperConsole />} /> 
          <Route path="orders/:id" element={<OrderDetail />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}