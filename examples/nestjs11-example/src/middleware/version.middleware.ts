import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ContextLogger } from 'nestjs-context-logger';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class VersionMiddleware implements NestMiddleware {
  private nestVersion: string;

  constructor() {
    // Get NestJS version at runtime using a more reliable method
    try {
      // Try to read package.json from node_modules
      const packageJsonPath = path.resolve('node_modules/@nestjs/core/package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      this.nestVersion = packageJson.version;
    } catch (e) {
      this.nestVersion = 'unknown';
      console.error('Could not determine NestJS version', e);
    }
    
    console.log(`Detected NestJS version: ${this.nestVersion}`);
  }

  use(req: Request, res: Response, next: NextFunction) {
    console.log(`Updating context nestVersion: ${this.nestVersion}`);
    ContextLogger.updateContext({
      nestVersion: this.nestVersion
    });
    
    next();
  }
} 