import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { McpService } from './mcp.service';
import { Request, Response } from 'express';
import { IncomingMessage } from 'http';

@Controller('mcp')
export class MCPController {
  constructor(private readonly mcpService: McpService) {}

  @Get('/sse')
  async sse(@Res() res: Response) {
    return this.mcpService.sse(res);
  }

  @Post('/messages')
  async messages(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: unknown,
  ) {
    return this.mcpService.messages(
      req as unknown as IncomingMessage,
      res,
      body,
    );
  }
}
