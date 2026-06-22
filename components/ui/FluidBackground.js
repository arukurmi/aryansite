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
          DYE_RESOLUTION: 1024,
          DENSITY_DISSIPATION: 0.999,
          VELOCITY_DISSIPATION: 0.99,
          PRESSURE: 0.8,
          PRESSURE_ITERATIONS: 20,
          CURL: 30,
          SPLAT_RADIUS: 0.25,
          SPLAT_FORCE: 6000,
          SHADING: true,
          COLORFUL: true,
          COLOR_UPDATE_SPEED: 10,
          PAUSED: false,
          BACK_COLOR: { r: 0, g: 0, b: 0 },
          TRANSPARENT: true,
          BLOOM: false, // Disabling bloom to make the colors more settled/pastel and less tacky/neon
          SUNRAYS: false, // Disabling sunrays to keep it looking like paint rather than glowing plasma
        });
      }
    };
    initFluid();

    let lastX = 0;
    let lastY = 0;

    const forwardMouseEvent = (e) => {
      if (!e.isTrusted) return;

      if (canvasRef.current) {
        const event = new MouseEvent(e.type, {
          clientX: e.clientX,
          clientY: e.clientY,
          bubbles: false,
          cancelable: true,
        });

        Object.defineProperty(event, 'offsetX', { value: e.clientX });
        Object.defineProperty(event, 'offsetY', { value: e.clientY });
        
        const movementX = e.movementX !== undefined ? e.movementX : e.clientX - lastX;
        const movementY = e.movementY !== undefined ? e.movementY : e.clientY - lastY;
        
        Object.defineProperty(event, 'movementX', { value: movementX });
        Object.defineProperty(event, 'movementY', { value: movementY });
        
        lastX = e.clientX;
        lastY = e.clientY;

        canvasRef.current.dispatchEvent(event);
      }
    };

    const forwardTouchEvent = (e) => {
      if (!e.isTrusted) return;

      if (canvasRef.current && e.touches.length > 0) {
        const touch = e.touches[0];
        const event = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: false,
          cancelable: true,
        });

        Object.defineProperty(event, 'offsetX', { value: touch.clientX });
        Object.defineProperty(event, 'offsetY', { value: touch.clientY });
        
        const movementX = touch.clientX - lastX;
        const movementY = touch.clientY - lastY;
        
        Object.defineProperty(event, 'movementX', { value: movementX });
        Object.defineProperty(event, 'movementY', { value: movementY });

        lastX = touch.clientX;
        lastY = touch.clientY;

        canvasRef.current.dispatchEvent(event);
      }
    };

    window.addEventListener('mousemove', forwardMouseEvent);
    window.addEventListener('mousedown', forwardMouseEvent);
    window.addEventListener('mouseup', forwardMouseEvent);
    window.addEventListener('touchstart', forwardTouchEvent, { passive: true });
    window.addEventListener('touchmove', forwardTouchEvent, { passive: true });

    return () => {
      window.removeEventListener('mousemove', forwardMouseEvent);
      window.removeEventListener('mousedown', forwardMouseEvent);
      window.removeEventListener('mouseup', forwardMouseEvent);
      window.removeEventListener('touchstart', forwardTouchEvent);
      window.removeEventListener('touchmove', forwardTouchEvent);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden opacity-50 contrast-75 brightness-90">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
