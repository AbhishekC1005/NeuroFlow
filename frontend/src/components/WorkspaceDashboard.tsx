import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Plus, Clock, Layers, Trash2, LogOut, LayoutGrid, Book, Pencil } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import axios from 'axios';
import logo from '../assets/image.png';
import { API_URL } from '../config';

interface WorkspaceSummary {
    id: string;
    name: string;
    node_count: number;
    created_at: string | null;
    updated_at: string | null;
}

export default function WorkspaceDashboard() {
    const { token, isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        fetchWorkspaces();
    }, [isAuthenticated, token]);

    const fetchWorkspaces = async () => {
        try {
            const res = await axios.get(`${API_URL}/workspaces`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setWorkspaces(res.data);
        } catch {
            toast.error('Failed to load workspaces');
        } finally {
            setLoading(false);
        }
    };

    const createWorkspace = async (name?: string, nodesJson?: any[], edgesJson?: any[]) => {
        setCreating(true);
        try {
            const res = await axios.post(
                `${API_URL}/workspaces`,
                { name: name || 'Untitled Workspace' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const newId = res.data.id;

            // If nodes/edges provided (from template/history), save them immediately
            if (nodesJson && nodesJson.length > 0) {
                await axios.put(
                    `${API_URL}/workspaces/${newId}`,
                    { nodes_json: nodesJson, edges_json: edgesJson || [] },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            navigate(`/workspace/${newId}`);
        } catch {
            toast.error('Failed to create workspace');
        } finally {
            setCreating(false);
        }
    };

    const deleteWorkspace = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (deletingId) return;
        setDeletingId(id);
        try {
            await axios.delete(`${API_URL}/workspaces/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setWorkspaces((ws) => ws.filter((w) => w.id !== id));
            toast.success('Workspace deleted');
        } catch {
            toast.error('Failed to delete workspace');
        } finally {
            setDeletingId(null);
        }
    };

    const renameWorkspace = async (id: string) => {
        const trimmed = renameValue.trim();
        if (!trimmed) { setRenamingId(null); return; }
        try {
            await axios.put(`${API_URL}/workspaces/${id}`, { name: trimmed }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setWorkspaces((ws) => ws.map((w) => w.id === id ? { ...w, name: trimmed } : w));
            toast.success('Renamed');
        } catch {
            toast.error('Rename failed');
        } finally {
            setRenamingId(null);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Just now';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
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
                                <span className="ml-2 text-sm text-gray-400 font-normal border-l border-gray-200 pl-2">Workspaces</span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/templates" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors text-sm font-medium">
                            <LayoutGrid size={16} />
                            <span className="hidden sm:inline">Templates</span>
                        </Link>
                        <Link to="/docs" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors text-sm font-medium">
                            <Book size={16} />
                            <span className="hidden sm:inline">Docs</span>
                        </Link>

                        {user && (
                            <div className="relative group ml-2">
                                <button className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 hover:ring-[#4285F4] transition-all" title={user.email}>
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`} alt={user.email} className="w-full h-full object-cover" />
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-2">
                                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{user.email.split('@')[0]}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                                        <LogOut size={15} className="text-gray-400" />
                                        <span>Log out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Your Workspaces</h1>
                        <p className="text-gray-500 mt-1">Create, manage, and continue your ML pipelines</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-3 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                        <p className="mt-4 text-gray-500 text-sm">Loading workspaces...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {/* New Workspace Card */}
                        <button
                            onClick={() => createWorkspace()}
                            disabled={creating}
                            className="group relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#4285F4] hover:bg-blue-50/30 transition-all duration-200 cursor-pointer min-h-[180px]"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4285F4] to-[#1a73e8] flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-110 transition-transform duration-200">
                                {creating ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Plus size={28} className="text-white" />
                                )}
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-800 group-hover:text-[#4285F4] transition-colors">New Workspace</p>
                                <p className="text-xs text-gray-400 mt-0.5">Start a fresh pipeline</p>
                            </div>
                        </button>

                        {/* Workspace Cards */}
                        {workspaces.map((ws) => (
                            <div
                                key={ws.id}
                                onClick={() => navigate(`/workspace/${ws.id}`)}
                                className="group relative flex flex-col justify-between p-6 bg-white border border-gray-200 rounded-2xl hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer min-h-[180px]"
                            >
                                {/* Rename / Delete buttons */}
                                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setRenamingId(ws.id); setRenameValue(ws.name); }}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                                        title="Rename workspace"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => deleteWorkspace(ws.id, e)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                                        title="Delete workspace"
                                    >
                                        {deletingId === ws.id ? (
                                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 size={14} />
                                        )}
                                    </button>
                                </div>

                                <div>
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34A853] to-[#2d9248] flex items-center justify-center mb-4 shadow-sm">
                                        <Layers size={20} className="text-white" />
                                    </div>
                                    {renamingId === ws.id ? (
                                        <input
                                            autoFocus
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onBlur={() => renameWorkspace(ws.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenamingId(null); }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-base font-semibold text-gray-900 bg-transparent border-b-2 border-[#4285F4] focus:outline-none w-full pr-8"
                                        />
                                    ) : (
                                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-[#1a73e8] transition-colors truncate pr-8">
                                            {ws.name}
                                        </h3>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Layers size={12} />
                                        {ws.node_count} node{ws.node_count !== 1 ? 's' : ''}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {formatDate(ws.updated_at)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && workspaces.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-400 text-sm">No workspaces yet. Create your first one above!</p>
                    </div>
                )}
            </main>

            <Toaster position="bottom-center" richColors theme="dark" closeButton />
        </div>
    );
}
