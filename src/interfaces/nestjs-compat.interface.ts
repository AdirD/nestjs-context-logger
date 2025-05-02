import { DynamicModule as NestJSDynamicModule, ForwardReference, Type } from '@nestjs/common';

/**
 * Compatibility interface to handle DynamicModule differences between NestJS 10 and NestJS 11
 * 
 * In NestJS 11, the imports array type has slightly different structure, which causes 
 * TypeScript errors when a module built with NestJS 10 types is used in a NestJS 11 project.
 */
export interface CompatDynamicModule extends Omit<NestJSDynamicModule, 'imports'> {
  imports?: Array<Type<any> | NestJSDynamicModule | Promise<NestJSDynamicModule> | ForwardReference<any>>;
}

/**
 * Type alias for DynamicModule that works with both NestJS 10 and 11
 */
export type DynamicModule = CompatDynamicModule; 