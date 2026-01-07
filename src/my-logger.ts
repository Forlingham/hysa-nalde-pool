import { ConsoleLogger } from '@nestjs/common';

export class MyLogger extends ConsoleLogger {
  protected getJsonLogObject(message: unknown, options: any) {
    const logObject = super.getJsonLogObject(message, options) as any;
    logObject.timestamp = new Date().toISOString();
    
    return logObject;
  }
}
