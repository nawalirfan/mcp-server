import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { IncomingMessage } from 'http';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Response } from 'express';

const execAsync = promisify(exec);

@Injectable()
export class McpService {
  private readonly server: McpServer;
  private transport: SSEServerTransport;
  constructor() {
    this.server = new McpServer(
      { name: 'mcp-server', version: '1.0.0' },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      },
    );
  }

  async onModuleInit() {
    this.registerTools();
  }

  private async registerTools() {
    this.server.tool(
      'do_something',
      'do something...',
      { name: z.string().default('John Doe') },
      ({ name }) => this.doSomething(name),
    );

    this.server.tool(
      'scan_nmap',
      'Run an NMAP scan on a target. Supports various scan types and configurations.',
      {
        target: z.string(),
        ports: z.string().optional(), // e.g. "22-80" or "80,443" or null for default
        scanType: z.enum(['quick', 'full', 'version']).default('quick'),
        timing: z.number().min(0).max(5).default(3), // T0-T5 timing templates
        additionalFlags: z.string().optional(),
      },
      async ({ target, ports, scanType, timing, additionalFlags }) =>
        await this.runNmapScan(
          target,
          ports ?? '',
          scanType,
          timing,
          additionalFlags,
        ),
    );

    console.log('✅ Tools Registered: ');
  }

  private doSomething(name: string) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Hello, ${name}!`,
        },
      ],
    };
  }

  private async runNmapScan(
    target: string,
    ports: string,
    scanType: string,
    timing: number,
    additionalFlags?: string,
  ) {
    // Build the nmap command with proper flags
    let command = `nmap -T${timing}`;

    // Add scan type flags
    switch (scanType) {
      case 'quick':
        command += ' -F'; // Fast scan
        break;
      case 'full':
        command += ' -p-'; // All ports
        break;
      case 'version':
        command += ' -sV'; // Version detection
        break;
    }

    // Add port specification if provided
    if (ports) {
      command += ` -p${ports}`;
    }

    // Add any additional flags
    if (additionalFlags) {
      command += ` ${additionalFlags}`;
    }

    // Add target
    command += ` ${target}`;

    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr) {
        console.error('Nmap stderr:', stderr);
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: stdout || 'Nmap scan completed with no output',
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Nmap scan failed: ${errorMessage}`);
    }
  }

  async sse(res: Response) {
    try {
      this.transport = new SSEServerTransport('/mcp/messages', res);
      await this.server.connect(this.transport);
    } catch (error: any) {
      console.log('🚀 ~ McpService ~ sse ~ error:', error);
    }
  }

  async messages(req: IncomingMessage, res: Response, body: unknown) {
    try {
      if (this.transport) {
        this.transport.handlePostMessage(req, res, body);
      }
    } catch (error: any) {
      console.log('🚀 ~ McpService ~ messages ~ error:', error);
    }
  }
}
