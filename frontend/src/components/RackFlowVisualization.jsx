import React, { useMemo } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    ConnectionLineType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './RackFlow.css'
import ChainNode from './ChainNode'
import DeviceNode from './DeviceNode'
import MacroNode from './MacroNode'

const nodeTypes = {
    chain: ChainNode,
    device: DeviceNode,
    macro: MacroNode,
}

const RackFlowVisualization = ({ rackData }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

    // Convert rack data to React Flow nodes and edges
    const { initialNodes, initialEdges } = useMemo(() => {
        if (!rackData?.analysis) {
            return { initialNodes: [], initialEdges: [] }
        }

        const nodes = []
        const edges = []
        let nodeId = 0

        // Starting positions
        let yPos = 50
        const chainSpacing = 300
        const deviceSpacing = 150
        const macroYStart = 50

        // Create macro control nodes (on the left side)
        const macroControls = rackData.analysis.macro_controls || []
        macroControls.forEach((macro, index) => {
            nodes.push({
                id: `macro-${nodeId++}`,
                type: 'macro',
                position: { x: 50, y: macroYStart + (index * 80) },
                data: {
                    label: macro.name,
                    value: macro.value,
                    index: macro.index,
                },
            })
        })

        // Create chain and device nodes
        const chains = rackData.analysis.chains || []
        chains.forEach((chain, chainIndex) => {
            const chainId = `chain-${nodeId++}`

            // Create chain node
            nodes.push({
                id: chainId,
                type: 'chain',
                position: { x: 400, y: yPos },
                data: {
                    label: chain.name || `Chain ${chainIndex + 1}`,
                    isSoloed: chain.is_soloed,
                    deviceCount: chain.devices?.length || 0,
                },
            })

            let deviceXPos = 600
            let previousDeviceId = chainId

            // Create device nodes for this chain
            const devices = chain.devices || []
            devices.forEach((device) => {
                const deviceId = `device-${nodeId++}`

                nodes.push({
                    id: deviceId,
                    type: 'device',
                    position: { x: deviceXPos, y: yPos },
                    data: {
                        label: device.name,
                        isOn: device.is_on !== false, // default to on if not specified
                        presetName: device.preset_name,
                        parameters: device.parameters || {},
                        hasNestedRacks: device.chains && device.chains.length > 0,
                    },
                })

                // Create edge from previous node to this device
                edges.push({
                    id: `edge-${previousDeviceId}-${deviceId}`,
                    source: previousDeviceId,
                    target: deviceId,
                    type: 'smoothstep',
                    animated: device.is_on !== false,
                    style: {
                        stroke: device.is_on !== false ? '#00ff88' : '#666',
                        strokeWidth: 2
                    },
                })

                // Handle nested racks (recursive visualization)
                if (device.chains && device.chains.length > 0) {
                    let nestedYPos = yPos + 100
                    device.chains.forEach((nestedChain, nestedIndex) => {
                        const nestedChainId = `nested-chain-${nodeId++}`

                        nodes.push({
                            id: nestedChainId,
                            type: 'chain',
                            position: { x: deviceXPos + 200, y: nestedYPos },
                            data: {
                                label: nestedChain.name || `Nested Chain ${nestedIndex + 1}`,
                                isSoloed: nestedChain.is_soloed,
                                deviceCount: nestedChain.devices?.length || 0,
                                isNested: true,
                            },
                        })

                        // Connect device to nested chain
                        edges.push({
                            id: `edge-${deviceId}-${nestedChainId}`,
                            source: deviceId,
                            target: nestedChainId,
                            type: 'smoothstep',
                            style: { stroke: '#ff6b35', strokeWidth: 2 },
                        })

                        nestedYPos += 120
                    })
                }

                deviceXPos += deviceSpacing
                previousDeviceId = deviceId
            })

            yPos += chainSpacing
        })

        return { initialNodes: nodes, initialEdges: edges }
    }, [rackData])

    // Update nodes and edges when rack data changes
    React.useEffect(() => {
        setNodes(initialNodes)
        setEdges(initialEdges)
    }, [initialNodes, initialEdges, setNodes, setEdges])

    if (!rackData?.analysis) {
        return (
            <div className="rack-flow-placeholder">
                <p>No rack data available for visualization</p>
            </div>
        )
    }

    return (
        <div className="rack-flow-container" style={{ height: '600px', width: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                connectionLineType={ConnectionLineType.SmoothStep}
                fitView
                attributionPosition="bottom-left"
            >
                <Background variant="dots" gap={20} size={1} />
                <Controls />
                <MiniMap
                    nodeStrokeColor="#333"
                    nodeColor="#fff"
                    nodeBorderRadius={8}
                />
            </ReactFlow>
        </div>
    )
}

export default RackFlowVisualization
