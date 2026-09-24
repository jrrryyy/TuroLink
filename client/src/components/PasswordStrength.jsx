import { passwordStrength } from '../../../shared/validation.mjs';
import '../styles/auth-security.css';
export default function PasswordStrength({ value }) {
  const result = passwordStrength(value);
  return <div className="password-strength" aria-live="polite">
    <div className="password-strength-track" role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={3} aria-valuenow={value ? result.score : 0} aria-valuetext={value ? result.label : 'Enter a password'}>
      <span className={`strength-${result.score}`} style={{ width: `${value ? result.score / 3 * 100 : 0}%` }} />
    </div>
    <p>{value ? <><strong>{result.label}</strong> — </> : null}{result.error || 'Use a unique password you do not use for other accounts.'}</p>
  </div>;
}
