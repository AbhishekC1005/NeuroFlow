import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, Navigate, Link, useLocation, useParams } from 'react-router-dom';
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
import { Play, LayoutGrid, Zap, LogOut, Book, FileDown, MousePointer2, Hand, FilePlus, Wand2, X, RefreshCw, Check, CloudOff, Database, Loader2, FileSpreadsheet, ChevronDown } from 'lucide-react';

import { Toaster, toast } from 'sonner';

import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import DocumentationPage from './components/DocumentationPage';
import TemplatesPage from './components/TemplatesPage';

import WorkspaceDashboard from './components/WorkspaceDashboard';
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
import ViewDatasetNode from './components/nodes/ViewDatasetNode';

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
  viewDataset: ViewDatasetNode,
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

  const defaultEdgeOptions = useMemo(() => ({ animated: true, style: DEFAULT_EDGE_STYLE }), []);

  // Bug 2 & 8 fix: keep live refs for edges and nodes to avoid stale closures
  const edgesRef = useRef(edges);
  const nodesRef = useRef(nodes);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const onNodeDataChange = useCallback((id: string, newData: any) => {
    setNodes((nds) => {
      const activeNode = nds.find(n => n.id === id);
      // Bug 2 fix: propagate columns ONLY to model nodes connected (downstream) to this dataset
      if (activeNode?.type === 'dataset' && newData.columns && JSON.stringify(newData.columns) !== JSON.stringify(activeNode.data.columns)) {
        const currentEdges = edgesRef.current;
        // BFS from this dataset node to find all reachable node ids
        const reachable = new Set<string>();
        const queue = [id];
        while (queue.length > 0) {
          const curr = queue.shift()!;
          currentEdges.filter(e => e.source === curr).forEach(e => {
            if (!reachable.has(e.target)) {
              reachable.add(e.target);
              queue.push(e.target);
            }
          });
        }
        return nds.map((node) => {
          if (node.id === id) return { ...node, data: newData };
          if (node.type === 'model' && reachable.has(node.id)) {
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

  // ── ViewDataset: on-demand peek callback ───────────────────────────────────
  const onNodeDataChangeRef = useRef(onNodeDataChange);
  useEffect(() => { onNodeDataChangeRef.current = onNodeDataChange; }, [onNodeDataChange]);

  const handlePeek = useCallback(async (nodeId: string): Promise<void> => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    const getParent = (id: string) => {
      const edge = currentEdges.find(e => e.target === id);
      if (!edge) return null;
      return currentNodes.find(n => n.id === edge.source) || null;
    };

    let cur = getParent(nodeId);
    let datasetNode: Node | null = null;
    let imputationNode: Node | null = null;
    let encodingNode: Node | null = null;
    let preprocessingNode: Node | null = null;
    let outlierNode: Node | null = null;
    let duplicateNode: Node | null = null;
    let featureSelectionNode: Node | null = null;
    const activeSteps: string[] = [];

    for (let i = 0; i < 20; i++) {
      if (!cur) break;
      if (cur.type === 'dataset') { datasetNode = cur; break; }
      if (cur.type === 'imputation') { imputationNode = cur; activeSteps.unshift('imputation'); }
      else if (cur.type === 'encoding') { encodingNode = cur; activeSteps.unshift('encoding'); }
      else if (cur.type === 'preprocessing') { preprocessingNode = cur; activeSteps.unshift('preprocessing'); }
      else if (cur.type === 'outlier') { outlierNode = cur; activeSteps.unshift('outlier'); }
      else if (cur.type === 'duplicate') { duplicateNode = cur; activeSteps.unshift('duplicate'); }
      else if (cur.type === 'featureSelection') { featureSelectionNode = cur; activeSteps.unshift('featureSelection'); }
      cur = getParent(cur.id);
    }

    if (!datasetNode || (!datasetNode.data.file_id && !datasetNode.data.file)) {
      toast.error('Connect a Dataset node before this View node.');
      return;
    }

    const payload = {
      file_id: datasetNode.data.file_id || datasetNode.data.file,
      active_steps: activeSteps,
      duplicate_handling: duplicateNode?.data.duplicateHandling || 'none',
      outlier_method: outlierNode?.data.outlierMethod || 'none',
      outlier_action: outlierNode?.data.outlierAction || 'clip',
      imputer_strategy: imputationNode?.data.strategy || 'none',
      encoder_strategy: encodingNode?.data.strategy || 'none',
      scaler_type: preprocessingNode?.data.scaler || 'None',
      feature_selection_method: featureSelectionNode?.data.featureSelectionMethod || 'none',
      variance_threshold: featureSelectionNode?.data.varianceThreshold ?? 0.01,
      correlation_threshold: featureSelectionNode?.data.correlationThreshold ?? 0.95,
      max_rows: 500,
    };

    const response = await axios.post(`${API_URL}/preview_until`, payload, {
      headers: getAuthHeaders()
    });

    const viewNode = currentNodes.find(n => n.id === nodeId);
    if (viewNode) {
      onNodeDataChangeRef.current(nodeId, { ...viewNode.data, previewResult: response.data });
    }
  }, []);

  const { id: workspaceId } = useParams<{ id: string }>();

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [workspaceName, setWorkspaceName] = useState('Untitled Workspace');

  // ── Navbar Datasets Dropdown ─────────────────────────────────────────────
  type NavDataset = { id: string; filename: string; is_sample: boolean; columns: string[]; shape: { rows: number; cols: number } };
  const [isDatasetPanelOpen, setIsDatasetPanelOpen] = useState(false);
  const [navDatasets, setNavDatasets] = useState<NavDataset[]>([]);
  const [navDatasetsLoading, setNavDatasetsLoading] = useState(false);
  const [navDatasetsFetched, setNavDatasetsFetched] = useState(false);
  const datasetPanelRef = useRef<HTMLDivElement>(null);

  const fetchNavDatasets = useCallback(async () => {
    setNavDatasetsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/datasets`, { headers: getAuthHeaders() });
      setNavDatasets(res.data);
    } catch { /* ignore */ }
    finally { setNavDatasetsLoading(false); setNavDatasetsFetched(true); }
  }, []);

  const handleDatasetPanelToggle = useCallback(() => {
    setIsDatasetPanelOpen(v => {
      if (!v && !navDatasetsFetched) fetchNavDatasets();
      return !v;
    });
  }, [navDatasetsFetched, fetchNavDatasets]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datasetPanelRef.current && !datasetPanelRef.current.contains(e.target as globalThis.Node)) {
        setIsDatasetPanelOpen(false);
      }
    };
    if (isDatasetPanelOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDatasetPanelOpen]);

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
  // Bug 8 fix: use nodesRef instead of stale `nodes` closure
  const restoreWorkflow = useCallback(async (workflowId: string) => {
    try {
      const response = await axios.get(`${API_URL}/workflows`, {
        headers: getAuthHeaders()
      });
      const workflow = response.data.find((w: any) => w.id === workflowId);

      if (workflow) {
        // Check if canvas has content (more than just default) using ref for fresh value
        const currentNodes = nodesRef.current;
        const hasContent = currentNodes.length > 0 && !(currentNodes.length === 1 && currentNodes[0].id === '1');

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
  }, [nodesRef]);



  const handleConfirmReplace = () => {
    if (pendingWorkflow) {
      const hydratedNodes = sanitizeNodes(pendingWorkflow.nodes_json).map((n: Node) => ({
        ...n,
        data: { ...n.data, onChange: onNodeDataChange, onDelete: onNodeDelete, onPeek: handlePeek }
      }));
      setNodes(hydratedNodes);
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
        return {
          ...node,
          id: newId,
          position: { x: node.position.x, y: node.position.y + yOffset },
          data: { ...node.data, onChange: onNodeDataChange, onDelete: onNodeDelete, onPeek: handlePeek }
        };
      });

      const newEdges = (pendingWorkflow.edges_json || []).map((edge: Edge, i: number) => ({
        ...edge,
        id: `${edge.id || `e${i}`}_${timestamp}`,
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
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // ── Load workspace from backend on mount ─────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    // If restoring from history, skip (handled by another effect)
    if (location.state?.restoreWorkflowId) {
      setIsInitialized(true);
      return;
    }

    const loadWorkspace = async () => {
      try {
        const res = await axios.get(`${API_URL}/workspaces/${workspaceId}`, {
          headers: getAuthHeaders(),
        });
        const { nodes_json, edges_json, name } = res.data;
        setWorkspaceName(name || 'Untitled Workspace');

        let loadedNodes: Node[] = nodes_json && nodes_json.length > 0
          ? sanitizeNodes(nodes_json)
          : initialNodes;
        let loadedEdges: Edge[] = edges_json || [];

        // Check if a template was passed via navigation state
        const templateFromState = location.state?.template;
        if (templateFromState) {
          try {
            const template = templateFromState;
            const hasContent = loadedNodes.length > 0 && loadedNodes[0].id !== '1';
            if (hasContent) {
              const yOffset = Math.max(...loadedNodes.map(n => n.position.y)) + 400;
              const idMap: Record<string, string> = {};
              const timestamp = Date.now();
              const safeTemplateNodes = sanitizeNodes(template.nodes);
              const newNodes = safeTemplateNodes.map((node: Node) => {
                const newId = `${node.id}_${timestamp}`;
                idMap[node.id] = newId;
                return { ...node, id: newId, position: { x: node.position.x, y: node.position.y + yOffset } };
              });
              const newEdges = (template.edges || []).map((edge: Edge, i: number) => ({
                ...edge, id: `${edge.id || `e${i}`}_${timestamp}`,
                source: idMap[edge.source] || edge.source, target: idMap[edge.target] || edge.target,
              }));
              loadedNodes = [...loadedNodes, ...newNodes];
              loadedEdges = [...loadedEdges, ...newEdges];
              toast.success(`Appended template: ${template.name}`);
            } else {
              loadedNodes = sanitizeNodes(template.nodes || []);
              loadedEdges = template.edges || [];
              toast.success(`Loaded template: ${template.name}`);
            }
            navigate(location.pathname, { replace: true, state: {} });
          } catch { toast.error('Failed to load template'); }
        }

        const hydratedNodes = loadedNodes.map(n => ({
          ...n,
          data: { ...n.data, onChange: onNodeDataChange, onDelete: onNodeDelete, onPeek: handlePeek }
        }));
        setNodes(hydratedNodes);
        setEdges(loadedEdges);
        setIsInitialized(true);
      } catch {
        toast.error('Failed to load workspace');
        navigate('/workspace', { replace: true });
      }
    };
    loadWorkspace();
  }, [workspaceId, onNodeDataChange, onNodeDelete]);

  // ── Debounced auto-save to backend (5s) ──────────────────────────────────
  useEffect(() => {
    if (!isInitialized || !workspaceId) return;

    const timer = setTimeout(() => {
      const sanitizedNodes = nodes.map(n => {
        const { onChange, onDelete, onPeek, ...rest } = n.data;
        return { ...n, data: rest };
      });

      setSaveStatus('saving');
      axios.put(
        `${API_URL}/workspaces/${workspaceId}`,
        { nodes_json: sanitizedNodes, edges_json: edges },
        { headers: getAuthHeaders() }
      ).then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }).catch(() => {
        setSaveStatus('error');
      });
    }, 10000);

    return () => clearTimeout(timer);
  }, [nodes, edges, isInitialized, workspaceId]);

  // ── Flush save on tab close ──────────────────────────────────────────────
  useEffect(() => {
    if (!workspaceId) return;
    const handleBeforeUnload = () => {
      const sanitizedNodes = nodesRef.current.map(n => {
        const { onChange, onDelete, onPeek, ...rest } = n.data;
        return { ...n, data: rest };
      });
      const payload = JSON.stringify({ nodes_json: sanitizedNodes, edges_json: edgesRef.current });
      navigator.sendBeacon(
        `${API_URL}/workspaces/${workspaceId}`,
        new Blob([payload], { type: 'application/json' })
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [workspaceId]);

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
      case 'viewDataset':
        return {};
      default:
        return {};
    }
  }, [nodes]);

  const humanizeNodeType = useCallback((type: string): string => {
    const names: Record<string, string> = {
      dataset: 'Dataset', imputation: 'Handle Missing', encoding: 'Encode Categories',
      preprocessing: 'Scale Features', split: 'Train-Test Split', model: 'Model', result: 'Result',
      outlier: 'Outlier Handler', featureSelection: 'Feature Selection', duplicate: 'Remove Duplicates',
      crossValidation: 'Cross-Validation', pca: 'PCA', featureEngineering: 'Feature Engineering',
      classBalancing: 'Class Balancing', viewDataset: 'View Dataset',
    };
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    // Bug 5 fix: .project() is deprecated in ReactFlow v11+, use screenToFlowPosition
    const position = reactFlowInstance.screenToFlowPosition
      ? reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : reactFlowInstance.project({
        x: event.clientX - reactFlowWrapper.current!.getBoundingClientRect().left,
        y: event.clientY - reactFlowWrapper.current!.getBoundingClientRect().top,
      });

    // Dataset cards in the sidebar carry pre-filled data (file, file_id, columns, shape)
    const prefillRaw = event.dataTransfer.getData('application/reactflow/dataset-prefill');
    const prefill = prefillRaw ? JSON.parse(prefillRaw) : {};

    // If dragging a dataset card, try to fill an existing empty dataset node first
    if (type === 'dataset' && prefill.file) {
      const emptyDatasetNodes = nodes.filter(n => n.type === 'dataset' && !n.data.file);
      if (emptyDatasetNodes.length > 0) {
        // Pick the nearest empty node to the drop position
        const nearest = emptyDatasetNodes.reduce((best, n) => {
          const d = Math.hypot(n.position.x - position.x, n.position.y - position.y);
          const bd = Math.hypot(best.position.x - position.x, best.position.y - position.y);
          return d < bd ? n : best;
        });
        setNodes((nds) =>
          nds.map((n) =>
            n.id === nearest.id
              ? { ...n, data: { ...n.data, ...prefill } }
              : n
          )
        );
        toast.success(`${prefill.file.replace(/\.(csv|xlsx|xls)$/i, '')} loaded into dataset node`);
        return;
      }
    }

    const initialData: any = {
      label: `${type} node`,
      onChange: onNodeDataChange,
      onDelete: onNodeDelete,
      onPeek: handlePeek,
      ...getNodeDefaults(type),
      ...prefill,
    };

    const newNode: Node = { id: getId(), type, position, data: initialData };
    setNodes((nds) => nds.concat(newNode));
    const label = prefill.file
      ? `${prefill.file.replace(/\.(csv|xlsx|xls)$/i, '')} added`
      : `${humanizeNodeType(type)} node added`;
    toast.success(label);
  },
    [reactFlowInstance, nodes, onNodeDataChange, onNodeDelete, handlePeek, setNodes, getNodeDefaults, humanizeNodeType]
  );

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (!node.data.onChange || !node.data.onDelete) {
          return { ...node, data: { ...node.data, onChange: onNodeDataChange, onDelete: onNodeDelete, onPeek: handlePeek } };
        }
        return node;
      })
    );
  }, [onNodeDataChange, onNodeDelete, setNodes]);

  const handleAddNode = useCallback((type: string) => {
    // Bug 5 fix: use screenToFlowPosition instead of deprecated .project()
    // Bug 10 fix: place new node offset from the rightmost existing node instead of stacking diagonally
    let position = { x: 100, y: 100 };
    if (reactFlowInstance) {
      const currentNodes = nodesRef.current;
      if (currentNodes.length > 0) {
        // Place to the right of the rightmost node
        const maxX = Math.max(...currentNodes.map(n => n.position.x));
        const rightmostNode = currentNodes.find(n => n.position.x === maxX);
        position = {
          x: maxX + 320,
          y: rightmostNode ? rightmostNode.position.y : 100,
        };
      } else {
        const centerFn = reactFlowInstance.screenToFlowPosition || reactFlowInstance.project;
        position = centerFn
          ? centerFn({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
          : { x: 100, y: 100 };
      }
    }

    const initialData: any = {
      label: `${type} node`,
      onChange: onNodeDataChange,
      onDelete: onNodeDelete,
      onPeek: handlePeek,
      ...getNodeDefaults(type),
    };

    const newNode: Node = { id: getId(), type, position, data: initialData };
    setNodes((nds) => nds.concat(newNode));
    toast.success(`${humanizeNodeType(type)} node added`);
    // nodesRef replaces `nodes` dep — no stale closure, no unnecessary re-creation
  }, [reactFlowInstance, nodesRef, onNodeDataChange, onNodeDelete, handlePeek, setNodes, getNodeDefaults, humanizeNodeType]);


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

        {/* Workspace name (editable) + save status */}
        <div className="flex items-center gap-3 ml-2">
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            onBlur={() => {
              if (workspaceId && workspaceName.trim()) {
                axios.put(
                  `${API_URL}/workspaces/${workspaceId}`,
                  { name: workspaceName.trim(), nodes_json: nodes.map(n => { const { onChange, onDelete, onPeek, ...rest } = n.data; return { ...n, data: rest }; }), edges_json: edges },
                  { headers: getAuthHeaders() }
                ).then(() => toast.success('Renamed')).catch(() => toast.error('Rename failed'));
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            className="text-sm font-medium text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#4285F4] focus:outline-none transition-colors truncate max-w-[200px] py-0.5 px-1 rounded"
            title="Click to rename"
          />
          <div className="flex items-center gap-1 text-xs">
            {saveStatus === 'saving' && (
              <><div className="w-3 h-3 border-[1.5px] border-gray-400 border-t-transparent rounded-full animate-spin" /><span className="text-gray-400">Saving...</span></>
            )}
            {saveStatus === 'saved' && (
              <><Check size={13} className="text-green-500" /><span className="text-green-500">Saved</span></>
            )}
            {saveStatus === 'error' && (
              <><CloudOff size={13} className="text-red-400" /><span className="text-red-400">Save failed</span></>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/workspace" className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all" title="All workspaces">
            <FilePlus size={18} />
            <span className="hidden sm:inline text-sm">Workspaces</span>
          </Link>

          <button onClick={() => setIsTemplatesOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all">
            <LayoutGrid size={18} />
            <span className="hidden sm:inline text-sm">Templates</span>
          </button>

          <button onClick={() => setIsDocsOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium transition-all">
            <Book size={18} />
            <span className="hidden sm:inline text-sm">Docs</span>
          </button>

          {/* ── Datasets Dropdown ── */}
          <div className="relative" ref={datasetPanelRef}>
            <button
              onClick={handleDatasetPanelToggle}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all ${isDatasetPanelOpen
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              {navDatasetsLoading
                ? <Loader2 size={16} className="animate-spin" />
                : <Database size={16} />}
              <span className="hidden sm:inline text-sm">Datasets</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${isDatasetPanelOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDatasetPanelOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Your Datasets</span>
                  <button
                    onClick={() => { fetchNavDatasets(); }}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {navDatasetsLoading ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                      <Loader2 size={13} className="animate-spin" /> Loading...
                    </div>
                  ) : navDatasets.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">No datasets yet. Upload a file first.</div>
                  ) : (
                    <>
                      {/* Sample datasets — teal */}
                      {navDatasets.filter(d => d.is_sample).map(ds => (
                        <div
                          key={ds.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/reactflow', 'dataset');
                            e.dataTransfer.setData('application/reactflow/dataset-prefill', JSON.stringify({
                              file: ds.filename, file_id: ds.id, columns: ds.columns,
                              shape: [ds.shape.rows, ds.shape.cols], preview: [],
                            }));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => setIsDatasetPanelOpen(false)}
                          className="group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-150 hover:bg-teal-50 border border-transparent hover:border-teal-200 mb-1"
                        >
                          <div className="w-7 h-7 rounded-lg bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center shrink-0 transition-colors">
                            <FileSpreadsheet size={13} className="text-teal-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold text-gray-800 truncate">{ds.filename.replace(/\.(csv|xlsx|xls)$/i, '')}</div>
                            <div className="text-[10px] text-teal-600 font-medium">Sample · {ds.shape.rows.toLocaleString()} × {ds.shape.cols}</div>
                          </div>
                        </div>
                      ))}

                      {/* Divider between sample and uploads */}
                      {navDatasets.some(d => d.is_sample) && navDatasets.some(d => !d.is_sample) && (
                        <div className="my-1.5 border-t border-gray-100" />
                      )}

                      {/* User uploads — deduplicated by filename, purple */}
                      {(() => {
                        const seen = new Set<string>();
                        return navDatasets
                          .filter(d => !d.is_sample)
                          .filter(d => { if (seen.has(d.filename)) return false; seen.add(d.filename); return true; })
                          .map(ds => (
                            <div
                              key={ds.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/reactflow', 'dataset');
                                e.dataTransfer.setData('application/reactflow/dataset-prefill', JSON.stringify({
                                  file: ds.filename, file_id: ds.id, columns: ds.columns,
                                  shape: [ds.shape.rows, ds.shape.cols], preview: [],
                                }));
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => setIsDatasetPanelOpen(false)}
                              className="group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-150 hover:bg-violet-50 border border-transparent hover:border-violet-200 mb-1"
                            >
                              <div className="w-7 h-7 rounded-lg bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center shrink-0 transition-colors">
                                <FileSpreadsheet size={13} className="text-violet-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold text-gray-800 truncate">{ds.filename.replace(/\.(csv|xlsx|xls)$/i, '')}</div>
                                <div className="text-[10px] text-violet-500 font-medium">My upload · {ds.shape.rows.toLocaleString()} × {ds.shape.cols}</div>
                              </div>
                            </div>
                          ));
                      })()}
                    </>
                  )}
                </div>

                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
                  <p className="text-[10px] text-gray-400 text-center">Drag any dataset onto the canvas</p>
                </div>
              </div>
            )}
          </div>

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

          {/* Export to Notebook Button */}
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => {
                const hasResultNode = nodes.some(n => n.type === 'result');
                if (hasResultNode) {
                  downloadNotebook(nodes, edges);
                  toast.success('Notebook exported successfully!');
                } else {
                  toast.error('Add a Result node first', { description: 'Connect a Result node to the end of your pipeline to enable export.' });
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all ${nodes.some(n => n.type === 'result') ? 'bg-[#34A853] hover:bg-[#2d9248] text-white shadow-md hover:shadow-lg active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              title={nodes.some(n => n.type === 'result') ? 'Export to Jupyter Notebook' : 'Add a Result node to enable export'}
            >
              <FileDown size={18} />
              <span className="hidden sm:inline text-sm">Export</span>
            </button>
            {!nodes.some(n => n.type === 'result') && (
              <span className="text-[9px] text-gray-400 whitespace-nowrap leading-none">needs Result node</span>
            )}
          </div>


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
              nodeTypes={STATIC_NODE_TYPES}
              defaultViewport={{ x: 50, y: 50, zoom: 0.8 }}
              minZoom={0.1}
              maxZoom={2.5}
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
              <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-[#4285F4]/60 z-50 transition-colors group" onMouseDown={startResizing}>
                <div className="absolute inset-y-0 left-0.5 w-0.5 bg-gray-200 group-hover:bg-[#4285F4] transition-colors" />
              </div>
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
                        onChange: onNodeDataChange,
                        onDelete: onNodeDelete,
                        onPeek: handlePeek,
                        columns: existingDataset?.data.columns || node.data.columns
                      }
                    };
                  });

                  // 2. Remap Edges
                  const remappedEdges = newEdges.map((edge, i) => ({
                    ...edge,
                    id: `${edge.id || `e${i}`}_${timestamp}`,
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
                  <X size={20} />
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
                        return {
                          ...node,
                          id: newId,
                          position: { x: node.position.x, y: node.position.y + yOffset },
                          data: { ...node.data, onChange: onNodeDataChange, onDelete: onNodeDelete, onPeek: handlePeek }
                        };
                      });
                      const newEdges = (template.edges || []).map((edge: Edge, i: number) => ({
                        ...edge,
                        id: `${edge.id || `e${i}`}_${timestamp}`,
                        source: idMap[edge.source] || edge.source,
                        target: idMap[edge.target] || edge.target,
                      }));
                      currentNodes = [...currentNodes, ...newNodes];
                      currentEdges = [...currentEdges, ...newEdges];
                      toast.success(`Appended template: ${template.name}`);
                    } else {
                      currentNodes = sanitizeNodes(template.nodes || []).map((n: Node) => ({
                        ...n,
                        data: { ...n.data, onChange: onNodeDataChange, onDelete: onNodeDelete, onPeek: handlePeek }
                      }));
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
                  <X size={20} />
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
                  <RefreshCw size={18} />
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
        <Route path="/workspace" element={<ProtectedRoute><WorkspaceDashboard /></ProtectedRoute>} />
        <Route path="/workspace/:id" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
