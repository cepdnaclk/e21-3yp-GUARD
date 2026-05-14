import { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '108391237039-0jg9nf8pjn48vi5bqi8bbth2kfe03vtm.apps.googleusercontent.com';

const SCRIPT_ID = 'google-identity-services';

/**
 * Renders a Google Sign-In / Sign-Up button.
 *
 * @param {{ onCredential: (idToken: string) => Promise<void>, text?: string, onError?: (msg: string) => void }} props
 */
export default function GoogleSignInButton({ onCredential, text = 'signin_with', onError }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return;

    const renderButton = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;

      if (!initializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (!response?.credential) {
              onError?.('Google sign in failed. Please try again.');
              return;
            }
            try {
              await onCredentialRef.current(response.credential);
            } catch (err) {
              onError?.(err.message || 'Google sign in failed.');
            }
          },
        });
        initializedRef.current = true;
      }

      containerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        text,
        shape: 'pill',
        width: 320,
      });
    };

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      renderButton();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);
  }, [text, onError]);

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}
    />
  );
}
