// src/components/Avatar3D.jsx
import { Canvas } from "@react-three/fiber";
import { Experience } from "./Experience";

export default function Avatar3D({ 
  isSpeaking = false, 
  isUserTyping = false, 
  background = false, 
  size = 300 
}) {
  return (
    <div
      style={{
        width: background ? "0%" : size,
        height: background ? "0%" : size * 1.2,
        position: background ? "absolute" : "relative",
        top: 0,
        left: 0,
        pointerEvents: "auto", // UBAH: dari "none" jadi "auto"
        opacity: background ? 1 : 1, // UBAH: dari 0.35 jadi 1 (hilangkan background)
      }}
    >
      <Canvas camera={{ position: [0, 0.3, 2.5], fov: 50 }}> {/* UBAH: camera untuk video call view */}
        <Experience isSpeaking={isSpeaking} isUserTyping={isUserTyping} />
      </Canvas>
    </div>
  );
}