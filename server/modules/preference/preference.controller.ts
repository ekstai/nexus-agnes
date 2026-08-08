import {
  Controller,
  Get,
  Put,
  Body,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { PreferenceService } from './preference.service';
import type {
  UserPreferenceDto,
  UpdatePreferenceRequest,
} from '@shared/api.interface';

@Controller('api/preferences')
export class PreferenceController {
  constructor(private readonly preferenceService: PreferenceService) {}

  @Get()
  @NeedLogin()
  async getPreference(@Req() req: any): Promise<UserPreferenceDto> {
    const { userId } = req.userContext;
    return this.preferenceService.get(userId);
  }

  @Put()
  @NeedLogin()
  async updatePreference(
    @Req() req: any,
    @Body() body: UpdatePreferenceRequest,
  ): Promise<UserPreferenceDto> {
    const { userId } = req.userContext;
    return this.preferenceService.update(userId, body);
  }
}
