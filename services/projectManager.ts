import * as projectManagerFiles from "./project-manager/files";
import * as projectManagerProcesses from "./project-manager/processes";
import * as projectManagerProjects from "./project-manager/projects";

export const projectManager = {
    ...projectManagerProjects,
    ...projectManagerProcesses,
    ...projectManagerFiles
};
