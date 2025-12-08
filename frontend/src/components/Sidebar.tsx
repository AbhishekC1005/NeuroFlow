import React from 'react';

export default function Sidebar() {
    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shadow-2xl z-10 relative overflow-hidden">
            {/* Decorative gradient background */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />

            <div className="p-6 border-b border-slate-800/50 relative">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full" />
                    Toolbox
                </h2>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Drag nodes to the canvas to build your ML pipeline.
                </p>

                {/* Search placeholder */}
                <div className="mt-4 relative">
                    <input
                        type="text"
                        placeholder="Search components..."
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                        disabled
                    />
                    <div className="absolute right-2.5 top-2 text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    </div>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar flex-1 relative">
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                        Data Source
                        <div className="h-px bg-slate-800 flex-1" />
                    </h3>
                    <div
                        className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl cursor-grab hover:bg-slate-800/80 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 flex items-center gap-3 group backdrop-blur-sm"
                        onDragStart={(event) => onDragStart(event, 'dataset')}
                        draggable
                    >
                        <div className="w-10 h-10 bg-slate-900/80 text-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 border border-slate-700/50 group-hover:border-blue-500 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                        </div>
                        <div>
                            <div className="font-medium text-slate-200 text-sm group-hover:text-blue-400 transition-colors">Dataset</div>
                            <div className="text-[10px] text-slate-500">Upload CSV/Excel</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                        Transformation
                        <div className="h-px bg-slate-800 flex-1" />
                    </h3>
                    <div
                        className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl cursor-grab hover:bg-slate-800/80 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/5 transition-all duration-300 flex items-center gap-3 group backdrop-blur-sm"
                        onDragStart={(event) => onDragStart(event, 'preprocessing')}
                        draggable
                    >
                        <div className="w-10 h-10 bg-slate-900/80 text-yellow-500 rounded-lg flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-white transition-all duration-300 border border-slate-700/50 group-hover:border-yellow-500 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                        </div>
                        <div>
                            <div className="font-medium text-slate-200 text-sm group-hover:text-yellow-400 transition-colors">Preprocessing</div>
                            <div className="text-[10px] text-slate-500">Scale & Normalize</div>
                        </div>
                    </div>

                    <div
                        className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl cursor-grab hover:bg-slate-800/80 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 flex items-center gap-3 group backdrop-blur-sm"
                        onDragStart={(event) => onDragStart(event, 'split')}
                        draggable
                    >
                        <div className="w-10 h-10 bg-slate-900/80 text-purple-500 rounded-lg flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all duration-300 border border-slate-700/50 group-hover:border-purple-500 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>
                        </div>
                        <div>
                            <div className="font-medium text-slate-200 text-sm group-hover:text-purple-400 transition-colors">Train-Test Split</div>
                            <div className="text-[10px] text-slate-500">Partition Data</div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                        Modeling
                        <div className="h-px bg-slate-800 flex-1" />
                    </h3>
                    <div
                        className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl cursor-grab hover:bg-slate-800/80 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300 flex items-center gap-3 group backdrop-blur-sm"
                        onDragStart={(event) => onDragStart(event, 'model')}
                        draggable
                    >
                        <div className="w-10 h-10 bg-slate-900/80 text-cyan-500 rounded-lg flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300 border border-slate-700/50 group-hover:border-cyan-500 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z" /><path d="M12 12 2.1 12a10.01 10.01 0 0 0 1.4 2.8L12 12z" /><path d="M12 12V2a10 10 0 0 1 3.8 1.5L12 12z" /></svg>
                        </div>
                        <div>
                            <div className="font-medium text-slate-200 text-sm group-hover:text-cyan-400 transition-colors">Model Training</div>
                            <div className="text-[10px] text-slate-500">Train Algorithms</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>v1.0.0</span>
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        System Online
                    </span>
                </div>
            </div>
        </aside>
    );
}
