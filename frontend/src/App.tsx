import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <div className="flex gap-4 mb-8">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="w-24 h-24" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="w-24 h-24" alt="React logo" />
        </a>
      </div>

      <h1 className="text-4xl font-bold mb-4">Vite + React + Twind</h1>

      <div className="card p-6 bg-white rounded-lg shadow-md mb-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          onClick={() => setCount((count) => count + 1)}
        >
          count is {count}
        </button>
        <p className="mt-2 text-gray-600">
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <p className="text-gray-500">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}


export default App
