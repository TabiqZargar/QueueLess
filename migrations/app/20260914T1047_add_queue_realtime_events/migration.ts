#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/475472fc0afac836d8e2c46285bafa03c9732928f1695fbed98df1ea26f5f268/contract';
import startContract from '../../snapshots/475472fc0afac836d8e2c46285bafa03c9732928f1695fbed98df1ea26f5f268/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/60880a416b0568b289bcc0853b0284023930786570d1ca40c7ee122b4646a01c/contract';
import endContract from '../../snapshots/60880a416b0568b289bcc0853b0284023930786570d1ca40c7ee122b4646a01c/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'queueRealtimeEvent',
        columns: [
          col('entryId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'BIGSERIAL', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('occurredAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('queueId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'queueRealtimeEvent_eventType_check_f75daa8c',
            "\"eventType\" IN ('QUEUE_UPDATED', 'QUEUE_ENTRY_UPDATED', 'QUEUE_STATUS_CHANGED')",
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queueRealtimeEvent',
        index: 'queueRealtimeEvent_queueId_id_idx_7700add7',
        columns: ['queueId', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queueRealtimeEvent',
        index: 'queueRealtimeEvent_queueId_idx_88ef1f02',
        columns: ['queueId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'queueRealtimeEvent',
        foreignKey: {
          name: 'queueRealtimeEvent_queueId_fkey',
          columns: ['queueId'],
          references: { schema: 'public', table: 'queue', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
