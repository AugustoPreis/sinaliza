import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  RemoveEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';

import { AuditTarget, IAuditEntityMetadata } from '@shared/audit/interfaces';
import { AuditMetadataRegistry } from '@shared/audit/registry/audit-metadata.registry';
import { RequestContextService } from '@shared/context/request-context.service';

import { EAuditAction } from '../enums/audit-action.enum';
import {
  AUDIT_CHANGE_REQUESTED_EVENT,
  IAuditChangeRequestedEvent,
} from '../events/audit-change-requested.event';

/**
 * Bridges TypeORM's own entity lifecycle to the audit engine: listens to
 * every entity's insert/update/remove/soft-remove and, for the ones
 * decorated with `@AuditEntity()`, emits `AUDIT_CHANGE_REQUESTED_EVENT`.
 *
 * No `listenTo()` on purpose: it listens to *all* entities and filters via
 * `AuditMetadataRegistry.getByTarget()`, silently ignoring anything not
 * decorated (including `AuditLogEntity` itself and `UserRoleEntity`, whose
 * join-table writes never go through `save()`/`remove()`).
 *
 * Registered as a provider (see `AuditModule`) rather than via
 * `subscribers: [...]` in the TypeORM config, so it can use normal Nest DI
 * (`EventEmitter2`, `RequestContextService`); it registers itself onto the
 * `DataSource` from its constructor, the standard way to combine Nest DI with
 * TypeORM subscribers.
 */
@Injectable()
export class AuditSubscriber implements EntitySubscriberInterface {
  private readonly logger = new Logger(AuditSubscriber.name);

  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly requestContextService: RequestContextService,
  ) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<Record<string, unknown>>): void {
    const metadata = this.resolveMetadata(event.metadata.target);

    if (!metadata) {
      return;
    }

    const after = this.pickTrackedFields(metadata.fields.keys(), event.entity);
    const entityUuid = event.entity?.uuid as string | undefined;

    if (!entityUuid) {
      this.logger.warn(`Skipping audit for ${metadata.name}: inserted entity has no uuid.`);

      return;
    }

    this.emitChange(metadata.name, entityUuid, EAuditAction.CREATED, null, after);
  }

  afterUpdate(event: UpdateEvent<Record<string, unknown>>): void {
    const metadata = this.resolveMetadata(event.metadata.target);

    if (!metadata) {
      return;
    }

    if (!event.databaseEntity) {
      this.logger.warn(
        `Skipping audit for ${metadata.name}#update: no "before" snapshot was loaded ` +
          '(event.databaseEntity is undefined). This happens when the row was updated via ' +
          'QueryBuilder (repo.update()) instead of repo.save(); the audit trail requires ' +
          'the instance-based flow.',
      );

      return;
    }

    const before = this.pickTrackedFields(metadata.fields.keys(), event.databaseEntity);
    const after = this.pickTrackedFields(metadata.fields.keys(), event.entity);
    const entityUuid = (event.entity?.uuid ?? event.databaseEntity.uuid) as string | undefined;

    if (!entityUuid) {
      this.logger.warn(`Skipping audit for ${metadata.name}: updated entity has no uuid.`);

      return;
    }

    this.emitChange(metadata.name, entityUuid, EAuditAction.UPDATED, before, after);
  }

  afterRemove(event: RemoveEvent<Record<string, unknown>>): void {
    this.handleRemove(event, EAuditAction.DELETED);
  }

  afterSoftRemove(event: SoftRemoveEvent<Record<string, unknown>>): void {
    this.handleRemove(event, EAuditAction.DELETED);
  }

  private handleRemove(
    event: RemoveEvent<Record<string, unknown>>,
    action: EAuditAction.DELETED,
  ): void {
    const metadata = this.resolveMetadata(event.metadata.target);

    if (!metadata) {
      return;
    }

    if (!event.databaseEntity) {
      this.logger.warn(
        `Skipping audit for ${metadata.name}#${action.toLowerCase()}: no "before" snapshot was ` +
          'loaded (event.databaseEntity is undefined). This happens when the row was removed via ' +
          'QueryBuilder (repo.delete()/softDelete()) instead of repo.remove()/softRemove(); the ' +
          'audit trail requires the instance-based flow.',
      );

      return;
    }

    const before = this.pickTrackedFields(metadata.fields.keys(), event.databaseEntity);
    const entityUuid = (event.entity?.uuid ?? event.databaseEntity.uuid) as string | undefined;

    if (!entityUuid) {
      this.logger.warn(`Skipping audit for ${metadata.name}: removed entity has no uuid.`);

      return;
    }

    this.emitChange(metadata.name, entityUuid, action, before, null);
  }

  private resolveMetadata(target: AuditTarget | string): IAuditEntityMetadata | undefined {
    // `EntityMetadata.target` is only ever a string for edge cases this
    // codebase doesn't use (e.g. entity schemas without a class); every
    // `@Entity()`-decorated class here has a real constructor target, which
    // is the only kind `AuditMetadataRegistry` ever indexes.
    if (typeof target === 'string') {
      return undefined;
    }

    return AuditMetadataRegistry.getByTarget(target);
  }

  private pickTrackedFields(
    fields: IterableIterator<string>,
    source: Record<string, unknown> | undefined,
  ): Record<string, unknown> | null {
    if (!source) {
      return null;
    }

    const picked: Record<string, unknown> = {};

    for (const field of fields) {
      picked[field] = source[field];
    }

    return picked;
  }

  private emitChange(
    entityName: string,
    entityUuid: string,
    action: EAuditAction,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
  ): void {
    const event: IAuditChangeRequestedEvent = {
      entityName,
      entityUuid,
      actorUuid: this.requestContextService.getActorUuid(),
      action,
      before,
      after,
    };

    this.eventEmitter.emit(AUDIT_CHANGE_REQUESTED_EVENT, event);
  }
}
