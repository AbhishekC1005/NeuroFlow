import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Book, Brain, Database, LineChart, Layers, GitBranch, Binary, Sigma, ArrowLeft } from 'lucide-react';
import logo from '../assets/image.png';

type Section = 'preprocessing' | 'ml-basics' | 'neural-networks' | 'evaluation';

export default function DocumentationPage() {
    const [activeSection, setActiveSection] = useState<Section>('ml-basics');
    const location = useLocation();
    const fromWorkspace = location.state?.from === 'workspace';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-['Outfit',_'Inter',_sans-serif]">
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
                                <span className="ml-2 text-sm text-gray-400 font-normal border-l border-gray-200 pl-2">Docs</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-8">
                {fromWorkspace ? (
                    <Link to="/workspace" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to Workspace</span>
                    </Link>
                ) : (
                    <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to Home</span>
                    </Link>
                )}
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-8 py-8 flex gap-8">
                {/* Sidebar */}
                <div className="hidden lg:block w-64 shrink-0">
                    <div className="sticky top-28 space-y-1">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Topics</div>
                        <button onClick={() => setActiveSection('preprocessing')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === 'preprocessing' ? 'bg-blue-50 text-[#4285F4]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}><Database size={18} /> Data Preprocessing</button>
                        <button onClick={() => setActiveSection('ml-basics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === 'ml-basics' ? 'bg-red-50 text-[#EA4335]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}><LineChart size={18} /> Machine Learning</button>
                        <button onClick={() => setActiveSection('neural-networks')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === 'neural-networks' ? 'bg-yellow-50 text-[#FBBC05]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}><Brain size={18} /> Neural Networks</button>
                        <button onClick={() => setActiveSection('evaluation')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSection === 'evaluation' ? 'bg-green-50 text-[#34A853]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}><Sigma size={18} /> Model Evaluation</button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-12 min-h-[80vh]">
                    {/* Mobile Menu */}
                    <div className="lg:hidden mb-8 overflow-x-auto pb-4 custom-scrollbar flex gap-2">
                        <button onClick={() => setActiveSection('preprocessing')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${activeSection === 'preprocessing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>Preprocessing</button>
                        <button onClick={() => setActiveSection('ml-basics')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${activeSection === 'ml-basics' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>ML Basics</button>
                        <button onClick={() => setActiveSection('neural-networks')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${activeSection === 'neural-networks' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>Neural Networks</button>
                        <button onClick={() => setActiveSection('evaluation')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${activeSection === 'evaluation' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>Evaluation</button>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {activeSection === 'preprocessing' && 'Data Preprocessing & Engineering'}
                        {activeSection === 'ml-basics' && 'Classical Machine Learning'}
                        {activeSection === 'neural-networks' && 'Deep Learning & Neural Networks'}
                        {activeSection === 'evaluation' && 'Metrics & Evaluation'}
                    </h1>
                    <p className="text-gray-500 text-lg mb-12">
                        {activeSection === 'preprocessing' && 'Techniques to clean, transform, and prepare your raw data for modeling.'}
                        {activeSection === 'ml-basics' && 'Fundamental algorithms for classification and regression tasks.'}
                        {activeSection === 'neural-networks' && 'Understanding the building blocks of modern AI and deep learning.'}
                        {activeSection === 'evaluation' && 'How to measure the performance and reliability of your models.'}
                    </p>

                    <div className="space-y-16">
                        {/* Preprocessing Content */}
                        {activeSection === 'preprocessing' && (
                            <div className="space-y-12">
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-blue-50 rounded-lg text-[#4285F4]">
                                            <GitBranch size={24} />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-gray-900">Handling Missing Data</h2>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        Real-world data is often incomplete. Missing values can occur due for various reasons like sensor failure or human error.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-6 border border-gray-200 rounded-xl bg-gray-50 hover:border-[#4285F4]/30 transition-colors">
                                            <h3 className="font-medium text-gray-900 mb-2">Mean/Median Imputation</h3>
                                            <p className="text-sm text-gray-600">Replaces missing values with the mean or median of the column. Best for numerical data without extreme outliers.</p>
                                        </div>
                                        <div className="p-6 border border-gray-200 rounded-xl bg-gray-50 hover:border-[#4285F4]/30 transition-colors">
                                            <h3 className="font-medium text-gray-900 mb-2">Most Frequent (Mode)</h3>
                                            <p className="text-sm text-gray-600">Replaces missing values with the most frequent value. Essential for categorical data.</p>
                                        </div>
                                    </div>
                                </section>

                                <hr className="border-gray-100" />

                                <section>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#4285F4]"></div>
                                        Scaling & Normalization
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Features with different scales (e.g., Age: 20-80 vs Salary: 20k-200k) can bias models. Scaling ensures equal contribution.
                                    </p>
                                    <div className="space-y-4">
                                        <div className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="shrink-0 font-mono text-sm text-blue-600 font-semibold w-24">Standard Scaler</div>
                                            <div className="text-sm text-gray-600">Removes the mean and scales to unit variance. Best for algorithms assuming Gaussian distribution (e.g., Logistic Regression).</div>
                                        </div>
                                        <div className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="shrink-0 font-mono text-sm text-blue-600 font-semibold w-24">MinMax Scaler</div>
                                            <div className="text-sm text-gray-600">Scales data to a fixed range [0, 1]. Preserves the shape of the original distribution but is sensitive to outliers.</div>
                                        </div>
                                    </div>
                                </section>

                                <hr className="border-gray-100" />

                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-blue-50 rounded-lg text-[#4285F4]">
                                            <Binary size={24} />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-gray-900">Feature Encoding</h2>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        Machine learning models require numerical input. Encoding converts categorical text data into numbers.
                                    </p>
                                    <div className="space-y-4">
                                        <div className="relative overflow-hidden rounded-xl border border-gray-200">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4285F4]"></div>
                                            <div className="p-6 pl-8">
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">One-Hot Encoding</h3>
                                                <p className="text-gray-600 mb-4">Creates a new binary column for each category. Best for nominal data without order.</p>
                                                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-blue-200">
                                                    Color: [Red, Blue] → Is_Red: [1, 0], Is_Blue: [0, 1]
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative overflow-hidden rounded-xl border border-gray-200">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4285F4]"></div>
                                            <div className="p-6 pl-8">
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">Label Encoding</h3>
                                                <p className="text-gray-600 mb-4">Assigns a unique integer to each category. Useful for ordinal data (Small, Medium, Large).</p>
                                                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-blue-200">
                                                    Size: [Small, Medium, Large] → [0, 1, 2]
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ML Basics Content */}
                        {activeSection === 'ml-basics' && (
                            <div className="space-y-12">
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-red-50 rounded-lg text-[#EA4335]">
                                            <LineChart size={24} />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-gray-900">Supervised Learning</h2>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed mb-8">
                                        Algorithms that learn to map input data (X) to output targets (y) based on example pairs.
                                    </p>

                                    <div className="grid grid-cols-1 gap-8">
                                        <div className="group relative bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
                                            <div className="absolute top-8 right-8 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Classification</div>
                                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Logistic Regression</h3>
                                            <p className="text-gray-600 mb-6 leading-relaxed">
                                                Despite its name, it's a classification algorithm used to predict the probability of a binary outcome (1/0, Yes/No). It fits an S-shaped logistic curve to the data.
                                            </p>
                                            <div className="bg-gray-50 rounded-xl p-5 text-gray-700 font-mono border border-gray-100">
                                                P(y=1) = 1 / (1 + e^-(wx + b))
                                            </div>
                                        </div>

                                        <div className="group relative bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
                                            <div className="absolute top-8 right-8 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">Regression</div>
                                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Linear Regression</h3>
                                            <p className="text-gray-600 mb-6 leading-relaxed">
                                                Predicts a continuous value by finding the best-fitting straight line through the data points. It minimizes the sum of squared errors between predicted and actual values.
                                            </p>
                                            <div className="bg-gray-50 rounded-xl p-5 text-gray-700 font-mono border border-gray-100">
                                                y = w₁x₁ + w₂x₂ + ... + b
                                            </div>
                                        </div>

                                        <div className="group relative bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
                                            <div className="absolute top-8 right-8 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">Versatile</div>
                                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Random Forest</h3>
                                            <p className="text-gray-600 mb-6 leading-relaxed">
                                                An ensemble method that builds multiple decision trees and merges them together to get a more accurate and stable prediction. It uses "bagging" to train trees on different data subsets.
                                            </p>
                                            <ul className="text-gray-600 space-y-2 list-disc pl-5">
                                                <li>Handles non-linear relationships well</li>
                                                <li>Robust against overfitting compared to single trees</li>
                                                <li>Can handle both classification and regression tasks</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="mt-12 p-6 bg-red-50 rounded-xl border border-red-100">
                                        <h3 className="text-lg font-semibold text-red-800 mb-2">Unsupervised Learning</h3>
                                        <p className="text-gray-700 mb-4">
                                            Algorithms that find hidden patterns or intrinsic structures in input data (X) without labeled responses.
                                        </p>
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <strong className="block text-gray-900 mb-1">K-Means Clustering</strong>
                                            <p className="text-sm text-gray-600">
                                                Partitions n observations into k clusters where each observation belongs to the cluster with the nearest mean. Useful for customer segmentation.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* Neural Networks Content */}
                        {activeSection === 'neural-networks' && (
                            <div className="space-y-12">
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-yellow-50 rounded-lg text-[#FBBC05]">
                                            <Brain size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-semibold text-gray-900">Neural Networks</h2>
                                            <p className="text-gray-500 text-sm mt-1">Inspired by the biological neural networks of animal brains</p>
                                        </div>
                                    </div>

                                    <div className="mb-12 p-10 bg-gray-900 rounded-2xl relative overflow-hidden text-center group">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
                                        <Layers className="mx-auto text-white/20 mb-6 group-hover:scale-110 transition-transform duration-500" size={80} />
                                        <h3 className="text-white text-2xl font-medium relative z-10 mb-3">The Perceptron</h3>
                                        <p className="text-gray-400 text-base max-w-xl mx-auto relative z-10 leading-relaxed">
                                            The fundamental building block. It takes inputs, weights them, sums them up, adds a bias, and passes the result through an activation function to determine the output.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div className="p-8 border border-gray-200 rounded-2xl bg-white hover:shadow-md transition-shadow">
                                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Activation Functions</h4>
                                            <ul className="space-y-4">
                                                <li className="text-gray-600">
                                                    <strong className="text-gray-900 block mb-1">ReLU (Rectified Linear Unit)</strong>
                                                    f(x) = max(0, x). Most common in hidden layers. Solves vanishing gradient problem and computes fast.
                                                </li>
                                                <li className="text-gray-600">
                                                    <strong className="text-gray-900 block mb-1">Sigmoid</strong>
                                                    Saps value between 0 and 1. Good for binary classification output layer.
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="p-8 border border-gray-200 rounded-2xl bg-white hover:shadow-md transition-shadow">
                                            <h4 className="text-lg font-semibold text-gray-900 mb-4">Backpropagation</h4>
                                            <p className="text-gray-600 leading-relaxed mb-4">
                                                The "learning" mechanism. It calculates the gradient of the error function with respect to the neural network's weights, allowing the network to adjust itself to minimize error.
                                            </p>
                                            <div className="p-4 bg-gray-50 rounded-xl text-sm font-mono text-gray-500 border border-gray-100">
                                                Weight_new = Weight_old - (Learning_Rate * Gradient)
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* Evaluation Content */}
                        {activeSection === 'evaluation' && (
                            <div className="space-y-12">
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-green-50 rounded-lg text-[#34A853]">
                                            <Sigma size={24} />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-gray-900">Metrics & Evaluation</h2>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="p-8 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                            <h3 className="text-xl font-medium text-gray-900 mb-6 text-center">Confusion Matrix</h3>
                                            <div className="max-w-lg mx-auto grid grid-cols-2 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
                                                <div className="bg-green-50 p-6 text-center">
                                                    <div className="text-xs text-uppercase tracking-wider text-green-800 font-semibold mb-2">True Positive</div>
                                                    <div className="text-3xl font-bold text-green-600">TP</div>
                                                    <div className="text-xs text-green-600/70 mt-1">Correctly predicted Yes</div>
                                                </div>

                                                <div className="bg-red-50 p-6 text-center">
                                                    <div className="text-xs text-uppercase tracking-wider text-red-800 font-semibold mb-2">False Positive</div>
                                                    <div className="text-3xl font-bold text-red-600">FP</div>
                                                    <div className="text-xs text-red-600/70 mt-1">Incorrectly predicted Yes</div>
                                                </div>
                                                <div className="bg-red-50 p-6 text-center">
                                                    <div className="text-xs text-uppercase tracking-wider text-red-800 font-semibold mb-2">False Negative</div>
                                                    <div className="text-3xl font-bold text-red-600">FN</div>
                                                    <div className="text-xs text-red-600/70 mt-1">Incorrectly predicted No</div>
                                                </div>
                                                <div className="bg-green-50 p-6 text-center">
                                                    <div className="text-xs text-uppercase tracking-wider text-green-800 font-semibold mb-2">True Negative</div>
                                                    <div className="text-3xl font-bold text-green-600">TN</div>
                                                    <div className="text-xs text-green-600/70 mt-1">Correctly predicted No</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                                                <div className="text-base font-semibold text-gray-900 mb-2">F1 Score</div>
                                                <div className="text-sm font-mono text-blue-600 mb-2">2 * (Precision * Recall) / (Precision + Recall)</div>
                                                <p className="text-sm text-gray-500">Harmonic mean of Precision and Recall. Best for imbalanced datasets where you care about both false positives and false negatives.</p>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                                                <div className="text-base font-semibold text-gray-900 mb-2">ROC - AUC</div>
                                                <p className="text-sm text-gray-500 mt-2">
                                                    <strong>Receiver Operating Characteristic</strong> curve plots TPR vs FPR at different thresholds. <strong>AUC (Area Under Curve)</strong> measures the ability of the classifier to distinguish between classes (1.0 is perfect, 0.5 is random).
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                                                <div className="text-base font-semibold text-gray-900 mb-2">Accuracy</div>
                                                <div className="text-sm font-mono text-blue-600 mb-2">(TP+TN) / Total</div>
                                                <p className="text-sm text-gray-500">Overall correctness of the model. Can be misleading for imbalanced datasets.</p>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                                                <div className="text-base font-semibold text-gray-900 mb-2">Precision</div>
                                                <div className="text-sm font-mono text-blue-600 mb-2">TP / (TP+FP)</div>
                                                <p className="text-sm text-gray-500">Of all positive predictions, how many were actually positive? (Quality).</p>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                                                <div className="text-base font-semibold text-gray-900 mb-2">Recall</div>
                                                <div className="text-sm font-mono text-blue-600 mb-2">TP / (TP+FN)</div>
                                                <p className="text-sm text-gray-500">Of all actual positives, how many did we find? (Quantity).</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        <div className="pt-12 mt-12 border-t border-gray-100 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                                © 2025 FlowML Documentation
                            </div>
                            <div className="flex gap-4">
                                <a href="#" className="text-gray-400 hover:text-[#4285F4] transition-colors"><Book size={18} /></a>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
