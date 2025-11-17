// src/components/AvatarModel.jsx
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export function AvatarModel({ animation, ...props }) {
  const group = useRef();
  const [animationEnded, setAnimationEnded] = useState(false);
  const currentActionRef = useRef(null);

  // Load GLB model
  const { nodes, materials } = useGLTF(
    "/assets/models/646d9dcdc8a5f5bddbfac913.glb"
  );

  // Load FBX animations
  const { animations: typingAnimation } = useFBX(
    "/assets/animations/Typing.fbx"
  );
  const { animations: standingAnimation } = useFBX(
    "/assets/animations/Standingidle.fbx"
  );
  const { animations: fallingAnimation } = useFBX(
    "/assets/animations/Fallingidle.fbx"
  );

  // Rename animations
  if (typingAnimation?.[0]) typingAnimation[0].name = "Typing";
  if (standingAnimation?.[0]) standingAnimation[0].name = "Standing";
  if (fallingAnimation?.[0]) fallingAnimation[0].name = "Falling";

  // Collect only existing animations
  const animList = [
    typingAnimation?.[0],
    standingAnimation?.[0],
    fallingAnimation?.[0],
  ].filter(Boolean);

  // Bind animations
  const { actions } = useAnimations(animList, group);

  // UBAH PENTING: Handle animation changes dengan proper reset
  useEffect(() => {
  if (!actions || !animation) return;

  const act = actions[animation];
  if (!act) return;

  if (currentActionRef.current && currentActionRef.current !== act) {
    currentActionRef.current.fadeOut(0.5);
  }

  // Ini yg penting - setiap animasi auto-loop
  act.clampWhenFinished = false;
  act.loop = THREE.LoopRepeat;
  act.reset().fadeIn(0.5).play();
  
  currentActionRef.current = act;

  return () => {
    act.fadeOut(0.5);
  };
}, [animation, actions]);


  // Render fallback if model not loaded
  if (!nodes) return null;

  return (
    <group {...props} ref={group} dispose={null}>
      {/* Rotation untuk correct avatar orientation - UBAH nilai rotation-x kalau masih salah */}
      <group rotation={[Math.PI * -0.5, 0, 0]}>
        <primitive object={nodes.Hips} />

        <skinnedMesh
          geometry={nodes.Wolf3D_Body.geometry}
          material={materials.Wolf3D_Body}
          skeleton={nodes.Wolf3D_Body.skeleton}
        />
        <skinnedMesh
          geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
          material={materials.Wolf3D_Outfit_Bottom}
          skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
        />
        <skinnedMesh
          geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
          material={materials.Wolf3D_Outfit_Footwear}
          skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
        />
        <skinnedMesh
          geometry={nodes.Wolf3D_Outfit_Top.geometry}
          material={materials.Wolf3D_Outfit_Top}
          skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
        />
        <skinnedMesh
          geometry={nodes.Wolf3D_Hair.geometry}
          material={materials.Wolf3D_Hair}
          skeleton={nodes.Wolf3D_Hair.skeleton}
        />

        <skinnedMesh
          name="EyeLeft"
          geometry={nodes.EyeLeft.geometry}
          material={materials.Wolf3D_Eye}
          skeleton={nodes.EyeLeft.skeleton}
          morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
          morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
        />
        <skinnedMesh
          name="EyeRight"
          geometry={nodes.EyeRight.geometry}
          material={materials.Wolf3D_Eye}
          skeleton={nodes.EyeRight.skeleton}
          morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
          morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
        />

        <skinnedMesh
          name="Wolf3D_Head"
          geometry={nodes.Wolf3D_Head.geometry}
          material={materials.Wolf3D_Skin}
          skeleton={nodes.Wolf3D_Head.skeleton}
          morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
          morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
        />
        <skinnedMesh
          name="Wolf3D_Teeth"
          geometry={nodes.Wolf3D_Teeth.geometry}
          material={materials.Wolf3D_Teeth}
          skeleton={nodes.Wolf3D_Teeth.skeleton}
          morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
          morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/assets/models/646d9dcdc8a5f5bddbfac913.glb");