import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function PasswordField({ value, onChange, placeholder, id }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-field">
      <input
        id={id}
        className="auth-input"
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 3l18 18M9.9 9.9a3 3 0 014.2 4.2M7.1 7.3C5 8.7 3.6 10.6 3 12c1.2 2.7 4.7 6 9 6 1.5 0 2.9-.4 4.1-1m2.8-2.6c.7-.9 1.2-1.8 1.6-2.7-1.2-2.7-4.7-6-9-6-.7 0-1.4.1-2 .2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 12c1.2 2.7 4.7 6 9 6s7.8-3.3 9-6c-1.2-2.7-4.7-6-9-6S4.2 9.3 3 12z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </button>
    </div>
  )
}

function HomeScreen({ user }) {
  const displayName = user?.user_metadata?.full_name || user?.email || 'Player'

  return (
    <div className="home-screen">
      <div className="home-welcome">Welcome, {displayName}</div>
      <div className="home-banner">
        <span className="home-banner-text">Planify: Your personal to do space</span>
        <span className="home-cursor">|</span>
      </div>
      <div className="home-options">
        <a className="home-btn" href="/legacy/cottage/cottage.html">picnic</a>
        <a className="home-btn" href="/legacy/study/study.html">study</a>
        <a className="home-btn" href="/legacy/tokyo/tokyo.html">tokyo</a>
        <a className="home-btn" href="/legacy/rain/rain.html">rain</a>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [todos, setTodos] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('home')
  const [filter, setFilter] = useState('all') // 'all', 'completed', 'incomplete'
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [operatingIds, setOperatingIds] = useState(new Set()) // Track which items are being operated on
  

  // Auth form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  // Get current user + listen for changes
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
        fetchTodos(data.user)
        setView('home')
      }
    }
    init()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          fetchTodos(u)
          setView('home')
        } else {
          setTodos([])
          setView('login')
        }
      }
    )

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function fetchTodos(userArg) {
    setLoading(true)
    // RLS (Row Level Security) is enabled on Supabase.
    // This query will only return rows where user_id matches the authenticated user.
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userArg.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
    } else {
      setTodos(data)
    }
    setLoading(false)
  }
  // ---------- AUTH ----------

  async function handleLogin(e) {
    e.preventDefault()
    const email = loginEmail.trim()
    const password = loginPassword

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Common Supabase error when email confirmation is required
      if (error.message.toLowerCase().includes('email not confirmed')) {
        // Try to resend the confirmation email to unblock the user
        await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: window.location.origin },
        })
        alert(
          'Please confirm your email from the inbox link we just re-sent, then try logging in again.'
        )
        return
      }

      alert(error.message)
      return
    }

    setUser(data.user)
    setView('home')
  }

  async function handleSignup(e) {
    e.preventDefault()
    const name = signupName.trim()
    const email = signupEmail.trim()
    const password = signupPassword
    const confirm = signupConfirmPassword

    if (!name) {
      alert('Please enter your name.')
      return
    }

    if (password !== confirm) {
      alert('Passwords do not match.')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    })

    if (error) {
      alert(error.message)
      return
    }

    // If your Supabase project requires email confirmation, session will be null
    if (!data.session) {
      alert('Sign up successful! Check your email to confirm, then log in.')
      setAuthMode('login')
      setLoginEmail(email)
      return
    }

    setUser(data.user)
    setView('home')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setTodos([])
  }

  // ---------- TODOS ----------

  // Dev helper: fetch all todos (bypasses client-side user filtering) for diagnosis
  

  async function handleAddTodo(e) {
    e.preventDefault()
    if (!newTitle.trim() || !user || loading) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ title: newTitle.trim(), completed: false, user_id: user.id }])
        .select()
        .single()

      if (error) {
        console.error(error)
        alert('Error adding todo')
      } else {
        setTodos((prev) => [...prev, data])
        setNewTitle('')
      }
    } catch (err) {
      console.error(err)
      alert('Network error while adding todo')
    } finally {
      setLoading(false)
    }
  }

  async function toggleTodo(todo) {
    setOperatingIds(prev => new Set([...prev, todo.id]))
    try {
      const { data, error } = await supabase
        .from('todos')
        .update({ completed: !todo.completed })
        .eq('id', todo.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error(error)
        alert('Error updating todo')
      } else {
        setTodos(prev => prev.map(t => (t.id === todo.id ? data : t)))
      }
    } catch (err) {
      console.error(err)
      alert('Network error while updating todo')
    } finally {
      setOperatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(todo.id)
        return newSet
      })
    }
  }

  async function deleteTodo(todo) {
    setOperatingIds(prev => new Set([...prev, todo.id]))
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todo.id)
        .eq('user_id', user.id)

      if (error) {
        console.error(error)
        alert('Error deleting todo')
      } else {
        setTodos(prev => prev.filter(t => t.id !== todo.id))
      }
    } catch (err) {
      console.error(err)
      alert('Network error while deleting todo')
    } finally {
      setOperatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(todo.id)
        return newSet
      })
    }
  }

  function startEdit(todo) {
    setEditingId(todo.id)
    setEditingText(todo.title)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingText('')
  }

  async function saveEdit(todo) {
    if (!editingText.trim()) {
      cancelEdit()
      return
    }

    setOperatingIds(prev => new Set([...prev, todo.id]))
    try {
      const { data, error } = await supabase
        .from('todos')
        .update({ title: editingText.trim() })
        .eq('id', todo.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error(error)
        alert('Error updating todo')
      } else {
        setTodos(prev => prev.map(t => (t.id === todo.id ? data : t)))
        cancelEdit()
      }
    } catch (err) {
      console.error(err)
      alert('Network error while saving todo')
    } finally {
      setOperatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(todo.id)
        return newSet
      })
    }
  }

  // Filter todos based on current filter
  const filteredTodos = todos.filter(todo => {
    if (filter === 'completed') return todo.completed
    if (filter === 'incomplete') return !todo.completed
    return true // 'all'
  })

  // ---------- UI ----------

  // 1) NOT LOGGED IN → arcade CRT login
  if (!user) {
    return (
      <div className="screen--login">
        <div className="crt">
          <div className="crt-inner">
            <div className="crt-scanlines" />

            <header className="crt-header">
              <span className="crt-player">PLAYER 1</span>
              <span className="crt-title">PLANIFY</span>
              <span className="crt-player">PLAYER 2</span>
            </header>

            <div className="crt-body">
              <p className="crt-label">SELECT MODE</p>

              <div className="mode-options">
                <button
                  type="button"
                  className={
                    'mode-option' +
                    (authMode === 'login' ? ' mode-option--active' : '')
                  }
                  onClick={() => setAuthMode('login')}
                >
                  LOGIN
                </button>

                <button
                  type="button"
                  className={
                    'mode-option' +
                    (authMode === 'signup' ? ' mode-option--active' : '')
                  }
                  onClick={() => setAuthMode('signup')}
                >
                  SIGN&nbsp;UP
                </button>
              </div>

              {authMode === 'login' ? (
                <form className="auth-form" onSubmit={handleLogin}>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                  <PasswordField
                    id="login-password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <button className="auth-btn" type="submit">
                    PRESS START
                  </button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleSignup}>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="Email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                  <PasswordField
                    id="signup-password"
                    placeholder="Password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                  <PasswordField
                    id="signup-confirm-password"
                    placeholder="Confirm Password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  />
                  <button className="auth-btn" type="submit">
                    CREATE PLAYER
                  </button>
                </form>
              )}

              <p className="crt-footer">▲ ▼ to switch · START to enter</p>
            </div>
          </div>
        </div>
      </div>
    )
  }


  if (view === 'home') {
    return (
      <div className="home-wrapper">
        <div className="home-topbar">
          <button className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
        <HomeScreen user={user} />
      </div>
    )
  }

  return (
    <div className="app-main">
      <header className="app-main-header">
        <div>
          <h1>TODO ARCADE</h1>
          <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            Logged in as {user.email}
          </p>
        </div>
        <div className="app-main-actions">
          <button className="logout-btn" onClick={() => setView('home')}>
            Home
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Log out
          </button>
          
        </div>
      </header>

      <section className="todo-card">
        <form className="todo-form" onSubmit={handleAddTodo}>
          <input
            className="neon-input"
            type="text"
            placeholder="Type a new quest and press Enter…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="neon-btn" disabled={loading}>
            Add Task
          </button>
        </form>

        {/* Filter Buttons */}
        <div className="todo-filters">
          <button
            type="button"
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
          <button
            type="button"
            className={`filter-btn ${filter === 'incomplete' ? 'active' : ''}`}
            onClick={() => setFilter('incomplete')}
          >
            Incomplete
          </button>
        </div>

        {loading && <p style={{ fontSize: '0.8rem' }}>Loading…</p>}

        <ul className="todo-list">
          {filteredTodos.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? 'done' : ''}`}
            >
              {editingId === todo.id ? (
                <div className="todo-edit-container">
                  <input
                    type="text"
                    className="todo-edit-input"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        saveEdit(todo)
                      } else if (e.key === 'Escape') {
                        cancelEdit()
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="todo-save-btn"
                    onPointerDown={(e) => {
                      // Prevent the input from blurring before we save (avoids race)
                      e.preventDefault()
                      saveEdit(todo)
                    }}
                    onClick={() => saveEdit(todo)}
                    aria-label="Save"
                    title="Save"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    className="todo-cancel-btn"
                    onClick={cancelEdit}
                    aria-label="Cancel"
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <label className="todo-label">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo)}
                      disabled={operatingIds.has(todo.id)}
                    />
                    <span>{todo.title}</span>
                  </label>
                  <div className="todo-actions">
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => startEdit(todo)}
                      aria-label="Edit todo"
                      title="Edit"
                      disabled={operatingIds.has(todo.id)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => deleteTodo(todo)}
                      title="Delete"
                      disabled={operatingIds.has(todo.id)}
                    >
                      DEL
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        {filteredTodos.length === 0 && !loading && (
          <p className="no-todos">No {filter === 'all' ? '' : filter} todos found.</p>
        )}

        
      </section>
    </div>
  )
}

export default App