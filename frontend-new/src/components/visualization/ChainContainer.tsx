import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { Chain } from '../../types/rack';

interface ChainContainerData {
    label: string;
    type: 'chainContainer';
    data: Chain;
    chainId?: string;
    chainIndex?: number;
    chainName?: string;
    chainColor?: string;
    width?: number;
    height?: number;
    deviceCount?: number;
}

const ChainContainer = memo(({ data }: NodeProps & { data: ChainContainerData }) => {
    const chain = data.data;
    const activeDevices = chain.devices.filter(device => device.is_on).length;
    const totalDevices = data.deviceCount || chain.devices.length;

    const containerStyle = {
        width: data.width || 280,
        height: data.height || 400,
        backgroundColor: data.chainColor ? `${data.chainColor}08` : '#f8fafc',
        borderColor: data.chainColor || '#e2e8f0',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '12px',
        position: 'relative' as const,
        cursor: 'move', // Make it clear this is draggable
        pointerEvents: 'all' as const, // Enable dragging
    };

    return (
        <div style={containerStyle} className="chain-container shadow-lg">
            {/* Chain Header */}
            <div
                className="absolute top-0 left-0 right-0 px-3 py-2 rounded-t-lg border-b-2 font-semibold"
                style={{
                    backgroundColor: data.chainColor || '#e2e8f0',
                    borderColor: data.chainColor || '#cbd5e1',
                    color: '#ffffff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
            >
                <div className="flex items-center justify-between">
                    <div className="text-sm">
                        {data.label}
                    </div>
                    <div className="flex items-center space-x-2">
                        {chain.is_soloed && (
                            <div className="w-2 h-2 bg-yellow-300 rounded-full border border-yellow-400" title="Soloed" />
                        )}
                        <div className="text-xs opacity-90">
                            {activeDevices}/{totalDevices}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chain Body - where devices will be positioned */}
            <div className="absolute inset-0 top-12 p-2">
                {/* This space contains the devices */}
                <div className="text-xs text-gray-500 text-center mt-4 opacity-75">
                    Drag to move all devices in this chain
                </div>
            </div>
        </div>
    );
});

ChainContainer.displayName = 'ChainContainer';

export default ChainContainer;
