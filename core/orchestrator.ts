import { aiHandlers } from "./orchestrator/ai";
import { runtimeHandlers } from "./orchestrator/runtime";
import { planningHandlers } from "./orchestrator/planning";
import { coordinationHandlers } from "./orchestrator/coordination";
import { executionHandlers } from "./orchestrator/execution";

/**
 * A2A Orchestrator Service
 * Fachada principal. La logica fue separada en core/orchestrator/.
 */
export const orchestratorService = {
    ...aiHandlers,
    ...runtimeHandlers,
    ...planningHandlers,
    ...coordinationHandlers,
    ...executionHandlers
};
