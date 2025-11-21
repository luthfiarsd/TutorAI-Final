//Avatar3D.jsx
import { Canvas } from "@react-three/fiber";
import { Experience } from "./Experience";

export default function Avatar3D({ 
  isSpeaking = false, 
  isUserTyping = false,
  isProcessing = false, 
  size = 300 
}) {
  console.log('Avatar3D props:', { isSpeaking, isUserTyping, isProcessing, size });
  
  return (
    <div style={{ width: size, height: size * 1.2, position: "relative" }}>
      <Canvas 
        camera={{ position: [0, 0.3, 2.5], fov: 50 }} 
        gl={{ alpha: true, antialias: true, transparent: true }}
        style={{ background: "transparent" }}
      >
        <Experience 
          isSpeaking={isSpeaking} 
          isUserTyping={isUserTyping}
          isProcessing={isProcessing}
        />
      </Canvas>
    </div>
  );
}