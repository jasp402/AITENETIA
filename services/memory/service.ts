import * as messageMemory from "./messages";
import * as reminderMemory from "./reminders";
import * as ruleMemory from "./rules";
import * as userMemory from "./users";

export const memoryService = {
    ...userMemory,
    ...messageMemory,
    ...ruleMemory,
    ...reminderMemory,
    onReminderExecute: null as ((channel: string, userId: string, message: string) => void) | null,
    onProactiveNudge: null as ((channel: string, userId: string, message: string) => void) | null
};
