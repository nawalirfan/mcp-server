import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { MCPController } from './mcp.controller';

@Module({
  controllers: [MCPController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
