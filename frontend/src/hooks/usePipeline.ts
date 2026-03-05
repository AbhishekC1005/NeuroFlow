import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import type { Node, Edge } from 'reactflow';
import { API_URL } from '../config';
import { getAuthHeaders } from '../components/AuthContext';

export function usePipeline(
    nodes: Node[],
    edges: Edge[],
    onNodeDataChange: (id: string, data: any) => void
) {
    const [isRunning, setIsRunning] = useState(false);

    // Use refs to always access the LATEST nodes/edges inside the callback.
    // This prevents the stale closure bug where runPipeline captures an
    // outdated nodes array, causing the old model type to be sent to the backend.
    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    const onNodeDataChangeRef = useRef(onNodeDataChange);

    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);
    useEffect(() => { onNodeDataChangeRef.current = onNodeDataChange; }, [onNodeDataChange]);

    const runPipeline = useCallback(async () => {
        // Read from refs to get the LATEST state
        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const onNodeDataChange = onNodeDataChangeRef.current;

        setIsRunning(true);
        try {
            const resultNodes = nodes.filter((n) => n.type === 'result');
            if (resultNodes.length === 0) throw new Error("Add a Result node to see output!");

            const batchPayload: Record<string, any> = {};

            const getParent = (nodeId: string) => {
                const edge = edges.find((e) => e.target === nodeId);
                if (!edge) return null;
                return nodes.find((n) => n.id === edge.source) || null;
            };

            for (const resNode of resultNodes) {
                const modelNode = getParent(resNode.id);
                if (!modelNode || modelNode.type !== 'model') continue;

                let splitNode = null;
                let preprocessingNode = null;
                let imputationNode = null;
                let encodingNode = null;
                let datasetNode = null;
                let outlierNode = null;
                let featureSelectionNode = null;
                let duplicateNode = null;
                let crossValidationNode = null;
                let pcaNode = null;
                let featureEngineeringNode = null;
                let classBalancingNode = null;

                let current = getParent(modelNode.id);

                // Walk back through the chain to find all connected nodes
                for (let i = 0; i < 20; i++) {
                    if (!current) break;
                    if (current.type === 'split') splitNode = current;
                    else if (current.type === 'preprocessing') preprocessingNode = current;
                    else if (current.type === 'imputation') imputationNode = current;
                    else if (current.type === 'encoding') encodingNode = current;
                    else if (current.type === 'outlier') outlierNode = current;
                    else if (current.type === 'featureSelection') featureSelectionNode = current;
                    else if (current.type === 'duplicate') duplicateNode = current;
                    else if (current.type === 'crossValidation') crossValidationNode = current;
                    else if (current.type === 'pca') pcaNode = current;
                    else if (current.type === 'featureEngineering') featureEngineeringNode = current;
                    else if (current.type === 'classBalancing') classBalancingNode = current;
                    else if (current.type === 'dataset') { datasetNode = current; break; }
                    current = getParent(current.id);
                }

                if (!datasetNode) continue;
                if (!datasetNode.data.file && !datasetNode.data.file_id) throw new Error(`Dataset node connected to ${resNode.data.label} is empty`);
                if (!modelNode.data.targetColumn) throw new Error(`Model node connected to ${resNode.data.label} has no target column`);

                batchPayload[resNode.id] = {
                    // Core pipeline fields
                    file_id: datasetNode.data.file_id || datasetNode.data.file,
                    target_column: modelNode.data.targetColumn,
                    scaler_type: preprocessingNode?.data.scaler || 'None',
                    imputer_strategy: imputationNode?.data.strategy || 'mean',
                    encoder_strategy: encodingNode?.data.strategy || 'onehot',
                    test_size: splitNode?.data.testSize || 0.2,
                    model_type: modelNode.data.modelType || 'Logistic Regression',

                    // Split enhancements
                    stratified: splitNode?.data.stratified ?? false,
                    random_state: splitNode?.data.randomState ?? 42,
                    shuffle: splitNode?.data.shuffle ?? true,

                    // Duplicate Removal — 'none' when node not in pipeline
                    duplicate_handling: duplicateNode ? (duplicateNode.data.duplicateHandling || 'first') : 'none',

                    // Outlier Handling — 'none' when node not in pipeline
                    outlier_method: outlierNode ? (outlierNode.data.outlierMethod || 'iqr') : 'none',
                    outlier_action: outlierNode ? (outlierNode.data.outlierAction || 'clip') : 'clip',

                    // Feature Selection — 'none' when node not in pipeline
                    feature_selection_method: featureSelectionNode ? (featureSelectionNode.data.featureSelectionMethod || 'variance') : 'none',
                    variance_threshold: featureSelectionNode?.data.varianceThreshold ?? 0.01,
                    correlation_threshold: featureSelectionNode?.data.correlationThreshold ?? 0.95,

                    // Cross-Validation
                    cv_folds: crossValidationNode?.data.cvFolds ?? 0,
                    cv_stratified: crossValidationNode?.data.cvStratified ?? true,

                    // PCA
                    pca_components: pcaNode?.data.pcaComponents ?? 0,

                    // Feature Engineering — 'none' when node not in pipeline
                    feature_engineering_method: featureEngineeringNode ? (featureEngineeringNode.data.featureEngineeringMethod || 'polynomial') : 'none',
                    polynomial_degree: featureEngineeringNode?.data.polynomialDegree ?? 2,

                    // Class Balancing — 'none' when node not in pipeline
                    class_balancing: classBalancingNode ? (classBalancingNode.data.classBalancing || 'oversample') : 'none',

                    // Workflow snapshot
                    workflow_snapshot: {
                        nodes: nodes.map(n => {
                            const { onChange, onDelete, ...rest } = n.data;
                            return { ...n, data: rest };
                        }),
                        edges
                    }
                };
            }

            if (Object.keys(batchPayload).length === 0) throw new Error("No valid pipeline paths found. Connect Dataset → Model → Result.");

            const response = await axios.post(`${API_URL}/run_pipeline_batch`, batchPayload, {
                headers: getAuthHeaders()
            });
            const results = response.data;
            let successCount = 0;

            // Re-read the latest nodes for distributing step previews
            const latestNodes = nodesRef.current;

            resultNodes.forEach((rn: Node) => {
                if (results[rn.id]) {
                    if (results[rn.id].error) {
                        toast.error(`Error in ${rn.data.label || 'Result'}: ${results[rn.id].error}`);
                    } else {
                        const { r2_score, mse, mae, accuracy, classification_report, confusion_matrix, is_regression, ...prevData } = rn.data;
                        onNodeDataChange(rn.id, { ...prevData, ...results[rn.id] });
                        successCount++;

                        // Distribute step_previews to each node in the pipeline
                        // Use latestNodes to avoid overwriting user changes with stale data
                        const stepPreviews = results[rn.id].step_previews;
                        if (stepPreviews) {
                            latestNodes.forEach((n) => {
                                const nodeType = n.type;
                                if (nodeType && stepPreviews[nodeType]) {
                                    onNodeDataChange(n.id, {
                                        ...n.data,
                                        stepPreview: stepPreviews[nodeType]
                                    });
                                }
                            });
                        }
                    }
                }
            });

            if (successCount > 0) toast.success(`Pipeline executed! Updated ${successCount} result(s).`);

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || error.message;
            toast.error(msg);
        } finally {
            setIsRunning(false);
        }
    }, []);

    return { runPipeline, isRunning };
}
