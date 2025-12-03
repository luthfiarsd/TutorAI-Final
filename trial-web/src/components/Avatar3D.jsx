import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useFBX, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Komponen Pemuat GLB dan Logika Animasi ---
function AvatarModel({ isSpeaking, isUserTyping }) {
  // Load model utama (GLB)
  const { scene } = useGLTF('/assets/models/npetani.glb');
  
  // Load animasi FBX
  const thinkingAnim = useFBX('/assets/models/npetani.glb');
  const speakingAnim = useFBX('/assets/models/acurigduduk.fbx');
  
  const meshRef = useRef();
  const mixer = useRef();

  // Setup AnimationMixer
  useEffect(() => {
    if (!scene) return;
    
    meshRef.current = scene;
    mixer.current = new THREE.AnimationMixer(scene);

    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
    };
  }, [scene]);

  // Logika Animasi berdasarkan state
  useEffect(() => {
    if (!mixer.current) return;

    // Stop semua animasi yang sedang berjalan
    mixer.current.stopAllAction();

    let currentAnimation = null;

    if (isSpeaking && speakingAnim?.animations?.[0]) {
      // Jika sedang berbicara (TTS aktif)
      currentAnimation = mixer.current.clipAction(speakingAnim.animations[0]);
      currentAnimation.setLoop(THREE.LoopRepeat);
      currentAnimation.reset().fadeIn(0.3).play();
      
    } else if (isUserTyping && thinkingAnim?.animations?.[0]) {
      // Jika sedang thinking/processing
      currentAnimation = mixer.current.clipAction(thinkingAnim.animations[0]);
      currentAnimation.setLoop(THREE.LoopRepeat);
      currentAnimation.reset().fadeIn(0.5).play();
      
    } else {
      // Idle state - model diam atau animasi default
      // Bisa tambahkan idle animation jika ada
    }

    return () => {
      if (currentAnimation) {
        currentAnimation.fadeOut(0.3);
      }
    };
  }, [isSpeaking, isUserTyping, thinkingAnim, speakingAnim]);

  // Update AnimationMixer setiap frame
  useFrame((state, delta) => {
    if (mixer.current) {
      mixer.current.update(delta);
    }

    // Rotasi pelan saat idle
    if (meshRef.current && !isSpeaking && !isUserTyping) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  // Sesuaikan scale dan posisi model
  const scaleFactor = 1;
  
  return (
    <primitive 
      object={scene} 
      scale={scaleFactor} 
      position={[0, -1.5, 0]} 
    />
  );
}

// --- Komponen Pembungkus (Wrapper) ---
export default function Avatar3D({ isSpeaking, isUserTyping, size = 100 }) {
  const canvasSize = `${size}px`; 

  return (
    <div style={{ width: canvasSize, height: canvasSize, margin: '0 auto' }}>
      <Canvas 
        shadows
        camera={{ position: [0, 0, 4], fov: 40 }} 
      >
        <Suspense fallback={<Html center>Loading 3D Model...</Html>}>
          {/* Pencahayaan Studio */}
          <ambientLight intensity={0.8} />
          <spotLight position={[5, 10, 5]} angle={0.3} penumbra={1} intensity={2} castShadow />

          {/* Model Avatar */}
          <AvatarModel 
            isSpeaking={isSpeaking} 
            isUserTyping={isUserTyping} 
          />
        </Suspense>
      </Canvas>
    </div>
  );
}