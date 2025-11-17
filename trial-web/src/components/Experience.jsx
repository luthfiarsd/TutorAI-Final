// src/components/Experience.jsx
import {
  ContactShadows,
  Environment,
  Sky,
  OrbitControls,
} from "@react-three/drei";
import { AvatarModel } from "./AvatarModel"; // <-- import model loader

export const Experience = ({ isSpeaking = false, isUserTyping = false }) => {
  const anim = isUserTyping ? "Typing" : isSpeaking ? "Falling" : "Standing";

  return (
    <>
      <OrbitControls />
      <Sky />
      <Environment preset="sunset" />

      <group position-y={-1}>
        <ContactShadows opacity={0.42} scale={10} blur={1} far={10} />

        {/* Avatar model loader */}
        <AvatarModel animation={anim} scale={1.3} position={[0, 0, 0]} />

        {/* Optional table when typing */}
        {anim === "Typing" && (
          <mesh scale={[0.8, 0.5, 0.8]} position-y={0.25}>
            <boxGeometry />
            <meshStandardMaterial color="white" />
          </mesh>
        )}

        <mesh scale={5} rotation-x={-Math.PI / 2} position-y={-0.001}>
          <planeGeometry />
          <meshStandardMaterial color="white" />
        </mesh>
      </group>
    </>
  );
};
