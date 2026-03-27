import { dbService } from "../../services/db";
import { dockerService } from "../../services/dockerService";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getPreviewUrl, getProjectAppPort, hasMeaningfulWorkspaceFiles } from "./shared";

export const runtimeHandlers = {
    async assessProjectDelivery(projectId: string) {
        const project = dbService.getProjectById(projectId);
        if (!project) throw new Error("Proyecto no encontrado");

        const framework = String(project.config?.framework || project.stack || "").toLowerCase();
        const requiresPreview = project.type === 'landingPage' || framework.includes('next') || framework.includes('astro') || framework.includes('react');
        const launchCommand = dockerService.detectLaunchCommand(project.path, project.config);
        const hasWorkspaceFiles = hasMeaningfulWorkspaceFiles(project.path);
        let previewReady = false;
        const appPort = getProjectAppPort(project);

        if (project.preview_url && project.runtime_status === 'running') {
            try {
                const response = await fetch(project.preview_url, {
                    method: 'GET',
                    signal: AbortSignal.timeout(4000)
                });
                const contentType = response.headers.get('content-type') || '';
                previewReady = response.ok && (contentType.includes('text/html') || contentType.includes('application/xhtml+xml'));
            } catch {
                previewReady = false;
            }
        }

        let reason = 'Delivery verified';
        let deliveryReady = true;

        if (!hasWorkspaceFiles) {
            deliveryReady = false;
            reason = 'No executable or source files were generated in the workspace.';
        } else if (requiresPreview && !launchCommand) {
            deliveryReady = false;
            reason = 'No launch command was detected for this web project.';
        } else if (requiresPreview && !previewReady) {
            deliveryReady = false;
            reason = 'The Docket is on, but the preview is not renderable yet.';
        }

        dbService.updateProject(projectId, {
            environment_details: {
                ...(project.environment_details || {}),
                deliveryReady,
                deliveryReason: reason,
                launchCommand,
                appPort,
                previewReady,
                hasWorkspaceFiles
            }
        });

        return { deliveryReady, reason, previewReady, launchCommand, appPort, hasWorkspaceFiles, requiresPreview };
    },

    async cleanupProjectArtifacts(projectId: string) {
        const result = await dockerService.cleanupProjectArtifacts(projectId);
        const project = dbService.getProjectById(projectId);
        if (project) {
            dbService.updateProject(projectId, {
                runtime_status: 'stopped',
                runtime_container_name: null,
                container_ip: null,
                preview_url: getPreviewUrl(projectId)
            });
        }
        return result;
    },

    async getProjectRuntime(projectId: string) {
        const project = dbService.getProjectById(projectId);
        if (!project) throw new Error("Proyecto no encontrado");

        const runtime = await dockerService.getContainerRuntime(projectId);
        const previewUrl = getPreviewUrl(projectId);

        if (runtime.exists) {
            dbService.updateProject(projectId, {
                runtime_status: runtime.running ? 'running' : 'stopped',
                runtime_container_name: runtime.containerName,
                container_ip: runtime.containerIp,
                preview_url: previewUrl
            });
        }

        return {
            assigned_port: project.assigned_port || null,
            app_port: project.environment_details?.appPort || null,
            container_ip: runtime.containerIp,
            preview_url: previewUrl,
            runtime_status: runtime.running ? 'running' : 'stopped',
            container_name: runtime.containerName
        };
    },

    async startProjectRuntime(projectId: string) {
        const project = dbService.getProjectById(projectId);
        if (!project) throw new Error("Proyecto no encontrado");
        if (project.environment_status !== 'ready') throw new Error("El ambiente aun no esta listo");

        const dockerfilePath = join(project.path, "Dockerfile");
        const launchCommand = dockerService.detectLaunchCommand(project.path, project.config);
        const dockerfileContent = existsSync(dockerfilePath) ? readFileSync(dockerfilePath, "utf-8") : "";
        const needsRuntimeRebuild = !!launchCommand && (
            dockerfileContent.includes("FROM alpine:latest")
            || dockerfileContent.includes('CMD ["sh", "-c", "npm run dev"]')
            || dockerfileContent.includes('CMD ["sh", "-c", "bun run dev"]')
        );

        dbService.updateProject(projectId, {
            runtime_status: 'starting',
            preview_url: getPreviewUrl(projectId)
        });

        if (needsRuntimeRebuild) {
            dbService.logSystemEvent(projectId, "Se detectó una app lanzable sobre un contenedor placeholder. Reconstruyendo runtime...", "docker");
            dockerService.generateDockerfile(project.path);
            await dockerService.stopContainer(projectId).catch(() => false);
            const rebuilt = await dockerService.buildImage(projectId, project.path);
            if (!rebuilt) {
                dbService.updateProject(projectId, { runtime_status: 'error', status: 'delivery_pending' });
                throw new Error("No se pudo reconstruir la imagen del proyecto con el runtime actualizado");
            }
        }

        const runtime = await dockerService.startContainer(projectId, project.path);
        const previewUrl = getPreviewUrl(projectId);
        const launchResult = await dockerService.launchApp(projectId, project.path, project.config);
        const appPort = await dockerService.detectAppPort(runtime.containerIp, project.config, 30000);
        const environmentDetails = {
            ...(project.environment_details || {}),
            launchCommand: launchResult.command,
            launchReady: launchResult.started,
            launchReason: launchResult.reason || null,
            appPort
        };

        if (launchResult.command) dbService.logSystemEvent(projectId, `Intentando iniciar la app del proyecto con: ${launchResult.command}`, "info");
        else dbService.logSystemEvent(projectId, "El Docket esta encendido, pero no se detecto un comando de arranque para la app.", "info");

        const isReady = await dockerService.waitForHttp(previewUrl, 30000);

        dbService.updateProject(projectId, {
            status: runtime.running && isReady ? project.status : 'delivery_pending',
            runtime_status: runtime.running ? 'running' : 'error',
            runtime_container_name: runtime.containerName,
            container_ip: runtime.containerIp,
            preview_url: previewUrl,
            environment_details: environmentDetails
        });

        return {
            containerName: runtime.containerName,
            assigned_port: project.assigned_port || null,
            container_ip: runtime.containerIp,
            preview_url: previewUrl,
            runtime_status: runtime.running ? 'running' : 'error',
            preview_ready: isReady,
            app_port: appPort,
            launch_command: launchResult.command,
            launch_ready: launchResult.started
        };
    },

    async stopProjectRuntime(projectId: string) {
        const project = dbService.getProjectById(projectId);
        if (!project) throw new Error("Proyecto no encontrado");

        await dockerService.stopContainer(projectId);
        dbService.updateProject(projectId, {
            runtime_status: 'stopped',
            container_ip: null,
            preview_url: getPreviewUrl(projectId)
        });

        return {
            assigned_port: project.assigned_port || null,
            container_ip: null,
            preview_url: getPreviewUrl(projectId),
            runtime_status: 'stopped'
        };
    },

    async orchestrate(this: any, projectId: string, goal: string) {
        await this.prepareEnvironment(projectId);
        return this.generateTasks(projectId, goal);
    },

    async prepareEnvironment(projectId: string) {
        if (dbService.isProjectBusy(projectId)) return;

        dbService.clearSystemEvents(projectId);
        dbService.setProjectBusy(projectId, true);

        try {
            const project = dbService.getProjectById(projectId);
            if (!project) throw new Error("Proyecto no encontrado");

            dbService.updateProject(projectId, {
                status: 'preparing_environment',
                environment_status: 'preparing',
                runtime_status: 'starting',
                preview_url: getPreviewUrl(projectId)
            });

            dbService.logSystemEvent(projectId, "Preparando ambiente de ejecucion...", "info");

            const dockerAvailable = await dockerService.isAvailable();
            if (!dockerAvailable) {
                dbService.updateProject(projectId, {
                    status: 'registered',
                    environment_status: 'failed',
                    environment_details: { dockerAvailable: false, mode: 'local_fs' }
                });
                dbService.logSystemEvent(projectId, "Docker no esta disponible. No se pudo preparar el ambiente aislado.", "error");
                throw new Error("Docker no disponible");
            }

            dbService.logSystemEvent(projectId, "Docker Engine detectado. Generando Dockerfile...", "docker");
            const dockerfilePath = dockerService.generateDockerfile(project.path);

            dbService.logSystemEvent(projectId, "Construyendo imagen del proyecto...", "docker");
            const buildSuccess = await dockerService.buildImage(projectId, project.path);
            if (!buildSuccess) {
                dbService.updateProject(projectId, {
                    status: 'registered',
                    environment_status: 'failed',
                    environment_details: { dockerAvailable: true, dockerfilePath, buildSuccess: false }
                });
                dbService.logSystemEvent(projectId, "Fallo la construccion de la imagen Docker.", "error");
                throw new Error("Fallo el build de Docker");
            }

            dbService.logSystemEvent(projectId, "Levantando contenedor del proyecto...", "docker");
            const runtime = await dockerService.startContainer(projectId, project.path);
            const previewUrl = getPreviewUrl(projectId);
            const launchResult = await dockerService.launchApp(projectId, project.path, project.config);
            const appPort = await dockerService.detectAppPort(runtime.containerIp, project.config, 30000);
            if (launchResult.command) dbService.logSystemEvent(projectId, `Intentando iniciar la app del proyecto con: ${launchResult.command}`, "info");
            else dbService.logSystemEvent(projectId, "El Docket quedo operativo, pero no se detecto una app arrancable todavia.", "info");

            const runtimeReady = await dockerService.waitForHttp(previewUrl, 30000);

            dbService.updateProject(projectId, {
                status: runtimeReady ? 'environment_ready' : 'delivery_pending',
                environment_status: 'ready',
                preview_url: previewUrl,
                runtime_status: runtime.running ? 'running' : 'error',
                runtime_container_name: runtime.containerName,
                container_ip: runtime.containerIp,
                environment_details: {
                    dockerAvailable: true,
                    dockerfilePath,
                    buildSuccess: true,
                    containerName: runtime.containerName,
                    containerIp: runtime.containerIp,
                    previewUrl,
                    appPort,
                    launchCommand: launchResult.command,
                    launchReady: launchResult.started,
                    launchReason: launchResult.reason || null,
                    previewReady: runtimeReady
                }
            });
            dbService.logSystemEvent(projectId, "Ambiente listo. Ya puedes generar tareas.", "success");
            return true;
        } finally {
            dbService.setProjectBusy(projectId, false);
        }
    }
};
