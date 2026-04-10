export type ElementType = 'rect' | 'ellipse' | 'line' | 'pencil' | 'text';

export interface BaseElement{
    id: string;
    type: ElementType;
    version: number;
    versionNonce: number;
}

export type Op = 
  | {op: 'add'; element: BaseElement & Record<string, unknown>}
  | {op: 'update'; elementId: string; changes: Partial<BaseElement & Record<string, unknown>>; version: number}
  | {op: 'delete'; elementId: string; version:number};


export function mergeElement<T extends BaseElement>(existing: T, incoming: T): T{
     if (incoming.version > existing.version) return incoming;
  if (incoming.version === existing.version && incoming.versionNonce > existing.versionNonce) return incoming;
  return existing;
}


