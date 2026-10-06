import 'server-only';

// Server-only configuration. Nothing here is prefixed NEXT_PUBLIC_, so the
// backend URL never reaches the browser bundle.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const serverEnv = {
  get backendUrl(): string {
    return required('BACKEND_URL').replace(/\/+$/, '');
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  },
};
