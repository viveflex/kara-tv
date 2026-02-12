'use client';

import { useState, useEffect } from 'react';

type Version = 'preview' | 'tv';

export default function Home() {
  const [selectedVersion, setSelectedVersion] = useState<Version>('preview');
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('karaoke_version') as Version;
    if (saved === 'preview' || saved === 'tv') {
      setSelectedVersion(saved);
    }
  }, []);

  const handleVersionChange = (version: Version) => {
    setSelectedVersion(version);
    localStorage.setItem('karaoke_version', version);
    setShowSelector(false);
  };

  const iframeSrc = selectedVersion === 'tv' ? '/browser/index.html' : '/tv';

  return (
    <>
      {/* Version Selector Button */}
      <button
        onClick={() => setShowSelector(!showSelector)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          backgroundColor: '#FF0000',
          color: '#fff',
          border: 'none',
          padding: '12px 20px',
          fontSize: '16px',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}
      >
        {selectedVersion === 'tv' ? '📺 TV' : '👁️ Preview'}
      </button>

      {/* Version Selector Modal */}
      {showSelector && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowSelector(false)}
        >
          <div
            style={{
              backgroundColor: '#1A1A1A',
              padding: '40px',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              minWidth: '400px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#FF0000', marginBottom: '20px', fontSize: '24px', textAlign: 'center' }}>
              Select Version
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button
                onClick={() => handleVersionChange('preview')}
                style={{
                  backgroundColor: selectedVersion === 'preview' ? '#FF0000' : '#333',
                  color: '#fff',
                  border: selectedVersion === 'preview' ? '2px solid #fff' : '2px solid transparent',
                  padding: '20px',
                  fontSize: '18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👁️</div>
                <div style={{ fontWeight: 'bold' }}>Preview</div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>React Version</div>
              </button>

              <button
                onClick={() => handleVersionChange('tv')}
                style={{
                  backgroundColor: selectedVersion === 'tv' ? '#FF0000' : '#333',
                  color: '#fff',
                  border: selectedVersion === 'tv' ? '2px solid #fff' : '2px solid transparent',
                  padding: '20px',
                  fontSize: '18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📺</div>
                <div style={{ fontWeight: 'bold' }}>TV</div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Original HTML Version</div>
              </button>
            </div>

            <button
              onClick={() => setShowSelector(false)}
              style={{
                width: '100%',
                marginTop: '20px',
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                padding: '12px',
                fontSize: '14px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <iframe 
        key={iframeSrc}
        src={iframeSrc}
        style={{
          width: '100vw',
          height: '100vh',
          border: 'none',
          position: 'fixed',
          top: 0,
          left: 0
        }}
        title="Karaoke Interface"
      />
    </>
  );
}
