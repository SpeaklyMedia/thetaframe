import type { ThetaExternalProvider, ThetaIntegrationObjectType, ThetaLane } from "./enums";

export function buildThetaObjectId(
  lane: ThetaLane,
  objectType: ThetaIntegrationObjectType,
  uuid: string,
): string {
  return `tf::${lane}::${objectType}::${uuid}`;
}

export function buildExternalRef(
  provider: ThetaExternalProvider,
  resourceType: string,
  resourceId: string,
): string {
  return `${provider}::${resourceType}::${resourceId}`;
}
