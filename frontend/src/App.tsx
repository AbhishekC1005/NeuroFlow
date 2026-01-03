import { useState, useCallback, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
} from 'reactflow';
import type { Connection, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Play, LayoutGrid, MessageSquare, LogOut, Book, History, Users } from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import { Toaster, toast } from 'sonner';

import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import DocumentationPage from './components/DocumentationPage';
import TemplatesPage from './components/TemplatesPage';
import HistoryPage from './components/HistoryPage';
import { AuthProvider, useAuth, getAuthHeaders } from './components/AuthContext';

import DatasetNode from './components/nodes/DatasetNode';
import PreprocessingNode from './components/nodes/PreprocessingNode';
import ImputationNode from './components/nodes/ImputationNode';
import EncodingNode from './components/nodes/EncodingNode';
import SplitNode from './components/nodes/SplitNode';
import ModelNode from './components/nodes/ModelNode';
import ResultNode from './components/nodes/ResultNode';

import logo from './assets/image.png';
import { API_URL, NODE_COLORS, DEFAULT_EDGE_STYLE } from './config';
import { usePipeline } from './hooks/usePipeline';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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

  // Handle Navigation State (Restore Workflow)
  const location = useLocation();
  useEffect(() => {
    if (location.state && location.state.restoreWorkflowId) {
      restoreWorkflow(location.state.restoreWorkflowId);
      navigate('/workspace', { replace: true, state: {} });
    }
  }, [location]);

  // Unified Initialization: Autosave + Template
  useEffect(() => {
    // If restoring from history, skip local logic (handled by another effect)
    if (location.state?.restoreWorkflowId) return;

    let currentNodes: Node[] = initialNodes;
    let currentEdges: Edge[] = [];

    // 1. Try Restore Autosave
    const autosaveStr = localStorage.getItem('workspace_autosave');
    if (autosaveStr) {
      try {
        const autosave = JSON.parse(autosaveStr);
        if (Array.isArray(autosave.nodes)) {
          currentNodes = autosave.nodes;
          currentEdges = autosave.edges || [];
        }
      } catch (e) {
        console.error("Autosave restore failed", e);
      }
    }

    // 2. Check for Pending Template (Overwrite)
    const templateFromState = location.state?.template;
    if (templateFromState) {
      try {
        const template = templateFromState;
        // Overwrite existing state with template
        currentNodes = template.nodes || [];
        currentEdges = template.edges || [];
        // toast.success(`Loaded template: ${template.name}`);
      } catch (e) {
        toast.error("Failed to load template");
      }
    }

    // Apply Final State
    if (autosaveStr || templateFromState) {
      setNodes(currentNodes);
      setEdges(currentEdges);
    }
  }, [location]);

  // Auto-save Workspace (Writer)
  useEffect(() => {
    if (nodes.length > 0) {
      const autosave = { nodes, edges, timestamp: Date.now() };
      localStorage.setItem('workspace_autosave', JSON.stringify(autosave));
    }
  }, [nodes, edges]);



  // Restore Workflow
  const restoreWorkflow = async (workflowId: number) => {
    try {
      const response = await axios.get(`${API_URL}/workflows`, {
        headers: getAuthHeaders()
      });
      const workflow = response.data.find((w: any) => w.id === workflowId);
      if (workflow) {
        setNodes(workflow.nodes_json);
        setEdges(workflow.edges_json);
        toast.success(`Restored workflow: ${workflow.name}`);
      } else {
        toast.error("Workflow not found");
      }
    } catch (error) {
      toast.error("Failed to restore workflow");
    }
  };

  const onNodeDataChange = useCallback((id: string, newData: any) => {
    setNodes((nds) => {
      const activeNode = nds.find(n => n.id === id);
      // Propagate columns to model node if dataset changes
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
        if (node.id === id) return { ...node, data: newData };
        return node;
      });
    });
  }, [setNodes]);

  // Dynamic edge coloring
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          const newStroke = NODE_COLORS[sourceNode.type || 'default'] || NODE_COLORS.default;
          if (edge.style?.stroke !== newStroke) {
            return { ...edge, style: { ...edge.style, stroke: newStroke, strokeWidth: 2 } };
          }
        }
        return edge;
      })
    );
  }, [nodes, setEdges]);

  const onConnect = useCallback((params: Connection) => {
    const sourceNode = nodes.find((n) => n.id === params.source);
    // Note: Edge styling is handled by useEffect above, but we set initial style here
    const stroke = sourceNode ? (NODE_COLORS[sourceNode.type || 'default'] || NODE_COLORS.default) : NODE_COLORS.default;
    const edge = { ...params, animated: true, style: { stroke, strokeWidth: 2 } };
    setEdges((eds) => {
      const filtered = eds.filter((e) => e.target !== params.target);
      return addEdge(edge, filtered);
    });
  }, [nodes, setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeDelete = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [setNodes]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type || !type) return;

    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowWrapper.current!.getBoundingClientRect().left,
      y: event.clientY - reactFlowWrapper.current!.getBoundingClientRect().top,
    });

    let initialData: any = { label: `${type} node`, onChange: onNodeDataChange, onDelete: onNodeDelete };
    if (type === 'model') {
      const datasetNode = nodes.find(n => n.type === 'dataset');
      if (datasetNode?.data.columns) initialData = { ...initialData, columns: datasetNode.data.columns };
    }

    const newNode: Node = { id: getId(), type, position, data: initialData };
    setNodes((nds) => nds.concat(newNode));
  },
    [reactFlowInstance, onNodeDataChange, onNodeDelete, setNodes]
  );

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (!node.data.onChange || !node.data.onDelete) {
          return { ...node, data: { ...node.data, onChange: onNodeDataChange, onDelete: onNodeDelete } };
        }
        return node;
      })
    );
  }, [onNodeDataChange, onNodeDelete, setNodes]);

  // Use Custom Hook for Pipeline Logic
  const { runPipeline, isRunning } = usePipeline(nodes, edges, onNodeDataChange);

  return (
    <div className="flex flex-col h-screen w-screen bg-white text-[#202124] font-sans">
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-200 p-4 flex justify-between items-center h-16 shrink-0 z-20 relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05]" />
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/templates" state={{ from: 'workspace' }} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all">
            <LayoutGrid size={18} />
            <span className="hidden sm:inline text-sm">Templates</span>
          </Link>

          <Link to="/docs" state={{ from: 'workspace' }} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all">
            <Book size={18} />
            <span className="hidden sm:inline text-sm">Docs</span>
          </Link>

          <Link
            to="/history"
            state={{ from: 'workspace' }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all"
          >
            <History size={18} />
            <span className="hidden sm:inline text-sm">History</span>
          </Link>

          <Link
            to="/chat"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all"
            title="Community Chat"
          >
            <Users size={18} />
            <span className="text-sm">Chat</span>
          </Link>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          <button
            onClick={runPipeline}
            disabled={isRunning}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-medium transition-all shadow-md active:scale-95 ${isRunning ? 'bg-gray-100 cursor-not-allowed text-gray-400 shadow-none' : 'bg-[#1a73e8] hover:bg-[#1557b0] hover:shadow-lg'}`}
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" className="opacity-90" />
                <span>Run</span>
              </>
            )}
          </button>


          {user && (
            <div className="relative group">
              <button className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-200 hover:ring-[#4285F4] transition-all duration-200 focus:outline-none focus:ring-[#4285F4]" title={user.email}>
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} alt={user.email} className="w-full h-full object-cover" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-100">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} alt={user.email} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.email.split('@')[0]}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <LogOut size={16} className="text-gray-400" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

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
            <div className={`absolute top-4 left-4 z-50 transition-all duration-300 ${!isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
              <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white border border-gray-200 rounded-full text-[#5f6368] shadow-lg hover:shadow-xl hover:text-[#202124] transition-all duration-300 group" title="Open Sidebar">
                <LayoutGrid size={20} />
              </button>
            </div>

            <div className={`absolute top-4 right-4 z-50 transition-all duration-300 ${!isChatOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
              <button onClick={() => setIsChatOpen(true)} className="p-3 bg-white border border-gray-200 rounded-full text-[#5f6368] shadow-lg hover:shadow-xl hover:text-[#4285F4] transition-all duration-300 group" title="Open Chat">
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
              defaultEdgeOptions={{ animated: true, style: DEFAULT_EDGE_STYLE }}
              className="bg-[#F8F9FA]"
              deleteKeyCode={['Backspace', 'Delete']}
              nodesFocusable={true}
            >
              <Controls className="!bg-white !border-gray-200 !shadow-lg !rounded-lg !text-[#5f6368] [&>button]:!border-gray-100 [&>button]:!fill-[#5f6368] hover:[&>button]:!bg-[#F1F3F4] hover:[&>button]:!fill-[#202124]" />
              <Background color="#dadce0" gap={20} size={1} />
            </ReactFlow>
          </div>

          {/* Chat Panel Area */}
          <div className={`flex flex-col border-l border-gray-200 relative z-10 overflow-visible transition-all duration-200 ease-out bg-white shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)]`} style={{ width: isChatOpen ? chatWidth : 0 }}>
            {isChatOpen && (
              <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[#4285F4] z-50 transition-colors" onMouseDown={startResizing} />
            )}
            <div className="w-full h-full overflow-hidden">
              <ChatPanel onClose={() => setIsChatOpen(false)} nodes={nodes} edges={edges} />
            </div>
          </div>
        </ReactFlowProvider>
      </div>
      <Toaster position="top-right" richColors theme="dark" />
    </div>
  );
}

function LandingPageWrapper() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  return <LandingPage onEnterWorkspace={() => navigate(isAuthenticated ? '/workspace' : '/login')} />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/history" element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatInterface />
          </ProtectedRoute>
        } />
        <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
