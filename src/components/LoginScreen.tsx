
import { useState, type FormEvent } from 'react';
import {
  ArrowRight, Eye, EyeOff, Leaf, LockKeyhole,
  Mail, ShieldCheck, Sprout, Wifi, Loader2,
  CheckCircle2, AlertCircle, ArrowLeft
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

type Language = 'en' | 'si' | 'ta';

interface LoginScreenProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
}

const content = {
  en: {
    welcome: 'Welcome back',
    subtitle: 'Sign in to your smart farming workspace.',
    email: 'Email address',
    password: 'Password',
    login: 'Sign in to AgroEye',
    forgot: 'Forgot password?',
    noAccount: "Don't have an account?",
    signup: 'Create an account',
    google: 'Continue with Google',
    or: 'or continue with',
    resetTitle: 'Reset your password',
    resetDescription: 'Enter your email to receive a password reset link.',
    sendReset: 'Send reset link',
    back: 'Back to sign in',
    loading: 'Please wait...',
    resetSuccess: 'If an account exists for this email, a reset link has been sent.'
  },
  si: {
    welcome: 'නැවත පිළිගනිමු',
    subtitle: 'ඔබේ Smart Farming පද්ධතියට පිවිසෙන්න.',
    email: 'ඊමේල් ලිපිනය',
    password: 'මුරපදය',
    login: 'ඇතුල් වන්න',
    forgot: 'මුරපදය අමතකද?',
    noAccount: 'ගිණුමක් නැද්ද?',
    signup: 'ගිණුමක් සාදන්න',
    google: 'Google සමඟ පිවිසෙන්න',
    or: 'හෝ',
    resetTitle: 'මුරපදය නැවත සකසන්න',
    resetDescription: 'Reset link එක ලබා ගැනීමට email එක ඇතුළත් කරන්න.',
    sendReset: 'Reset link යවන්න',
    back: 'නැවත Login වෙත',
    loading: 'මඳක් රැඳී සිටින්න...',
    resetSuccess: 'මෙම email එකට ගිණුමක් තිබේ නම් reset link එක යවා ඇත.'
  },
  ta: {
    welcome: 'மீண்டும் வரவேற்கிறோம்',
    subtitle: 'உங்கள் ஸ்மார்ட் விவசாய கணக்கில் உள்நுழையுங்கள்.',
    email: 'மின்னஞ்சல் முகவரி',
    password: 'கடவுச்சொல்',
    login: 'உள்நுழைய',
    forgot: 'கடவுச்சொல் மறந்துவிட்டதா?',
    noAccount: 'கணக்கு இல்லையா?',
    signup: 'கணக்கை உருவாக்கவும்',
    google: 'Google மூலம் தொடரவும்',
    or: 'அல்லது',
    resetTitle: 'கடவுச்சொல்லை மீட்டமைக்கவும்',
    resetDescription: 'மீட்டமைப்பு இணைப்பைப் பெற மின்னஞ்சலை உள்ளிடவும்.',
    sendReset: 'இணைப்பை அனுப்பவும்',
    back: 'உள்நுழைவுக்குத் திரும்பு',
    loading: 'காத்திருக்கவும்...',
    resetSuccess: 'இந்த மின்னஞ்சலுக்குக் கணக்கு இருந்தால் இணைப்பு அனுப்பப்படும்.'
  }
};

const fieldClass =
  'w-full h-12 rounded-xl border border-slate-200 bg-slate-50/70 ' +
  'pl-11 pr-12 text-sm text-slate-800 outline-none transition-all ' +
  'placeholder:text-slate-400 focus:border-emerald-500 ' +
  'focus:bg-white focus:ring-4 focus:ring-emerald-500/10';

