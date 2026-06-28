import { UserProfile, useClerk } from '@clerk/clerk-react'
import { Link, useNavigate } from 'react-router-dom'

export default function Profile() {
  const { signOut } = useClerk()
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto pb-20 pt-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <Link to="/" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 transition-colors">
          <span className="text-xl">←</span> Back to Store
        </Link>
        <button onClick={() => signOut(() => navigate('/login'))} className="bg-red-50 text-red-600 font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition-colors">
          Sign Out
        </button>
      </div>
      <div className="flex justify-center">
        <UserProfile routing="path" path="/profile" />
      </div>
    </div>
  )
}