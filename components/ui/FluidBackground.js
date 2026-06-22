import { useEffect, useRef } from 'react';

export default function FluidBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let fluid;
    const initFluid = async () => {
      if (typeof window !== 'undefined') {
        const webglFluid = (await import('webgl-fluid')).default;
        fluid = webglFluid(canvasRef.current, {
          IMMEDIATE: true,
          TRIGGER: 'hover',
          SIM_RESOLUTION: 128,
          DYE_RESOLUTION: 512,
          DENSITY_DISSIPATION: 0.97,
          VELOCITY_DISSIPATION: 0.98,
          PRESSURE_ITERATIONS: 20,
          CURL: 30,
          SPLAT_RADIUS: 0.5,
          SHADING: true,
          COLORFUL: true,
          PAUSED: false,
          BACK_COLOR: { r: 15, g: 23, b: 42 }, // Matches tailwind dark-900 (#0f172a)
          TRANSPARENT: false
        });
      }
    };
    initFluid();

    return () => {
      // webgl-fluid automatically cleans up the canvas on unmount if it's removed
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-auto overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
