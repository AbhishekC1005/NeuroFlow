import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
} from 'reactflow';
import type { Connection, Node } from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Play, PanelLeft, PanelRight, PanelLeftClose, PanelRightClose, LayoutGrid, MessageSquare } from 'lucide-react';

import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import DatasetNode from './components/nodes/DatasetNode';
import PreprocessingNode from './components/nodes/PreprocessingNode';
import SplitNode from './components/nodes/SplitNode';
import ModelNode from './components/nodes/ModelNode';
import ResultNode from './components/nodes/ResultNode';

const nodeTypes = {
  dataset: DatasetNode,
  preprocessing: PreprocessingNode,
  split: SplitNode,
  model: ModelNode,
  result: ResultNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'dataset',
    position: { x: 50, y: 50 },
    data: { label: 'Dataset Node' },
  },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

function App() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);

  // Update node data handler
  const onNodeDataChange = useCallback((id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: newData };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Propagate columns from Dataset to Model nodes
  useEffect(() => {
    const datasetNode = nodes.find((n) => n.type === 'dataset');
    if (datasetNode && datasetNode.data.columns) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.type === 'model') {
            // Only update if columns are different to avoid infinite loop
            if (JSON.stringify(node.data.columns) !== JSON.stringify(datasetNode.data.columns)) {
              return {
                ...node,
                data: { ...node.data, columns: datasetNode.data.columns },
              };
            }
          }
          return node;
        })
      );
    }
  }, [nodes, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      let stroke = '#64748b'; // default slate

      if (sourceNode) {
        switch (sourceNode.type) {
          case 'dataset':
            stroke = '#3b82f6'; // blue-500
            break;
          case 'preprocessing':
            stroke = '#eab308'; // yellow-500
            break;
          case 'split':
            stroke = '#a855f7'; // purple-500
            break;
          case 'model':
            stroke = '#06b6d4'; // cyan-500
            break;
          case 'result':
            stroke = '#10b981'; // emerald-500
            break;
        }
      }

      const edge = {
        ...params,
        animated: true,
        style: { stroke, strokeWidth: 2 },
      };

      setEdges((eds) => addEdge(edge, eds));
    },
    [nodes, setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeDelete = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [setNodes]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowWrapper.current!.getBoundingClientRect().left,
        y: event.clientY - reactFlowWrapper.current!.getBoundingClientRect().top,
      });

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node`, onChange: onNodeDataChange, onDelete: onNodeDelete },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, onNodeDataChange, onNodeDelete, setNodes]
  );

  // Initialize data.onChange and data.onDelete for initial nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (!node.data.onChange || !node.data.onDelete) {
          return {
            ...node,
            data: { ...node.data, onChange: onNodeDataChange, onDelete: onNodeDelete },
          };
        }
        return node;
      })
    );
  }, [onNodeDataChange, onNodeDelete, setNodes]);

  const runPipeline = async () => {
    setIsRunning(true);
    try {
      // Extract config from nodes
      const datasetNode = nodes.find((n) => n.type === 'dataset');
      const preprocessingNode = nodes.find((n) => n.type === 'preprocessing');
      const splitNode = nodes.find((n) => n.type === 'split');
      const modelNode = nodes.find((n) => n.type === 'model');
      const resultNode = nodes.find((n) => n.type === 'result');

      if (!datasetNode?.data.file) throw new Error("No dataset uploaded");
      if (!modelNode?.data.targetColumn) throw new Error("No target column selected");

      const payload = {
        target_column: modelNode.data.targetColumn,
        scaler_type: preprocessingNode?.data.scaler || 'None',
        test_size: splitNode?.data.testSize || 0.2,
        model_type: modelNode.data.modelType || 'Logistic Regression',
      };

      const response = await axios.post('http://localhost:8000/run_pipeline', payload);

      // Update result node
      if (resultNode) {
        onNodeDataChange(resultNode.id, { ...resultNode.data, results: response.data });
      } else {
        alert("Add a Result node to see output!");
        console.log("Results:", response.data);
      }

    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.detail || error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50 p-4 flex justify-between items-center h-16 shrink-0 z-20 shadow-lg relative">
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200" />
              <div className="relative w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700/50 ring-1 ring-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#logo-gradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <defs>
                    <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                  <path d="M12 12 2.1 12a10.01 10.01 0 0 0 1.4 2.8L12 12z" />
                  <path d="M12 12V2a10 10 0 0 1 3.8 1.5L12 12z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-200 tracking-tight">
                NeuroFlow
              </h1>
              <div className="text-[10px] font-medium text-blue-400/80 tracking-widest uppercase">AI Pipeline Orchestrator</div>
            </div>
          </div>

          {/* Left Panel Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg transition-colors ${!isSidebarOpen ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            title="Toggle Sidebar"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Right Panel Toggle */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2 rounded-lg transition-colors ${!isChatOpen ? 'bg-purple-500/10 text-purple-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            title="Toggle Chat"
          >
            {isChatOpen ? <PanelRightClose size={18} /> : <PanelRight size={18} />}
          </button>

          <button
            onClick={runPipeline}
            disabled={isRunning}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-all shadow-lg border border-white/10 ${isRunning
              ? 'bg-slate-800 cursor-not-allowed text-slate-500 shadow-none'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]'
              }`}
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" className="opacity-90" />
                <span>Run Pipeline</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-64px)] relative">
        <ReactFlowProvider>
          {/* Sidebar Area */}
          <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72' : 'w-0'} flex flex-col border-r border-slate-800/50 bg-slate-900/50 backdrop-blur-xl relative z-10 overflow-hidden`}>
            <Sidebar />
          </div>

          {/* Main Canvas */}
          <div className="flex-1 h-full w-full bg-slate-950 relative group/canvas" ref={reactFlowWrapper}>
            {/* Floating Sidebar Toggle */}
            <div className={`absolute top-4 left-4 z-50 transition-all duration-300 ${!isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl text-blue-400 shadow-xl hover:scale-105 hover:bg-blue-500/10 transition-all duration-300 group"
                title="Open Sidebar"
              >
                <LayoutGrid size={20} className="group-hover:text-blue-300 transition-colors" />
              </button>
            </div>

            {/* Floating Chat Toggle */}
            <div className={`absolute top-4 right-4 z-50 transition-all duration-300 ${!isChatOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
              <button
                onClick={() => setIsChatOpen(true)}
                className="p-3 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl text-purple-400 shadow-xl hover:scale-105 hover:bg-purple-500/10 transition-all duration-300 group"
                title="Open Chat"
              >
                <MessageSquare size={20} className="group-hover:text-purple-300 transition-colors" />
              </button>
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ maxZoom: 1 }}
              minZoom={0.1}
              maxZoom={1.5}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: '#6366f1', strokeWidth: 2 },
              }}
              className="bg-slate-950"
            >
              <Controls className="!bg-slate-800 !border-slate-700 !shadow-xl [&>button]:!border-slate-700 [&>button]:!fill-slate-400 hover:[&>button]:!fill-white hover:[&>button]:!bg-slate-700" />
              <Background color="#334155" gap={20} size={1} />
            </ReactFlow>
          </div>

          {/* Chat Panel Area */}
          <div className={`transition-all duration-300 ease-in-out ${isChatOpen ? 'w-80' : 'w-0'} flex flex-col border-l border-slate-800/50 bg-slate-900/50 backdrop-blur-xl relative z-10 overflow-hidden`}>
            <ChatPanel />
          </div>
        </ReactFlowProvider>
      </div>
    </div>

  );
}

export default App;
