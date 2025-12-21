import { useState, useCallback, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
} from 'reactflow';
import type {
  Connection,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Play, LayoutGrid, MessageSquare } from 'lucide-react';
import { Toaster, toast } from 'sonner';

import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import LandingPage from './components/LandingPage';
import DatasetNode from './components/nodes/DatasetNode';
import PreprocessingNode from './components/nodes/PreprocessingNode';
import ImputationNode from './components/nodes/ImputationNode';
import EncodingNode from './components/nodes/EncodingNode';
import SplitNode from './components/nodes/SplitNode';
import ModelNode from './components/nodes/ModelNode';
import ResultNode from './components/nodes/ResultNode';

import logo from './assets/image.png';

const nodeTypes = {
  dataset: DatasetNode,
  imputation: ImputationNode,
  encoding: EncodingNode,
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

const getId = () => `dndnode_${Math.random().toString(36).substr(2, 9)}`;

function Workspace() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - mouseMoveEvent.clientX;
      if (newWidth > 300 && newWidth < 800) {
        setChatWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // Keep-alive ping to backend every 3 minutes
  useEffect(() => {
    const BASE_URL = import.meta.env.VITE_API_URL;
    let timeoutId: ReturnType<typeof setTimeout>;

    const pingBackend = async () => {
      console.log(`[Keep-alive] Sending ping at ${new Date().toLocaleTimeString()}`);
      try {
        await axios.get(`${BASE_URL}/`);
        console.log(`[Keep-alive] Ping successful at ${new Date().toLocaleTimeString()}`);
      } catch (error) {
        console.log(`[Keep-alive] Ping failed at ${new Date().toLocaleTimeString()} (server may be waking up)`);
      }
      // Schedule next ping after 3 minutes
      console.log(`[Keep-alive] Next ping scheduled in 3 minutes`);
      timeoutId = setTimeout(pingBackend, 3 * 60 * 1000);
    };

    // Initial ping after 2 seconds
    console.log('[Keep-alive] Initializing - first ping in 2 seconds');
    timeoutId = setTimeout(pingBackend, 2000);

    return () => {
      console.log('[Keep-alive] Cleanup - clearing timeout');
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Update node data handler with Column Sync
  const onNodeDataChange = useCallback((id: string, newData: any) => {
    setNodes((nds) => {
      const activeNode = nds.find(n => n.id === id);

      // If updating a Dataset node and columns change, propagate to all Model nodes
      if (activeNode?.type === 'dataset' && newData.columns && JSON.stringify(newData.columns) !== JSON.stringify(activeNode.data.columns)) {
        return nds.map((node) => {
          if (node.id === id) return { ...node, data: newData };
          if (node.type === 'model') {
            return { ...node, data: { ...node.data, columns: newData.columns } };
          }
          return node;
        });
      }

      return nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: newData };
        }
        return node;
      });
    });
  }, [setNodes]);



  // Sync edge colors with source node types
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          let newStroke = '#64748b';
          switch (sourceNode.type) {
            case 'dataset':
              newStroke = '#06b6d4'; // cyan-500
              break;
            case 'imputation':
              newStroke = '#F97316'; // orange-500
              break;
            case 'encoding':
              newStroke = '#8B5CF6'; // violet-500
              break;
            case 'preprocessing':
              newStroke = '#eab308'; // yellow-500
              break;
            case 'split':
              newStroke = '#d946ef'; // fuchsia-500
              break;
            case 'model':
              newStroke = '#f43f5e'; // rose-500
              break;
            case 'result':
              newStroke = '#10b981'; // emerald-500
              break;
          }
          if (edge.style?.stroke !== newStroke) {
            return {
              ...edge,
              style: { ...edge.style, stroke: newStroke, strokeWidth: 2 },
            };
          }
        }
        return edge;
      })
    );
  }, [nodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      let stroke = '#64748b'; // default slate

      if (sourceNode) {
        switch (sourceNode.type) {
          case 'dataset':
            stroke = '#06b6d4'; // cyan-500
            break;
          case 'imputation':
            stroke = '#F97316'; // orange-500
            break;
          case 'encoding':
            stroke = '#8B5CF6'; // violet-500
            break;
          case 'preprocessing':
            stroke = '#eab308'; // yellow-500
            break;
          case 'split':
            stroke = '#d946ef'; // fuchsia-500
            break;
          case 'model':
            stroke = '#f43f5e'; // rose-500
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

      setEdges((eds) => {
        // Enforce single input connection for ALL nodes:
        // Remove any existing edges that target the same node (and same handle if applicable, but usually 1 input handle)
        const filtered = eds.filter((e) => e.target !== params.target);
        return addEdge(edge, filtered);
      });
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

      // Pre-fill columns if adding a Model node
      let initialData: any = { label: `${type} node`, onChange: onNodeDataChange, onDelete: onNodeDelete };
      if (type === 'model') {
        const datasetNode = nodes.find(n => n.type === 'dataset');
        if (datasetNode?.data.columns) {
          initialData = { ...initialData, columns: datasetNode.data.columns };
        }
      }

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: initialData,
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
      const resultNodes = nodes.filter((n) => n.type === 'result');
      if (resultNodes.length === 0) throw new Error("Add a Result node to see output!");

      const batchPayload: Record<string, any> = {};

      // Helper to find parent node
      const getParent = (nodeId: string) => {
        const edge = edges.find((e) => e.target === nodeId);
        if (!edge) return null;
        return nodes.find((n) => n.id === edge.source) || null;
      };

      for (const resNode of resultNodes) {
        // 1. Find Model
        const modelNode = getParent(resNode.id);
        if (!modelNode || modelNode.type !== 'model') continue;

        // 2. Traverse upstream to find all config nodes
        let splitNode = null;
        let preprocessingNode = null;
        let imputationNode = null;
        let encodingNode = null;
        let datasetNode = null;

        let current = getParent(modelNode.id);

        // Traverse back up to 10 steps to find the dataset
        for (let i = 0; i < 10; i++) {
          if (!current) break;

          if (current.type === 'split') splitNode = current;
          else if (current.type === 'preprocessing') preprocessingNode = current;
          else if (current.type === 'imputation') imputationNode = current;
          else if (current.type === 'encoding') encodingNode = current;
          else if (current.type === 'dataset') {
            datasetNode = current;
            break; // Found flow start
          }

          current = getParent(current.id);
        }

        // Validate minimal path
        if (!datasetNode) {
          // Skip this result node if path is incomplete, but don't error out entire batch unless all are empty
          continue;
        }

        if (!datasetNode.data.file && !datasetNode.data.file_id) throw new Error(`Dataset node connected to ${resNode.data.label} is empty`);
        if (!modelNode.data.targetColumn) throw new Error(`Model node connected to ${resNode.data.label} has no target column`);

        batchPayload[resNode.id] = {
          file_id: datasetNode.data.file_id || datasetNode.data.file,
          target_column: modelNode.data.targetColumn,
          scaler_type: preprocessingNode?.data.scaler || 'None',
          imputer_strategy: imputationNode?.data.strategy || 'mean',
          encoder_strategy: encodingNode?.data.strategy || 'onehot',
          test_size: splitNode?.data.testSize || 0.2,
          model_type: modelNode.data.modelType || 'Logistic Regression',
        };
      }

      if (Object.keys(batchPayload).length === 0) throw new Error("No valid pipeline paths found. Connect Dataset -> Model -> Result.");

      const BASE_URL = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${BASE_URL}/run_pipeline_batch`, batchPayload);
      const results = response.data;

      // Distribute results back to nodes
      let successCount = 0;
      resultNodes.forEach((rn) => {
        if (results[rn.id]) {
          if (results[rn.id].error) {
            toast.error(`Error in ${rn.data.label || 'Result'}: ${results[rn.id].error}`);
          } else {
            // Clear previous metrics to avoid mixing Regression/Classification keys
            const {
              r2_score, mse, mae, accuracy, classification_report, confusion_matrix, is_regression,
              ...prevData
            } = rn.data;

            onNodeDataChange(rn.id, { ...prevData, ...results[rn.id] });
            successCount++;
          }
        }
      });

      if (successCount > 0) toast.success(`Pipeline executed! Updated ${successCount} result(s).`);

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || error.message;
      toast.error(msg);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-white text-[#202124] font-sans">
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200 p-4 flex justify-between items-center h-16 shrink-0 z-20 relative">
        {/* Google Colors Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05]" />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="relative w-24 h-12 flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden">
                <img src={logo} alt="FlowML Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-medium text-gray-800 tracking-tight flex items-center gap-0.5">
                <span className="text-[#4285F4]">Flow</span>
                <span className="text-[#34A853]">ML</span>
              </h1>
              <div className="text-xs text-gray-500">Visual ML Pipeline Builder</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={runPipeline}
            disabled={isRunning}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-medium transition-all shadow-md ${isRunning
              ? 'bg-gray-100 cursor-not-allowed text-gray-400 shadow-none'
              : 'bg-[#1a73e8] hover:bg-[#1557b0] hover:shadow-lg active:shadow-md'
              }`}
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" className="opacity-90" />
                <span>Run Pipeline</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white py-1 overflow-hidden relative shrink-0">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="flex items-center gap-3 text-sm">
              <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
              📁 Upload time depends on file size — please be patient with larger datasets
              <span className="mx-4">•</span>
              💬 Use the Chat AI efficiently for workflow guidance and debugging help!
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden h-[calc(100vh-64px-32px)] relative">
        <ReactFlowProvider>
          {/* Sidebar Area */}
          <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-0'} flex flex-col border-r border-gray-100 relative z-10 overflow-hidden bg-white`}>
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>

          {/* Main Canvas */}
          <div className="flex-1 h-full w-full bg-[#F8F9FA] relative group/canvas" ref={reactFlowWrapper}>
            {/* Floating Sidebar Toggle */}
            <div className={`absolute top-4 left-4 z-50 transition-all duration-300 ${!isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 bg-white border border-gray-200 rounded-full text-[#5f6368] shadow-lg hover:shadow-xl hover:text-[#202124] transition-all duration-300 group"
                title="Open Sidebar"
              >
                <LayoutGrid size={20} />
              </button>
            </div>

            {/* Floating Chat Toggle */}
            <div className={`absolute top-4 right-4 z-50 transition-all duration-300 ${!isChatOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
              <button
                onClick={() => setIsChatOpen(true)}
                className="p-3 bg-white border border-gray-200 rounded-full text-[#5f6368] shadow-lg hover:shadow-xl hover:text-[#4285F4] transition-all duration-300 group"
                title="Open Chat"
              >
                <MessageSquare size={20} />
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
              defaultViewport={{ x: 50, y: 50, zoom: 0.8 }}
              minZoom={0.1}
              maxZoom={1.5}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: '#bdc1c6', strokeWidth: 2 },
              }}
              className="bg-[#F8F9FA]"
              deleteKeyCode={['Backspace', 'Delete']}
              nodesFocusable={true}
            >
              <Controls className="!bg-white !border-gray-200 !shadow-lg !rounded-lg !text-[#5f6368] [&>button]:!border-gray-100 [&>button]:!fill-[#5f6368] hover:[&>button]:!bg-[#F1F3F4] hover:[&>button]:!fill-[#202124]" />
              <Background color="#dadce0" gap={20} size={1} />
            </ReactFlow>
          </div>

          {/* Chat Panel Area */}
          <div
            className={`flex flex-col border-l border-gray-200 relative z-10 overflow-visible transition-all duration-200 ease-out bg-white shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)]`}
            style={{ width: isChatOpen ? chatWidth : 0 }}
          >
            {isChatOpen && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[#4285F4] z-50 transition-colors"
                onMouseDown={startResizing}
              />
            )}
            <div className="w-full h-full overflow-hidden">
              <ChatPanel
                onClose={() => setIsChatOpen(false)}
                nodes={nodes}
                edges={edges}
              />
            </div>
          </div>
        </ReactFlowProvider>
      </div>
      <Toaster position="top-right" richColors theme="dark" />
    </div>
  );
}

// Landing Page wrapper with navigation
function LandingPageWrapper() {
  const navigate = useNavigate();
  return <LandingPage onEnterWorkspace={() => navigate('/workspace')} />;
}

// Main App with Routes
function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPageWrapper />} />
      <Route path="/workspace" element={<Workspace />} />
    </Routes>
  );
}

export default App;
