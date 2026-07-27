import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 192,
  height: 192,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            border: '3px solid #22c55e',
            borderRadius: '20px',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <div
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '2px',
            }}
          >
            青森県
          </div>
          <div
            style={{
              fontSize: '38px',
              fontWeight: 900,
              color: '#4ade80',
              letterSpacing: '4px',
              marginTop: '-4px',
            }}
          >
            競馬
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}