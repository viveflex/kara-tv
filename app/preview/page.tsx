'use client';

export default function Home() {
  return (
    <iframe 
      src="/tv" 
      style={{
        width: '100vw',
        height: '100vh',
        border: 'none',
        position: 'fixed',
        top: 0,
        left: 0
      }}
      title="Karaoke Browser Interface"
    />
  );
}
