import {
    Play,
    Database,
    BrainCircuit,
    BarChart3,
    Wand2,
    ArrowRight,
    Sparkles,
    Zap,
    MousePointerClick,
    GitBranch
} from 'lucide-react';
import logo from '../assets/image.png';
import screenshot from '../assets/Screenshot 2025-12-20 210421.png';
import demoVideo from '../assets/Screen Recording 2025-12-20 210508.mp4';

interface LandingPageProps {
    onEnterWorkspace: () => void;
}

export default function LandingPage({ onEnterWorkspace }: LandingPageProps) {
    const features = [
        {
            icon: <Database size={24} />,
            title: 'Easy Data Import',
            description: 'Upload CSV or Excel files with instant preview and column detection.',
            color: 'text-[#4285F4]',
            bgColor: 'bg-[#4285F4]/10'
        },
        {
            icon: <Wand2 size={24} />,
            title: 'Smart Preprocessing',
            description: 'Handle missing values, encode categories, and scale features automatically.',
            color: 'text-[#FBBC05]',
            bgColor: 'bg-[#FBBC05]/10'
        },
        {
            icon: <BrainCircuit size={24} />,
            title: 'Multiple ML Models',
            description: 'Choose from classification and regression models with one click.',
            color: 'text-[#EA4335]',
            bgColor: 'bg-[#EA4335]/10'
        },
        {
            icon: <BarChart3 size={24} />,
            title: 'Visual Results',
            description: 'Get accuracy metrics, confusion matrices, and feature importance charts.',
            color: 'text-[#34A853]',
            bgColor: 'bg-[#34A853]/10'
        }
    ];

    const steps = [
        { icon: <MousePointerClick size={20} />, text: 'Drag & Drop Nodes' },
        { icon: <GitBranch size={20} />, text: 'Connect Pipeline' },
        { icon: <Play size={20} />, text: 'Run & Analyze' }
    ];

    return (
        <div className="min-h-screen bg-white overflow-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="FlowML Logo" className="w-24 h-12 object-cover" />
                        <div>
                            <h1 className="text-xl font-bold text-[#202124] tracking-tight flex items-center gap-0.5">
                                <span className="text-[#4285F4]">Flow</span>
                                <span className="text-[#34A853]">ML</span>
                            </h1>
                        </div>
                    </div>
                    <button
                        onClick={onEnterWorkspace}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg"
                    >
                        <Play size={16} fill="currentColor" />
                        <span>Try It Now</span>
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#4285F4]/5 via-white to-[#34A853]/5" />

                {/* Animated Circles */}
                <div className="absolute top-20 left-10 w-72 h-72 bg-[#4285F4]/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#34A853]/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FBBC05]/5 rounded-full blur-3xl" />

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4285F4]/10 to-[#34A853]/10 border border-[#4285F4]/20 rounded-full mb-8">
                        <Sparkles size={14} className="text-[#FBBC05]" />
                        <span className="text-sm font-medium text-[#5f6368]">No-Code Machine Learning Platform</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#202124] leading-tight mb-6">
                        Build ML Pipelines
                        <br />
                        <span className="bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05] bg-clip-text text-transparent">
                            Visually
                        </span>
                    </h1>

                    <p className="text-xl text-[#5f6368] max-w-2xl mx-auto mb-10 leading-relaxed">
                        Drag, drop, and connect nodes to create powerful machine learning workflows.
                        No coding required — just your data and creativity.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <button
                            onClick={onEnterWorkspace}
                            className="group flex items-center gap-3 px-8 py-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl hover:shadow-[#4285F4]/25 transform hover:-translate-y-0.5"
                        >
                            <Zap size={20} className="group-hover:animate-pulse" />
                            <span>Start Building Now</span>
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Steps */}
                    <div className="flex items-center justify-center gap-8 flex-wrap">
                        {steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#5f6368]">
                                    {step.icon}
                                </div>
                                <span className="text-sm font-medium text-[#202124]">{step.text}</span>
                                {idx < steps.length - 1 && (
                                    <ArrowRight size={16} className="text-gray-300 ml-4" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Product Demo Section */}
            <section className="py-20 px-6 bg-gradient-to-b from-white to-[#F8F9FA]">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#202124] mb-4">
                            See It In Action
                        </h2>
                        <p className="text-lg text-[#5f6368] max-w-xl mx-auto">
                            Watch how easy it is to build and train ML models with FlowML
                        </p>
                    </div>

                    {/* Video Demo - Main Focus with Browser Frame */}
                    <div className="relative mb-8">
                        {/* Glow Effect */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-[#4285F4]/30 via-[#EA4335]/20 to-[#34A853]/30 rounded-3xl blur-2xl opacity-60" />

                        {/* Browser Frame */}
                        <div className="relative bg-[#202124] rounded-xl overflow-hidden shadow-2xl border border-gray-700">
                            {/* Browser Header */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-[#2d2d2d] border-b border-gray-700">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                    <div className="w-3 h-3 rounded-full bg-[#28ca41]" />
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="bg-[#1a1a1a] rounded-md px-4 py-1.5 text-xs text-gray-400 text-center font-mono">
                                        flowml.app/workspace
                                    </div>
                                </div>
                            </div>

                            {/* Video Content */}
                            <video
                                className="w-full h-auto"
                                autoPlay
                                muted
                                loop
                                playsInline
                                controls
                            >
                                <source src={demoVideo} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                    <p className="text-center text-sm text-[#5f6368] mb-12">🎬 Building a complete ML pipeline in under 2 minutes</p>

                    {/* Screenshot - Preview Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="relative">
                            <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200 hover:shadow-2xl transition-shadow duration-300">
                                <img
                                    src={screenshot}
                                    alt="FlowML Workspace Interface"
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-[#202124]">Intuitive Visual Interface</h3>
                            <p className="text-[#5f6368] leading-relaxed">
                                Our drag-and-drop canvas makes it easy to connect data sources, preprocessing steps,
                                ML models, and result visualizations. No coding experience required.
                            </p>
                            <ul className="space-y-2 text-sm text-[#5f6368]">
                                <li className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#4285F4]/10 text-[#4285F4] flex items-center justify-center text-xs">✓</span>
                                    Real-time data preview
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#34A853]/10 text-[#34A853] flex items-center justify-center text-xs">✓</span>
                                    Instant model training
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#FBBC05]/10 text-[#FBBC05] flex items-center justify-center text-xs">✓</span>
                                    Beautiful result visualizations
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-6 bg-[#F8F9FA]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#202124] mb-4">
                            Everything You Need
                        </h2>
                        <p className="text-lg text-[#5f6368] max-w-xl mx-auto">
                            From data import to model evaluation — a complete ML workflow in one place.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className="group p-6 bg-white rounded-2xl border border-gray-200 hover:border-transparent hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className={`w-14 h-14 ${feature.bgColor} ${feature.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold text-[#202124] mb-2">{feature.title}</h3>
                                <p className="text-sm text-[#5f6368] leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#202124] mb-4">
                        How It Works
                    </h2>
                    <p className="text-lg text-[#5f6368] mb-12">
                        Three simple steps to train your machine learning model
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-[#4285F4] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#4285F4]/30">
                                1
                            </div>
                            <h3 className="text-lg font-bold text-[#202124] mb-2">Upload Data</h3>
                            <p className="text-sm text-[#5f6368]">Import your CSV or Excel file with a simple drag and drop</p>
                        </div>

                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-[#FBBC05] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#FBBC05]/30">
                                2
                            </div>
                            <h3 className="text-lg font-bold text-[#202124] mb-2">Build Pipeline</h3>
                            <p className="text-sm text-[#5f6368]">Connect preprocessing, model, and result nodes visually</p>
                        </div>

                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-[#34A853] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#34A853]/30">
                                3
                            </div>
                            <h3 className="text-lg font-bold text-[#202124] mb-2">Get Results</h3>
                            <p className="text-sm text-[#5f6368]">Run the pipeline and see accuracy, metrics, and insights</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05]">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Build Your First Model?
                    </h2>
                    <p className="text-lg text-white/80 mb-8">
                        No sign-up required. Start building in seconds.
                    </p>
                    <button
                        onClick={onEnterWorkspace}
                        className="inline-flex items-center gap-3 px-10 py-4 bg-white text-[#202124] font-semibold text-lg rounded-xl transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                    >
                        <Play size={20} fill="currentColor" className="text-[#4285F4]" />
                        <span>Try It Now — It's Free</span>
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 bg-[#202124] text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-lg font-bold">
                        <span className="text-[#4285F4]">Flow</span>
                        <span className="text-[#34A853]">ML</span>
                    </span>
                </div>
                <p className="text-sm text-gray-500">
                    Built with ❤️ for the ML community
                </p>
            </footer>
        </div>
    );
}
