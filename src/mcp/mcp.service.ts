import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class McpService {
  private readonly server: McpServer;
  private readonly transport: StdioServerTransport;

  constructor() {
    this.server = new McpServer({
      name: 'example-server',
      version: '1.0.0',
    });
    this.transport = new StdioServerTransport();
  }

  async onModuleInit() {
    this.registerTools();

    await this.server.connect(this.transport);
    console.log('✅ MCP Server running...');
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

  doSomething(name: string) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Hello, ${name}!`,
        },
      ],
    };
  }

  async runNmapScan(
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

  getServer(): McpServer {
    return this.server;
  }
}
