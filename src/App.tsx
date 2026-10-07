import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, update, set } from 'firebase/database';
import { auth, db } from './firebase';
import { LoginScreen } from './components/LoginScreen';
import { SignUpScreen } from './components/SignUpScreen';
import { MainLayout } from './components/MainLayout';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('agroeye-theme') === 'dark');

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('agroeye-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);
      setCheckingAuth(false);

      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
          const now = new Date().toLocaleString();

          if (snapshot.exists()) {
            await update(userRef, { lastLogin: now });
          } else {
            await set(userRef, {
              name: user.displayName || 'Unnamed User',
              email: user.email || '',
              role: 'user',
              status: 'active',
              lastLogin: now,
              fields: 0,
            });
          }
        } catch (err) {
          console.error('Failed to update lastLogin:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggedIn(false);
    }
  };

  const themeWrapperStyle: React.CSSProperties = darkMode
    ? { filter: 'invert(1) hue-rotate(180deg)', minHeight: '100vh' }
    : { minHeight: '100vh' };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-green-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'theme-dark-wrapper' : ''} style={themeWrapperStyle}>
      {!isLoggedIn ? (
        authView === 'signup' ? (
          <>
            <SignUpScreen
              onSignUp={() => setIsLoggedIn(true)}
              onSwitchToLogin={() => setAuthView('login')}
            />
            <PWAInstallPrompt />
          </>
        ) : (
          <>
            <LoginScreen
              onLogin={() => setIsLoggedIn(true)}
              onSwitchToSignup={() => setAuthView('signup')}
            />
            <PWAInstallPrompt />
          </>
        )
      ) : (
        <>
          <MainLayout
            onLogout={handleLogout}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
          <PWAInstallPrompt />
        </>
      )}
    </div>
  );
}