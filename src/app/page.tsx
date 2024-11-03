'use client'
import { Canvas, Euler, extend, SphereGeometryProps, ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three"
import React from "react"; import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { CameraControls, Center, Line, OrbitControls, useAspect, useEnvironment } from "@react-three/drei";
import { create } from "zustand";
import { Group, Plane } from "three";
import { NotFoundBoundary } from "next/dist/client/components/not-found-boundary";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
extend({ Line2 })

const useCursorStore = create((set) => ({
  cursor: 'auto',
  interactable: () => set((state: any) => ({ cursor: 'grab' })),
  default: () => set((state: any) => ({ cursor: 'auto' })),
}))

interface KeyBinding {
  cmd: string | string[],
  callback: () => any,
}

export const useKeybindings = (...props: KeyBinding[]) => {
  const currentlyPressedKeys = new Set();

  const areAllKeyPressed = (keys: string | string[]) => {
    for (const key of keys) {
      if (!currentlyPressedKeys.has(key)) return false;
    }
    return true;
  }

  const bindingsKeyDown = (e: KeyboardEvent) => {
    currentlyPressedKeys.add(e.key);
    props.forEach((binding) => {
      if (areAllKeyPressed(binding.cmd)) {
        binding.callback();
      }
    });

  };

  const bindingsKeyUp = (e: KeyboardEvent) => {
    currentlyPressedKeys.delete(e.key);
  }

  useEffect(() => {
    document.addEventListener("keydown", bindingsKeyDown);
    document.addEventListener("keyup", bindingsKeyUp);
    return () => {
      document.removeEventListener("keydown", bindingsKeyDown);
      document.removeEventListener("keyup", bindingsKeyUp);
    };
  }, []);
};

/** Checks whether the first intersected object is the object that registered the event */
function intersectedFirst(ev: ThreeEvent<PointerEvent>) {
  return ev.eventObject.uuid == ev.intersections[0].object.uuid;
}

type ALineProps = {
  selected: (isSelected: boolean) => any;
  rotation: number;
  radius?: number;
  lineWidth?: number
}


type ALineType = "Meridian" | "Equator";

function ALine(type: ALineType) {
  return ({ radius = 1, lineWidth = 10, ...rest }: ALineProps) => {
    const curve = new THREE.EllipseCurve(
      0, 0,
      radius + 0.01, radius + 0.01,
      0, 2 * Math.PI,
      false,
      0
    );

    const points = curve.getPoints(150);
    const [selected, setSelected] = useState(false);
    const [hover, setHover] = useState(false);

    const mouseup = (_: MouseEvent) => {
      setSelected(false);
    };
    useEffect(() => {
      document.addEventListener('mouseup', mouseup);
      return () => {
        document.removeEventListener('mouseup', mouseup);
      };
    }, [selected]);

    useEffect(() => {
      rest.selected(selected);
    }, [selected])

    return (
      <Line
        points={points}
        color={!hover ? "black" : "blue"}
        linewidth={lineWidth}
        rotation={type === "Equator" ? [rest.rotation, 0, 0] : [0, rest.rotation, 0]}
        onPointerOver={(ev) => {
          setHover(intersectedFirst(ev))
        }}
        onPointerOut={(ev) => setHover(false)}
        onPointerDown={(ev) => {
          if (intersectedFirst(ev)) {
            setSelected(true);
          }
        }}
      />
    );
  }
}

const Meridian = ALine("Meridian");
const Equator = ALine("Equator");

const visibleHeightAtZDepth = (depth: any, camera: THREE.PerspectiveCamera) => {
  // vertical fov in radians
  const vFOV = camera.fov * Math.PI / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth: any, camera: THREE.PerspectiveCamera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};

function Vis() {
  const { camera, size, viewport } = useThree();
  const sphereRef = useRef<THREE.Sphere>(null!);
  const cursorInteractable = useCursorStore((state: any) => state.interactable);
  const cursorDefault = useCursorStore((state: any) => state.default);

  //const [leftPlane, setLeftPlane] = useState<Plane>(new THREE.Plane(new THREE.Vector3(100, 100, 100), 100));
  //const [rightPlane, setRightPlane] = useState<Plane>(new THREE.Plane(new THREE.Vector3(100, 100, 100), 100));


  function resize() {
    //const distance = radius / 2;
    //const xAxis = new THREE.Vector3(1, 0, 0);
    //const nxAxis = new THREE.Vector3(-1, 0, 0);
    //const rxAxis = xAxis.applyEuler(new THREE.Euler(0, rotationMer - Math.PI / 2, 0))
    //const rnxAxis = nxAxis.applyEuler(new THREE.Euler(0, rotationMer - Math.PI / 2, 0))
    //
    //const left = new Plane(rxAxis, distance);
    //const right = new Plane(rnxAxis, distance);

    //gl.clippingPlanes = [left, right]
  }

  useEffect(() => {
    console.log("camera", camera);
    console.log("viewport", viewport);
    console.log("size", size);

    // I did this for testing purposes. This information already is inside the viewport object.
    console.log("c height", visibleHeightAtZDepth(5, camera as THREE.PerspectiveCamera));
    console.log("c width", visibleWidthAtZDepth(5, camera as THREE.PerspectiveCamera));
    

    //console.log("camera pos", camera.position)
    //console.log("sphere pos", sphereRef.current?.position)

    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  //useEffect(() => {
  //  const distance = radius / 2;
  //  const xAxis = new THREE.Vector3(1, 0, 0);
  //  const nxAxis = new THREE.Vector3(-1, 0, 0);
  //  const rxAxis = xAxis.applyEuler(new THREE.Euler(0, rotationMer - Math.PI / 2, 0))
  //  const rnxAxis = nxAxis.applyEuler(new THREE.Euler(0, rotationMer - Math.PI / 2, 0))
  //
  //  const left = new Plane(rxAxis, distance);
  //  const right = new Plane(rnxAxis, distance);
  //
  //  gl.clippingPlanes = [left, right]
  //}, [rotationMer]);


  const [selectedEq, setSelectedEq] = useState<boolean>(false);
  const [selectedMer, setSelectedMer] = useState<boolean>(false);
  const [minP, setMinP] = useState(0);
  const [maxP, setMaxP] = useState(Math.PI);
  const [minA, setMinA] = useState(- Math.PI / 2);
  const [maxA, setMaxA] = useState(Math.PI / 2);

  useEffect(() => {
    if (selectedEq) {
      setMinP(Math.PI / 2);
      setMaxP(Math.PI / 2);
    } else {
      setMinP(0);
      setMaxP(Math.PI);
    }
  }, [selectedEq])

  useEffect(() => {
    if (selectedMer) {
      setMinA(0);
      setMaxA(0);
    } else {
      setMinA(-Math.PI / 2);
      setMaxA(Math.PI / 2);
    }
  }, [selectedMer])


  const cc = useRef<CameraControls>();

  const speed = .1;
  useKeybindings({
    cmd: "d",
    callback: () => { cc.current?.rotateAzimuthTo(cc.current!.azimuthAngle - speed, true); }
  }, {
    cmd: "a",
    callback: () => { cc.current?.rotateAzimuthTo(cc.current!.azimuthAngle + speed, true); }
  }, {
    cmd: "w",
    callback: () => { cc.current?.rotatePolarTo(cc.current!.polarAngle + speed, true); }
  }, {
    cmd: "s",
    callback: () => { cc.current?.rotatePolarTo(cc.current!.polarAngle - speed, true); }
  });

  return <>
    <ambientLight intensity={Math.PI / 2} />
    <spotLight position={[10, 10, 15]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />

    <group position={[0,0,0]} scale={Math.min(viewport.height / 2 - 1, viewport.width / 2 - 1)}>
      <mesh
        onPointerOver={(ev) => {
          cursorInteractable();
        }}
        onPointerOut={(ev) => {
          cursorDefault();
        }}
        rotation={[Math.PI / 2, Math.PI / 2, 0]}
      >
        <sphereGeometry ref={sphereRef} args={[1, 100, 64]} />
        <meshStandardMaterial color="lightgrey">
        </meshStandardMaterial>
      </mesh>

      <Equator selected={setSelectedEq} rotation={Math.PI / 2} />
      <Meridian selected={setSelectedMer} rotation={Math.PI / 2} />

    </group>

    <CameraControls minDistance={4} maxDistance={10} ref={cc} minPolarAngle={minP} maxPolarAngle={maxP} minAzimuthAngle={minA} maxAzimuthAngle={maxA} />
  </>;
}

export default function Home() {
  const cursor = useCursorStore((state: any) => state.cursor)

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start h-4/5 w-4/5">
        <Canvas camera={{}} className="" style={{ "cursor": cursor }}>
          <Vis />
        </Canvas>
      </main>
    </div>
  );
}
