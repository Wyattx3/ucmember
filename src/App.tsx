import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import CreateAccountModal from './components/CreateAccountModal'
import LoginModal from './components/LoginModal'
import { apiService } from './services/api'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [theme, setTheme] = useState('light')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [apiHealth, setApiHealth] = useState<{ formValidation: boolean; memberAuth: boolean; message: string } | null>(null)
  const [isLoadingHealth, setIsLoadingHealth] = useState(true)

  // Check API health and authentication status on app load
  useEffect(() => {
    const checkApiHealthAndAuth = async () => {
      try {
        // Check API health
        const health = await apiService.healthCheck()
        setApiHealth({
          formValidation: health.success || false,
          memberAuth: health.success || false,
          message: health.message || health.error || 'API status checked'
        })
        
        // Check if user is already authenticated
        const currentUser = apiService.getCurrentUser()
        const token = apiService.getAuthToken()
        
        if (currentUser && token) {
          // Verify token is still valid
          const verification = await apiService.verifyToken(token)
          
          if (verification.success && verification.user) {
            setUser(verification.user)
          } else {
            // Token invalid, clear storage
            apiService.logout()
          }
        }
      } catch (error) {
        console.error('Failed to check API health and auth:', error)
        setApiHealth({
          formValidation: false,
          memberAuth: false,
          message: `API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      } finally {
        setIsLoadingHealth(false)
      }
    }

    checkApiHealthAndAuth()
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleLoginSuccess = (userData: { email: string; name: string }) => {
    setUser(userData)
    setIsLoginModalOpen(false)
  }

  const handleLogout = () => {
    apiService.logout()
    setUser(null)
  }

  return (
    <div className="min-h-screen bg-base-100 text-base-content transition-all duration-300">
      {/* Header with Authentication and Theme Toggle */}
      <header className="navbar bg-primary text-primary-content">
        <div className="navbar-start">
          <h1 className="text-xl font-bold">Member Card System</h1>
        </div>
        <div className="navbar-center">
          {/* API Health Status */}
          {isLoadingHealth ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : apiHealth ? (
            <div className="flex items-center space-x-2">
              <div 
                className={`badge ${apiHealth.formValidation && apiHealth.memberAuth ? 'badge-success' : 'badge-warning'} cursor-pointer`}
                title={apiHealth.message}
              >
                {apiHealth.formValidation && apiHealth.memberAuth ? '🟢 API Healthy' : '🟡 API Issues'}
              </div>
            </div>
          ) : null}
        </div>
        <div className="navbar-end space-x-2">
          {/* User Authentication */}
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="text-sm">
                <div className="font-medium">{user.name}</div>
                <div className="text-xs opacity-70">{user.email}</div>
              </div>
              <button className="btn btn-sm btn-outline" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <button 
                className="btn btn-sm btn-outline" 
                onClick={() => setIsLoginModalOpen(true)}
              >
                Login
              </button>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => setIsModalOpen(true)}
              >
                Create Account
              </button>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-12">
        
        {/* Hero Section with Motion */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="hero bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg"
        >
          <div className="hero-content text-center py-12">
            <div className="max-w-md">
              <motion.h1 
                className="text-5xl font-bold"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                မင်္ဂလာပါ! 👋
              </motion.h1>
              <p className="py-6 text-lg">
                Welcome to our comprehensive UI library showcase featuring DaisyUI, Magic UI animations, Aceternity UI, and more!
              </p>
              <div className="flex gap-4 flex-wrap justify-center">
                <motion.button 
                  className="btn btn-primary btn-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCount(count + 1)}
                >
                  Count: {count} 🚀
                </motion.button>
                <motion.button 
                  className="btn btn-secondary btn-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalOpen(true)}
                >
                  Create Account ✨
                </motion.button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* DaisyUI Components Section */}
        <section className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">🌼 DaisyUI Components</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Buttons */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Buttons</h3>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary">Primary</button>
                  <button className="btn btn-secondary">Secondary</button>
                  <button className="btn btn-accent">Accent</button>
                  <button className="btn btn-warning">Warning</button>
                  <button className="btn btn-error">Error</button>
                  <button className="btn btn-success">Success</button>
                </div>
              </div>

              {/* Form Components */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Form Elements</h3>
                <input type="text" placeholder="Type here" className="input input-bordered w-full" />
                <select className="select select-bordered w-full">
                  <option disabled selected>Pick your favorite</option>
                  <option>React</option>
                  <option>Vue</option>
                  <option>Angular</option>
                </select>
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text">Remember me</span>
                    <input type="checkbox" className="checkbox checkbox-primary" />
                  </label>
                </div>
              </div>

              {/* Cards and Alerts */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Cards & Alerts</h3>
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>Info alert!</span>
                </div>
                <div className="card compact bg-base-100 shadow">
                  <div className="card-body">
                    <h2 className="card-title">Sample Card</h2>
                    <p>Beautiful DaisyUI card component</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Magic UI / Framer Motion Animations */}
        <section className="card bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">✨ Magic UI Animations</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Floating Cards */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Floating Cards</h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="card bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl"
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    >
                      <div className="card-body p-4">
                        <h3 className="font-semibold">Animated Card {i}</h3>
                        <p className="text-sm opacity-70">Hover to see the magic!</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Animated Progress */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Animated Progress</h3>
                <div className="space-y-4">
                  {[
                    { label: 'React', progress: 90, color: 'bg-blue-500' },
                    { label: 'TypeScript', progress: 85, color: 'bg-green-500' },
                    { label: 'Tailwind', progress: 95, color: 'bg-purple-500' }
                  ].map((skill, i) => (
                    <div key={skill.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{skill.label}</span>
                        <span className="text-sm">{skill.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          className={`h-2 rounded-full ${skill.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.progress}%` }}
                          transition={{ delay: i * 0.2, duration: 1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Aceternity UI Inspired Components */}
        <section className="card bg-black text-white shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">🌟 Aceternity UI Style</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Neon Cards */}
              <div>
                <h3 className="font-semibold text-lg mb-3 text-cyan-400">Neon Effects</h3>
                <motion.div 
                  className="border border-cyan-400 rounded-lg p-6 relative overflow-hidden group"
                  whileHover={{ boxShadow: "0 0 20px rgba(34, 211, 238, 0.6)" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <h3 className="text-xl font-bold text-cyan-400 relative z-10">Cyberpunk Card</h3>
                  <p className="text-gray-300 mt-2 relative z-10">
                    Experience the future of UI design with neon accents and cyberpunk aesthetics.
                  </p>
                  <motion.button 
                    className="btn border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black mt-4 relative z-10"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Explore
                  </motion.button>
                </motion.div>
              </div>

              {/* Glowing Text */}
              <div>
                <h3 className="font-semibold text-lg mb-3 text-purple-400">Glowing Text</h3>
                <div className="space-y-4">
                  <motion.h1 
                    className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400"
                    animate={{ 
                      textShadow: [
                        "0 0 10px rgba(34, 211, 238, 0.5)",
                        "0 0 20px rgba(168, 85, 247, 0.5)",
                        "0 0 10px rgba(34, 211, 238, 0.5)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    FUTURE
                  </motion.h1>
                  <motion.p 
                    className="text-gray-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Building tomorrow's interfaces today with cutting-edge design patterns.
                  </motion.p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="stats stats-vertical lg:stats-horizontal shadow bg-base-200 w-full">
          <div className="stat">
            <div className="stat-figure text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            </div>
            <div className="stat-title">DaisyUI Components</div>
            <div className="stat-value text-primary">50+</div>
            <div className="stat-desc">Ready to use</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div className="stat-title">Animations</div>
            <div className="stat-value text-secondary">100+</div>
            <div className="stat-desc">Smooth transitions</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4"></path></svg>
            </div>
            <div className="stat-title">Themes</div>
            <div className="stat-value text-accent">25+</div>
            <div className="stat-desc">Beautiful themes</div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer footer-center p-4 bg-base-300 text-base-content rounded">
          <div>
            <p>
              Built with ❤️ using React + TypeScript + Vite + Tailwind CSS + DaisyUI + Magic UI + Aceternity UI
            </p>
            <p className="text-sm opacity-70">
              Click the moon/sun icon to toggle between light and dark themes!
            </p>
          </div>
        </footer>
      </div>

            {/* Create Account Modal */}
      <CreateAccountModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}

export default App
