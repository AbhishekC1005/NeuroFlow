import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  ControlButton,
  Background,
  BackgroundVariant,
  SelectionMode,
} from 'reactflow';
import type { Connection, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { Play, LayoutGrid, Zap, LogOut, Book, History, FileDown, MousePointer2, Hand, FilePlus, Wand2 } from 'lucide-react';

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

import { downloadNotebook } from './utils/notebookGenerator';

import DatasetNode from './components/nodes/DatasetNode';
import PreprocessingNode from './components/nodes/PreprocessingNode';
import ImputationNode from './components/nodes/ImputationNode';
import EncodingNode from './components/nodes/EncodingNode';
import SplitNode from './components/nodes/SplitNode';
import ModelNode from './components/nodes/ModelNode';
import ResultNode from './components/nodes/ResultNode';
import OutlierNode from './components/nodes/OutlierNode';
import FeatureSelectionNode from './components/nodes/FeatureSelectionNode';
import DuplicateNode from './components/nodes/DuplicateNode';
import CrossValidationNode from './components/nodes/CrossValidationNode';
import PCANode from './components/nodes/PCANode';
import FeatureEngineeringNode from './components/nodes/FeatureEngineeringNode';
import ClassBalancingNode from './components/nodes/ClassBalancingNode';

import logo from './assets/image.png';
import { API_URL, NODE_COLORS, DEFAULT_EDGE_STYLE } from './config';
import { usePipeline } from './hooks/usePipeline';

const STATIC_NODE_TYPES = {
  dataset: DatasetNode,
  imputation: ImputationNode,
  encoding: EncodingNode,
  preprocessing: PreprocessingNode,
  split: SplitNode,
  model: ModelNode,
  result: ResultNode,
  outlier: OutlierNode,
  featureSelection: FeatureSelectionNode,
  duplicate: DuplicateNode,
  crossValidation: CrossValidationNode,
  pca: PCANode,
  featureEngineering: FeatureEngineeringNode,
  classBalancing: ClassBalancingNode,
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

const sanitizeNodes = (nodes: any[]): Node[] => {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((node) => ({
    ...node,
    id: node.id || `node_${Math.random().toString(36).substr(2, 9)}`,
    position: {
      x: typeof node.position?.x === 'number' && !isNaN(node.position.x) ? node.position.x : 0,
      y: typeof node.position?.y === 'number' && !isNaN(node.position.y) ? node.position.y : 0,
    },
    data: node.data || { label: 'Node' },
  }));
};

const applySmartLayout = (nodes: Node[], edges: Edge[] = []): Node[] => {
  if (nodes.length <= 1) return nodes;

  const VERTICAL_SPACING = 400;
  const HORIZONTAL_SPACING = 400;

  // Build Adjacency
  const adj: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  nodes.forEach(n => { adj[n.id] = []; inDegree[n.id] = 0; });
  edges.forEach(e => {
    if (adj[e.source]) {
      adj[e.source].push(e.target);
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    }
  });

  // Find Roots
  const roots = nodes.filter(n => (inDegree[n.id] || 0) === 0);
  // Cycle fallback
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);
  // Sort roots by original Y to keep relative order of disconnected components
  roots.sort((a, b) => a.position.y - b.position.y);

  const positions: Record<string, { x: number, y: number }> = {};
  const visited = new Set<string>();

  // Recursive Layout Function
  const layoutNode = (nodeId: string, x: number, yStart: number): number => {
    // If already visited, we treat it as "0 height added" to this specific parent path
    if (visited.has(nodeId)) {
      return 0;
    }
    visited.add(nodeId);

    const children = adj[nodeId] || [];

    // Leaf node
    if (children.length === 0) {
      positions[nodeId] = { x, y: yStart };
      return VERTICAL_SPACING;
    }

    // Compute children
    let currentY = yStart;
    const childYs: number[] = [];

    children.forEach(childId => {
      const childH = layoutNode(childId, x + HORIZONTAL_SPACING, currentY);
      // If we actually placed the child (it wasn't visited before), record its Y for centering
      if (positions[childId]) {
        childYs.push(positions[childId].y);
      }
      currentY += childH;
    });

    // Place self centered relative to children
    let myY = yStart;
    if (childYs.length > 0) {
      myY = (Math.min(...childYs) + Math.max(...childYs)) / 2;
    } else {
      // Fallback for merge cases where all children are already placed
      const existingChildYs = children.map(c => positions[c]?.y).filter(y => y !== undefined);
      if (existingChildYs.length > 0) {
        myY = (Math.min(...existingChildYs) + Math.max(...existingChildYs)) / 2;
      }
    }

    positions[nodeId] = { x, y: myY };

    return Math.max(currentY - yStart, VERTICAL_SPACING);
  };

  let rootYOffset = 0;
  roots.forEach(root => {
    const treeH = layoutNode(root.id, 50, rootYOffset);
    rootYOffset += treeH + 500; // Large gap between separate pipelines
  });

  return nodes.map(n => ({
    ...n,
    position: positions[n.id] || n.position // Fallback
  }));
};



function Workspace() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(() => STATIC_NODE_TYPES, []);
  const defaultEdgeOptions = useMemo(() => ({ animated: true, style: DEFAULT_EDGE_STYLE }), []);



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

  const onNodeDelete = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [setNodes]);

  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingWorkflow, setPendingWorkflow] = useState<any>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

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

  // Restore Workflow
  const restoreWorkflow = async (workflowId: string) => {
    try {
      const response = await axios.get(`${API_URL}/workflows`, {
        headers: getAuthHeaders()
      });
      const workflow = response.data.find((w: any) => w.id === workflowId);

      if (workflow) {
        // Check if canvas has content (more than just default)
        const hasContent = nodes.length > 0 && !(nodes.length === 1 && nodes[0].id === '1');

        if (hasContent) {
          setPendingWorkflow(workflow);
          setIsRestoreModalOpen(true);
        } else {
          // Empty canvas -> Replace immediately
          setNodes(sanitizeNodes(workflow.nodes_json));
          setEdges(workflow.edges_json || []);
          toast.success(`Restored workflow: ${workflow.name}`);
        }
      } else {
        toast.error("Workflow not found");
      }
    } catch (error) {
      toast.error("Failed to restore workflow");
    }
  };

  const handleNewWorkspace = () => {
    if (nodes.length > 0 && !(nodes.length === 1 && nodes[0].id === '1')) {
      if (window.confirm("Are you sure you want to clear the workspace? Unsaved changes will be lost.")) {
        setNodes(initialNodes);
        setEdges([]);
        setPendingWorkflow(null);
        toast.success("New workspace created");
        // Clear autosave
        localStorage.removeItem('workspace_autosave');
      }
    } else {
      setNodes(initialNodes);
      setEdges([]);
      toast.success("New workspace created");
    }
  };

  const handleConfirmReplace = () => {
    if (pendingWorkflow) {
      setNodes(sanitizeNodes(pendingWorkflow.nodes_json));
      setEdges(pendingWorkflow.edges_json || []);
      toast.success(`Restored workflow: ${pendingWorkflow.name}`);
      setIsRestoreModalOpen(false);
      setPendingWorkflow(null);
    }
  };

  const handleConfirmAppend = () => {
    if (pendingWorkflow) {
      const currentNodes = [...nodes];
      const currentEdges = [...edges];

      const yOffset = currentNodes.length > 0 ? Math.max(...currentNodes.map(n => n.position.y)) + 400 : 0;
      const idMap: Record<string, string> = {};
      const timestamp = Date.now();

      const safePendingNodes = sanitizeNodes(pendingWorkflow.nodes_json);

      const newNodes = safePendingNodes.map((node: Node) => {
        const newId = `${node.id}_${timestamp}`;
        idMap[node.id] = newId;
        return { ...node, id: newId, position: { x: node.position.x, y: node.position.y + yOffset } };
      });

      const newEdges = (pendingWorkflow.edges_json || []).map((edge: Edge) => ({
        ...edge,
        id: `${edge.id}_${timestamp}`,
        source: idMap[edge.source] || edge.source,
        target: idMap[edge.target] || edge.target,
      }));

      setNodes([...currentNodes, ...newNodes]);
      setEdges([...currentEdges, ...newEdges]);

      toast.success(`Appended workflow: ${pendingWorkflow.name}`);
      setIsRestoreModalOpen(false);
      setPendingWorkflow(null);
    }
  };

  useEffect(() => {
    if (location.state && location.state.restoreWorkflowId) {
      restoreWorkflow(location.state.restoreWorkflowId);
      navigate('/workspace', { replace: true, state: {} });
    }
  }, [location, navigate]); // Added navigate dependency

  // Unified Initialization: Autosave + Template
  useEffect(() => {
    // If restoring from history, skip local logic (handled by another effect)
    if (location.state?.restoreWorkflowId) {
      setIsInitialized(true);
      return;
    }

    let currentNodes: Node[] = initialNodes;
    let currentEdges: Edge[] = [];
    let hasRestored = false;

    // 1. Always Try Restore Autosave First (Persistence)
    const autosaveStr = localStorage.getItem('workspace_autosave');
    if (autosaveStr) {
      try {
        const autosave = JSON.parse(autosaveStr);
        if (Array.isArray(autosave.nodes) && autosave.nodes.length > 0) {
          currentNodes = sanitizeNodes(autosave.nodes);
          currentEdges = autosave.edges || [];
          hasRestored = true;
        }
      } catch (e) {
        console.error("Autosave restore failed", e);
      }
    }

    // 2. Check for Pending Template (Smart Append)
    const templateFromState = location.state?.template;
    if (templateFromState) {
      try {
        const template = templateFromState;

        // If we have existing nodes, append intelligently
        const hasContent = hasRestored || (currentNodes.length > 0 && currentNodes[0].id !== '1');

        if (hasContent) {
          const yOffset = Math.max(...currentNodes.map(n => n.position.y)) + 400; // More space for templates
          const idMap: Record<string, string> = {};
          const timestamp = Date.now();
          const safeTemplateNodes = sanitizeNodes(template.nodes);

          // Remap Template Nodes
          const newNodes = safeTemplateNodes.map((node: Node) => {
            const newId = `${node.id}_${timestamp}`;
            idMap[node.id] = newId;
            return {
              ...node,
              id: newId,
              position: {
                x: node.position.x,
                y: node.position.y + yOffset
              }
            };
          });

          // Remap Template Edges
          const newEdges = (template.edges || []).map((edge: Edge) => ({
            ...edge,
            id: `${edge.id}_${timestamp}`,
            source: idMap[edge.source] || edge.source,
            target: idMap[edge.target] || edge.target,
          }));

          currentNodes = [...currentNodes, ...newNodes];
          currentEdges = [...currentEdges, ...newEdges];

          navigate(location.pathname, { replace: true, state: {} });
          toast.success(`Appended template: ${template.name}`);

        } else {
          // Overwrite if workspace is empty/default
          currentNodes = sanitizeNodes(template.nodes || []);
          currentEdges = template.edges || [];
          navigate(location.pathname, { replace: true, state: {} });
          toast.success(`Loaded template: ${template.name}`);
        }
      } catch (e) {
        toast.error("Failed to load template");
      }
    }

    // Apply Final State
    // Apply Final State
    const hydratedNodes = currentNodes.map(n => ({
      ...n,
      data: { ...n.data, onChange: onNodeDataChange, onDelete: onNodeDelete }
    }));
    setNodes(hydratedNodes);
    setEdges(currentEdges);
    setIsInitialized(true); // Enable autosave
  }, [onNodeDataChange, onNodeDelete]); // Only run on mount

  // Auto-save Workspace (Writer)
  useEffect(() => {
    if (!isInitialized) return;

    if (nodes.length > 0) {
      const sanitizedNodes = nodes.map(n => {
        // Strip functions before saving
        const { onChange, onDelete, ...rest } = n.data;
        return { ...n, data: rest };
      });
      const autosave = { nodes: sanitizedNodes, edges, timestamp: Date.now() };
      localStorage.setItem('workspace_autosave', JSON.stringify(autosave));
    }
  }, [nodes, edges, isInitialized]);

  // Auto-fit view on workspace load (center on existing pipeline)
  useEffect(() => {
    if (!isInitialized || !reactFlowInstance) return;

    // Only fit view if we have meaningful nodes (more than just the default empty node)
    const hasMeaningfulPipeline = nodes.length > 1 || (nodes.length === 1 && nodes[0].id !== '1');
    if (hasMeaningfulPipeline) {
      // Small delay to ensure nodes are rendered before fitting
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, reactFlowInstance]);







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



  // Returns explicit default data for each node type so the UI dropdown
  // values are always stored in node.data from the moment of creation.
  const getNodeDefaults = useCallback((type: string): Record<string, any> => {
    const datasetNode = nodes.find(n => n.type === 'dataset');
    const columns = datasetNode?.data.columns;

    switch (type) {
      case 'model':
        return { targetColumn: '', modelType: 'Logistic Regression', ...(columns ? { columns } : {}) };
      case 'preprocessing':
        return { scaler: 'None' };
      case 'imputation':
        return { strategy: 'mean' };
      case 'encoding':
        return { strategy: 'onehot' };
      case 'split':
        return { testSize: 0.2, stratified: false, shuffle: true, randomState: 42 };
      case 'outlier':
        return { outlierMethod: 'iqr', outlierAction: 'clip' };
      case 'featureSelection':
        return { featureSelectionMethod: 'variance', varianceThreshold: 0.01, correlationThreshold: 0.95 };
      case 'duplicate':
        return { duplicateHandling: 'first' };
      case 'crossValidation':
        return { cvFolds: 5, cvStratified: true };
      case 'pca':
        return { pcaComponents: 2 };
      case 'featureEngineering':
        return { featureEngineeringMethod: 'polynomial', polynomialDegree: 2 };
      case 'classBalancing':
        return { classBalancing: 'oversample' };
      default:
        return {};
    }
  }, [nodes]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowWrapper.current!.getBoundingClientRect().left,
      y: event.clientY - reactFlowWrapper.current!.getBoundingClientRect().top,
    });

    const initialData: any = {
      label: `${type} node`,
      onChange: onNodeDataChange,
      onDelete: onNodeDelete,
      ...getNodeDefaults(type),
    };

    const newNode: Node = { id: getId(), type, position, data: initialData };
    setNodes((nds) => nds.concat(newNode));
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} node added`);
  },
    [reactFlowInstance, onNodeDataChange, onNodeDelete, setNodes, getNodeDefaults]
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

  const handleAddNode = useCallback((type: string) => {
    // Basic auto-layout: Find center of viewport or next to last node
    const position = reactFlowInstance ? reactFlowInstance.project({
      x: (window.innerWidth - 320) / 2, // Approximate center
      y: window.innerHeight / 2
    }) : { x: 100, y: 100 };

    // Offset based on existing nodes count to avoid overlap
    position.x += (nodes.length * 20);
    position.y += (nodes.length * 20);

    const initialData: any = {
      label: `${type} node`,
      onChange: onNodeDataChange,
      onDelete: onNodeDelete,
      ...getNodeDefaults(type),
    };

    const newNode: Node = { id: getId(), type, position, data: initialData };
    setNodes((nds) => nds.concat(newNode));
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} node added`);
  }, [reactFlowInstance, nodes, onNodeDataChange, onNodeDelete, setNodes, getNodeDefaults]);


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
          <button onClick={handleNewWorkspace} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all" title="Create new blank workspace">
            <FilePlus size={18} />
            <span className="hidden sm:inline text-sm">New</span>
          </button>

          <button onClick={() => setIsTemplatesOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all">
            <LayoutGrid size={18} />
            <span className="hidden sm:inline text-sm">Templates</span>
          </button>

          <button onClick={() => setIsDocsOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all">
            <Book size={18} />
            <span className="hidden sm:inline text-sm">Docs</span>
          </button>

          <Link
            to="/history"
            state={{ from: 'workspace' }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all"
          >
            <History size={18} />
            <span className="hidden sm:inline text-sm">History</span>
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

          {/* Export to Notebook Button - Only enabled when Result node exists */}
          <button
            onClick={() => {
              const hasResultNode = nodes.some(n => n.type === 'result');
              if (hasResultNode) {
                downloadNotebook(nodes, edges);
                toast.success('Notebook exported successfully!');
              } else {
                toast.error('Add a Result node to export pipeline');
              }
            }}
            disabled={!nodes.some(n => n.type === 'result')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all ${nodes.some(n => n.type === 'result') ? 'bg-[#34A853] hover:bg-[#2d9248] text-white shadow-md hover:shadow-lg active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            title={nodes.some(n => n.type === 'result') ? 'Export to Jupyter Notebook' : 'Add a Result node to enable export'}
          >
            <FileDown size={18} />
            <span className="hidden sm:inline text-sm">Export</span>
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



      <div className="flex flex-1 overflow-hidden h-[calc(100vh-64px-32px)] relative">
        <ReactFlowProvider>
          {/* Sidebar Area */}
          <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-0'} flex flex-col border-r border-gray-100 relative z-10 overflow-hidden bg-white`}>
            <Sidebar onClose={() => setIsSidebarOpen(false)} onAddNode={handleAddNode} />
          </div>

          {/* Main Canvas */}
          <div className="flex-1 h-full w-full bg-[#F8F9FA] relative group/canvas" ref={reactFlowWrapper}>
            <div className={`absolute top-4 left-4 z-50 transition-all duration-300 ${!isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}>
              <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white border border-gray-200 rounded-full text-[#5f6368] shadow-lg hover:shadow-xl hover:text-[#202124] transition-all duration-300 group" title="Open Sidebar">
                <LayoutGrid size={20} />
              </button>
            </div>

            <div className={`absolute top-4 right-4 z-50 transition-all duration-300 ${!isChatOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
              <button onClick={() => setIsChatOpen(true)} className="group relative p-3 bg-gradient-to-r from-[#4285F4] to-[#1a73e8] hover:from-[#3367D6] hover:to-[#1557B0] text-white rounded-2xl shadow-lg shadow-blue-300/40 hover:shadow-xl hover:shadow-blue-300/50 transition-all duration-300 hover:scale-105" title="Open Flow">
                <Zap size={20} />
                <span className="absolute -bottom-8 right-0 text-xs font-bold text-[#202124] bg-white px-2 py-0.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Flow AI</span>
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
              defaultEdgeOptions={defaultEdgeOptions}
              className="bg-[#F8F9FA]"
              deleteKeyCode={['Backspace', 'Delete']}
              nodesFocusable={true}
              panOnDrag={!isSelectionMode}
              selectionOnDrag={isSelectionMode}
              selectionMode={SelectionMode.Partial}
            >
              <Controls className="!bg-white !border-gray-200 !shadow-lg !rounded-lg !text-[#5f6368] [&>button]:!border-gray-100 [&>button]:!fill-[#5f6368] hover:[&>button]:!bg-[#F1F3F4] hover:[&>button]:!fill-[#202124]">
                <ControlButton
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                  title={isSelectionMode ? "Switch to Pan Mode" : "Switch to Selection Mode"}
                >
                  {isSelectionMode ? <Hand size={16} strokeWidth={2} /> : <MousePointer2 size={16} strokeWidth={2} />}
                </ControlButton>
                <ControlButton
                  onClick={() => {
                    const layoutNodes = applySmartLayout(nodes, edges);
                    setNodes([...layoutNodes]); // Create new reference to trigger update
                    setTimeout(() => reactFlowInstance?.fitView({ duration: 800 }), 100);
                    toast.success("Pipeline rearranged!");
                  }}
                  title="Auto Layout Pipeline"
                >
                  <Wand2 size={16} strokeWidth={2} />
                </ControlButton>
              </Controls>
              <Background color="#94a3b8" gap={24} size={2} variant={BackgroundVariant.Dots} />
            </ReactFlow>
          </div>

          {/* Chat Panel Area */}
          <div className={`flex flex-col border-l border-gray-200 relative z-10 overflow-visible transition-all duration-200 ease-out bg-white shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.1)]`} style={{ width: isChatOpen ? chatWidth : 0 }}>
            {isChatOpen && (
              <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-[#4285F4] z-50 transition-colors" onMouseDown={startResizing} />
            )}
            <div className="w-full h-full overflow-hidden">
              <ChatPanel
                onClose={() => setIsChatOpen(false)}
                nodes={nodes}
                edges={edges}
                onPipelineReplace={(newNodes, newEdges) => {
                  // 1. Find existing dataset node to preserve data
                  const existingDataset = nodes.find(n => n.type === 'dataset');

                  const validatedNodes = sanitizeNodes(newNodes);

                  // 2. Merge existing data if found
                  const mergedNodes = validatedNodes.map(node => {
                    if (node.type === 'dataset' && existingDataset) {
                      return {
                        ...node,
                        data: {
                          ...node.data,
                          ...existingDataset.data,
                          label: existingDataset.data.label || node.data.label // Keep user's label if exists
                        }
                      };
                    }
                    return node;
                  });

                  // 3. Propagate columns to all nodes if dataset exists
                  const finalNodes = mergedNodes.map(node => {
                    const datasetNode = mergedNodes.find(n => n.type === 'dataset');
                    if (node.type !== 'dataset' && datasetNode?.data.columns) {
                      return {
                        ...node,
                        data: {
                          ...node.data,
                          columns: datasetNode.data.columns
                        }
                      };
                    }
                    return node;
                  });

                  const layoutNodes = applySmartLayout(finalNodes, newEdges);
                  setNodes(layoutNodes);
                  setEdges(newEdges);
                  toast.success("Pipeline updated by Flow!");
                }}
                onPipelineCreate={(newNodes, newEdges) => {
                  // Smart Append Logic
                  if (nodes.length === 0) {
                    const validatedVals = sanitizeNodes(newNodes);
                    // Check for dataset in new nodes or if we're restoring one with data
                    const datasetNode = validatedVals.find(n => n.type === 'dataset');

                    const finalVals = validatedVals.map(node => {
                      if (node.type !== 'dataset' && datasetNode?.data.columns) {
                        return { ...node, data: { ...node.data, columns: datasetNode.data.columns } };
                      }
                      return node;
                    });

                    const layoutVals = applySmartLayout(finalVals, newEdges);
                    setNodes(layoutVals);
                    setEdges(newEdges);
                    return;
                  }


                  const yOffset = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.y)) + 300 : 0;
                  const idMap: Record<string, string> = {};
                  const timestamp = Date.now();

                  // Find EXISTING dataset to propagate its columns to NEW nodes
                  const existingDataset = nodes.find(n => n.type === 'dataset');

                  // 1. Remap IDs and Position
                  // First apply layout to just the NEW set to ensure they don't overlap each other
                  const layoutNewNodes = applySmartLayout(sanitizeNodes(newNodes), newEdges);

                  const remappedNodes = layoutNewNodes.map((node) => {
                    const newId = `${node.id}_${timestamp}`; // Simple unique ID generation
                    idMap[node.id] = newId;
                    const basePosition = node.position || { x: 100, y: 100 };
                    return {
                      ...node,
                      id: newId,
                      position: {
                        x: basePosition.x,
                        y: basePosition.y + yOffset
                      },
                      // Ensure we keep the handlers and Propagate Columns
                      data: {
                        ...node.data,
                        columns: existingDataset?.data.columns || node.data.columns
                      }
                    };
                  });

                  // 2. Remap Edges
                  const remappedEdges = newEdges.map((edge) => ({
                    ...edge,
                    id: `${edge.id}_${timestamp}`,
                    source: idMap[edge.source] || edge.source,
                    target: idMap[edge.target] || edge.target,
                  }));

                  // 3. Append to State
                  setNodes((prev) => [...prev, ...remappedNodes]);
                  setEdges((prev) => [...prev, ...remappedEdges]);
                  toast.success("Pipeline appended by Flow!");
                }}
              />
            </div>
          </div>
        </ReactFlowProvider>
      </div>


      {/* Templates Modal */}
      {
        isTemplatesOpen && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative">
              <div className="absolute top-4 right-4 z-50">
                <button onClick={() => setIsTemplatesOpen(false)} className="p-2 bg-white/80 hover:bg-gray-100 rounded-full transition-colors">
                  <LogOut className="rotate-180" size={20} />
                </button>
              </div>
              <TemplatesPage
                isModal={true}
                onSelectTemplate={(template) => {
                  // Logic to load template (same as Autosave restore)
                  try {
                    // Smart Append 
                    const hasContent = nodes.length > 0 && nodes[0].id !== '1';
                    let currentNodes = [...nodes];
                    let currentEdges = [...edges];

                    if (hasContent) {
                      const yOffset = Math.max(...currentNodes.map(n => n.position.y)) + 400;
                      const idMap: Record<string, string> = {};
                      const timestamp = Date.now();
                      const safeTemplateNodes = sanitizeNodes(template.nodes);
                      const newNodes = safeTemplateNodes.map((node: Node) => {
                        const newId = `${node.id}_${timestamp}`;
                        idMap[node.id] = newId;
                        return { ...node, id: newId, position: { x: node.position.x, y: node.position.y + yOffset } };
                      });
                      const newEdges = (template.edges || []).map((edge: Edge) => ({
                        ...edge,
                        id: `${edge.id}_${timestamp}`,
                        source: idMap[edge.source] || edge.source,
                        target: idMap[edge.target] || edge.target,
                      }));
                      currentNodes = [...currentNodes, ...newNodes];
                      currentEdges = [...currentEdges, ...newEdges];
                      toast.success(`Appended template: ${template.name}`);
                    } else {
                      currentNodes = sanitizeNodes(template.nodes || []);
                      currentEdges = template.edges || [];
                      toast.success(`Loaded template: ${template.name}`);
                    }
                    setNodes(currentNodes);
                    setEdges(currentEdges);
                    setIsTemplatesOpen(false);
                  } catch (e) {
                    toast.error("Failed to load template");
                  }
                }}
                onClose={() => setIsTemplatesOpen(false)}
              />
            </div>
          </div>
        )
      }

      {/* Docs Modal */}
      {
        isDocsOpen && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative">
              <div className="absolute top-4 right-4 z-50">
                <button onClick={() => setIsDocsOpen(false)} className="p-2 bg-white/80 hover:bg-gray-100 rounded-full transition-colors">
                  <LogOut className="rotate-180" size={20} />
                </button>
              </div>
              <DocumentationPage isModal={true} onClose={() => setIsDocsOpen(false)} />
            </div>
          </div>
        )
      }

      {/* Restore Workflow Modal */}
      {
        isRestoreModalOpen && pendingWorkflow && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Workflow Loaded</h2>
              <p className="text-gray-600 mb-6">
                You have existing nodes on the canvas. How would you like to add <strong>{pendingWorkflow.name}</strong>?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmAppend}
                  className="w-full py-3 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <LayoutGrid size={18} />
                  Append to Current (Keep Existing)
                </button>

                <button
                  onClick={handleConfirmReplace}
                  className="w-full py-3 bg-white border-2 border-red-100 hover:border-red-500 hover:text-red-600 text-gray-700 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="rotate-0" size={18} />
                  Replace Current (Clear Canvas)
                </button>

                <button
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="w-full py-2 text-gray-500 hover:text-gray-700 font-medium text-sm mt-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      <Toaster position="bottom-center" richColors theme="dark" closeButton />
    </div >
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

        <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
