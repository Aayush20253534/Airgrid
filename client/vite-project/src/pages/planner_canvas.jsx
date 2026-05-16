import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Rect, Circle, Line, Group, Text } from 'react-konva';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  Cpu, 
  Radio, 
  Layers, 
  Eye, 
  Zap, 
  AlertTriangle, 
  Activity, 
  RefreshCw, 
  Sliders, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  Info,
  Maximize2
} from 'lucide-react';
import {
  analyzePlannerLayout,
  optimizePlannerLayout,
  saveProject,
  getProjects,
  getProjectByFile,
} from "../api/plannerApi";

// ==========================================
// CONSTANTS & CONFIGURATIONS
// ==========================================
const GRID_SIZE = 40;
const DEFAULT_BLOCKS_X = 20;
const DEFAULT_BLOCKS_Y = 14;

const DEVICE_TYPES = {
  WIFI_AP: { type: 'WiFi AP', icon: Wifi, color: '#06b6d4', defaultRange: 120, freq: '2.4 GHz', chan: 6, power: 20 },
  ROUTER: { type: 'Router', icon: Layers, color: '#3b82f6', defaultRange: 140, freq: '5.0 GHz', chan: 36, power: 23 },
  IOT_NODE: { type: 'IoT Node', icon: Cpu, color: '#10b981', defaultRange: 80, freq: '915 MHz', chan: 1, power: 14 },
  BLE_BEACON: { type: 'BLE Beacon', icon: Radio, color: '#f59e0b', defaultRange: 50, freq: '2.4 GHz', chan: 37, power: 4 },
};

const INITIAL_NODES = [
  { id: 'node-1', type: 'WiFi AP', x: 200, y: 200, range: 130, frequency: '2.4 GHz', channel: 6, power: 20, name: 'AP-Alpha' },
  { id: 'node-2', type: 'WiFi AP', x: 340, y: 240, frequency: '2.4 GHz', channel: 6, power: 18, range: 110, name: 'AP-Beta' },
  { id: 'node-3', type: 'IoT Node', x: 550, y: 380, frequency: '915 MHz', channel: 1, power: 14, range: 90, name: 'IoT-Sens1' },
];

