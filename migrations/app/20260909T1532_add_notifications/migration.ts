#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/475472fc0afac836d8e2c46285bafa03c9732928f1695fbed98df1ea26f5f268/contract';
import endContract from '../../snapshots/475472fc0afac836d8e2c46285bafa03c9732928f1695fbed98df1ea26f5f268/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/804823ca44cb67dc67417b0e947820d9cf1619a4c9d3b766d5ea619363300b2b/contract';
import startContract from '../../snapshots/804823ca44cb67dc67417b0e947820d9cf1619a4c9d3b766d5ea619363300b2b/contract.json' with { type: 'json' };
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
        table: 'notification',
        columns: [
          col('channel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dedupeKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entryId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('queueId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'notification_channel_check_7b5c13c0',
            "\"channel\" IN ('IN_APP', 'EMAIL', 'SMS', 'PUSH')",
          ),
          checkExpression(
            'notification_type_check_2df23cfa',
            "\"type\" IN ('QUEUE_JOINED', 'TURN_APPROACHING', 'PATIENT_CALLED', 'CONSULTATION_STARTED', 'QUEUE_COMPLETED', 'QUEUE_CANCELLED', 'QUEUE_PAUSED', 'QUEUE_RESUMED', 'NO_SHOW')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_userId_type_eventId_key',
        columns: ['userId', 'type', 'eventId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_userId_type_dedupeKey_key',
        columns: ['userId', 'type', 'dedupeKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_entryId_idx_8b42d1db',
        columns: ['entryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_eventId_idx_6a266d47',
        columns: ['eventId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_queueId_idx_88ef1f02',
        columns: ['queueId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_userId_createdAt_idx_f726f04a',
        columns: ['userId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notification',
        index: 'notification_userId_readAt_idx_8bd92969',
        columns: ['userId', 'readAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_queueId_fkey',
          columns: ['queueId'],
          references: { schema: 'public', table: 'queue', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notification',
        foreignKey: {
          name: 'notification_entryId_fkey',
          columns: ['entryId'],
          references: { schema: 'public', table: 'queueEntry', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
