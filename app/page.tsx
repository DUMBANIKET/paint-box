"use client"

import React, { useRef, useState, useEffect } from "react";
import { FaPaintBrush, FaEraser, FaUndo, FaRedo, FaSave, FaFill } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';

type Tool = 'brush' | 'eraser' | 'fill';
type Resolution = { width: number; height: number; label: string };

const RESOLUTIONS: Resolution[] = [
  { width: 16, height: 16, label: '16x16' },
  { width: 32, height: 32, label: '32x32' },
  { width: 64, height: 64, label: '64x64' },
  { width: 128, height: 128, label: '128x128' }
];

export default function Home() {
  const [resolution, setResolution] = useState<Resolution>(RESOLUTIONS[1]);
  const [pixelSize, setPixelSize] = useState(10);
  const [grid, setGrid] = useState<string[]>(Array(resolution.width * resolution.height).fill("#1a1a1a"));
  const [currentColor, setCurrentColor] = useState("#ffffff");
  const [undoStack, setUndoStack] = useState<string[][]>([]);
  const [redoStack, setRedoStack] = useState<string[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [lastDrawnGrid, setLastDrawnGrid] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleResolutionChange = (newRes: Resolution) => {
    setResolution(newRes);
    setGrid(Array(newRes.width * newRes.height).fill("#1a1a1a"));
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevGrid = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, grid]);
    setGrid(prevGrid);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextGrid = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, grid]);
    setGrid(nextGrid);
  };

  const handleDrawStart = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setLastDrawnGrid([...grid]);
    if (currentTool === 'fill') {
      handleCanvasClick(e);
    } else {
      draw(e);
    }
  };

  const handleDrawEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (JSON.stringify(lastDrawnGrid) !== JSON.stringify(grid)) {
      setUndoStack(prev => [...prev, lastDrawnGrid]);
      setRedoStack([]);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / pixelSize);
    const y = Math.floor((e.clientY - rect.top) * scaleY / pixelSize);
    
    if (x < 0 || x >= resolution.width || y < 0 || y >= resolution.height) return;
    
    const index = y * resolution.width + x;
    const newGrid = [...grid];
    newGrid[index] = currentTool === 'eraser' ? '#1a1a1a' : currentColor;
    setGrid(newGrid);
  };

  const floodFill = (startIndex: number, targetColor: string, replacementColor: string) => {
    if (targetColor === replacementColor) return;
    
    const newGrid = [...grid];
    const stack = [startIndex];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (newGrid[current] !== targetColor) continue;
      
      newGrid[current] = replacementColor;
      
      const x = current % resolution.width;
      const y = Math.floor(current / resolution.width);
      
      if (x > 0) stack.push(current - 1);
      if (x < resolution.width - 1) stack.push(current + 1);
      if (y > 0) stack.push(current - resolution.width);
      if (y < resolution.height - 1) stack.push(current + resolution.width);
    }
    
    const previousGrid = [...grid];
    setGrid(newGrid);
    setUndoStack(prev => [...prev, previousGrid]);
    setRedoStack([]);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / pixelSize);
    const y = Math.floor((e.clientY - rect.top) * scaleY / pixelSize);
    
    if (x < 0 || x >= resolution.width || y < 0 || y >= resolution.height) return;
    
    const index = y * resolution.width + x;
    if (currentTool === 'fill') {
      floodFill(index, grid[index], currentColor);
    }
  };

  const handleSaveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let minX = resolution.width, minY = resolution.height, maxX = 0, maxY = 0;

    grid.forEach((color, index) => {
      if (color !== "#1a1a1a") {
        const x = index % resolution.width;
        const y = Math.floor(index / resolution.width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    });

    if (minX > maxX || minY > maxY) {
      minX = 0;
      minY = 0;
      maxX = resolution.width - 1;
      maxY = resolution.height - 1;
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const width = (maxX - minX + 1) * pixelSize;
    const height = (maxY - minY + 1) * pixelSize;
    tempCanvas.width = width;
    tempCanvas.height = height;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const color = grid[y * resolution.width + x];
        if (color !== "#1a1a1a") {
          tempCtx.fillStyle = color;
          tempCtx.fillRect(
            (x - minX) * pixelSize,
            (y - minY) * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `pixel-art-${resolution.width}x${resolution.height}-${timestamp}.png`;
    const link = document.createElement('a');
    link.download = fileName;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, resolution.width * pixelSize, resolution.height * pixelSize);
    grid.forEach((color, index) => {
      const x = (index % resolution.width) * pixelSize;
      const y = Math.floor(index / resolution.width) * pixelSize;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, pixelSize, pixelSize);
      ctx.strokeStyle = "#333";
      ctx.strokeRect(x, y, pixelSize, pixelSize);
    });
  }, [grid, resolution, pixelSize]);

  const getCursorStyle = (tool: Tool) => {
    switch (tool) {
      case 'brush':
        return 'crosshair';
      case 'eraser':
        return 'cell';
      case 'fill':
        return 'crosshair';
      default:
        return 'default';
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
    <div className="max-w-7xl mx-auto">
     
      
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
        <div className="flex items-center gap-4 bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl shadow-lg">
          <select
            value={resolution.label}
            onChange={(e) => {
              const newRes = RESOLUTIONS.find(r => r.label === e.target.value);
              if (newRes) handleResolutionChange(newRes);
            }}
            className="bg-gray-700/50 text-white px-4 py-2 rounded-lg transition-colors hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RESOLUTIONS.map(res => (
              <option key={res.label} value={res.label}>
                {res.label}
              </option>
            ))}
          </select>
          
          <div className="relative group">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-600 hover:border-blue-500 transition-colors"
            />
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              Color Picker
            </span>
          </div>

          <div className="flex gap-3">
            {[
              { tool: 'brush', icon: FaPaintBrush, label: 'Brush' },
              { tool: 'eraser', icon: FaEraser, label: 'Eraser' },
              { tool: 'fill', icon: FaFill, label: 'Fill' }
            ].map(({ tool, icon: Icon, label }) => (
              <button
                key={tool}
                className={`p-3 rounded-lg transition-all transform hover:scale-105 ${
                  currentTool === tool 
                    ? 'bg-blue-600 shadow-lg shadow-blue-500/50' 
                    : 'bg-gray-700/50 hover:bg-gray-600/50'
                }`}
                onClick={() => setCurrentTool(tool as Tool)}
                data-tooltip-id={`tooltip-${tool}`}
              >
                <Icon className="w-5 h-5" />
                <Tooltip id={`tooltip-${tool}`} place="bottom">
                  {label}
                </Tooltip>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl shadow-lg">
          {[
            { action: handleUndo, icon: FaUndo, label: 'Undo', disabled: undoStack.length === 0 },
            { action: handleRedo, icon: FaRedo, label: 'Redo', disabled: redoStack.length === 0 },
            { action: handleSaveImage, icon: FaSave, label: 'Save', disabled: false }
          ].map(({ action, icon: Icon, label, disabled }) => (
            <button
              key={label}
              onClick={action}
              disabled={disabled}
              className={`p-3 rounded-lg transition-all transform hover:scale-105 ${
                disabled 
                  ? 'bg-gray-700/30 cursor-not-allowed' 
                  : 'bg-gray-700/50 hover:bg-gray-600/50'
              }`}
              data-tooltip-id={`tooltip-${label.toLowerCase()}`}
            >
              <Icon className={`w-5 h-5 ${disabled ? 'opacity-50' : ''}`} />
              <Tooltip id={`tooltip-${label.toLowerCase()}`} place="bottom">
                {label}
              </Tooltip>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-xl">
        <div className="relative aspect-square max-w-3xl mx-auto overflow-hidden rounded-lg">
          <canvas
            ref={canvasRef}
            width={resolution.width * pixelSize}
            height={resolution.height * pixelSize}
            className="w-full h-full imageRendering-pixelated"
            style={{
              imageRendering: 'pixelated',
              cursor: getCursorStyle(currentTool),
              boxShadow: '0 0 20px rgba(0,0,0,0.3)'
            }}
            onMouseDown={handleDrawStart}
            onMouseMove={draw}
            onMouseUp={handleDrawEnd}
            onMouseLeave={handleDrawEnd}
          />
        </div>
      </div>
    </div>
  </div>
);
}