export default function AirGridPlannerCanvas() {
  // States
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [backendAnalysis, setBackendAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState("");
  const [projectName, setProjectName] = useState("");
  const [savedProjects, setSavedProjects] = useState([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [areaBlocksX, setAreaBlocksX] = useState(DEFAULT_BLOCKS_X);
  const [areaBlocksY, setAreaBlocksY] = useState(DEFAULT_BLOCKS_Y);
  const CANVAS_WIDTH = areaBlocksX * GRID_SIZE;
  const CANVAS_HEIGHT = areaBlocksY * GRID_SIZE;
  
  // Visualization Toggles
  const [visuals, setVisuals] = useState({
    coverage: true,
    heatmap: false,
    interference: true,
    deadZones: false,
  });

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  // Handle Drag & Drop registration from sidebar
  const handleDragStartFromSidebar = (e, deviceType) => {
    e.dataTransfer.setData('text/plain', deviceType);
  };

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    const container = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - container.left;
    const y = e.clientY - container.top;
    
    const deviceTypeKey = e.dataTransfer.getData('text/plain');
    const template = DEVICE_TYPES[deviceTypeKey];
    
    if (template) {
      const newNode = {
        id: `node-${Date.now()}`,
        type: template.type,
        x: Math.max(20, Math.min(x, CANVAS_WIDTH - 20)),
        y: Math.max(20, Math.min(y, CANVAS_HEIGHT - 20)),
        range: template.defaultRange,
        frequency: template.freq,
        channel: template.chan,
        power: template.power,
        name: `${template.type.replace(' ', '')}-${nodes.length + 1}`
      };
      setNodes([...nodes, newNode]);
      setSelectedNodeId(newNode.id);
    }
  };
  const buildPlannerPayload = () => ({
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  gridSize: GRID_SIZE,
  nodes,
});

const handleAnalyzeWithBackend = async () => {
  try {
    setIsAnalyzing(true);
    setApiError("");

    const data = await analyzePlannerLayout(buildPlannerPayload());
    setBackendAnalysis(data);
  } catch (error) {
    setApiError(error.message);
  } finally {
    setIsAnalyzing(false);
  }
};

const handleOptimizeWithBackend = async () => {
  try {
    setIsAnalyzing(true);
    setApiError("");

    const data = await optimizePlannerLayout(buildPlannerPayload());

    setBackendAnalysis(data);
    setRecommendations(data.suggestions || []);
    setShowRecommendations(true);
  } catch (error) {
    setApiError(error.message);
  } finally {
    setIsAnalyzing(false);
  }
};

const handleSaveProject = async () => {
  try {
    setApiError("");

    const name = prompt("Enter project name:");

    if (!name || !name.trim()) {
      alert("Project name is required");
      return;
    }

    await saveProject({
      projectName: name.trim(),
      areaBlocksX,
      areaBlocksY,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      gridSize: GRID_SIZE,
      nodes,
      visualSettings: visuals,
      lastAnalysis: backendAnalysis,
    });

    alert("Project saved successfully");
    handleLoadProjects();
  } catch (error) {
    setApiError(error.message);
  }
};

const handleLoadProjects = async () => {
  try {
    setApiError("");

    const data = await getProjects();

    setSavedProjects(data);
    setShowProjectPicker(true);

    if (data.length === 0) {
      alert("No saved project files found");
    }
  } catch (error) {
    setApiError(error.message);
  }
};

const handleOpenProject = async (projectFile) => {
  try {
    setApiError("");

    const project = await getProjectByFile(projectFile.fileName);

    setAreaBlocksX(project.areaBlocksX || DEFAULT_BLOCKS_X);
    setAreaBlocksY(project.areaBlocksY || DEFAULT_BLOCKS_Y);
    setNodes(project.nodes || []);
    setVisuals(project.visualSettings || visuals);
    setBackendAnalysis(project.lastAnalysis || null);
    setSelectedNodeId(null);
    setRecommendations([]);
    setShowRecommendations(false);
    setShowProjectPicker(false);

    alert(`Loaded project: ${project.projectName}`);
  } catch (error) {
    setApiError(error.message);
  }
};

  const handleNodeDragMove = (id, e) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    
    setNodes(nodes.map(node => {
      if (node.id === id) {
        return {
          ...node,
          x: Math.max(10, Math.min(pointerPos.x, CANVAS_WIDTH - 10)),
          y: Math.max(10, Math.min(pointerPos.y, CANVAS_HEIGHT - 10)),
        };
      }
      return node;
    }));
  };

  const updateSelectedNodeProperty = (key, value) => {
    if (!selectedNodeId) return;
    setNodes(nodes.map(node => node.id === selectedNodeId ? { ...node, [key]: value } : node));
  };

  const resetCanvas = () => {
    setNodes([]);
    setSelectedNodeId(null);
    setRecommendations([]);
    setShowRecommendations(false);
  };

  // ==========================================
  // CORE ENGINE ALGORITHMS
  // ==========================================

  // 1. Coverage & Heatmap Matrix Grid Calculations
  const gridAnalysis = useMemo(() => {
    const cols = Math.ceil(CANVAS_WIDTH / GRID_SIZE);
    const rows = Math.ceil(CANVAS_HEIGHT / GRID_SIZE);
    let coveredCellsCount = 0;
    let deadCellsCount = 0;
    const cells = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellX = c * GRID_SIZE + GRID_SIZE / 2;
        const cellY = r * GRID_SIZE + GRID_SIZE / 2;
        
        let highestSignal = 0;
        let activeInterferenceTint = 0;
        let channelsPresent = [];

        // Determine if cell is covered and measure composite signal strength
        nodes.forEach(node => {
          const dx = cellX - node.x;
          const dy = cellY - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= node.range) {
            // Logarithmic signal loss simulation scaled up for visual aesthetic
            const signal = Math.max(0, (1 - distance / node.range) * node.power);
            if (signal > highestSignal) highestSignal = signal;
            
            channelsPresent.push(node.channel);
          }
        });

        // Calculate micro-interference local variants per cell
        const uniqueChans = new Set(channelsPresent);
        if (channelsPresent.length > uniqueChans.size) {
          activeInterferenceTint = (channelsPresent.length - uniqueChans.size) * 0.4;
        }

        const isCovered = highestSignal > 0;
        if (isCovered) coveredCellsCount++;
        else deadCellsCount++;

        cells.push({
          x: c * GRID_SIZE,
          y: r * GRID_SIZE,
          isCovered,
          signalStrength: highestSignal,
          interferenceTint: Math.min(activeInterferenceTint, 1)
        });
      }
    }

    const totalCells = cols * rows;
    const coveragePercent = totalCells > 0 ? Math.round((coveredCellsCount / totalCells) * 100) : 0;
    const deadZonePercent = totalCells > 0 ? Math.round((deadCellsCount / totalCells) * 100) : 0;

    return { cells, coveragePercent, deadZonePercent };
  }, [nodes]);

  // 2. Inter-Node Interference Vector Detection
  const interferenceVectors = useMemo(() => {
    const vectors = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Interference if bounding coverage geometry circles intersect
        if (distance < (n1.range + n2.range)) {
          let severity = 'low';
          // Higher crash risk if matching frequencies and exact/near channel numbers
          if (n1.frequency === n2.frequency) {
            const chanDiff = Math.abs(n1.channel - n2.channel);
            if (chanDiff === 0) severity = 'critical';
            else if (chanDiff <= 4) severity = 'medium';
          }
          
          vectors.push({
            id: `${n1.id}-${n2.id}`,
            from: { x: n1.x, y: n1.y, name: n1.name },
            to: { x: n2.x, y: n2.y, name: n2.name },
            severity
          });
        }
      }
    }
    return vectors;
  }, [nodes]);

  
  // 3. Score Evaluator Matrix
  const networkHealthScore = useMemo(() => {
    if (nodes.length === 0) return 0;
    let score = 100;

    // Deduct weights according to poor coverage matrices
    const openDeadZonePenalty = gridAnalysis.deadZonePercent * 0.7;
    score -= openDeadZonePenalty;

    // Deduct weights based on cross-talk collision severities
    interferenceVectors.forEach(v => {
      if (v.severity === 'critical') score -= 15;
      if (v.severity === 'medium') score -= 7;
      if (v.severity === 'low') score -= 2;
    });

    return Math.max(5, Math.min(100, Math.round(score)));
  }, [gridAnalysis, interferenceVectors, nodes]);

  const displayCoverage =
  backendAnalysis?.coveragePercent ?? gridAnalysis.coveragePercent;

