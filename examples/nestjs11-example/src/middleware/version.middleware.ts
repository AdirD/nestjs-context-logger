import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ContextLogger } from 'nestjs-context-logger';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class VersionMiddleware implements NestMiddleware {
  private nestVersion: string;
  private pinoVersion: string;
  private nestjsPinoVersion: string;

  constructor() {
    // Get versions at runtime
    this.nestVersion = this.getPackageVersion('@nestjs/core');
    this.pinoVersion = this.getPackageVersion('pino');
    this.nestjsPinoVersion = this.getPackageVersion('nestjs-pino');
    
    console.log(`Detected versions - NestJS: ${this.nestVersion}, Pino: ${this.pinoVersion}, NestJS-Pino: ${this.nestjsPinoVersion}`);
  }

  private getPackageVersion(packageName: string): string {
    try {
      const packageJsonPath = path.resolve(`node_modules/${packageName}/package.json`);
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch (e) {
      console.error(`Could not determine ${packageName} version`, e);
      return 'unknown';
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    console.log(`Updating context with versions - NestJS: ${this.nestVersion}, Pino: ${this.pinoVersion}, NestJS-Pino: ${this.nestjsPinoVersion}`);
    ContextLogger.updateContext({
      nestVersion: this.nestVersion,
      pinoVersion: this.pinoVersion,
      nestjsPinoVersion: this.nestjsPinoVersion
    });
    
    next();
  }
} 