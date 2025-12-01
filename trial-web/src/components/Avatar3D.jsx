import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';

// --- Komponen Pemuat GLB dan Logika Animasi ---
function AvatarModel({ isSpeaking, isUserTyping }) {
  // Ganti '/model.glb' dengan path file GLB Anda jika berbeda
  const { scene, animations } = useGLTF('/assets/models/npetani.glb');
  const { actions, names } = useAnimations(animations, scene);
  
  const meshRef = useRef();

  // Pastikan scene memiliki referensi agar animasi dapat diputar
  useEffect(() => {
    meshRef.current = scene;
  }, [scene]);

  // Logika Animasi
  useEffect(() => {
    if (!names || names.length === 0) return;

    // Nama animasi yang akan diputar saat idle (ganti jika Anda punya nama animasi idle spesifik)
    const idleAction = actions[names[0]]; 

    // Stop semua animasi
    Object.values(actions).forEach(action => action.stop());

    if (isSpeaking) {
      // Jika berbicara: Putar animasi bicara/interaksi (jika ada)
      // Contoh: Ganti 'Talking' dengan nama animasi bicara di GLB Anda
      const talkAction = actions['Talking'] || idleAction; 
      talkAction.reset().fadeIn(0.2).play();
    } else if (isUserTyping) {
      // Jika memproses: Putar animasi loading/thinking
      // Contoh: Ganti 'Thinking' dengan nama animasi berpikir di GLB Anda
      const thinkAction = actions['Thinking'] || idleAction;
      thinkAction.reset().fadeIn(0.5).play();
    } else {
      // Jika idle: Putar animasi idle
      idleAction.reset().fadeIn(0.5).play();
    }

    // Cleanup: Fade out animasi saat komponen di-unmount/state berubah
    return () => {
      idleAction.fadeOut(0.5);
    };

  }, [isSpeaking, isUserTyping, actions, names]);

  // Opsional: Buat model berputar pelan saat idle
  useFrame(() => {
    if (meshRef.current && !isSpeaking && !isUserTyping) {
      meshRef.current.rotation.y += 0.005;
    }
  });


  // Model GLB perlu di-scale dan diposisikan agar pas di tengah Canvas
  // Nilai scale dan posisi ini SANGAT bergantung pada ukuran model GLB Anda
  const scaleFactor = 1; // Sesuaikan jika model Anda terlalu besar/kecil
  
  return (
    <primitive 
      object={scene} 
      scale={scaleFactor} 
      position={[0, -1.5, 0]} // Angkat sedikit agar tidak tenggelam (sesuaikan)
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
        // Atur posisi kamera agar model terlihat penuh
        camera={{ position: [0, 0, 4], fov: 40 }} 
      >
        <Suspense fallback={<Html center>Loading 3D Model...</Html>}>
          {/* Pencahayaan Studio Sederhana */}
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