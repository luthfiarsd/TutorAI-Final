// Avatar3D.jsx
import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';

function AvatarModel({ isSpeaking, isUserTyping }) {
  const modelRef = useRef();
  const [modelError, setModelError] = useState(false);
  
  const modelPath = '/assets/models/a73f77cc659620e190b1d111f2cbc301.glb';
  
  let scene = null;

  try {
    gltf = useGLTF(modelPath);
    scene = gltf.scene;
  } catch {
    // do nothing — useGLTF will suspend, fallback is used instead
  }

  useEffect(() => {
    if (scene && modelRef.current) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);

  useFrame((state) => {
    if (modelRef.current && !modelError) {
      const time = state.clock.elapsedTime;
      
      if (isUserTyping) {
        // 📝 User Typing Animation
        modelRef.current.rotation.x = Math.sin(time * 4) * 0.1;
        modelRef.current.rotation.y = Math.sin(time * 2) * 0.15;
        modelRef.current.position.y = Math.sin(time * 6) * 0.08;
      } else if (isSpeaking) {
        // 🗣️ AI Speaking Animation
        modelRef.current.rotation.x = Math.sin(time * 5) * 0.08;
        modelRef.current.rotation.z = Math.sin(time * 3) * 0.05;
        modelRef.current.position.y = Math.sin(time * 8) * 0.1;
        modelRef.current.position.x = Math.sin(time * 2) * 0.03;
      } else {
        // 😌 Idle Animation
        modelRef.current.rotation.y = Math.sin(time * 0.5) * 0.05;
        modelRef.current.position.y = Math.sin(time * 0.8) * 0.03;
        modelRef.current.rotation.x = Math.sin(time * 0.3) * 0.02;
      }
    }
  });

  if (modelError || !scene) {
    console.log('Using fallback geometry avatar');
    return (
      <group ref={modelRef}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial 
            color="#153C30" 
            transparent 
            opacity={0.9}
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.7, 32, 32]} />
          <meshStandardMaterial 
            color="#2D7A5F"
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>
        <mesh position={[-0.25, 1.6, 0.5]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.25, 1.6, 0.5]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[-0.25, 1.6, 0.6]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0.25, 1.6, 0.6]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        <mesh position={[0, 1.3, 0.6]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.2, 0.03, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
      </group>
    );
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

export default function Avatar3D({ 
  isSpeaking = false, 
  isUserTyping = false,
  size = 100, 
  background = false,
  cropToChest = false
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // 🎨 Camera positioning berdasarkan mode
  let cameraPosition, cameraFov;
  
  if (cropToChest) {
    // 👤 PROFILE PICTURE MODE - Close up ke wajah sampai dada
    cameraPosition = [0, 1.2, 1.8];
    cameraFov = 35;
  } else if (background) {
    // 🖼️ BACKGROUND MODE - Almost full body dengan view lebih baik
    cameraPosition = [0, 0.8, 5]; // Lebih tinggi dan lebih jauh
    cameraFov = 40;
  } else {
    // 💬 MESSAGE AVATAR MODE - Default
    cameraPosition = [0, 0.5, 3];
    cameraFov = 50;
  }

  const containerStyle = background ? {
    // 🖼️ Background Avatar (besar di belakang chat) - OPACITY LEBIH TINGGI
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '75vh', // Sedikit lebih besar
    height: '75vh',
    maxWidth: '900px',
    maxHeight: '900px',
    zIndex: 0,
    // OPACITY LEBIH TINGGI: 0.4 saat speaking, 0.3 saat typing, 0.25 normal
    opacity: isSpeaking ? 0.4 : isUserTyping ? 0.3 : 0.25,
    pointerEvents: 'auto', // Diubah jadi auto agar bisa di-interact
    transition: 'opacity 0.5s ease',
    filter: 'blur(0.5px)', // Kurangi blur agar lebih jelas
    cursor: 'grab', // Tambahkan cursor grab
  } : {
    // 👤 Small Avatar (profile pic & message)
    width: size, 
    height: size, 
    borderRadius: '50%', 
    overflow: 'hidden',
    background: cropToChest 
      ? 'linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)'
      : 'linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isSpeaking 
      ? '0 8px 24px rgba(21, 60, 48, 0.4), 0 0 40px rgba(45, 122, 95, 0.3)' 
      : '0 4px 12px rgba(21, 60, 48, 0.2)',
    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
    transform: isSpeaking ? 'scale(1.05)' : 'scale(1)',
    position: 'relative',
  };

  return (
    <div style={containerStyle}>
      <Canvas
        camera={{ 
          position: cameraPosition,
          fov: cameraFov
        }}
        style={{ 
          background: 'transparent',
          width: '100%',
          height: '100%'
        }}
        onCreated={() => {
          console.log('✅ Canvas created successfully');
          setLoading(false);
          setError(false);
        }}
        onError={(e) => {
          console.error('❌ Canvas error:', e);
          setError(true);
          setLoading(false);
        }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        {/* 💡 Enhanced Lighting */}
        <ambientLight intensity={0.8} />
        
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1.2}
          castShadow
        />
        
        <directionalLight 
          position={[-5, 3, -5]} 
          intensity={0.6}
        />
        
        <pointLight 
          position={[0, 3, 0]} 
          intensity={0.7} 
          color="#FFFFFF"
        />
        
        <spotLight
          position={[0, 5, 2]}
          angle={0.5}
          penumbra={0.5}
          intensity={0.9}
          castShadow
        />
        
        {/* 🎭 Avatar Model */}
        <AvatarModel 
          isSpeaking={isSpeaking} 
          isUserTyping={isUserTyping}
        />
        
        {/* 🎮 Controls - ENABLE UNTUK BACKGROUND JUGA! */}
        {(background || (!background && !cropToChest)) && (
          <OrbitControls 
            enableZoom={background ? true : false} // Zoom enabled untuk background
            enablePan={background ? true : false} // Pan enabled untuk background  
            autoRotate={!isSpeaking && !isUserTyping}
            autoRotateSpeed={0.8}
            maxPolarAngle={Math.PI / 1.6} // Lebih fleksibel
            minPolarAngle={Math.PI / 4}
            minDistance={background ? 3 : 2} // Batas zoom in
            maxDistance={background ? 10 : 5} // Batas zoom out
          />
        )}
      </Canvas>
      
      {/* ⏳ Loading State */}
      {loading && !background && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid #FFFFFF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            Loading...
          </div>
        </div>
      )}
      
      {/* 📝 Instructions untuk Background Avatar */}
      {background && !loading && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(21, 60, 48, 0.8)',
          fontSize: '12px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.7)',
          padding: '8px 16px',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(21, 60, 48, 0.2)',
          pointerEvents: 'none',
        }}>
          🖱️ Drag to rotate • Scroll to zoom
        </div>
      )}
      
      {/* ⚠️ Error State */}
      {error && !background && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '11px',
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.15)',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            Error
          </div>
          <div style={{ fontSize: '9px', opacity: 0.8 }}>
            Using Fallback
          </div>
        </div>
      )}
    </div>
  );
}

// Preload model
try {
  useGLTF.preload('/assets/models/a73f77cc659620e190b1d111f2cbc301.glb');
} catch (err) {
  console.log('Model preload skipped:', err);
}