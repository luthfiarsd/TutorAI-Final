import { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';

function AvatarModel({ isSpeaking }) {
  const modelRef = useRef();
  const { scene } = useGLTF('/assets/models/avatar.glb');
  
  // Animate when speaking
  useFrame((state) => {
    if (modelRef.current) {
      if (isSpeaking) {
        // Subtle bounce animation
        modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.05;
        modelRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      } else {
        // Gentle idle animation
        modelRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
        modelRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
      }
    }
  });
  
  return <primitive ref={modelRef} object={scene} scale={1.5} />;
}

export default function Avatar3D({ isSpeaking = false, size = 100 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ background: 'linear-gradient(135deg, #153C30 0%, #2D7A5F 100%)' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <AvatarModel isSpeaking={isSpeaking} />
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          autoRotate={!isSpeaking}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}