const displayDeadZones =
  backendAnalysis?.deadZonePercent ?? gridAnalysis.deadZonePercent;

const displayInterference =
  backendAnalysis?.interferenceVectors?.length ?? interferenceVectors.length;

const displayHealth =
  backendAnalysis?.networkHealthScore ?? networkHealthScore;

  // 4. Heuristic Rule Optimization Engine
  const generateOptimizationSuggestions = () => {
    const suggestions = [];

    // Analyze channel overlaps
    interferenceVectors.forEach(v => {
      if (v.severity === 'critical') {
        suggestions.push({
          type: 'channel',
          msg: `Co-channel conflict detected between ${v.from.name} and ${v.to.name}. Alternate one to a clear channel (e.g., switch channel from common overlaps).`,
          icon: AlertTriangle,
          color: 'text-red-400 bg-red-950/40 border-red-800'
        });
      }
    });

    // Distance/Overlap mitigation rules
    interferenceVectors.forEach(v => {
      if (v.severity === 'critical' || v.severity === 'medium') {
        suggestions.push({
          type: 'position',
          msg: `Relocate ${v.to.name} further away from ${v.from.name} to mitigate localized cross-talk boundaries.`,
          icon: Sliders,
          color: 'text-amber-400 bg-amber-950/40 border-amber-800'
        });
      }
    });

    // Blank sector detection rule
    if (displayDeadZones > 25) {
      suggestions.push({
        type: 'coverage',
        msg: `High aggregate dead zones (${displayDeadZones}%). Deploy an extra high-range WiFi AP or Router on unmapped coordinates.`,
        icon: Zap,
        color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800'
      });
    }

    if (suggestions.length === 0 && nodes.length > 0) {
      suggestions.push({
        type: 'perfect',
        msg: 'Network configuration operating within nominal spec limits. No critical optimization anomalies found.',
        icon: CheckCircle,
        color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800'
      });
    } else if (nodes.length === 0) {
      suggestions.push({
        type: 'empty',
        msg: 'No tactical equipment deployed on canvas. Drop active transceiver nodes onto the grid matrix to initiate diagnostic logs.',
        icon: Info,
        color: 'text-slate-400 bg-slate-900 border-slate-800'
      });
    }

    setRecommendations(suggestions);
    setShowRecommendations(true);
  };

  return (
    <div className="flex flex-col h-screen bg-[#030712] text-slate-100 font-sans select-none overflow-hidden antialiased">
      
      {/* 1. TOP NAVBAR */}
      <header className="flex items-center justify-between px-6 h-14 bg-[#090d16] border-b border-slate-800 shadow-lg tracking-wide z-10">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30">
            <div className="absolute w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">AirGrid</h1>
            <p className="text-[10px] text-slate-500 font-mono -mt-0.5">TACTICAL SIGNAL GEOMETRY ENGINE v2.6</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="flex items-center space-x-2 px-3 py-1 bg-slate-900/60 border border-slate-800 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">SYS STATUS:</span>
            <span className="text-emerald-400 font-bold">NOMINAL</span>
          </div>
        </div>
      </header>

      {/* BODY WRAPPER */}
      <div className="flex flex-1 overflow-hidden w-full">
        
        {/* 2. LEFT SIDEBAR */}
        <aside className="w-64 bg-[#070b12] border-r border-slate-800 p-4 flex flex-col justify-between overflow-y-auto airgrid-scrollbar">
          <div className="space-y-6">
            {apiError && (
             <div className="p-2 text-[11px] font-mono text-red-400 bg-red-950/30 border border-red-900 rounded">
            {apiError}
           </div>
            )}
            <div className="pt-2 border-b border-slate-800/60 pb-4">
  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono mb-3">
    Area Definition
  </h3>

  <div className="grid grid-cols-2 gap-2">
    <div>
      <label className="text-[10px] text-slate-500 font-mono">X Blocks</label>
      <input
        type="number"
        min="5"
        max="40"
        value={areaBlocksX}
        onChange={(e) => {
        const value = Math.max(5, Number(e.target.value) || 5);
        setAreaBlocksX(value);
        setBackendAnalysis(null);
        }}
        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-300"
      />
    </div>

    <div>
      <label className="text-[10px] text-slate-500 font-mono">Y Blocks</label>
      <input
        type="number"
        min="5"
        max="30"
        value={areaBlocksY}
        onChange={(e) => {
        const value = Math.max(5, Number(e.target.value) || 5);
        setAreaBlocksY(value);
        setBackendAnalysis(null);
         }}
        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-300"
      />
    </div>
  </div>

  <p className="text-[10px] text-slate-500 font-mono mt-2">
    Area: {areaBlocksX} × {areaBlocksY} blocks = {CANVAS_WIDTH}px × {CANVAS_HEIGHT}px
  </p>
</div>
            {/* Palette */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-500" /> Device Palette
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">Drag components directly onto tactical tactical operations floor.</p>
              
              <div className="space-y-2.5">
                {Object.entries(DEVICE_TYPES).map(([key, device]) => {
                  const IconComponent = device.icon;
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={(e) => handleDragStartFromSidebar(e, key)}
                      className="group flex items-center justify-between p-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md cursor-grab active:cursor-grabbing transition-all duration-200 shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded bg-slate-950 border border-slate-800 group-hover:border-slate-700 transition-colors">
                          <IconComponent className="w-4 h-4" style={{ color: device.color }} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-300 font-mono">{device.type}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{device.freq} • {device.defaultRange}m</div>
                        </div>
                      </div>
                      <Maximize2 className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visualization Layer Control */}
            <div className="pt-2 border-t border-slate-800/60">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-cyan-500" /> Layer Overlays
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {Object.entries({
                  coverage: 'Show Coverage',
                  heatmap: 'Show Signal Heatmap',
                  interference: 'Show Interference Vectors',
                  deadZones: 'Highlight Dead Zones'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between p-2 rounded bg-slate-900/20 hover:bg-slate-900/40 border border-slate-800/40 cursor-pointer transition-colors">
                    <span className="text-slate-400 text-[11px]">{label}</span>
                    <input 
                      type="checkbox"
                      checked={visuals[key]}
                      onChange={(e) => setVisuals({ ...visuals, [key]: e.target.checked })}
                      className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Diagnostics Actions */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button 
              onClick={handleOptimizeWithBackend}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded text-xs font-semibold font-mono shadow-md shadow-cyan-950/20 active:scale-[0.98] transition-transform"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? "OPTIMIZING..." : "OPTIMIZE LAYOUT"}</span>
            </button>

            <button 
              onClick={handleAnalyzeWithBackend}
              disabled={isAnalyzing}
               className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 rounded text-xs font-semibold font-mono transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? "ANALYZING..." : "ANALYZE NETWORK"}</span>
            </button>

            <button 
             onClick={() => setIsCanvasExpanded(true)}
             className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-400 rounded text-xs font-semibold font-mono transition-colors"
            >
               <Maximize2 className="w-3.5 h-3.5" />
               <span>ENLARGE CANVAS</span>
            </button>
            <button 
              onClick={handleSaveProject}
               className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 rounded text-xs font-semibold font-mono transition-colors"
            >
               <CheckCircle className="w-3.5 h-3.5" />
              <span>SAVE PROJECT</span>
            </button>
            <button 
              onClick={handleLoadProjects}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 rounded text-xs font-semibold font-mono transition-colors"
            >
             <Layers className="w-3.5 h-3.5" />
              <span>LOAD PROJECTS</span>
            </button>

            <button 
              onClick={resetCanvas}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs font-semibold font-mono transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RESET GRID</span>
            </button>
          </div>
        </aside>

        {/* 3. MAIN CANVAS CONTAINER */}
        <main className="flex-1 bg-[#05080f] p-6 relative overflow-auto airgrid-scrollbar">
          
          {/* Tactical Target Scope Ring Background Overlays */}
          <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center">
            <div className="w-100 h-100 border border-cyan-500 rounded-full" />
            <div className="w-175 h-175 absolute border border-cyan-500 rounded-full" />
          </div>

          {/* Konva Stage Wrapper Frame */}
          <div 
           className="relative border border-slate-800/80 rounded bg-[#020408] shadow-2xl overflow-hidden mx-auto"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnCanvas}
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          >
            <Stage 
              width={CANVAS_WIDTH} 
              height={CANVAS_HEIGHT}
              onClick={(e) => {
                if (e.target === e.target.getStage()) {
                  setSelectedNodeId(null);
                }
              }}
            >
              <Layer>
                {/* A. Grid Overlay Background */}
                {Array.from({ length: Math.ceil(CANVAS_WIDTH / 20) }).map((_, i) => (
                  <Line key={`v-${i}`} points={[i * 20, 0, i * 20, CANVAS_HEIGHT]} stroke="#1e293b" strokeWidth={i % 2 === 0 ? 0.4 : 0.1} listening={false} />
                ))}
                {Array.from({ length: Math.ceil(CANVAS_HEIGHT / 20) }).map((_, i) => (
                  <Line key={`h-${i}`} points={[0, i * 20, CANVAS_WIDTH, i * 20]} stroke="#1e293b" strokeWidth={i % 2 === 0 ? 0.4 : 0.1} listening={false} />
                ))}

                {/* B. Heatmap Matrix Nodes / Dead Zone Rendering */}
                {(visuals.heatmap || visuals.deadZones) && gridAnalysis.cells.map((cell, idx) => {
                  let fillColor = 'transparent';
                  let opacity = 0;

                  if (visuals.deadZones && !cell.isCovered) {
                    fillColor = '#ef4444'; // Red tinted dead zone
                    opacity = 0.08;
                  } else if (visuals.heatmap && cell.isCovered) {
                    opacity = 0.22;
                    if (cell.interferenceTint > 0) {
                      fillColor = '#a855f7'; // Interference structural damage node (Purple)
                    } else if (cell.signalStrength > 14) {
                      fillColor = '#06b6d4'; // High strength cyan
                    } else if (cell.signalStrength > 7) {
                      fillColor = '#f59e0b'; // Amber warning intermediate line
                    } else {
                      fillColor = '#3b82f6'; // Muted generic perimeter node
                    }
                  }

                  if (fillColor === 'transparent') return null;

                  return (
                    <Rect 
                      key={`grid-cell-${idx}`}
                      x={cell.x}
                      y={cell.y}
                      width={GRID_SIZE}
                      height={GRID_SIZE}
                      fill={fillColor}
                      opacity={opacity}
                      listening={false}
                    />
                  );
                })}

                {/* C. Node Interference Warning Vector Paths */}
                {visuals.interference && interferenceVectors.map(v => {
                  const color = v.severity === 'critical' ? '#ef4444' : v.severity === 'medium' ? '#f59e0b' : '#a855f7';
                  const dashPattern = v.severity === 'critical' ? [6, 4] : [10, 5];
                  return (
                    <Group key={v.id}>
                      <Line
                        points={[v.from.x, v.from.y, v.to.x, v.to.y]}
                        stroke={color}
                        strokeWidth={v.severity === 'critical' ? 2 : 1.2}
                        dash={dashPattern}
                        opacity={0.8}
                      />
                      <Circle 
                        x={(v.from.x + v.to.x) / 2}
                        y={(v.from.y + v.to.y) / 2}
                        radius={7}
                        fill="#0f172a"
                        stroke={color}
                        strokeWidth={1}
                      />
                    </Group>
                  );
                })}

                {/* D. Transceiver Nodes Layer */}
                {nodes.map(node => {
                  const isSelected = node.id === selectedNodeId;
                  const devMeta = Object.values(DEVICE_TYPES).find(d => d.type === node.type) || DEVICE_TYPES.WIFI_AP;

                  return (
                    <Group 
                      key={node.id}
                      x={node.x}
                      y={node.y}
                      draggable
                      onDragMove={(e) => handleNodeDragMove(node.id, e)}
                      onClick={(e) => {
                        e.cancelBubble = true; // Stop unselect triggers
                        setSelectedNodeId(node.id);
                      }}
                    >
                      {/* Range / Boundary Signal Ring */}
                      {visuals.coverage && (
                        <Circle 
                          radius={node.range}
                          fill={devMeta.color}
                          opacity={isSelected ? 0.08 : 0.03}
                          stroke={devMeta.color}
                          strokeWidth={isSelected ? 1.5 : 0.8}
                          dash={isSelected ? [5, 3] : null}
                        />
                      )}

                      {/* Main Node Base Core Anchor */}
                      <Circle 
                        radius={16}
                        fill="#090d16"
                        stroke={isSelected ? '#22d3ee' : '#334155'}
                        strokeWidth={isSelected ? 25 / 10 : 1}
                        shadowColor={devMeta.color}
                        shadowBlur={isSelected ? 12 : 3}
                        shadowOpacity={0.5}
                      />

                      {/* Text Indicator Flags */}
                      <Text 
                        text={node.name}
                        y={22}
                        x={-40}
                        width={80}
                        align="center"
                        fill={isSelected ? '#22d3ee' : '#94a3b8'}
                        fontSize={10}
                        fontFamily="monospace"
                        fontStyle="bold"
                      />
                      
                      <Text 
                        text={`Ch:${node.channel}`}
                        y={-28}
                        x={-30}
                        width={60}
                        align="center"
                        fill="#64748b"
                        fontSize={9}
                        fontFamily="monospace"
                      />

                      {/* Micro Inner Tracker Core */}
                      <Circle radius={4} fill={devMeta.color} />
                    </Group>
                  );
                })}
              </Layer>
            </Stage>

            {/* FLOATING RECOMMENDATION DRAWER CARD */}
            <AnimatePresence>
              {showRecommendations && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="absolute bottom-4 left-4 right-4 max-h-44 bg-[#090f1d]/95 backdrop-blur border border-slate-800 rounded shadow-xl flex flex-col p-3 z-20 font-mono"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                    <div className="flex items-center space-x-2 text-[11px] font-bold text-cyan-400 tracking-wider">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>HEURISTIC TOPOLOGY ENGINE SUGGESTIONS</span>
                    </div>
                    <button 
                      onClick={() => setShowRecommendations(false)}
                      className="text-slate-500 hover:text-slate-300 text-[10px] uppercase bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="overflow-y-auto space-y-1.5 pr-1 flex-1 airgrid-scrollbar">
                    {recommendations.map((rec, index) => {
                      const iconMap = {
  channel: AlertTriangle,
  position: Sliders,
  coverage: Zap,
  perfect: CheckCircle,
  empty: Info,
};

const colorMap = {
  channel: "text-red-400 bg-red-950/40 border-red-800",
  position: "text-amber-400 bg-amber-950/40 border-amber-800",
  coverage: "text-cyan-400 bg-cyan-950/40 border-cyan-800",
  perfect: "text-emerald-400 bg-emerald-950/40 border-emerald-800",
  empty: "text-slate-400 bg-slate-900 border-slate-800",
};

const RecIcon = rec.icon || iconMap[rec.type] || Info;
const recColor = rec.color || colorMap[rec.type] || "text-slate-400 bg-slate-900 border-slate-800";
                      return (
                        <div key={index} className={`flex items-start space-x-2.5 p-2 rounded text-[11px] border ${recColor}`}>
                          <RecIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <p className="leading-normal">{rec.msg}</p>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* 4. RIGHT DETAILS PANEL */}
        <aside className="w-80 bg-[#070b12] border-l border-slate-800 p-4 flex flex-col overflow-y-auto airgrid-scrollbar">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              // Active Node Profile Inspector Layout
              <motion.div 
                key="node-inspector"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-5 h-full flex flex-col"
              >
                <div>
                  <div className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest font-bold">Transceiver Node Inspected</div>
                  <h2 className="text-base font-bold text-slate-100 font-mono mt-0.5 tracking-tight flex items-center justify-between">
                    <span>{selectedNode.name}</span>
                    <span className="text-xs font-normal text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80">{selectedNode.type}</span>
                  </h2>
                </div>

                <div className="bg-slate-950 p-3 rounded border border-slate-800/60 font-mono space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]"><span className="text-slate-500">VECTOR ID:</span> <span className="text-slate-300">{selectedNode.id}</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-slate-500">COORDINATES:</span> <span className="text-slate-300">X: {Math.round(selectedNode.x)}px | Y: {Math.round(selectedNode.y)}px</span></div>
                </div>

                {/* Live Core Tweaks & Sliders */}
                <div className="space-y-4 pt-2 border-t border-slate-800/60 flex-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5"><Sliders className="w-3 h-3 text-cyan-500"/> Core Metrics Editor</h3>
                  
                  {/* Range Config Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">Coverage Radius:</span>
                      <span className="text-cyan-400 font-bold">{selectedNode.range}m</span>
                    </div>
                    <input 
                      type="range" min="30" max="250" 
                      value={selectedNode.range}
                      onChange={(e) => updateSelectedNodeProperty('range', parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  {/* Transmit Power Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-400">Tx Transmit Power:</span>
                      <span className="text-emerald-400 font-bold">{selectedNode.power} dBm</span>
                    </div>
                    <input 
                      type="range" min="1" max="30" 
                      value={selectedNode.power}
                      onChange={(e) => updateSelectedNodeProperty('power', parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* Frequency Band Profile */}
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[11px] text-slate-400">Frequency Band Allocation:</label>
                    <select
                      value={selectedNode.frequency}
                      onChange={(e) => updateSelectedNodeProperty('frequency', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-300 focus:border-cyan-500 focus:ring-0"
                    >
                      <option value="2.4 GHz">2.4 GHz ISM Band</option>
                      <option value="5.0 GHz">5.0 GHz UNII Band</option>
                      <option value="915 MHz">915 MHz SRD Band</option>
                    </select>
                  </div>

                  {/* Channel Index Config */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono text-[11px]">
                      <label className="text-slate-400">Discrete Channel Index:</label>
                      <span className="text-amber-400 font-bold">CH {selectedNode.channel}</span>
                    </div>
                    <input 
                      type="number" min="1" max="165"
                      value={selectedNode.channel}
                      onChange={(e) => updateSelectedNodeProperty('channel', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-300 focus:border-cyan-500 focus:ring-0"
                    />
                  </div>
                </div>

                {/* Component Destruct Actions */}
                <div className="pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => {
                      setNodes(nodes.filter(n => n.id !== selectedNodeId));
                      setSelectedNodeId(null);
                    }}
                    className="w-full py-2 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/60 rounded text-xs font-mono transition-colors"
                  >
                    DECOMMISSION NODE
                  </button>
                </div>
              </motion.div>
            ) : (
              // Empty System Overview Frame Profile
              <motion.div 
                key="summary-inspector"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4 font-mono h-full flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">NOC Dashboard Monitor</div>
                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mt-0.5">AirGrid Overview</h2>
                  </div>

                  <div className="p-3 bg-slate-950 rounded border border-slate-800/80 text-[11px] text-slate-400 space-y-2.5 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1"><Info className="w-3.5 h-3.5" /> SYSTEM METRICS LOGS</div>
                    Select an active device icon within the grid space map layout area to configure hardware transceivers, channel frequencies, or adjust signal footprints.
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-500 uppercase font-semibold">Active Inventory Breakdown</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.values(DEVICE_TYPES).map(dev => {
                        const count = nodes.filter(n => n.type === dev.type).length;
                        return (
                          <div key={dev.type} className="bg-slate-900/40 border border-slate-800/50 rounded p-2.5 flex flex-col justify-between">
                            <span className="text-slate-500 text-[10px] truncate">{dev.type}</span>
                            <span className="text-base font-bold mt-1" style={{ color: dev.color }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-cyan-950/10 border border-cyan-800/30 rounded text-[10px] text-slate-500 leading-normal flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-500/70 shrink-0 mt-0.5" />
                  <span>Grid cells capture structural channel overlaps and calculate physical interferences inside shared range envelopes.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      {/* 5. BOTTOM METRICS BAR */}
      <footer className="h-12 bg-[#090d16] border-t border-slate-800 px-6 flex items-center justify-between text-xs font-mono z-10">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">DEVICES DEPLOYED:</span>
            <span className="text-slate-200 font-bold">{nodes.length}</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">COVERS DISTANCE:</span>
            <span className={`font-bold ${displayCoverage > 70 ? 'text-emerald-400' : displayCoverage > 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {displayCoverage}%
            </span>
          </div>
          <div className="h-4 w-1px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">DEAD SECTORS:</span>
            <span className={`font-bold ${displayDeadZones < 20 ? 'text-emerald-400' : 'text-red-400'}`}>
              {displayDeadZones}%
            </span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <span className="text-slate-500">CONFLICT CROSS-TALKS:</span>
            <span className={`font-bold ${displayInterference > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {displayInterference} active
            </span>
          </div>
        </div>

        {/* Aggregated Health Score Panel */}
        <div className="flex items-center space-x-2.5">
          <span className="text-slate-500 text-[11px] tracking-wider">NET HEALTH INDEX:</span>
          <div className="relative flex items-center justify-center bg-slate-950 border border-slate-800 px-3 py-1 rounded font-bold min-w-16">
            <span className={
              displayHealth > 80 ? 'text-emerald-400' : displayHealth > 50 ? 'text-amber-400' : 'text-red-400'
            }>
              {displayHealth}%
            </span>
          </div>
        </div>
      </footer>

      <AnimatePresence>
  {isCanvasExpanded && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#020408]"
    >
      <div className="h-screen w-screen bg-[#05080f] flex flex-col overflow-hidden">
        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-800 bg-[#090d16]">
          <div className="font-mono">
            <h2 className="text-sm font-bold text-slate-100 tracking-widest">
              AIRGRID EXPANDED CANVAS
            </h2>
            <p className="text-[10px] text-slate-500">
              {areaBlocksX} × {areaBlocksY} blocks • {CANVAS_WIDTH}px × {CANVAS_HEIGHT}px
            </p>
          </div>

          <button
            onClick={() => setIsCanvasExpanded(false)}
            className="px-3 py-1 text-xs font-mono text-red-400 border border-red-900/60 bg-red-950/20 hover:bg-red-900/30 rounded"
          >
            CLOSE
          </button>
        </div>

        <div
          className="flex-1 overflow-auto airgrid-scrollbar p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropOnCanvas}
        >
          <div
            className="relative border border-slate-800/80 rounded bg-[#020408] shadow-2xl overflow-hidden mx-auto"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          >
            <Stage
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onClick={(e) => {
                if (e.target === e.target.getStage()) {
                  setSelectedNodeId(null);
                }
              }}
            >
              <Layer>
                {Array.from({ length: Math.ceil(CANVAS_WIDTH / 20) }).map((_, i) => (
                  <Line key={`expanded-v-${i}`} points={[i * 20, 0, i * 20, CANVAS_HEIGHT]} stroke="#1e293b" strokeWidth={i % 2 === 0 ? 0.4 : 0.1} listening={false} />
                ))}

                {Array.from({ length: Math.ceil(CANVAS_HEIGHT / 20) }).map((_, i) => (
                  <Line key={`expanded-h-${i}`} points={[0, i * 20, CANVAS_WIDTH, i * 20]} stroke="#1e293b" strokeWidth={i % 2 === 0 ? 0.4 : 0.1} listening={false} />
                ))}

                {(visuals.heatmap || visuals.deadZones) && gridAnalysis.cells.map((cell, idx) => {
                  let fillColor = "transparent";
                  let opacity = 0;

                  if (visuals.deadZones && !cell.isCovered) {
                    fillColor = "#ef4444";
                    opacity = 0.08;
                  } else if (visuals.heatmap && cell.isCovered) {
                    opacity = 0.22;
                    if (cell.interferenceTint > 0) fillColor = "#a855f7";
                    else if (cell.signalStrength > 14) fillColor = "#06b6d4";
                    else if (cell.signalStrength > 7) fillColor = "#f59e0b";
                    else fillColor = "#3b82f6";
                  }

                  if (fillColor === "transparent") return null;

                  return (
                    <Rect
                      key={`expanded-grid-cell-${idx}`}
                      x={cell.x}
                      y={cell.y}
                      width={GRID_SIZE}
                      height={GRID_SIZE}
                      fill={fillColor}
                      opacity={opacity}
                      listening={false}
                    />
                  );
                })}

                {visuals.interference && interferenceVectors.map((v) => {
                  const color = v.severity === "critical" ? "#ef4444" : v.severity === "medium" ? "#f59e0b" : "#a855f7";
                  const dashPattern = v.severity === "critical" ? [6, 4] : [10, 5];

                  return (
                    <Group key={`expanded-${v.id}`}>
                      <Line
                        points={[v.from.x, v.from.y, v.to.x, v.to.y]}
                        stroke={color}
                        strokeWidth={v.severity === "critical" ? 2 : 1.2}
                        dash={dashPattern}
                        opacity={0.8}
                      />
                      <Circle
                        x={(v.from.x + v.to.x) / 2}
                        y={(v.from.y + v.to.y) / 2}
                        radius={7}
                        fill="#0f172a"
                        stroke={color}
                        strokeWidth={1}
                      />
                    </Group>
                  );
                })}

                {nodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const devMeta = Object.values(DEVICE_TYPES).find((d) => d.type === node.type) || DEVICE_TYPES.WIFI_AP;

                  return (
                    <Group
                      key={`expanded-${node.id}`}
                      x={node.x}
                      y={node.y}
                      draggable
                      onDragMove={(e) => handleNodeDragMove(node.id, e)}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        setSelectedNodeId(node.id);
                      }}
                    >
                      {visuals.coverage && (
                        <Circle
                          radius={node.range}
                          fill={devMeta.color}
                          opacity={isSelected ? 0.08 : 0.03}
                          stroke={devMeta.color}
                          strokeWidth={isSelected ? 1.5 : 0.8}
                          dash={isSelected ? [5, 3] : null}
                        />
                      )}

                      <Circle
                        radius={16}
                        fill="#090d16"
                        stroke={isSelected ? "#22d3ee" : "#334155"}
                        strokeWidth={isSelected ? 2.5 : 1}
                        shadowColor={devMeta.color}
                        shadowBlur={isSelected ? 12 : 3}
                        shadowOpacity={0.5}
                      />

                      <Text
                        text={node.name}
                        y={22}
                        x={-40}
                        width={80}
                        align="center"
                        fill={isSelected ? "#22d3ee" : "#94a3b8"}
                        fontSize={10}
                        fontFamily="monospace"
                        fontStyle="bold"
                      />

                      <Text
                        text={`Ch:${node.channel}`}
                        y={-28}
                        x={-30}
                        width={60}
                        align="center"
                        fill="#64748b"
                        fontSize={9}
                        fontFamily="monospace"
                      />

                      <Circle radius={4} fill={devMeta.color} />
                    </Group>
                  );
                })}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
<AnimatePresence>
  {showProjectPicker && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 10 }}
        className="w-full max-w-xl max-h-[70vh] bg-[#070b12] border border-slate-800 rounded-xl shadow-2xl overflow-hidden font-mono"
      >
        <div className="px-4 py-3 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div>
            <h2 className="text-sm text-slate-100 font-bold tracking-widest">
              LOAD PROJECT FILE
            </h2>
            <p className="text-[10px] text-slate-500">
              Select a saved AirGrid JSON layout
            </p>
          </div>

          <button
            onClick={() => setShowProjectPicker(false)}
            className="px-2 py-1 text-[10px] text-red-400 border border-red-900 rounded bg-red-950/20"
          >
            CLOSE
          </button>
        </div>

        <div className="p-3 max-h-[55vh] overflow-y-auto airgrid-scrollbar space-y-2">
          {savedProjects.length === 0 ? (
            <div className="text-xs text-slate-500 p-4 text-center">
              No saved project files found.
            </div>
          ) : (
            savedProjects.map((project) => (
              <button
                key={project.fileName}
                onClick={() => handleOpenProject(project)}
                className="w-full text-left p-3 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 text-xs font-bold truncate">
                    {project.projectName}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {project.nodesCount} devices
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 mt-1">
                  File: {project.fileName}
                </div>

                <div className="text-[10px] text-slate-600 mt-1">
                  Area: {project.areaBlocksX} × {project.areaBlocksY} blocks
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
    </div>
  );
}