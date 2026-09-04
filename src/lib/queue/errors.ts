export class QueueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QueueError";
  }
}

export class QueueNotFoundError extends QueueError {
  constructor(queueId: string) {
    super(`Queue not found: ${queueId}`);
    this.name = "QueueNotFoundError";
  }
}

export class QueueEntryNotFoundError extends QueueError {
  constructor(entryId: string) {
    super(`Queue entry not found: ${entryId}`);
    this.name = "QueueEntryNotFoundError";
  }
}

export class QueueNotActiveError extends QueueError {
  constructor(queueId: string, status: string) {
    super(`Queue ${queueId} is not active (current status: ${status})`);
    this.name = "QueueNotActiveError";
  }
}

export class QueuePausedError extends QueueError {
  constructor(queueId: string) {
    super(`Queue ${queueId} is paused`);
    this.name = "QueuePausedError";
  }
}

export class QueueClosedError extends QueueError {
  constructor(queueId: string) {
    super(`Queue ${queueId} is closed`);
    this.name = "QueueClosedError";
  }
}

export class InvalidTransitionError extends QueueError {
  constructor(from: string, to: string) {
    super(`Invalid transition from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export class NoPatientsWaitingError extends QueueError {
  constructor(queueId: string) {
    super(`No patients waiting in queue ${queueId}`);
    this.name = "NoPatientsWaitingError";
  }
}
