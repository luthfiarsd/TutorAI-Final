import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import React, { useEffect, useRef } from "react";

export function AvatarModel({ animation, isSpeaking = false, ...props }) {
  const group = useRef();
  
  // Load model dan animations
  const { nodes, materials } = useGLTF("/assets/models/646d9dcdc8a5f5bddbfac913.glb");
  const { animations: typingAnimation } = useFBX("/assets/animations/Typing.fbx");
  const { animations: standingAnimation } = useFBX("/assets/animations/Standingidle.fbx");
  const { animations: speakingAnimation } = useFBX("/assets/animations/Talkingcoba.fbx");
  const { animations: fallingAnimation } = useFBX("/assets/animations/Fallingidle.fbx");

  // Rename animations
  if (typingAnimation?.[0]) typingAnimation[0].name = "Typing";
  if (standingAnimation?.[0]) standingAnimation[0].name = "Standing";
  if (speakingAnimation?.[0]) speakingAnimation[0].name = "Speaking";
  if (fallingAnimation?.[0]) fallingAnimation[0].name = "Falling";

  const animList = [
    typingAnimation?.[0], 
    standingAnimation?.[0], 
    speakingAnimation?.[0],
    fallingAnimation?.[0]
  ].filter(Boolean);

  const { actions } = useAnimations(animList, group);

  // 🔥 FIX UTAMA - Gunakan pattern seperti Avatar.jsx
  useEffect(() => {
    if (!actions) return;

    // Tentukan animasi yang harus diplay
    let targetAnimation = animation;
    if (isSpeaking) {
      targetAnimation = "Speaking";
    }

    const currentAction = actions[targetAnimation];
    if (!currentAction) return;

    // ✅ Pattern dari Avatar.jsx - Simple dan Smooth!
    currentAction.reset().fadeIn(0.5).play();
    
    return () => {
      // Cleanup dengan fadeOut
      currentAction.reset().fadeOut(0.5);
    };
  }, [animation, isSpeaking, actions]);

  if (!nodes) return null;

  return (
    <group {...props} ref={group} dispose={null}>
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