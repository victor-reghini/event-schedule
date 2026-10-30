import React, { useEffect, useRef } from 'react';

/**
 * Componente de Bloco de Anúncio Google AdSense
 * Suporta anúncios responsivos com tratamento seguro contra bloqueadores.
 */
export default function AdSenseBanner({
  client = 'ca-pub-2801447553650841',
  slot = '',
  format = 'auto',
  responsive = 'true',
  style = {}
}) {
  const adRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Evita inicialização duplicada no React StrictMode
    if (initializedRef.current) return;

    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        initializedRef.current = true;
      }
    } catch (e) {
      // Bloqueadores de anúncio ou erro de script são tratados silenciosamente
      console.debug('AdSense initialization notice:', e.message);
    }
  }, []);

  return (
    <div
      className="adsense-container"
      style={{
        overflow: 'hidden',
        textAlign: 'center',
        margin: '1.25rem 0',
        minHeight: slot ? '90px' : 'auto',
        ...style
      }}
      aria-label="Publicidade"
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={client}
        {...(slot ? { 'data-ad-slot': slot } : {})}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
