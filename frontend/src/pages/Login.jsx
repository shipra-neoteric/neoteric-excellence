import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AlertBanner from '../components/AlertBanner';
import { btnPrimaryBase, inputClass, label as labelClass, primaryStyle } from '../ui/classes';

// Reused for both the Staff tab and the Trainee tab's "Password" method — the backend
// login endpoint doesn't discriminate by role, it just checks whoever has a password set.
function EmailPasswordLogin() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <AlertBanner level="crit">{error}</AlertBanner>}
      <div>
        <label className={labelClass}>Email</label>
        <input className={inputClass()} type="email" autoComplete="username" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Password</label>
        <input className={inputClass()} type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <PrimaryButton loading={loading}>{loading ? 'Signing in…' : 'Sign in'}</PrimaryButton>
    </form>
  );
}

function OtpLogin() {
  const { requestOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [devCode, setDevCode] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { devCode: dc } = await requestOtp(phone);
      setDevCode(dc ?? null);
      setStep('code');
    } catch {
      setError('No trainee account found with that phone number.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(phone, code);
    } catch {
      setError('Wrong or expired code.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={handleRequest} className="space-y-4">
        {error && <AlertBanner level="crit">{error}</AlertBanner>}
        <div>
          <label className={labelClass}>Phone number</label>
          <input className={inputClass()} type="tel" required autoFocus
            value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <PrimaryButton loading={loading}>{loading ? 'Sending…' : 'Send code'}</PrimaryButton>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      {error && <AlertBanner level="crit">{error}</AlertBanner>}
      {devCode && (
        <AlertBanner level="info">No SMS provider configured yet — your code is <b>{devCode}</b> (dev mode only).</AlertBanner>
      )}
      <div>
        <label className={labelClass}>6-digit code sent to {phone}</label>
        <input className={inputClass()} inputMode="numeric" pattern="[0-9]*" maxLength={6} required autoFocus
          value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <PrimaryButton loading={loading}>{loading ? 'Verifying…' : 'Verify & sign in'}</PrimaryButton>
      <button type="button" onClick={() => setStep('phone')}
        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
        Use a different number
      </button>
    </form>
  );
}

function TraineeLogin() {
  const [method, setMethod] = useState('otp'); // 'otp' | 'password'

  return (
    <div>
      <div className="flex gap-4 mb-5 text-sm">
        {[['otp', 'Phone + OTP'], ['password', 'Email + password']].map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMethod(m)}
            className={`pb-1 border-b-2 transition-colors ${
              method === m ? 'border-orange-500 text-gray-900 dark:text-white font-medium' : 'border-transparent text-gray-400'
            }`}>
            {label}
          </button>
        ))}
      </div>
      {method === 'otp' ? <OtpLogin /> : <EmailPasswordLogin />}
    </div>
  );
}

function PrimaryButton({ loading, children }) {
  const { getThemeColor } = useTheme();
  return (
    <button type="submit" disabled={loading} className={`w-full ${btnPrimaryBase}`} style={primaryStyle(getThemeColor())}>
      {children}
    </button>
  );
}

export default function Login() {
  const { session } = useAuth();
  const { getThemeColor } = useTheme();
  const location = useLocation();
  const [tab, setTab] = useState('staff');

  if (session) {
    const fallback = session.role === 'trainee' ? '/t/today' : '/dashboard';
    return <Navigate to={location.state?.from ?? fallback} replace />;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6 w-full max-w-[380px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: getThemeColor() }}>NE</div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white">Neoteric Excellence</div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500">Batch 2026-01</div>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
          {['staff', 'trainee'].map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'staff' ? <EmailPasswordLogin /> : <TraineeLogin />}
      </div>
    </div>
  );
}
