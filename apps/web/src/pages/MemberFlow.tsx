// Member-facing logging flow: company → member → item → confirm → success
// Design spec: docs/design-foundation.md (member-facing screens)

export default function MemberFlow() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-stone-900 mb-2">Kaffeelisten</h1>
        <p className="text-lg text-stone-600">Was hast du genommen?</p>
      </div>
    </div>
  )
}
