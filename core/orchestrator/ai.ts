import { getActiveServices } from "../../services";

export const aiHandlers = {
    getPrioritizedServices() {
        const preferredOrder = ['groq', 'openrouter', 'gemini', 'cerebras', 'kimi', 'mistral', 'anthropic'];
        const services = getActiveServices().filter(Boolean);

        return services.sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            const aIndex = preferredOrder.findIndex((name) => aName.includes(name));
            const bIndex = preferredOrder.findIndex((name) => bName.includes(name));
            const safeA = aIndex === -1 ? preferredOrder.length : aIndex;
            const safeB = bIndex === -1 ? preferredOrder.length : bIndex;
            return safeA - safeB;
        });
    },

    async collectStream(stream: AsyncIterable<string>) {
        let response = "";
        for await (const chunk of stream) {
            if (chunk) response += chunk;
        }
        return response;
    },

    async chatWithFallback(this: any, messages: any[], timeoutMs = 45000) {
        const services = this.getPrioritizedServices();
        if (services.length === 0) {
            throw new Error("IA no disponible");
        }

        const failures: string[] = [];

        for (const ai of services) {
            const label = `${ai.name || 'Unknown'}:${ai.model || 'unknown'}`;

            try {
                const response = await Promise.race([
                    (async () => this.collectStream(await ai.chat(messages)))(),
                    new Promise<string>((_, reject) => {
                        setTimeout(() => reject(new Error(`Timeout agotado para ${label}`)), timeoutMs);
                    })
                ]);

                if (response && response.trim()) {
                    return {
                        response,
                        serviceName: ai.name || "Unknown",
                        modelName: ai.model || "Unknown"
                    };
                }

                failures.push(`${label}: respuesta vacia`);
            } catch (error: any) {
                failures.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`Ningun proveedor respondio correctamente. ${failures.join(" | ")}`);
    }
};