const GOOGLE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export function LoginScreen({
  onLogin,
  onSwitchToSignup
}: LoginScreenProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const t = content[language];

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLogin();
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String(err.code)
          : '';

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setError('Incorrect email or password. Please try again.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
      onLogin();
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String(err.code)
          : '';

      if (code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(t.resetSuccess);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String(err.code)
          : '';

      if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Could not send the reset link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f5faf7] font-sans lg:flex">

      {/* LEFT: AGRICULTURE HERO */}
      <section className="relative hidden min-h-screen overflow-hidden bg-emerald-950 lg:flex lg:w-[52%] xl:w-[55%]">

        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1800&q=85"
          alt="Beautiful green agricultural landscape"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#052e22]/80 via-[#064e3b]/40 to-[#022c22]/95" />

        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 flex w-full flex-col justify-between px-10 py-10 xl:px-16 xl:py-12">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-xl">
              <Sprout className="h-7 w-7 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Agro<span className="text-emerald-300">Eye</span>
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.23em] text-emerald-100/80">
                Smart Farming Platform
              </p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <span className="text-xs font-semibold tracking-wide text-emerald-50">
                THE FUTURE OF SMART AGRICULTURE
              </span>
            </div>

            <h2 className="text-5xl font-extrabold leading-[1.13] tracking-tight text-white xl:text-6xl">
              Smarter Fields.
              <br />
              <span className="text-[#a7f3d0]">Better Harvests.</span>
            </h2>

            <p className="mt-6 max-w-md text-base leading-8 text-emerald-50/85">
              Transform the way you monitor your paddy fields
              with real-time IoT insights, intelligent monitoring,
              and data-driven farming decisions.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                { icon: Wifi, title: 'Real-Time', desc: 'IoT Monitoring' },
                { icon: Leaf, title: 'Crop Health', desc: 'Smart Insights' },
                { icon: ShieldCheck, title: 'Reliable', desc: 'Field Tracking' }
              ].map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
                  >
                    <Icon className="mb-3 h-6 w-6 text-emerald-200" />
                    <p className="text-sm font-bold text-white">
                      {feature.title}
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-100/75">
                      {feature.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hero Footer */}
          <div className="flex items-center justify-between gap-4 border-t border-white/20 pt-6">
            <p className="text-xs text-white/65">
              © {new Date().getFullYear()} AgroEye
            </p>
            <span className="flex items-center gap-2 text-xs text-emerald-100/80">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Growing a smarter future
            </span>
          </div>
        </div>
      </section>

      {/* RIGHT: LOGIN FORM */}
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:w-[48%] xl:w-[45%]">

        <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-lime-100/70 blur-3xl" />

        <div className="relative z-10 w-full max-w-[430px]">

          {/* Mobile Brand */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
              <Sprout className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-emerald-950">
                Agro<span className="text-emerald-600">Eye</span>
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                Smart Farming
              </p>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="mb-8 flex justify-center gap-2">
            {([
              ['en', 'English'],
              ['si', 'සිංහල'],
              ['ta', 'தமிழ்']
            ] as const).map(([code, name]) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLanguage(code);
                  setError('');
                  setSuccess('');
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${language === code
                    ? 'bg-emerald-700 text-white shadow-md shadow-emerald-200'
                    : 'border border-emerald-100 bg-white text-slate-600 hover:bg-emerald-50'
                  }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Form Card */}
          <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_20px_70px_rgba(15,80,50,0.10)] backdrop-blur-xl sm:p-9">

            <div className="mb-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                {resetMode ? (
                  <LockKeyhole className="h-6 w-6 text-emerald-700" />
                ) : (
                  <Leaf className="h-6 w-6 text-emerald-700" />
                )}
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {resetMode ? t.resetTitle : t.welcome}
                {!resetMode && <span className="ml-2">👋</span>}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {resetMode ? t.resetDescription : t.subtitle}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div
                role="status"
                className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form
              onSubmit={resetMode ? handleReset : handleLogin}
              className="space-y-5"
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="agro-email"
                  className="mb-2 block text-xs font-bold text-slate-700"
                >
                  {t.email}
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    id="agro-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className={fieldClass}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              {!resetMode && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label
                      htmlFor="agro-password"
                      className="text-xs font-bold text-slate-700"
                    >
                      {t.password}
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setResetMode(true);
                        setError('');
                        setSuccess('');
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      {t.forgot}
                    </button>
                  </div>

                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="agro-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className={fieldClass}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-emerald-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Main Action */}
              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-green-600 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-800 hover:to-green-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.loading}
                  </>
                ) : (
                  <>
                    {resetMode ? t.sendReset : t.login}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {resetMode ? (
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setError('');
                  setSuccess('');
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-semibold text-emerald-700 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </button>
            ) : (
              <>
                {/* Divider */}
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs text-slate-400">{t.or}</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-all hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-60"
                >
                  {GOOGLE_ICON}
                  {t.google}
                </button>

                {/* Signup */}
                <p className="mt-7 text-center text-sm text-slate-500">
                  {t.noAccount}{' '}
                  <button
                    type="button"
                    onClick={onSwitchToSignup}
                    className="font-bold text-emerald-700 hover:underline"
                  >
                    {t.signup}
                  </button>
                </p>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-7 text-center">
            <div className="mb-3 flex items-center justify-center gap-2 text-xs text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Secure access to your farming dashboard
            </div>

            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} AgroEye. All rights reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
