export function StatusMessage({ message, error = false }: { message: string; error?: boolean }) {
  return <p className={`status ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{message}</p>;
}
