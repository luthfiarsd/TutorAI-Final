// src/components/Avatar3D.jsx
import { Canvas } from "@react-three/fiber";
import { Experience } from "./Experience";

export default function Avatar3D({ isSpeaking = false, isUserTyping = false, background = false, size = 300 }) {
  return (
    <div
      style={{
        width: background ? "100%" : size,
        height: background ? "100%" : size * 1.2,
        position: background ? "absolute" : "relative",
        top: 0,
        left: 0,
        pointerEvents: background ? "none" : "auto",
        opacity: background ? 0.35 : 1,
      }}
    >
      <Canvas camera={{ position: [0, 1.8, 4], fov: 40 }}>
        <Experience isSpeaking={isSpeaking} isUserTyping={isUserTyping} />
      </Canvas>
    </div>
  );
}
