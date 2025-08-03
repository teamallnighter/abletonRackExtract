import React, { useState } from 'react'
import { Handle, Position } from '@xyflow/react'

const DeviceNode = ({ data }) => {
    const { label, isOn, presetName, parameters, hasNestedRacks } = data
    const [showDetails, setShowDetails] = useState(false)

    const parameterEntries = Object.entries(parameters || {}).slice(0, 3)

    return (
        <div className={`device-node ${!isOn ? 'disabled' : ''} ${hasNestedRacks ? 'has-nested' : ''}`}>
            <Handle type="target" position={Position.Left} />

            <div className="device-header" onClick={() => setShowDetails(!showDetails)}>
                <h4>{label}</h4>
                <div className="device-status">
                    <span className={`power-indicator ${isOn ? 'on' : 'off'}`}>
                        {isOn ? '●' : '○'}
                    </span>
                    {hasNestedRacks && <span className="nested-indicator">📦</span>}
                </div>
            </div>

            {presetName && (
                <div className="preset-name">
                    <small>{presetName}</small>
                </div>
            )}

            {showDetails && parameterEntries.length > 0 && (
                <div className="device-parameters">
                    {parameterEntries.map(([key, value]) => (
                        <div key={key} className="parameter">
                            <span className="param-name">{key}:</span>
                            <span className="param-value">{String(value).slice(0, 20)}</span>
                        </div>
                    ))}
                    {Object.keys(parameters || {}).length > 3 && (
                        <div className="parameter">
                            <small>+ {Object.keys(parameters).length - 3} more...</small>
                        </div>
                    )}
                </div>
            )}

            <Handle type="source" position={Position.Right} />
        </div>
    )
}

export default DeviceNode
