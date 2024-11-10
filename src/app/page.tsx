'use client'
import { Canvas, extend, ThreeEvent, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three"
import React from "react"; import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { CameraControls, Line, useCursor } from "@react-three/drei";
import { Plane } from "three";
import { create } from "zustand";
import { combine } from "zustand/middleware";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import { CircleHelp, Download, Icon, Menu, Minus, Plus, Slice } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";


extend({ Line2 })


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
  radius?: number;
  lineWidth?: number;
}


type ALineType = "Meridian" | "Equator";

function ALine(type: ALineType) {
  return ({ radius = 1, lineWidth = 10, ...rest }: ALineProps) => {
    const curve = new THREE.EllipseCurve(
      0, 0,
      radius + 0.005, radius + 0.005,
      0, 2 * Math.PI,
      false,
      0
    );

    const points = curve.getPoints(150);
    const [selected, setSelected] = useState(false);
    const [hover, setHover] = useState(false);

    const { isClipped, planes, planeDistance, planeRadius } = useClipping();

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

    return <>
      <Line
        clippingPlanes={planes}
        points={points}
        color={!hover ? "black" : "blue"}
        linewidth={lineWidth}
        rotation={type === "Equator" ? [Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0]}
        onPointerOver={(ev) => {
          setHover(intersectedFirst(ev))
        }}
        onPointerOut={(_) => setHover(false)}
        onPointerDown={(ev) => {
          if (intersectedFirst(ev)) {
            setSelected(true);
          }
        }}
      />

      {isClipped && type == "Equator" &&
        <>
          <Line
            points={[[planeDistance * 1.005, 0, -planeRadius * 1.005], [planeDistance * 1.005, 0, planeRadius * 1.005]]}
            lineWidth={lineWidth}
            color={!hover ? "black" : "blue"}
            onPointerOver={(_) => {
              setHover(true)
            }}
            onPointerOut={(_) => setHover(false)}
            onPointerDown={(_) => {
              setSelected(true);
            }}
          />
          <Line
            points={[[-planeDistance * 1.005, 0, -planeRadius * 1.005], [-planeDistance * 1.005, 0, planeRadius * 1.005]]}
            lineWidth={lineWidth}
            color={!hover ? "black" : "blue"}
            onPointerOver={(_) => {
              setHover(true)
            }}
            onPointerOut={(_) => setHover(false)}
            onPointerDown={(_) => {
              setSelected(true);
            }}
          />
        </>
      }
    </>
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

const useClipping = create(
  combine({
    isClipped: false,
    planes: [] as THREE.Plane[],
    planeDistance: 0.0,
    planeRadius: 0.0,

  }, (set) => ({
    clip: (planes: THREE.Plane[], dist: number, radius: number) => set({ isClipped: true, planes: planes, planeDistance: dist, planeRadius: radius }),
    reset: () => set({ isClipped: false, planes: [], planeDistance: 0.0, planeRadius: 0.0 }),
  })),
)

function Vis() {
  const { camera, size, viewport } = useThree();
  const scale = Math.min(viewport.height / 2 - 0.5, viewport.width / 2 - 0.5);
  const pxScale = Math.min(size.height / 2, size.width / 2);
  const sphereRef = useRef<THREE.Sphere>(null!);
  const [hovered, setHovered] = useState<boolean>(false)

  const { isClipped, planes, planeDistance, planeRadius, clip, reset } = useClipping();
  useCursor(hovered)


  useEffect(() => {
    const distance = 0.65 * scale;
    const xAxis = new THREE.Vector3(1, 0, 0);
    const nxAxis = new THREE.Vector3(-1, 0, 0);

    const left = new Plane(xAxis, distance);
    const right = new Plane(nxAxis, distance);

    // pythagorean theorem
    const rr = Math.sqrt(scale * scale - distance * distance);

    clip([left, right], distance, rr * 1.001)
  }, [viewport]);


  // This is for debugging purposes
  useEffect(() => {
    console.log("camera", camera);
    console.log("viewport", viewport);
    console.log("size", size);

    // I did this for debugging purposes. This information already is inside the viewport object.
    console.log("c height", visibleHeightAtZDepth(5, camera as THREE.PerspectiveCamera));
    console.log("c width", visibleWidthAtZDepth(5, camera as THREE.PerspectiveCamera));

  }, []);


  const [selectedEq, setSelectedEq] = useState<boolean>(false);
  const [selectedMer, setSelectedMer] = useState<boolean>(false);
  // Just spreading the camera attributes for the "true" case leads to a bug, so I need to properly define both select / not selected states
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

    <group position={[0, 0, 0]} >
      <mesh
        onPointerMove={(ev) => {
          const { point } = ev;

          let inside = true;
          for (const plane of planes) {
            const distToPlane = plane.distanceToPoint(point)
            if (distToPlane < 0) {
              inside = false
            }
          }

          setHovered(inside);
        }}
        onPointerOut={(ev) => {
          setHovered(false);
        }}
        rotation={[Math.PI / 2, Math.PI / 2, 0]}
      >
        <sphereGeometry ref={sphereRef} args={[scale, 100, 64]} />
        <meshStandardMaterial clippingPlanes={planes} color="lightgrey">
        </meshStandardMaterial>
      </mesh>

      <Equator radius={scale} lineWidth={pxScale / 80} selected={setSelectedEq} />
      <Meridian radius={scale} lineWidth={pxScale / 80} selected={setSelectedMer} />
    </group>

    {
      isClipped &&
      <>
        <mesh position={[planeDistance, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[planeRadius, 64]} />
        </mesh>
        <mesh position={[-planeDistance, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[planeRadius, 64]} />
        </mesh>
      </>
    }

    <CameraControls ref={cc} minDistance={4} maxDistance={10} minPolarAngle={minP} maxPolarAngle={maxP} minAzimuthAngle={minA} maxAzimuthAngle={maxA} />
  </>;
}

const startZoom = 100
const useUI = create(
  combine({
    zoom: startZoom,
    limit: 50
  }, (set) => ({
    zoomOut: () => set(({ zoom, limit }) => ({ zoom: zoom > startZoom - limit ? zoom - 10 : zoom })),
    zoomIn: () => set(({ zoom, limit }) => ({ zoom: zoom < startZoom + limit ? zoom + 10 : zoom })),
    reset: () => set({ zoom: 1.0 }),
  })),
)

export default function Home() {
  const { zoom, zoomIn, zoomOut } = useUI()

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {
        //<Menubar>
        //  <MenubarMenu>
        //    <MenubarTrigger>File</MenubarTrigger>
        //    <MenubarContent>
        //      <MenubarItem>
        //        Download <MenubarShortcut>⌘S</MenubarShortcut>
        //      </MenubarItem>
        //    </MenubarContent>
        //  </MenubarMenu>
        //  <MenubarMenu>
        //    <MenubarTrigger>Options</MenubarTrigger>
        //    <MenubarContent>
        //      <MenubarItem>
        //        Cranium Clipping <MenubarShortcut>⌘C</MenubarShortcut>
        //      </MenubarItem>
        //    </MenubarContent>
        //  </MenubarMenu>
        //</Menubar>
        //
      }
      <div className="flex w-full">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Menu />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Download /><span>Download</span>
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Slice /> Cranium Clipping
                <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start h-4/5 w-4/5">
        <Canvas gl={{ localClippingEnabled: true }} camera={{ fov: 60 }} className="">
          <Vis />
        </Canvas>
      </main>

      <div className="flex w-full justify-between">
        <div>
          <Button variant="outline" onClick={zoomOut}>
            <Minus />
          </Button>
          <span className="p-2">{zoom}%</span>
          <Button variant="outline" onClick={zoomIn}>
            <Plus />
          </Button>
        </div>

        <Toggle>
          <CircleHelp />
        </Toggle>
      </div>
    </div >
  );
}
