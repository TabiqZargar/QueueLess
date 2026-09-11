#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/804823ca44cb67dc67417b0e947820d9cf1619a4c9d3b766d5ea619363300b2b/contract';
import endContract from '../../snapshots/804823ca44cb67dc67417b0e947820d9cf1619a4c9d3b766d5ea619363300b2b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'clinic',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contact', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('timezone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'department',
        columns: [
          col('clinicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'department_status_check_ee520df2',
            "\"status\" IN ('ACTIVE', 'INACTIVE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'doctor',
        columns: [
          col('averageConsultationMinutes', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('displayName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('doctor_status_check_ee520df2', "\"status\" IN ('ACTIVE', 'INACTIVE')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'patient',
        columns: [
          col('clinicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'queue',
        columns: [
          col('clinicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currentToken', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('departmentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('doctorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pausedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('queueDate', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('startedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'queue_status_check_97e0dd0e',
            "\"status\" IN ('NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'queueEntry',
        columns: [
          col('calledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('consultationStartedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('entryType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('joinedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('patientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('queueId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenNumber', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'queueEntry_entryType_check_00cb452a',
            "\"entryType\" IN ('APPOINTMENT', 'WALK_IN')",
          ),
          checkExpression(
            'queueEntry_status_check_2792efe4',
            "\"status\" IN ('REGISTERED', 'WAITING', 'CALLED', 'IN_CONSULTATION', 'COMPLETED', 'NO_SHOW', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'queueEvent',
        columns: [
          col('actorUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('queueEntryId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('queueId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('timestamp', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'queueEvent_eventType_check_ff041c07',
            "\"eventType\" IN ('QUEUE_CREATED', 'PATIENT_REGISTERED', 'QUEUE_JOINED', 'PATIENT_CALLED', 'CONSULTATION_STARTED', 'CONSULTATION_COMPLETED', 'PATIENT_NO_SHOW', 'PATIENT_CANCELLED', 'WALK_IN_ADDED', 'QUEUE_PAUSED', 'QUEUE_RESUMED', 'DOCTOR_DELAYED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('clinicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_role_check_fa85347c',
            "\"role\" IN ('PATIENT', 'STAFF', 'DOCTOR', 'ADMIN')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'doctor',
        constraint: 'doctor_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'queueEntry',
        constraint: 'queueEntry_queueId_tokenNumber_key',
        columns: ['queueId', 'tokenNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'department',
        index: 'department_clinicId_idx_8f933800',
        columns: ['clinicId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'doctor',
        index: 'doctor_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'patient',
        index: 'patient_clinicId_idx_8f933800',
        columns: ['clinicId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queue',
        index: 'queue_clinicId_idx_8f933800',
        columns: ['clinicId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queue',
        index: 'queue_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queue',
        index: 'queue_doctorId_idx_04369053',
        columns: ['doctorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queue',
        index: 'queue_queueDate_idx_a3b499c8',
        columns: ['queueDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queueEntry',
        index: 'queueEntry_patientId_idx_e5f07e88',
        columns: ['patientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queueEntry',
        index: 'queueEntry_queueId_idx_88ef1f02',
        columns: ['queueId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queueEntry',
        index: 'queueEntry_queueId_status_idx_26329bf4',
        columns: ['queueId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queueEvent',
        index: 'queueEvent_actorUserId_idx_96dac96c',
        columns: ['actorUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queueEvent',
        index: 'queueEvent_queueEntryId_idx_5167a6d8',
        columns: ['queueEntryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queueEvent',
        index: 'queueEvent_queueId_idx_88ef1f02',
        columns: ['queueId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'queueEvent',
        index: 'queueEvent_queueId_timestamp_idx_19d82d86',
        columns: ['queueId', 'timestamp'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user',
        index: 'user_clinicId_idx_8f933800',
        columns: ['clinicId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'department',
        foreignKey: {
          name: 'department_clinicId_fkey',
          columns: ['clinicId'],
          references: { schema: 'public', table: 'clinic', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'doctor',
        foreignKey: {
          name: 'doctor_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'doctor',
        foreignKey: {
          name: 'doctor_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'patient',
        foreignKey: {
          name: 'patient_clinicId_fkey',
          columns: ['clinicId'],
          references: { schema: 'public', table: 'clinic', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'queue',
        foreignKey: {
          name: 'queue_clinicId_fkey',
          columns: ['clinicId'],
          references: { schema: 'public', table: 'clinic', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'queue',
        foreignKey: {
          name: 'queue_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'queue',
        foreignKey: {
          name: 'queue_doctorId_fkey',
          columns: ['doctorId'],
          references: { schema: 'public', table: 'doctor', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'queueEntry',
        foreignKey: {
          name: 'queueEntry_queueId_fkey',
          columns: ['queueId'],
          references: { schema: 'public', table: 'queue', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'queueEntry',
        foreignKey: {
          name: 'queueEntry_patientId_fkey',
          columns: ['patientId'],
          references: { schema: 'public', table: 'patient', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'queueEvent',
        foreignKey: {
          name: 'queueEvent_queueId_fkey',
          columns: ['queueId'],
          references: { schema: 'public', table: 'queue', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'queueEvent',
        foreignKey: {
          name: 'queueEvent_queueEntryId_fkey',
          columns: ['queueEntryId'],
          references: { schema: 'public', table: 'queueEntry', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'queueEvent',
        foreignKey: {
          name: 'queueEvent_actorUserId_fkey',
          columns: ['actorUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'user',
        foreignKey: {
          name: 'user_clinicId_fkey',
          columns: ['clinicId'],
          references: { schema: 'public', table: 'clinic', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
