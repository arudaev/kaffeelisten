// Admin PIN entry screen
// PIN is validated server-side via /api/admin/verify-pin
// Never expose ADMIN_PIN in the client bundle

export default function AdminLogin() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">Administration</h1>
        <p className="text-stone-600">PIN eingeben</p>
      </div>
    </div>
  )
}
