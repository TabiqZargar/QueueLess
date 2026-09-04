export { MockQueueRepository } from "./mock-repository";
export { QueueService } from "./queue-service";
export type {
  JoinQueueInput,
  QueueJoinResult,
  QueueActionResult,
} from "./queue-service";
export {
  QueueError,
  QueueNotFoundError,
  QueueEntryNotFoundError,
  QueueNotActiveError,
  QueuePausedError,
  QueueClosedError,
  InvalidTransitionError,
  NoPatientsWaitingError,
} from "./errors";
export type {
  QueueRepository,
  QueueWithDetails,
  QueueStatistics,
  CreateQueueEntryInput,
  UpdateQueueEntryInput,
} from "./repository";
export {
  canTransition,
  canTransitionQueueStatus,
  validateEntryTransition,
  validateQueueTransition,
} from "./state-machine";
export {
  calculateEstimatedWait,
  calculateQueuePosition,
  countPatientsAhead,
  getCurrentServingToken,
  countWaiting,
} from "./calculations";
