import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { DataService } from './data.service';
import type {
  DataExportResponse,
  DataImportRequest,
  DataImportResponse,
  UserStatsResponse,
} from '@shared/api.interface';

@Controller('api/data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('export')
  @NeedLogin()
  async exportData(@Req() req: Request): Promise<DataExportResponse> {
    const { userId } = req.userContext;
    return this.dataService.exportData(userId);
  }

  @Post('import')
  @NeedLogin()
  async importData(
    @Req() req: Request,
    @Body() body: DataImportRequest,
  ): Promise<DataImportResponse> {
    const { userId } = req.userContext;
    return this.dataService.importData(userId, body);
  }

  @Delete('clear')
  @NeedLogin()
  async clearData(@Req() req: Request): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    return this.dataService.clearData(userId);
  }

  @Get('stats')
  @NeedLogin()
  async getStats(@Req() req: Request): Promise<UserStatsResponse> {
    const { userId } = req.userContext;
    return this.dataService.getStats(userId);
  }
}
