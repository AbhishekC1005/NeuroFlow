import { useState } from 'react';
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

    const runPipeline = async () => {
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
                let current = getParent(modelNode.id);

                for (let i = 0; i < 10; i++) {
                    if (!current) break;
                    if (current.type === 'split') splitNode = current;
                    else if (current.type === 'preprocessing') preprocessingNode = current;
                    else if (current.type === 'imputation') imputationNode = current;
                    else if (current.type === 'encoding') encodingNode = current;
                    else if (current.type === 'dataset') { datasetNode = current; break; }
                    current = getParent(current.id);
                }

                if (!datasetNode) continue;
                if (!datasetNode.data.file && !datasetNode.data.file_id) throw new Error(`Dataset node connected to ${resNode.data.label} is empty`);
                if (!modelNode.data.targetColumn) throw new Error(`Model node connected to ${resNode.data.label} has no target column`);

                batchPayload[resNode.id] = {
                    file_id: datasetNode.data.file_id || datasetNode.data.file,
                    target_column: modelNode.data.targetColumn,
                    scaler_type: preprocessingNode?.data.scaler || 'None',
                    imputer_strategy: imputationNode?.data.strategy || 'mean',
                    encoder_strategy: encodingNode?.data.strategy || 'onehot',
                    test_size: splitNode?.data.testSize || 0.2,
                    model_type: modelNode.data.modelType || 'Logistic Regression',
                    workflow_snapshot: { nodes, edges }
                    // workflow_id: currentWorkflowId // TODO: Add currentWorkflowId tracking if needed
                };
            }

            if (Object.keys(batchPayload).length === 0) throw new Error("No valid pipeline paths found. Connect Dataset -> Model -> Result.");

            const response = await axios.post(`${API_URL}/run_pipeline_batch`, batchPayload, {
                headers: getAuthHeaders()
            });
            const results = response.data;
            let successCount = 0;

            resultNodes.forEach((rn) => {
                if (results[rn.id]) {
                    if (results[rn.id].error) {
                        toast.error(`Error in ${rn.data.label || 'Result'}: ${results[rn.id].error}`);
                    } else {
                        const { r2_score, mse, mae, accuracy, classification_report, confusion_matrix, is_regression, ...prevData } = rn.data;
                        onNodeDataChange(rn.id, { ...prevData, ...results[rn.id] });
                        successCount++;
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
    };

    return { runPipeline, isRunning };
}
