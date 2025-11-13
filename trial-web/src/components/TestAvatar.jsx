import { useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import { useRef } from 'react';

// Test 1: Simple Geometry (pasti jalan)
function SimpleGeometry() {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });
  
  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#153C30" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#2D7A5F" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.25, 1.6, 0.5]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.25, 1.6, 0.5]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

// Test 2: Load GLB Model
function GLBModel() {
  const modelRef = useRef();
  const [error, setError] = useState(null);
  
  let scene = null;
  
  try {
    const result = useGLTF('/assets/models/a73f77cc659620e190b1d111f2cbc301.glb');
    scene = result.scene;
    console.log('✅ GLB Model loaded successfully!');
  } catch (err) {
    console.error('❌ GLB Model failed to load:', err);
    setError(err.message);
  }
  
  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });
  
  if (error || !scene) {
    console.log('Using fallback geometry');
    return <SimpleGeometry />;
  }
  
  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={2} 
      position={[0, -1, 0]} 
    />
  );
}

export default function TestAvatar() {
  const [testMode, setTestMode] = useState('simple'); // 'simple' or 'glb'
  const [showInfo, setShowInfo] = useState(true);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px',
      gap: '20px',
      background: '#F8FAFB',
      minHeight: '100vh',
    }}>
      {/* Info Panel */}
      {showInfo && (
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxWidth: '600px',
          width: '100%',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h3 style={{ margin: 0, color: '#153C30' }}>
              🧪 Avatar Debug Mode
            </h3>
            <button 
              onClick={() => setShowInfo(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{
            background: '#F1F5F9',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px',
          }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Current Mode:</strong> {testMode === 'simple' ? '🟢 Simple Geometry' : '🔵 GLB Model'}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Expected Result:</strong>
            </div>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Simple Mode: Should see green animated spheres</li>
              <li>GLB Mode: Should see your 3D model OR fallback if failed</li>
            </ul>
          </div>
          
          <div style={{
            fontSize: '12px',
            color: '#64748B',
            lineHeight: '1.5',
          }}>
            📝 <strong>Instructions:</strong>
            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Press F12 to open Console</li>
              <li>Check for any errors (red text)</li>
              <li>Toggle between modes to test</li>
              <li>If Simple works but GLB doesn't → model file issue</li>
              <li>If nothing works → Three.js setup issue</li>
            </ol>
          </div>
        </div>
      )}
      
      {/* Control Panel */}
      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '12px',
      }}>
        <button
          onClick={() => setTestMode('simple')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: testMode === 'simple' ? '2px solid #153C30' : '1px solid #E5E7EB',
            background: testMode === 'simple' ? 'rgba(21, 60, 48, 0.1)' : 'white',
            color: '#153C30',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🟢 Test Simple Geometry
        </button>
        
        <button
          onClick={() => setTestMode('glb')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: testMode === 'glb' ? '2px solid #153C30' : '1px solid #E5E7EB',
            background: testMode === 'glb' ? 'rgba(21, 60, 48, 0.1)' : 'white',
            color: '#153C30',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🔵 Test GLB Model
        </button>
        
        <button
          onClick={() => setShowInfo(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            background: 'white',
            color: '#64748B',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ℹ️ Show Info
        </button>
      </div>
      
      {/* Canvas Display */}
      <div style={{
        width: '400px',
        height: '400px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)',
        boxShadow: '0 8px 24px rgba(21, 60, 48, 0.3)',
        position: 'relative',
      }}>
        <Canvas
          camera={{ position: [0, 1, 5], fov: 50 }}
          gl={{ 
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
          }}
          onCreated={() => {
            console.log('✅ Canvas created successfully');
          }}
          onError={(e) => {
            console.error('❌ Canvas error:', e);
          }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[-5, 3, -5]} intensity={0.5} />
          <pointLight position={[0, 3, 0]} intensity={0.6} />
          
          {/* Model */}
          {testMode === 'simple' ? <SimpleGeometry /> : <GLBModel />}
          
          {/* Controls */}
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            autoRotate={false}
          />
        </Canvas>
        
        {/* Status Badge */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#153C30',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {testMode === 'simple' ? '🟢 Simple Mode' : '🔵 GLB Mode'}
        </div>
      </div>
      
      {/* Console Output */}
      <div style={{
        background: '#1E293B',
        color: '#E2E8F0',
        padding: '16px',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.6',
      }}>
        <div style={{ marginBottom: '8px', color: '#94A3B8' }}>
          📋 Console Output (open F12 for full details):
        </div>
        <div>• Canvas initialized</div>
        <div>• Mode: {testMode}</div>
        <div>• Check browser console (F12) for detailed logs</div>
        <div style={{ marginTop: '8px', color: '#10B981' }}>
          ✓ Component rendered successfully
        </div>
      </div>
      
      {/* Troubleshooting Tips */}
      <div style={{
        background: '#FEF3C7',
        border: '2px solid #F59E0B',
        padding: '16px',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        fontSize: '13px',
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px', color: '#92400E' }}>
          ⚠️ If you see white screen:
        </div>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#78350F' }}>
          <li>Check console for errors (F12)</li>
          <li>Verify file at: <code style={{ background: '#FDE68A', padding: '2px 6px', borderRadius: '4px' }}>
            public/assets/models/a73f77cc659620e190b1d111f2cbc301.glb
          </code></li>
          <li>Restart dev server: <code style={{ background: '#FDE68A', padding: '2px 6px', borderRadius: '4px' }}>
            npm run dev
          </code></li>
          <li>Hard refresh browser: Ctrl + Shift + R</li>
        </ol>
      </div>
    </div>
  );
}

// Add keyframe animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}