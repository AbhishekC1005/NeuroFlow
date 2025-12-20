import {
    Play,
    Database,
    BrainCircuit,
    BarChart3,
    Wand2,
    ArrowRight,
    Sparkles,
    MousePointerClick,
    GitBranch,
    CheckCircle2
} from 'lucide-react';
import logo from '../assets/image.png';
import screenshot from '../assets/Screenshot 2025-12-20 210421.png';
import screenshot2 from '../assets/image copy.png';
import demoVideo from '../assets/Screen Recording 2025-12-20 210508.mp4';

interface LandingPageProps {
    onEnterWorkspace: () => void;
}

export default function LandingPage({ onEnterWorkspace }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-white font-['Outfit',_'Inter',_sans-serif]">
            {/* Top accent bar - Google colors */}
            <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853]" />

            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="FlowML" className="h-8 w-auto" />
                        <div className="hidden sm:block">
                            <span className="text-xl font-medium text-gray-800">
                                <span className="text-[#4285F4]">Flow</span>
                                <span className="text-[#34A853]">ML</span>
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onEnterWorkspace}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#4285F4] hover:bg-[#3367D6] text-white text-sm font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        Get Started
                        <ArrowRight size={16} />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-green-50/30" />

                <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm mb-8">
                            <Sparkles size={16} className="text-[#FBBC05]" />
                            <span className="text-sm text-gray-600">Experimental • No-Code ML Platform</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal text-gray-900 tracking-tight mb-6 leading-tight">
                            Build machine learning pipelines
                            <br />
                            <span className="font-medium bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05] bg-clip-text text-transparent">
                                visually
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Drag and drop nodes to create ML workflows. Train models in one click. No coding required.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                            <button
                                onClick={onEnterWorkspace}
                                className="flex items-center gap-3 px-8 py-4 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                <Play size={20} fill="currentColor" />
                                Try FlowML
                            </button>
                            <a href="#demo" className="flex items-center gap-2 px-6 py-4 text-gray-700 hover:text-[#4285F4] font-medium transition-colors">
                                Watch demo
                                <ArrowRight size={18} />
                            </a>
                        </div>

                        {/* Quick steps */}
                        <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <MousePointerClick size={18} className="text-[#4285F4]" />
                                <span>Drag & drop</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <GitBranch size={18} className="text-[#FBBC05]" />
                                <span>Connect nodes</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <BarChart3 size={18} className="text-[#34A853]" />
                                <span>See results</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Screenshots Section */}
            <section id="demo" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl lg:text-4xl font-normal text-gray-900 mb-4">
                            See it in action
                        </h2>
                        <p className="text-lg text-gray-600">
                            A visual approach to machine learning
                        </p>
                    </div>

                    {/* Image 1: Description LEFT, Image RIGHT */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center mb-32">
                        {/* Description */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#4285F4]/10 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-[#4285F4]" />
                                <span className="text-sm font-medium text-[#4285F4]">Visual Pipeline Builder</span>
                            </div>
                            <h3 className="text-2xl lg:text-3xl font-medium text-gray-900">
                                Build ML workflows with drag & drop
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Simply drag nodes from the sidebar and connect them to create powerful machine learning pipelines. No coding required.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-gray-700">
                                    <span className="w-6 h-6 rounded-full bg-[#4285F4]/10 text-[#4285F4] flex items-center justify-center text-sm">✓</span>
                                    Intuitive drag and drop interface
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <span className="w-6 h-6 rounded-full bg-[#34A853]/10 text-[#34A853] flex items-center justify-center text-sm">✓</span>
                                    Connect nodes visually
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <span className="w-6 h-6 rounded-full bg-[#FBBC05]/10 text-[#FBBC05] flex items-center justify-center text-sm">✓</span>
                                    Real-time data preview
                                </li>
                            </ul>
                        </div>

                        {/* Image */}
                        <div className="lg:col-span-3">
                            <div className="rounded-2xl overflow-hidden shadow-2xl ring-2 ring-[#4285F4]/30 transition-all duration-300 hover:ring-[#4285F4]/50">
                                <div className="p-1.5 bg-gradient-to-r from-[#4285F4] to-[#34A853]">
                                    <img
                                        src={screenshot}
                                        alt="FlowML Pipeline Builder"
                                        className="w-full h-auto rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Image 2: Image LEFT, Description RIGHT */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center mb-32">
                        {/* Image */}
                        <div className="lg:col-span-3 order-2 lg:order-1">
                            <div className="rounded-2xl overflow-hidden shadow-2xl ring-2 ring-[#EA4335]/30 transition-all duration-300 hover:ring-[#EA4335]/50">
                                <div className="p-1.5 bg-gradient-to-r from-[#EA4335] to-[#FBBC05]">
                                    <div className="overflow-hidden rounded-xl">
                                        <img
                                            src={screenshot2}
                                            alt="FlowML AI Chatbot"
                                            className="w-full h-auto rounded-xl"
                                            style={{ marginRight: '-30px', width: 'calc(100% + 30px)' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EA4335]/10 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-[#EA4335]" />
                                <span className="text-sm font-medium text-[#EA4335]">AI Assistant</span>
                            </div>
                            <h3 className="text-2xl lg:text-3xl font-medium text-gray-900">
                                Get help from AI chatbot
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                Have questions about ML or need guidance? Our built-in AI chatbot powered by GPT helps you understand concepts and troubleshoot issues.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-gray-700">
                                    <span className="w-6 h-6 rounded-full bg-[#EA4335]/10 text-[#EA4335] flex items-center justify-center text-sm">✓</span>
                                    Ask questions in natural language
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <span className="w-6 h-6 rounded-full bg-[#FBBC05]/10 text-[#FBBC05] flex items-center justify-center text-sm">✓</span>
                                    Get ML explanations & tips
                                </li>
                                <li className="flex items-center gap-3 text-gray-700">
                                    <span className="w-6 h-6 rounded-full bg-[#34A853]/10 text-[#34A853] flex items-center justify-center text-sm">✓</span>
                                    Learn while you build
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Video Demo */}
                    <div className="max-w-4xl mx-auto">
                        <div className="rounded-2xl overflow-hidden bg-gray-900 shadow-2xl ring-1 ring-gray-800">
                            {/* Browser chrome */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-800">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#EA4335]" />
                                    <div className="w-3 h-3 rounded-full bg-[#FBBC05]" />
                                    <div className="w-3 h-3 rounded-full bg-[#34A853]" />
                                </div>
                                <div className="flex-1 max-w-md mx-auto">
                                    <div className="bg-gray-700 rounded-md px-4 py-1.5 text-xs text-gray-300 text-center">
                                        flowml.app/workspace
                                    </div>
                                </div>
                            </div>
                            <video
                                className="w-full"
                                autoPlay
                                muted
                                loop
                                playsInline
                                controls
                            >
                                <source src={demoVideo} type="video/mp4" />
                            </video>
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-4">Build a complete ML pipeline in minutes</p>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-normal text-gray-900 mb-4">
                            Everything you need
                        </h2>
                        <p className="text-lg text-gray-600">
                            From data import to model evaluation
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: <Database size={28} />, title: 'Data Import', desc: 'Upload CSV or Excel with instant preview', color: '#4285F4' },
                            { icon: <Wand2 size={28} />, title: 'Preprocessing', desc: 'Handle missing values, encode categories', color: '#FBBC05' },
                            { icon: <BrainCircuit size={28} />, title: 'ML Models', desc: 'Classification & regression algorithms', color: '#EA4335' },
                            { icon: <BarChart3 size={28} />, title: 'Evaluation', desc: 'Accuracy metrics and visualizations', color: '#34A853' },
                        ].map((feature, idx) => (
                            <div key={idx} className="text-center">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                    style={{ backgroundColor: `${feature.color}15`, color: feature.color }}
                                >
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-500">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-5xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl lg:text-4xl font-normal text-gray-900 mb-4">
                            Three simple steps
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            { num: '1', title: 'Upload your data', desc: 'Drag and drop your CSV or Excel file', color: '#4285F4' },
                            { num: '2', title: 'Build your pipeline', desc: 'Connect preprocessing and model nodes', color: '#FBBC05' },
                            { num: '3', title: 'Train & evaluate', desc: 'Click run and view your results', color: '#34A853' },
                        ].map((step, idx) => (
                            <div key={idx} className="text-center">
                                <div
                                    className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 text-white text-xl font-medium"
                                    style={{ backgroundColor: step.color }}
                                >
                                    {step.num}
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">{step.title}</h3>
                                <p className="text-sm text-gray-500">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-[#4285F4]">
                <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                    <h2 className="text-3xl lg:text-4xl font-normal text-white mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-lg text-blue-100 mb-8">
                        No account required. Start building in seconds.
                    </p>
                    <button
                        onClick={onEnterWorkspace}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[#4285F4] font-medium rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        <Play size={20} fill="currentColor" />
                        Launch FlowML
                    </button>

                    <div className="flex items-center justify-center gap-6 mt-10 text-blue-100 text-sm">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            <span>Free to use</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            <span>No sign-up</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            <span>Instant results</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-medium">
                            <span className="text-[#4285F4]">Flow</span>
                            <span className="text-[#34A853]">ML</span>
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">
                        Built with ❤️ for the ML community
                    </p>
                </div>
            </footer>
        </div>
    );
}
