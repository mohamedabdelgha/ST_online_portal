export default function ErrorState({ message, onRetry }) {
  return 
  <div className="error-state">
    <strong>Something went wrong.</strong>
    <span>{message}</span>
    {onRetry && <button className="btn secondary" onClick={onRetry}>Retry</button>}
  </div>
}
