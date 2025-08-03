import React from 'react'
import { Handle, Position } from '@xyflow/react'

const ChainNode = ({ data }) => {
    const { label, isSoloed, deviceCount, isNested } = data

    return (
        <div className={`chain-node ${isNested ? 'nested' : ''} ${isSoloed ? 'soloed' : ''}`}>
            <Handle type="target" position={Position.Left} />

            <div className="chain-header">
                <h4>{label}</h4>
                {isSoloed && <span className="solo-indicator">SOLO</span>}
            </div>

            <div className="chain-info">
                <span className="device-count">{deviceCount} devices</span>
            </div>

            <Handle type="source" position={Position.Right} />
        </div>
    )
}

export default ChainNode
