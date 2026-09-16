import { parseArgs, runValidate } from "./cli.js";

const root = process.env.THETAFRAME_BABY_KB_PRIVATE_ROOT;
const args = parseArgs(process.argv.slice(2));
process.exitCode = runValidate({ ...args, root: args.root ?? root });
