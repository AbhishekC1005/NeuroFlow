import { useNavigate, Link, useLocation } from 'react-router-dom';
import ReactFlow, { Background } from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowLeft, ArrowRight, LayoutTemplate, Database, LineChart } from 'lucide-react';
import logo from '../assets/image.png';

// Import actual nodes for realistic preview
import DatasetNode from './nodes/DatasetNode';
import PreprocessingNode from './nodes/PreprocessingNode';
import ImputationNode from './nodes/ImputationNode';
import EncodingNode from './nodes/EncodingNode';
import SplitNode from './nodes/SplitNode';
import ModelNode from './nodes/ModelNode';
import ResultNode from './nodes/ResultNode';

const nodeTypes = {
    dataset: DatasetNode,
    imputation: ImputationNode,
    encoding: EncodingNode,
    preprocessing: PreprocessingNode,
    split: SplitNode,
    model: ModelNode,
    result: ResultNode,
};

// Template Data with Horizontal Layouts (Left -> Right)
const templates = [
    {
        id: 'linear-regression',
        name: 'Linear Regression Pipeline',
        description: 'A standard pipeline for predicting continuous values. Includes data splitting and linear regression modeling.',
        nodes: [
            { id: 't1-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Housing Data' } },
            { id: 't1-2', type: 'split', position: { x: 500, y: 100 }, data: { label: 'Train/Test Split' } },
            { id: 't1-3', type: 'model', position: { x: 1000, y: 100 }, data: { label: 'Linear Regression', modelType: 'Linear Regression' } },
            { id: 't1-4', type: 'result', position: { x: 1500, y: 100 }, data: { label: 'Evaluation Metrics' } },
        ],
        edges: [
            { id: 'e1-1', source: 't1-1', target: 't1-2' },
            { id: 'e1-2', source: 't1-2', target: 't1-3' },
            { id: 'e1-3', source: 't1-3', target: 't1-4' },
        ],
        icon: <LineChart className="text-blue-500" size={24} />,
        color: 'blue'
    },
    {
        id: 'random-forest',
        name: 'Random Forest Classifier',
        description: 'Robust classification pipeline with feature encoding and Random Forest ensemble learning.',
        nodes: [
            { id: 't2-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Customer Churn' } },
            { id: 't2-2', type: 'encoding', position: { x: 500, y: 100 }, data: { label: 'One-Hot Encoding' } },
            { id: 't2-3', type: 'split', position: { x: 1000, y: 100 }, data: { label: 'Split Data' } },
            { id: 't2-4', type: 'model', position: { x: 1500, y: 100 }, data: { label: 'Random Forest', modelType: 'Random Forest' } },
            { id: 't2-5', type: 'result', position: { x: 2000, y: 100 }, data: { label: 'Accuracy Report' } },
        ],
        edges: [
            { id: 'e2-1', source: 't2-1', target: 't2-2' },
            { id: 'e2-2', source: 't2-2', target: 't2-3' },
            { id: 'e2-3', source: 't2-3', target: 't2-4' },
            { id: 'e2-4', source: 't2-4', target: 't2-5' },
        ],
        icon: <LayoutTemplate className="text-green-500" size={24} />,
        color: 'green'
    },
    {
        id: 'data-cleaning',
        name: 'Data Cleaning & Prep',
        description: 'Focus on data quality. Handles missing values and performs feature scaling before visualization.',
        nodes: [
            { id: 't3-1', type: 'dataset', position: { x: 0, y: 100 }, data: { label: 'Raw Survey Data' } },
            { id: 't3-2', type: 'imputation', position: { x: 500, y: 100 }, data: { label: 'Fill Missing Values' } },
            { id: 't3-3', type: 'preprocessing', position: { x: 1000, y: 100 }, data: { label: 'Scale Features' } },
            { id: 't3-4', type: 'result', position: { x: 1500, y: 100 }, data: { label: 'Cleaned Dataset' } },
        ],
        edges: [
            { id: 'e3-1', source: 't3-1', target: 't3-2' },
            { id: 'e3-1b', source: 't3-2', target: 't3-3' },
            { id: 'e3-2', source: 't3-3', target: 't3-4' },
        ],
        icon: <Database className="text-purple-500" size={24} />,
        color: 'purple'
    }
];

export default function TemplatesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const fromWorkspace = location.state?.from === 'workspace';

    const handleTryTemplate = (template: any) => {
        // Sanitize template (remove React Components which can't be put in history state)
        const { icon, ...sanitizedTemplate } = template;
        navigate('/workspace', { state: { template: sanitizedTemplate } });
    };

    return (
        <div className="min-h-screen bg-gray-50 font-['Outfit',_'Inter',_sans-serif]">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <img src={logo} alt="FlowML" className="h-8 w-auto" />
                            <div className="hidden sm:block">
                                <span className="text-xl font-medium text-gray-800">
                                    <span className="text-[#4285F4]">Flow</span>
                                    <span className="text-[#34A853]">ML</span>
                                </span>
                                <span className="ml-2 text-sm text-gray-400 font-normal border-l border-gray-200 pl-2">Templates</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
                {fromWorkspace ? (
                    <Link to="/workspace" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to Workspace</span>
                    </Link>
                ) : (
                    <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to Home</span>
                    </Link>
                )}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Start with a Blueprint</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Choose a pre-built workflow to jumpstart your project. These templates are fully interactive previews!
                    </p>
                </div>

                {/* Stacked Layout for Big Space */}
                <div className="space-y-16">
                    {templates.map((template) => (
                        <div key={template.id} className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col">

                            {/* Header */}
                            <div className="px-8 py-6 border-b border-gray-100 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl bg-${template.color}-50 text-${template.color}-600`}>
                                        {template.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">{template.name}</h3>
                                        <p className="text-gray-500">{template.description}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleTryTemplate(template)}
                                    className="py-2.5 px-6 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium rounded-full transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
                                >
                                    Try this template
                                    <ArrowRight size={18} />
                                </button>
                            </div>

                            {/* ReactFlow Preview Area - BIG SPACE */}
                            <div className="h-[500px] w-full bg-gray-50/50 relative">
                                <div className="absolute inset-0 pointer-events-none"> {/* Disable interaction within preview to prevent scroll trapping */}
                                    <ReactFlow
                                        nodes={template.nodes}
                                        edges={template.edges}
                                        nodeTypes={nodeTypes}

                                        fitView
                                        fitViewOptions={{ padding: 0.25 }}
                                        minZoom={0.1}
                                        proOptions={{ hideAttribution: true }}
                                        nodesDraggable={false}
                                        nodesConnectable={false}
                                        panOnDrag={false}
                                        panOnScroll={false}
                                        zoomOnScroll={false}
                                        zoomOnPinch={false}
                                        zoomOnDoubleClick={false}
                                        preventScrolling={false}
                                        attributionPosition="bottom-right"
                                    >
                                        <Background color="#f1f3f4" gap={20} size={1} />
                                        {/* Controls might be distracting in a static preview, but adding them non-interactively looks cool. 
                             Actually, let's remove Controls for a cleaner 'preview' look 
                         */}
                                    </ReactFlow>
                                </div>
                                {/* Overlay to indicate interactivity only happens in workspace */}
                                <div className="absolute inset-0 bg-transparent" />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
