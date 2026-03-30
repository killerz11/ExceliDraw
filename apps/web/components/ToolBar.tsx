'use client';
import { AppState, ToolType } from '../lib/types';

interface ToolBarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

// Each tool button config — add new tools here in future
const tools: { type: ToolType; label: string; icon: string }[] = [
  { type: 'select', label: 'Select', icon: '↖' },
  { type: 'rect',   label: 'Rectangle', icon: '▭' },
  { type: 'ellipse',label: 'Ellipse', icon: '◯' },
  { type: 'line',   label: 'Line', icon: '╱' },
  { type: 'pencil', label: 'Pencil', icon: '✏' },
];

export default function ToolBar({ activeTool, onToolChange }: ToolBarProps) {
  return (
    <div className="flex flex-col gap-1 p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl">
      {tools.map(tool => (
        <button
          key={tool.type}
          onClick={() => onToolChange(tool.type)}
          title={tool.label}
          className={`
            w-10 h-10 rounded-lg text-lg flex items-center justify-center
            transition-colors cursor-pointer
            ${activeTool === tool.type
              ? 'bg-white text-black'           // active tool — white background
              : 'text-[#888] hover:text-white hover:bg-[#2a2a2a]'  // inactive
            }
          `}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}