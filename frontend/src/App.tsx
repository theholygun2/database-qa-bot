import { useEffect, useState } from 'react'

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - fixed or sticky */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          {/* Nav content */}
        </div>
      </header>

      {/* Main content - grows to fill space */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Your app content */}
      </main>

      {/* Footer - stays at bottom */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          {/* Footer content */}
        </div>
      </footer>
    </div>
  )
}

export default App
