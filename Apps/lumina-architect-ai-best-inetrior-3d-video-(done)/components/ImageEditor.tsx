import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { ToolType, Point, ImageEditorHandle } from '../types';

interface ImageEditorProps {
  image: HTMLImageElement | null;
  tool: ToolType;
  brushSize: number;
  onMaskChange: (hasMask: boolean) => void;
}

export const ImageEditor = forwardRef<ImageEditorHandle, ImageEditorProps>(({ 
  image, 
  tool, 
  brushSize,
  onMaskChange 
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getMaskDataURL: () => {
      if (!maskCanvasRef.current || !image) return null;
      
      const width = maskCanvasRef.current.width;
      const height = maskCanvasRef.current.height;
      const ctx = maskCanvasRef.current.getContext('2d');
      
      if (!ctx) return null;

      // Get the current mask data (red strokes)
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Create a temporary canvas to generate the binary mask
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) return null;

      // Create new image data for the binary mask
      const newImgData = tempCtx.createImageData(width, height);
      const newData = newImgData.data;

      // Loop through pixels: if alpha > 0, make it white; otherwise black
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
          // White (Selected)
          newData[i] = 255;     // R
          newData[i + 1] = 255; // G
          newData[i + 2] = 255; // B
          newData[i + 3] = 255; // A
        } else {
          // Black (Background)
          newData[i] = 0;
          newData[i + 1] = 0;
          newData[i + 2] = 0;
          newData[i + 3] = 255;
        }
      }

      tempCtx.putImageData(newImgData, 0, 0);
      return tempCanvas.toDataURL('image/png');
    }
  }));

  // Initialize and resize canvases
  useEffect(() => {
    if (!image || !containerRef.current || !imageCanvasRef.current || !maskCanvasRef.current) return;

    const container = containerRef.current;
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    // Calculate aspect ratio fit
    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;
    const imgRatio = image.width / image.height;
    const containerRatio = maxWidth / maxHeight;

    let displayWidth, displayHeight;

    if (containerRatio > imgRatio) {
      displayHeight = maxHeight;
      displayWidth = displayHeight * imgRatio;
    } else {
      displayWidth = maxWidth;
      displayHeight = displayWidth / imgRatio;
    }

    // Set canvas dimensions to match display size for crisp rendering
    // Ideally we match natural size but for performance/display we scale
    // Let's use natural size for the buffer, style width for display
    imageCanvas.width = image.width;
    imageCanvas.height = image.height;
    maskCanvas.width = image.width;
    maskCanvas.height = image.height;

    // Draw the main image
    const ctx = imageCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(image, 0, 0);
    }

    // Set CSS dimensions
    setScale(displayWidth / image.width);
    
  }, [image]);

  // Handle Drawing Logic
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    if (!maskCanvasRef.current || !image) return null;
    const rect = maskCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x, y };
  };

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current) return;
    
    const point = getCoordinates(e);
    if (!point) return;

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSize / scale; // Adjust brush size for scale

    if (tool === ToolType.ERASER) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)'; // Red semi-transparent mask
      ctx.fillStyle = 'rgba(255, 50, 50, 0.5)';
    }

    ctx.beginPath();
    if (lastPoint) {
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    } else {
        // Dot
        ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    setLastPoint(point);
    onMaskChange(true); // Signal that mask has been modified
  }, [isDrawing, lastPoint, tool, brushSize, scale, onMaskChange]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === ToolType.MOVE) return;
    setIsDrawing(true);
    const point = getCoordinates(e);
    setLastPoint(point);
    draw(e); // Draw initial dot
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const handleMouseEnter = () => {
    if (cursorRef.current) cursorRef.current.style.display = 'block';
  };

  const handleMouseLeave = () => {
    if (cursorRef.current) cursorRef.current.style.display = 'none';
    setIsDrawing(false);
    setLastPoint(null);
  };

  // Custom Cursor for Brush Size
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (cursorRef.current) {
          cursorRef.current.style.left = `${e.clientX}px`;
          cursorRef.current.style.top = `${e.clientY}px`;
          cursorRef.current.style.width = `${brushSize}px`;
          cursorRef.current.style.height = `${brushSize}px`;
          cursorRef.current.style.borderColor = tool === ToolType.ERASER ? 'white' : 'red';
      }
      draw(e);
  };

  if (!image) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-700 rounded-xl bg-brand-800/50">
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden bg-brand-900 rounded-xl shadow-inner border border-brand-700">
      <div 
        className="relative shadow-2xl"
        style={{ 
          width: image.width * scale, 
          height: image.height * scale 
        }}
      >
        <canvas
          ref={imageCanvasRef}
          className="absolute top-0 left-0 w-full h-full object-contain"
        />
        <canvas
          ref={maskCanvasRef}
          className={`absolute top-0 left-0 w-full h-full object-contain ${tool === ToolType.MOVE ? 'cursor-grab' : 'cursor-none'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        />
      </div>
      
      {/* Custom Brush Cursor */}
      <div 
        ref={cursorRef}
        className="pointer-events-none fixed border-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-50 mix-blend-difference"
        style={{ display: 'none' }}
      />
    </div>
  );
});

ImageEditor.displayName = 'ImageEditor';
