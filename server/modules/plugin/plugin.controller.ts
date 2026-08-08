import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { PluginService } from './plugin.service';
import type {
  PluginDto,
  PluginMarketResponse,
  PluginConfigResponse,
  SavePluginConfigRequest,
} from '@shared/api.interface';

@Controller('api/plugins')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @Get('market')
  @NeedLogin()
  async getMarket(@Req() req: any): Promise<PluginMarketResponse> {
    const { userId } = req.userContext;
    return this.pluginService.getMarket(userId);
  }

  @Post('install')
  @NeedLogin()
  async install(
    @Req() req: any,
    @Body() body: { pluginKey: string },
  ): Promise<PluginDto> {
    const { userId } = req.userContext;
    return this.pluginService.install(userId, body.pluginKey);
  }

  @Delete(':id/uninstall')
  @NeedLogin()
  async uninstall(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    return this.pluginService.uninstall(userId, id);
  }

  @Patch(':id/enable')
  @NeedLogin()
  async setEnabled(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ): Promise<PluginDto> {
    const { userId } = req.userContext;
    return this.pluginService.setEnabled(userId, id, body.enabled);
  }

  @Get(':id/config')
  @NeedLogin()
  async getConfig(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<PluginConfigResponse> {
    const { userId } = req.userContext;
    return this.pluginService.getConfig(userId, id);
  }

  @Put(':id/config')
  @NeedLogin()
  async saveConfig(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: SavePluginConfigRequest,
  ): Promise<{ success: boolean; configValues: Record<string, any> }> {
    const { userId } = req.userContext;
    return this.pluginService.saveConfig(userId, id, body.configValues);
  }
}
