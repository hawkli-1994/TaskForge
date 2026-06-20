export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export interface RepositoryRef {
  id: string;
  provider: string;
  owner: string;
  name: string;
  url: string;
}

export interface RepositorySnapshot {
  ref: RepositoryRef;
  defaultBranch: string;
  externalId: string;
}

export interface IssueRef {
  number: number;
  title: string;
  state: string;
  url: string;
}

export interface ChangeRequestRef {
  number: number;
  title: string;
  state: string;
  url: string;
}

export interface CommitRef {
  sha: string;
  message: string;
  author: string;
  committedAt: Date;
}

export interface CommitRange {
  base: string;
  head: string;
}

export interface CiStatus {
  context: string;
  state: string;
  url?: string;
}

export interface AuthRef {
  token: string;
  baseUrl?: string;
}

export interface ProviderCapabilities {
  supportsIssues: boolean;
  supportsPullRequests: boolean;
  supportsCommits: boolean;
  supportsCiStatuses: boolean;
}

export interface RepositoryProvider {
  readonly provider: string;
  capabilities(): ProviderCapabilities;
  validateConnection(auth: AuthRef): Promise<{ id: string; login: string }>;
  listRepositories(cursor?: string): Promise<Page<RepositoryRef>>;
  getRepository(ref: RepositoryRef): Promise<RepositorySnapshot>;
  listIssues(ref: RepositoryRef, cursor?: string): Promise<Page<IssueRef>>;
  listPullRequests(ref: RepositoryRef, cursor?: string): Promise<Page<ChangeRequestRef>>;
  listCommits(ref: RepositoryRef, range: CommitRange): Promise<Page<CommitRef>>;
  listCiStatuses(ref: RepositoryRef, sha: string): Promise<CiStatus[]>;
}
