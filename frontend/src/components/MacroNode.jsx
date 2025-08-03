import React from 'react'
import { Handle, Position } from '@xyflow/react'

const MacroNode = ({ data }) => {
    const { label, value, index } = data

    // Convert 0-1 value to percentage
    const percentage = Math.round((value || 0) * 100)

    return (
        <div className="macro-node">
            <div className="macro-header">
                <h4>{label}</h4>
                <span className="macro-index">M{index + 1}</span>
            </div>

            <div className="macro-value">
                <div className="value-bar">
                    <div
                        className="value-fill"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="value-text">{percentage}%</span>
            </div>

            <Handle type="source" position={Position.Right} />
        </div>
    )
}

export default MacroNode
