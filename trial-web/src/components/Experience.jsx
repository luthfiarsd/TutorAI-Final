//Experience.jsx
import {
  ContactShadows,
  OrbitControls,
} from "@react-three/drei";
import { AvatarModel } from "./AvatarModel";
import { useThree } from "@react-three/fiber";

export const Experience = ({ isSpeaking = false, isUserTyping = false, isProcessing = false }) => {
  let anim = "Standing"; // default idle
  
  if (isUserTyping) {
    anim = "Typing";
  } else if (isProcessing) {
    anim = "Falling"; // Saat processing
  } else if (isSpeaking) {
    anim = "Speaking";
  }
  
  console.log('Experience animation:', { anim, isSpeaking, isUserTyping, isProcessing });
  
  const { scene } = useThree();
  scene.background = null;
  
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, 5, -5]} intensity={0.7} />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 6}
      />
      <group position-y={-1.5}>
        <ContactShadows opacity={0.42} scale={10} blur={1} far={10} />
        <AvatarModel 
          animation={anim} 
          isSpeaking={isSpeaking}
          scale={1.3} 
          position={[0, 0, 0]} 
        />
      </group>
    </>
  );
};