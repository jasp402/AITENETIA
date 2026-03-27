import * as dockerBuild from "./docker/build";
import * as dockerFiles from "./docker/files";
import * as dockerRuntime from "./docker/runtime";

export const dockerService = {
    ...dockerFiles,
    ...dockerBuild,
    ...dockerRuntime
};
