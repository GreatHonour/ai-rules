export interface ResourceEntry {
  readonly version: string;
  readonly desc: string;
  readonly updatedAt: string;
}

export interface ManagedSkillEntry extends ResourceEntry {
  readonly managed: true;
}

export interface Registry {
  readonly repositoryUrl: string;
  readonly rules: Readonly<Record<string, ResourceEntry>>;
  readonly skills: Readonly<Record<string, ResourceEntry>>;
}

export interface ProjectProfile {
  readonly name: string;
  readonly frontendFrameworks: readonly string[];
  readonly backendFrameworks: readonly string[];
  readonly environments: readonly string[];
}

export interface Manifest {
  readonly schemaVersion: 2;
  readonly project: ProjectProfile;
  readonly registryUrl: string;
  readonly repositoryUrl: string;
  readonly rules: Readonly<Record<string, ResourceEntry>>;
  readonly skills: Readonly<Record<string, ManagedSkillEntry>>;
  readonly cliVersion: string;
  readonly updatedAt: string;
}

export type ResourceKind = 'rules' | 'skills';

export interface NamedResource {
  readonly kind: ResourceKind;
  readonly name: string;
  readonly entry: ResourceEntry;
}
