import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AvatarModel } from "./AvatarModel";

export default function TestAvatar() {
  return (
    <Canvas camera={{ position: [0, 1.6, 4], fov: 40 }}>
      <OrbitControls />
      <AvatarModel animation="Standing" scale={1.3} />
    </Canvas>
  );
}
