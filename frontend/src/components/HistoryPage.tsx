import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import logo from '../assets/image.png';
import { useAuth } from "./AuthContext";
import { ArrowLeft, History, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface HistoryItem {
    id: number;
    created_at: string;
    workflow_id: number | null;
    results_summary: any;
    workflow_snapshot: any; // Added snapshot support
}

export default function HistoryPage() {
    const { token, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const fromWorkspace = location.state?.from === 'workspace';
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        const fetchHistory = async () => {
            try {
                // Determine API Base URL (same logic as other components)
                const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
                const API_BASE_URL = isProduction
                    ? 'https://neuro-flow-backend.onrender.com'
                    : 'http://localhost:8000';

                const response = await fetch(`${API_BASE_URL}/history`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch history');
                }

                const data = await response.json();
                setHistory(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [isAuthenticated, token, navigate]);

    // Format date helper
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 font-['Outfit',_'Inter',_sans-serif]">
            {/* Reuse Navbar from TemplatesPage (Simplified) */}
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
                                <span className="ml-2 text-sm text-gray-400 font-normal border-l border-gray-200 pl-2">History</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 lg:px-8 py-12">
                <div className="mb-8">
                    {fromWorkspace ? (
                        <Link to="/workspace" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4">
                            <ArrowLeft size={18} />
                            <span className="text-sm font-medium">Back to Workspace</span>
                        </Link>
                    ) : (
                        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4">
                            <ArrowLeft size={18} />
                            <span className="text-sm font-medium">Back to Home</span>
                        </Link>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                            <History size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Execution History</h1>
                            <p className="text-gray-500">View past pipeline runs and results.</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500">Loading history...</p>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                        <p className="text-gray-500">No history found. Run a pipeline first!</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Metrics</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Workflow</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {history.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {item.results_summary?.error ? (
                                                        <>
                                                            <XCircle size={18} className="text-red-500" />
                                                            <span className="text-sm font-medium text-red-600">Failed</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 size={18} className="text-green-500" />
                                                            <span className="text-sm font-medium text-green-600">Success</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={16} className="text-gray-400" />
                                                    {formatDate(item.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {item.results_summary?.accuracy ? (
                                                    <span>Accuracy: <strong>{(item.results_summary.accuracy * 100).toFixed(1)}%</strong></span>
                                                ) : item.results_summary?.r2_score ? (
                                                    <span>R²: <strong>{item.results_summary.r2_score.toFixed(3)}</strong></span>
                                                ) : (
                                                    <span className="text-gray-400 italic">No metrics</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-3">
                                                    {item.workflow_id ? <span>Workflow #{item.workflow_id}</span> : <span className="text-gray-400">Ad-hoc Run</span>}

                                                    {/* Restore Button for BOTH saved and ad-hoc workflows */}
                                                    {(item.workflow_id || item.workflow_snapshot) && (
                                                        <button
                                                            onClick={() => {
                                                                if (item.workflow_id) {
                                                                    navigate('/workspace', { state: { restoreWorkflowId: item.workflow_id } });
                                                                } else if (item.workflow_snapshot) {
                                                                    navigate('/workspace', { state: { template: item.workflow_snapshot } });
                                                                }
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                                            title="Restore this pipeline state"
                                                        >
                                                            Open
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
