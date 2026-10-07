import { useState } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { User, Lock, Sprout } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

type Language = 'en' | 'si' | 'ta';

interface Translations {
  title: string;
  subtitle: string;
  username: string;
  password: string;
  login: string;
  welcome: string;
  description: string;
}

const translations: Record<Language, Translations> = {
  en: {
    title: 'AgroEye',
    subtitle: 'Smart Farming Solutions',
    username: 'Email',
    password: 'Password',
    login: 'Login',
    welcome: 'Welcome Back',
    description: 'Monitor your paddy fields with real-time IoT sensors',
  },
  si: {
    title: 'AgroEye',
    subtitle: 'බුද්ධිමත් ගොවිතැන් විසඳුම්',
    username: 'ඊමේල් ලිපිනය',
    password: 'මුරපදය',
    login: 'ඇතුල් වන්න',
    welcome: 'නැවත පිළිගනිමු',
    description: 'තත්‍ය කාලීන IoT සංවේදක සමඟ ඔබේ කුඹුරු නිරීක්ෂණය කරන්න',
  },
  ta: {
    title: 'AgroEye',
    subtitle: 'புத்திசாலி விவசாய தீர்வுகள்',
    username: 'மின்னஞ்சல்',
    password: 'கடவுச்சொல்',
    login: 'உள்நுழைய',
    welcome: 'மீண்டும் வரவேற்கிறோம்',
    description: 'நேரடி IoT சென்சார்கள் மூலம் உங்கள் நெல் வயல்களை கண்காணிக்கவும்',
  },
};

const languageNames: Record<Language, string> = {
  en: 'English',
  si: 'සිංහල',
  ta: 'தமிழ்',
};

interface LoginScreenProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
}

export function LoginScreen({ onLogin, onSwitchToSignup }: LoginScreenProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = translations[language];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Email or password is incorrect.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onLogin();
    } catch (err: any) {
      console.error(err);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1655903724829-37b3cd3d4ab9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYWRkeSUyMHJpY2UlMjBmaWVsZCUyMGdyZWVufGVufDF8fHx8MTc2Mzk1Mjc0OHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Paddy Field"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/80 to-green-600/60" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Sprout className="w-10 h-10" />
            </div>
            <h1 className="text-white mb-4">AgroEye</h1>
            <p className="text-white/90 text-xl mb-2">Smart Paddy Monitoring</p>
            <p className="text-white/80">Real-time IoT solutions for modern farming</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gradient-to-br from-green-50 to-white">
        <div className="w-full max-w-md">
          {/* Language Switcher */}
          <div className="flex justify-center gap-2 mb-8">
            {(Object.keys(languageNames) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-4 py-2 rounded-full transition-all text-sm ${
                  language === lang
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-green-700 hover:bg-green-50 border border-green-200'
                }`}
              >
                {languageNames[lang]}
              </button>
            ))}
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-green-100">
            {/* Logo and Title - Mobile Only */}
            <div className="text-center mb-8 lg:hidden">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
                <Sprout className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-green-800 mb-2">{t.title}</h1>
              <p className="text-green-600">{t.subtitle}</p>
            </div>

            {/* Welcome Text */}
            <div className="mb-8">
              <h2 className="text-green-800 mb-2">{t.welcome}</h2>
              <p className="text-green-600">{t.description}</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-green-800">
                  {t.username}
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600">
                    <User className="w-5 h-5" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-green-200 focus:border-green-500 focus:ring-green-500"
                    placeholder={t.username}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-green-800">
                  {t.password}
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 border-green-200 focus:border-green-500 focus:ring-green-500"
                    placeholder={t.password}
                    required
                  />
                </div>
              </div>

              {/* Remember Me / Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-green-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-green-300 text-green-600 focus:ring-green-500"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="text-green-600 hover:text-green-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
              >
                {loading ? 'Logging in...' : t.login}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-green-100" />
              <span className="text-sm text-green-500">or</span>
              <div className="flex-1 h-px bg-green-100" />
            </div>

            {/* Google Sign-in Button */}
            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              variant="outline"
              className="w-full h-14 border-green-200 text-green-800 hover:bg-green-50 rounded-xl flex items-center justify-center gap-3 disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            {/* Sign Up Link */}
            <div className="mt-6 text-center text-sm text-green-600">
              Don't have an account?{' '}
              <button onClick={onSwitchToSignup} className="text-green-700 hover:underline">
                Sign up
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-green-700">
            <p className="text-sm">© 2025 AgroEye. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}