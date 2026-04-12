import { ImageResponse } from '@vercel/og';
import type { IncomingMessage, ServerResponse } from 'http';

export const config = { runtime: 'edge' };

const SITE_URL = (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://www.vision7.pt').replace(/\/$/, '');

export default async function handler(req: Request | IncomingMessage, res?: ServerResponse) {
  // Support both Edge (Request) and Node.js (IncomingMessage) runtimes
  let title = 'Vision7';
  let subtitle = 'Portal de Tecnologia e Inovação';

  try {
    const url = new URL(
      typeof (req as Request).url === 'string'
        ? (req as Request).url
        : `${SITE_URL}/api/og-image`,
      SITE_URL,
    );
    title = (url.searchParams.get('title') || 'Vision7').slice(0, 80);
    subtitle = (url.searchParams.get('subtitle') || 'Portal de Tecnologia e Inovação').slice(0, 120);
  } catch {
    // keep defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #111827 100%)',
          padding: '60px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Grid background accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow accent */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Logo + brand bar */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              marginRight: '14px',
            }}
          >
            <span style={{ color: 'white', fontWeight: 900, fontSize: '20px' }}>V7</span>
          </div>
          <span style={{ color: '#a5b4fc', fontSize: '18px', fontWeight: 600, letterSpacing: '0.05em' }}>
            VISION7
          </span>
          <div
            style={{
              marginLeft: '18px',
              paddingLeft: '18px',
              borderLeft: '1px solid rgba(165,180,252,0.2)',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            Tecnologia &amp; Inovação
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <p
            style={{
              fontSize: title.length > 50 ? '38px' : '48px',
              fontWeight: 800,
              color: '#f8fafc',
              lineHeight: 1.2,
              margin: '0 0 24px 0',
              maxWidth: '860px',
            }}
          >
            {title}
          </p>
          {subtitle && subtitle !== 'Portal de Tecnologia e Inovação' && (
            <p
              style={{
                fontSize: '20px',
                color: '#94a3b8',
                lineHeight: 1.5,
                margin: 0,
                maxWidth: '820px',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
            borderTop: '1px solid rgba(99,102,241,0.2)',
            paddingTop: '24px',
          }}
        >
          <span style={{ color: '#475569', fontSize: '14px' }}>vision7.pt</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '20px',
              padding: '6px 16px',
            }}
          >
            <span style={{ color: '#a5b4fc', fontSize: '13px', fontWeight: 500 }}>Leia no portal</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
