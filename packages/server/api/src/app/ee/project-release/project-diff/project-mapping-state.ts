import { isNil } from '@activepieces/shared'

export class ProjectMappingState {
    flows: Record<string, {
        sourceId: string
    }>

    constructor(data: { flows: Record<string, { sourceId: string }> }) {
        this.flows = data.flows
    }

    mapFlow({ sourceId, targetId }: { sourceId: string, targetId: string }): ProjectMappingState {
        return new ProjectMappingState({
            ...this,
            flows: {
                ...this.flows,
                [targetId]: {
                    sourceId,
                },
            },
        })
    }


    deleteFlow(targetId: string): ProjectMappingState {
        const { [targetId]: _, ...rest } = this.flows
        return new ProjectMappingState({
            flows: rest,
        })
    }

    findSourceId(targetflowId: string): string | undefined {
        const state = this.flows[targetflowId]
        if (isNil(state)) {
            return undefined
        }
        return state.sourceId
    }

    findTargetId(sourceId: string): string | undefined {
        return Object.entries(this.flows).find(([_, value]) => value.sourceId === sourceId)?.[0]
    }

    static empty(): ProjectMappingState {
        return new ProjectMappingState({
            flows: {},
        })
    }

}
